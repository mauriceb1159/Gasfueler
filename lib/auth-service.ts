import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { comparePasswords, hashPassword } from '@/lib/auth/session';
import { USER_ROLES } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  ActivityType,
  invitations,
  type NewActivityLog,
  type NewTeam,
  type NewTeamMember,
  type NewUser,
  teamMembers,
  teams,
  users
} from '@/lib/db/schema';

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

export async function authenticateUser(input: z.infer<typeof signInInputSchema>) {
  const { email, password } = input;

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

  await logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN);

  return {
    user: foundUser,
    team: foundTeam
  };
}

export async function registerUser(input: z.infer<typeof signUpInputSchema>) {
  const { email, password, inviteId } = input;

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

    let invitation:
      | (typeof invitations.$inferSelect)
      | undefined;

    if (inviteId) {
      [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, parseInt(inviteId, 10)),
            eq(invitations.email, email),
            eq(invitations.status, 'pending')
          )
        )
        .limit(1);

      if (!invitation) {
        return { error: 'This invitation is invalid or expired.' as const };
      }
    }

    const passwordHash = await hashPassword(password);
    const newUser: NewUser = {
      email,
      passwordHash,
      role: (invitation?.role as NewUser['role']) ?? USER_ROLES.END_USER
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();

    if (!createdUser) {
      return {
        error: 'We could not create your account. Please try again.' as const
      };
    }

    let teamId: number;
    let userRole: string;
    let createdTeam: typeof teams.$inferSelect | null = null;

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      [createdTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
    } else {
      const newTeam: NewTeam = {
        name: `${email}'s Team`
      };

      [createdTeam] = await db.insert(teams).values(newTeam).returning();

      if (!createdTeam) {
        return {
          error:
            'Your account was created, but we could not create your team. Please try again.' as const
        };
      }

      teamId = createdTeam.id;
      userRole = USER_ROLES.END_USER;

      await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
    }

    const newTeamMember: NewTeamMember = {
      userId: createdUser.id,
      teamId,
      role: userRole
    };

    await Promise.all([
      db.insert(teamMembers).values(newTeamMember),
      logActivity(teamId, createdUser.id, ActivityType.SIGN_UP)
    ]);

    return {
      user: createdUser,
      team: createdTeam
    };
  } catch (error) {
    console.error('Sign-up failed:', error);
    return {
      error: 'We could not finish creating your account right now. Please try again.' as const
    };
  }
}
