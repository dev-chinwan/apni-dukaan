import { NextResponse }  from 'next/server';
import { getCurrentUser, clearCookieString } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ user });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.set('Set-Cookie', clearCookieString());
  return res;
}
