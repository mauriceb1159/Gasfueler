'use server';

import { redirect } from 'next/navigation';

import { validatedAction } from '@/lib/auth/middleware';
import { setSession } from '@/lib/auth/session';
import { authenticateUser, registerUser, signInInputSchema, signUpInputSchema } from '@/lib/auth-service';
import { getPostAuthRedirectForRole, type UserRole } from '@/lib/auth/roles';
import { createCheckoutSession } from '@/lib/payments/stripe';

export const signIn = validatedAction(signInInputSchema, async (data, formData) => {
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

  redirect(getPostAuthRedirectForRole(result.user.role as UserRole, redirectTo));
});

export const signUp = validatedAction(signUpInputSchema, async (data, formData) => {
  const result = await registerUser(data);

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

  redirect(getPostAuthRedirectForRole(result.user.role as UserRole, redirectTo));
});
