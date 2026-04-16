import type { NextRequest } from 'next/server';
import { handleRequestGuard } from '@/lib/auth/request-guard';

// Keep the legacy filename because this Next canary still requires it in dev mode.
// The routing logic itself now lives in a shared module so migrating back to
// `proxy.ts` later is just an entrypoint swap instead of another refactor.
export async function middleware(request: NextRequest) {
  return handleRequestGuard(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
