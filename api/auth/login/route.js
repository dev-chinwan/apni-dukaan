import { NextResponse } from 'next/server';
import { Users }         from '@/lib/db';
import { signToken, buildCookieString } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req) {
  try {
    const { name, mobile, adminMode } = await req.json();

    if (!name?.trim() || !mobile)
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });

    if (!/^[6-9]\d{9}$/.test(mobile))
      return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });

    let user = await Users.findByMobile(mobile);

    if (adminMode) {
      if (user && user.role !== 'admin') {
        return NextResponse.json({ error: 'This mobile is already registered as customer' }, { status: 409 });
      }

      if (!user) {
        user = await Users.create({
          id: randomUUID(),
          name: name.trim(),
          mobile,
          role: 'admin',
        });
      } else if (user.name !== name.trim()) {
        user = await Users.update(user.id, { name: name.trim() });
      }
    } else {
      if (!user) {
        user = await Users.create({
          id: randomUUID(),
          name: name.trim(),
          mobile,
          role: 'customer',
        });
      } else if (user.role === 'customer' && user.name !== name.trim()) {
        user = await Users.update(user.id, { name: name.trim() });
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
