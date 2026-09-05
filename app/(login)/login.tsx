'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getPostAuthRedirectForRole, type UserRole } from '@/lib/auth/roles';

export function Login({
  mode = 'signin',
  redirect,
  priceId,
  inviteId
}: {
  mode?: 'signin' | 'signup';
  redirect?: string | null;
  priceId?: string | null;
  inviteId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const effectiveRedirect = redirect ?? searchParams.get('redirect');
  const effectivePriceId = priceId ?? searchParams.get('priceId');
  const effectiveInviteId = inviteId ?? searchParams.get('inviteId');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(searchParams.get('error') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const authSwitchHref = buildAuthSwitchHref({
    mode,
    redirect: effectiveRedirect,
    priceId: effectivePriceId,
    inviteId: effectiveInviteId
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    try {
      const response = await fetch(
        mode === 'signin' ? '/api/auth/sign-in' : '/api/auth/sign-up',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password,
            inviteId: effectiveInviteId || undefined
          })
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          (payload && typeof payload === 'object' && 'error' in payload && payload.error) ||
            `Unable to continue right now. (${response.status})`
        );
        return;
      }

      const userRole =
        payload &&
        typeof payload === 'object' &&
        'user' in payload &&
        payload.user &&
        typeof payload.user === 'object' &&
        'role' in payload.user &&
        typeof payload.user.role === 'string'
          ? (payload.user.role as UserRole)
          : null;

      if (userRole) {
        router.push(getPostAuthRedirectForRole(userRole, effectiveRedirect));
        router.refresh();
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to continue right now.');
    } finally {
      setPending(false);
    }
  }

  function handleGoogleSignIn() {
    const params = new URLSearchParams();

    if (effectiveRedirect) {
      params.set('redirect', effectiveRedirect);
    }

    if (effectivePriceId) {
      params.set('priceId', effectivePriceId);
    }

    if (effectiveInviteId) {
      params.set('inviteId', effectiveInviteId);
    }

    const query = params.toString();
    window.location.href = query
      ? `/api/auth/oauth/google?${query}`
      : '/api/auth/oauth/google';
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/logos/gasbite-logo-header-transparent.png"
            alt="GasBite"
            width={156}
            height={64}
            priority
            className="h-16 w-auto object-contain"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'signin'
            ? 'Sign in to book and manage service'
            : effectiveInviteId
              ? 'Create your account'
              : 'Create your customer account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {mode === 'signin'
            ? 'Sign in to book fuel, manage orders, and track your service.'
            : effectiveInviteId
              ? 'Finish setting up your invited account.'
              : 'Sign up to book fuel faster, manage requests, and track your service.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="redirect" value={effectiveRedirect || ''} />
          <input type="hidden" name="priceId" value={effectivePriceId || ''} />
          <input type="hidden" name="inviteId" value={effectiveInviteId || ''} />
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={50}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
            {mode === 'signin' ? (
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Forgot password?
                </Link>
              </div>
            ) : null}
          </div>

          {mode === 'signup' && !effectiveInviteId ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              New public sign-ups create a customer account for booking fuel and tracking service.
            </div>
          ) : null}
          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                effectiveInviteId ? 'Create account' : 'Create customer account'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            onClick={handleGoogleSignIn}
            disabled={pending}
          >
            Continue with Google
          </Button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                {mode === 'signin'
                  ? 'Ready to book fuel faster?'
                  : 'Already booking with us?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={authSwitchHref}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {mode === 'signin'
                ? 'Create customer account'
                : 'Sign in to continue booking'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAuthSwitchHref({
  mode,
  redirect,
  priceId,
  inviteId
}: {
  mode: 'signin' | 'signup';
  redirect?: string | null;
  priceId?: string | null;
  inviteId?: string | null;
}) {
  const pathname = mode === 'signin' ? '/sign-up' : '/sign-in';
  const params = new URLSearchParams();

  if (redirect) {
    params.set('redirect', redirect);
  }

  if (priceId) {
    params.set('priceId', priceId);
  }

  if (inviteId) {
    params.set('inviteId', inviteId);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}
