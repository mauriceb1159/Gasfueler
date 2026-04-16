import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { users, type User } from '@/lib/db/schema';

export const updateUserProfileInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  email: z.string().trim().email('Invalid email address.').max(255)
});

export async function updateUserProfileForUser(
  user: User,
  input: z.infer<typeof updateUserProfileInputSchema>
) {
  const normalizedEmail = input.email.toLowerCase();

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser[0] && existingUser[0].id !== user.id) {
    throw new Error('An account with this email already exists.');
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      name: input.name,
      email: normalizedEmail
    })
    .where(eq(users.id, user.id))
    .returning();

  if (!updatedUser) {
    throw new Error('Unable to update account right now.');
  }

  return updatedUser;
}
