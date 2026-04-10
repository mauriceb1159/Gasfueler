import Link from 'next/link';
import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Reset link missing</h1>
          <p className="mt-3 text-sm text-gray-600">
            Request a new password reset link and try again.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex rounded-full bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
