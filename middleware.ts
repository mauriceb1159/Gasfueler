import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRequestGuard } from '@/lib/auth/request-guard';

const corsAllowMethods = 'GET,POST,PATCH,DELETE,OPTIONS';
const corsAllowHeaders = 'authorization,content-type,accept,x-requested-with';

function isAllowedCorsOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');

  if (!isAllowedCorsOrigin(origin)) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin!);
  response.headers.set('Access-Control-Allow-Methods', corsAllowMethods);
  response.headers.set('Access-Control-Allow-Headers', corsAllowHeaders);
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.append('Vary', 'Origin');

  return response;
}

function handleApiCors(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
  }

  return applyCorsHeaders(NextResponse.next(), request);
}

// Keep the legacy filename because this Next canary still requires it in dev mode.
// The routing logic itself now lives in a shared module so migrating back to
// `proxy.ts` later is just an entrypoint swap instead of another refactor.
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return handleApiCors(request);
  }

  return handleRequestGuard(request);
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
