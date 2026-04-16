import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { comparePasswords } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers, users, type User } from '@/lib/db/schema';

export const deleteAccountInputSchema = z.object({
  password: z.string().min(8).max(100)
});

export async function deleteAccountForUser(
  user: User,
  input: z.infer<typeof deleteAccountInputSchema>
) {
  const isPasswordValid = await comparePasswords(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Incorrect password. Account deletion failed.');
  }

  const userWithTeam = await getUserWithTeam(user.id);

  await db
    .update(users)
    .set({
      deletedAt: sql`CURRENT_TIMESTAMP`,
      email: sql`CONCAT(email, '-', id, '-deleted')`
    })
    .where(eq(users.id, user.id));

  if (userWithTeam?.teamId) {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, userWithTeam.teamId)));
  }

  return { success: 'Account deleted successfully.' as const };
}
