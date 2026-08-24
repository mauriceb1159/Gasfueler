import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { comparePasswords, hashPassword } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users, type User } from '@/lib/db/schema';
import {
  createSupabaseAdminClient,
  createSupabaseAuthClient
} from '@/lib/supabase/server';

export const updatePasswordInputSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export async function updatePasswordForUser(
  user: User,
  input: z.infer<typeof updatePasswordInputSchema>
) {
  const { currentPassword, newPassword, confirmPassword } = input;

  if (user.supabaseAuthUserId) {
    const supabase = createSupabaseAuthClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (error) {
      throw new Error('Current password is incorrect.');
    }
  } else {
    const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect.');
    }
  }

  if (currentPassword === newPassword) {
    throw new Error('New password must be different from the current password.');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('New password and confirmation password do not match.');
  }

  if (user.supabaseAuthUserId) {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.supabaseAuthUserId,
      { password: newPassword }
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const newPasswordHash = await hashPassword(
    user.supabaseAuthUserId ? 'supabase-auth-managed-password' : newPassword
  );

  const [updatedUser] = await db
    .update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, user.id))
    .returning();

  if (!updatedUser) {
    throw new Error('Unable to update password right now.');
  }

  return { success: 'Password updated successfully.' as const };
}
