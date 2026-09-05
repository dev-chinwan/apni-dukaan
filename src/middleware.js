import { NextResponse } from 'next/server';

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    // JWT uses base64url; convert to base64 for atob in edge runtime.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('fc_token')?.value;
  const user  = token ? decodeJwtPayload(token) : null;

  if (pathname === '/') {
    if (!user) return NextResponse.redirect(new URL('/login', req.url));
    return NextResponse.redirect(new URL(user.role === 'admin' ? '/admin' : '/customer', req.url));
  }

  if (pathname === '/login') {
    if (user) return NextResponse.redirect(new URL(user.role === 'admin' ? '/admin' : '/customer', req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/customer')) {
    if (!user) return NextResponse.redirect(new URL('/login', req.url));
    if (user.role !== 'customer') return NextResponse.redirect(new URL('/admin', req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login?admin=1', req.url));
    if (user.role !== 'admin') return NextResponse.redirect(new URL('/customer', req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/customer/:path*', '/admin/:path*'],
};
