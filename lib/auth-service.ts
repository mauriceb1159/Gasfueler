import { and, eq, or } from 'drizzle-orm';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { z } from 'zod';

import { USER_ROLES } from '@/lib/auth/roles';
import { comparePasswords, hashPassword } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  ActivityType,
  drivers,
  invitations,
  type NewActivityLog,
  type NewUser,
  type Team,
  teamMembers,
  teams,
  users
} from '@/lib/db/schema';
import {
  createSupabaseAdminClient,
  createSupabaseAuthClient
} from '@/lib/supabase/server';

const SUPABASE_AUTH_PASSWORD_SENTINEL = 'supabase-auth-managed-password';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };

  await db.insert(activityLogs).values(newActivity);
}

export const signInInputSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional()
});

export async function getDriverProfileIdForUser(userId: number) {
  const [driver] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(and(eq(drivers.userId, userId), eq(drivers.active, true)))
    .limit(1);

  return driver?.id ?? null;
}

export async function authenticateUser(input: z.infer<typeof signInInputSchema>) {
  const email = input.email.toLowerCase();
  const { password } = input;

  try {
    const supabase = createSupabaseAuthClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (!error && data.user) {
      const result = await getOrCreateApplicationUserForSupabaseIdentity(data.user);
      await logActivity(result.team?.id, result.user.id, ActivityType.SIGN_IN);
      return result;
    }
  } catch (error) {
    if (!isMissingSupabaseAuthConfigError(error)) {
      throw error;
    }

    console.warn(
      'Supabase Auth password sign-in is not configured; falling back to legacy auth.'
    );
  }

  return authenticateLegacyUserAndLinkToSupabase(email, password);
}

function isMissingSupabaseAuthConfigError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('is required for Supabase Auth')
  );
}

export async function registerUser(input: z.infer<typeof signUpInputSchema>) {
  const email = input.email.toLowerCase();
  const { password, inviteId } = input;

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        error: 'An account with this email already exists. Try signing in instead.' as const
      };
    }

    const supabaseUser = await createConfirmedSupabaseUser(email, password);

    if ('error' in supabaseUser) {
      return { error: supabaseUser.error };
    }

    return await createApplicationUserForSupabaseIdentity(supabaseUser.user, {
      inviteId,
      password
    });
  } catch (error) {
    console.error('Sign-up failed:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'We could not finish creating your account right now. Please try again.'
    } as const;
  }
}

export async function getOrCreateApplicationUserForSupabaseIdentity(
  supabaseUser: SupabaseAuthUser,
  input: { inviteId?: string; role?: string } = {}
) {
  const email = supabaseUser.email?.toLowerCase();

  if (!email) {
    throw new Error('Supabase Auth user does not have an email address.');
  }

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      or(
        eq(users.supabaseAuthUserId, supabaseUser.id),
        eq(users.email, email)
      )
    )
    .limit(1);

  if (userWithTeam.length > 0) {
    const { user, team } = userWithTeam[0];

    if (!user.supabaseAuthUserId) {
      user.supabaseAuthUserId = supabaseUser.id;
      await db
        .update(users)
        .set({ supabaseAuthUserId: supabaseUser.id })
        .where(eq(users.id, user.id));
    }

    return { user, team };
  }

  return createApplicationUserForSupabaseIdentity(supabaseUser, input);
}

async function authenticateLegacyUserAndLinkToSupabase(
  email: string,
  password: string
) {
  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return { error: 'Invalid email or password. Please try again.' as const };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];
  const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);

  if (!isPasswordValid) {
    return { error: 'Invalid email or password. Please try again.' as const };
  }

  if (!foundUser.supabaseAuthUserId) {
    let supabaseUser:
      | Awaited<ReturnType<typeof createConfirmedSupabaseUser>>
      | undefined;

    try {
      supabaseUser = await createConfirmedSupabaseUser(email, password);
    } catch (error) {
      console.warn('Supabase Auth user linking failed during legacy sign-in:', error);
    }

    if (supabaseUser && !('error' in supabaseUser)) {
      foundUser.supabaseAuthUserId = supabaseUser.user.id;
      await db
        .update(users)
        .set({ supabaseAuthUserId: supabaseUser.user.id })
        .where(eq(users.id, foundUser.id));
    } else if (supabaseUser && 'error' in supabaseUser) {
      console.warn(
        'Supabase Auth user linking skipped during legacy sign-in:',
        supabaseUser.error
      );
    }
  }

  await logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN);

  return {
    user: foundUser,
    team: foundTeam
  };
}

async function createConfirmedSupabaseUser(email: string, password: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error || !data.user) {
    return {
      error:
        error?.message ||
        'We could not create your authentication account right now.'
    } as const;
  }

  return { user: data.user } as const;
}

async function createApplicationUserForSupabaseIdentity(
  supabaseUser: SupabaseAuthUser,
  input: { inviteId?: string; password?: string; role?: string }
) {
  const email = supabaseUser.email?.toLowerCase();

  if (!email) {
    throw new Error('Supabase Auth user does not have an email address.');
  }

  let invitation: (typeof invitations.$inferSelect) | undefined;

  if (input.inviteId) {
    [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(input.inviteId, 10)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (!invitation) {
      throw new Error('This invitation is invalid or expired.');
    }
  }

  const userRole =
    (invitation?.role as NewUser['role'] | undefined) ??
    (input.role as NewUser['role'] | undefined) ??
    USER_ROLES.END_USER;

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      supabaseAuthUserId: supabaseUser.id,
      passwordHash: await hashPassword(
        input.password ?? SUPABASE_AUTH_PASSWORD_SENTINEL
      ),
      role: userRole
    })
    .returning();

  if (!createdUser) {
    throw new Error('We could not create your account. Please try again.');
  }

  let teamId: number;
  let team: Team | null = null;

  if (invitation) {
    teamId = invitation.teamId;

    await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitation.id));

    [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);
  } else {
    [team] = await db
      .insert(teams)
      .values({ name: `${email}'s Team` })
      .returning();

    if (!team) {
      throw new Error(
        'Your account was created, but we could not create your team. Please try again.'
      );
    }

    teamId = team.id;
    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  await Promise.all([
    db.insert(teamMembers).values({
      userId: createdUser.id,
      teamId,
      role: userRole
    }),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP)
  ]);

  return { user: createdUser, team };
}
