import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { passwordResetTokens } from '@/lib/db/schema';

const RESET_WINDOW_MS = 60 * 60 * 1000;

export function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issuePasswordResetToken(userId: number) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_WINDOW_MS);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt
  });

  return {
    token,
    expiresAt
  };
}

export async function getActivePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);

  return db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
    with: {
      user: true
    }
  });
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.tokenHash, tokenHash));
}

export async function invalidatePasswordResetTokensForUser(userId: number) {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
}
