import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { comparePasswords, hashPassword } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users, type User } from '@/lib/db/schema';

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

  const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Current password is incorrect.');
  }

  if (currentPassword === newPassword) {
    throw new Error('New password must be different from the current password.');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('New password and confirmation password do not match.');
  }

  const newPasswordHash = await hashPassword(newPassword);

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
