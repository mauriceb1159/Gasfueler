import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = '/dashboard';

export function handleRequestGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}
