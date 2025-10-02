import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from './lib/utils';
export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value; // Assume backend sets 'auth-token' cookie
  const isAuthenticated = !!token;

  const protectedPaths = ['/chat', '/profile'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // Temporarily disabled for testing
  if (isProtectedPath && !isAuthenticated) {
    logger.log("Middleware: Unauthenticated access to protected route, redirecting to /login");
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/profile/:path*'],
};
