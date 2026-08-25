'use server';

import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teamMembers,
  activityLogs,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { authenticateUser, registerUser } from '@/lib/auth-service';
import { deleteAccountForUser } from '@/lib/account-delete-service';
import { updatePasswordForUser } from '@/lib/account-security-service';
import {
  consumePasswordResetToken,
  getActivePasswordResetToken,
  invalidatePasswordResetTokensForUser,
  issuePasswordResetToken
} from '@/lib/auth/password-reset';
import { sendPasswordResetEmail } from '@/lib/email/password-reset';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import {
  canManageTeam,
  getDashboardUrlForRole,
  USER_ROLES,
  type UserRole
} from '@/lib/auth/roles';

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

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const result = await authenticateUser(data);

  if ('error' in result) {
    return {
      error: result.error,
      email: data.email,
      password: data.password
    };
  }

  await setSession(result.user);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: result.team, priceId });
  }

  if (redirectTo === 'book') {
    redirect('/book');
  }

  // Redirect to role-specific dashboard
  const roleDashboard = getDashboardUrlForRole(result.user.role as UserRole);
  redirect(roleDashboard);
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([
    USER_ROLES.END_USER,
    USER_ROLES.FUEL_DRIVER,
    USER_ROLES.FUEL_ATTENDANT,
    USER_ROLES.STORE,
    USER_ROLES.STORE_BACK_OFFICE,
    USER_ROLES.DISPATCHER,
    USER_ROLES.ADMIN,
    USER_ROLES.MAIN_ADMIN
  ]).optional().default(USER_ROLES.END_USER),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;
  try {
    const result = await registerUser({ email, password, inviteId });

    if ('error' in result) {
      return {
        error: result.error,
        email,
        password
      };
    }

    await setSession(result.user);

    const redirectTo = formData.get('redirect') as string | null;
    if (redirectTo === 'checkout') {
      const priceId = formData.get('priceId') as string;
      return createCheckoutSession({ team: result.team, priceId });
    }

    if (redirectTo === 'book') {
      redirect('/book');
    }

    // Redirect to role-specific dashboard
    const roleDashboard = getDashboardUrlForRole(result.user.role as UserRole);
    redirect(roleDashboard);
  } catch (error) {
    console.error('Sign-up failed:', error);
    return {
      error: 'We could not finish creating your account right now. Please try again.',
      email,
      password
    };
  }
});

const requestPasswordResetSchema = z.object({
  email: z.string().email().min(3).max(255)
});

export const requestPasswordReset = validatedAction(
  requestPasswordResetSchema,
  async (data) => {
    const [foundUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.email, data.email), isNull(users.deletedAt)))
      .limit(1);

    let resetUrl: string | undefined;

    if (foundUser) {
      const { token } = await issuePasswordResetToken(foundUser.id);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      resetUrl = `${baseUrl}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(foundUser.email, resetUrl);
      } catch (error) {
        console.error('Password reset email failed:', error);
      }
      console.info(`[password-reset] ${foundUser.email}: ${resetUrl}`);
    }

    return {
      success:
        'If an account with that email exists, we sent password reset instructions.',
      ...(process.env.NODE_ENV !== 'production' && resetUrl
        ? { resetUrl }
        : {})
    };
  }
);

const resetPasswordWithTokenSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100)
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'New password and confirmation password do not match.',
        path: ['confirmPassword']
      });
    }
  });

export const resetPasswordWithToken = validatedAction(
  resetPasswordWithTokenSchema,
  async (data) => {
    const activeToken = await getActivePasswordResetToken(data.token);

    if (!activeToken) {
      return {
        error: 'That reset link is invalid or has expired.',
        token: data.token
      };
    }

    const isSamePassword = await comparePasswords(
      data.newPassword,
      activeToken.user.passwordHash
    );

    if (isSamePassword) {
      return {
        error: 'Choose a password that is different from your current password.',
        token: data.token
      };
    }

    const newPasswordHash = await hashPassword(data.newPassword);
    const userWithTeam = await getUserWithTeam(activeToken.user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, activeToken.user.id)),
      consumePasswordResetToken(data.token),
      invalidatePasswordResetTokensForUser(activeToken.user.id),
      logActivity(userWithTeam?.teamId, activeToken.user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: 'Password reset successfully. You can sign in with your new password now.'
    };
  }
);

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    try {
      const result = await updatePasswordForUser(user, data);
      const userWithTeam = await getUserWithTeam(user.id);
      await logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD);
      return result;
    } catch (error) {
      return {
        ...data,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update password right now.'
      };
    }
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);

    try {
      await deleteAccountForUser(user, data);
      await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_ACCOUNT);
    } catch (error) {
      return {
        password: data.password,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to delete account right now.'
      };
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;

    if (!canManageTeam(user.role)) {
      return { error: 'Only admins can remove team members.' };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([
    USER_ROLES.END_USER,
    USER_ROLES.FUEL_DRIVER,
    USER_ROLES.FUEL_ATTENDANT,
    USER_ROLES.STORE,
    USER_ROLES.STORE_BACK_OFFICE,
    USER_ROLES.DISPATCHER,
    USER_ROLES.ADMIN,
    USER_ROLES.MAIN_ADMIN
  ])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;

    if (!canManageTeam(user.role)) {
      return { error: 'Only admins can invite team members.' };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  }
);
