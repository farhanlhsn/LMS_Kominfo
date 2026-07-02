import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const authRoutes = ['/login', '/register', '/forgot-password'];
  const protectedRoutes = [
    '/dashboard',
    '/courses',
    '/learn',
    '/quiz',
    '/assignment',
    '/ai',
    '/leaderboard',
    '/certificates',
    '/profile',
    '/settings',
    '/notifications',
    '/admin',
  ];

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    const url = new URL('/login', request.url);
    // Remember redirect destination
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
