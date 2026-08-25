import './globals.css';
import type { Metadata, Viewport } from 'next';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: 'GasBite',
  description: 'GasBite runs on Next.js, Postgres, and Stripe.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, team } = await getLayoutFallbacks();

  return (
    <html
      lang="en"
      className="bg-white dark:bg-gray-950 text-black dark:text-white"
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              '/api/user': user,
              '/api/team': team
            }
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}

async function getLayoutFallbacks() {
  try {
    const user = await getUser();

    if (!user) {
      return { user: null, team: null };
    }

    try {
      const team = await getTeamForUser();
      return { user, team };
    } catch (error) {
      if (isDynamicServerUsageError(error)) {
        throw error;
      }

      console.error('Failed to preload team for layout:', error);
      return { user, team: null };
    }
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }

    console.error('Failed to preload user for layout:', error);
    return { user: null, team: null };
  }
}

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    error.digest === 'DYNAMIC_SERVER_USAGE'
  );
}
