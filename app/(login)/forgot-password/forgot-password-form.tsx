'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { requestPasswordReset } from '../actions';
import { ActionState } from '@/lib/auth/middleware';

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    {}
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h1>
        <p className="mt-3 text-center text-sm text-gray-600">
          Enter your account email and we will generate a reset link for you.
        </p>

        <form className="mt-8 space-y-6" action={formAction}>
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                className="w-full rounded-full border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
          {state.success ? (
            <div className="space-y-3 rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p>{state.success}</p>
              {state.resetUrl ? (
                <Link className="font-medium text-green-900 underline" href={state.resetUrl}>
                  Open the local reset link
                </Link>
              ) : null}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full rounded-full bg-orange-600 text-white hover:bg-orange-700"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/sign-in" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
