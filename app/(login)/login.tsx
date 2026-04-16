'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import {
  USER_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type UserRole
} from '@/lib/auth/roles';

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLES.END_USER);
  const availableRoles = Object.values(USER_ROLES) as UserRole[];

  const authSwitchHref = buildAuthSwitchHref({
    mode,
    redirect,
    priceId,
    inviteId
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
            ...(mode === 'signup' && { role }),
            inviteId: inviteId || undefined
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

      if (redirect === 'book') {
        router.push('/book');
        router.refresh();
        return;
      }

      if (redirect) {
        router.push(`/${redirect}`);
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

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'signin'
            ? 'Sign in to your account'
            : 'Create your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
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

          {mode === 'signup' && (
            <div>
              <Label className="block text-sm font-medium text-gray-700">
                Account Type
              </Label>
              <div className="mt-3 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {availableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-3 text-left rounded-lg border-2 transition ${
                      role === r
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 bg-white hover:border-orange-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{ROLE_LABELS[r]}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {ROLE_DESCRIPTIONS[r]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                'Sign up'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                {mode === 'signin'
                  ? 'New to our platform?'
                  : 'Already have an account?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={authSwitchHref}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {mode === 'signin'
                ? 'Create an account'
                : 'Sign in to existing account'}
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
