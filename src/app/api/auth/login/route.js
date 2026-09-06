import { NextResponse } from 'next/server';
import { Users }         from '@/lib/db';
import { signToken, buildCookieString } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req) {
  try {
    const { name, mobile, adminMode } = await req.json();

    if (!mobile)
      return NextResponse.json({ error: 'Mobile is required' }, { status: 400 });

    if (!/^[6-9]\d{9}$/.test(mobile))
      return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });

    let user = await Users.findByMobile(mobile);
    const cleanName = String(name || '').trim();
    const nowIso = new Date().toISOString();

    if (adminMode) {
      if (user && user.role !== 'admin') {
        return NextResponse.json({ error: 'This mobile is already registered as customer' }, { status: 409 });
      }

      if (!user) {
        if (!cleanName) {
          return NextResponse.json({ error: 'Name is required for first-time login' }, { status: 400 });
        }
        user = await Users.create({
          id: randomUUID(),
          name: cleanName,
          mobile,
          role: 'admin',
          lastLoginAt: nowIso,
        });
      } else {
        const updates = { lastLoginAt: nowIso };
        if (cleanName && user.name !== cleanName) updates.name = cleanName;
        user = await Users.update(user.id, updates);
      }
    } else {
      if (!user) {
        if (!cleanName) {
          return NextResponse.json({ error: 'Name is required for first-time login' }, { status: 400 });
        }
        user = await Users.create({
          id: randomUUID(),
          name: cleanName,
          mobile,
          role: 'customer',
          lastLoginAt: nowIso,
        });
      } else if (user.role === 'customer') {
        const updates = { lastLoginAt: nowIso };
        if (cleanName && user.name !== cleanName) updates.name = cleanName;
        user = await Users.update(user.id, updates);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unable to login, try again' }, { status: 500 });
    }

    const token = signToken({ id: user.id, name: user.name, mobile: user.mobile, role: user.role });
    const safeUser = { id: user.id, name: user.name, mobile: user.mobile, role: user.role };

    const res = NextResponse.json({ success: true, user: safeUser });
    res.headers.set('Set-Cookie', buildCookieString(token));
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
