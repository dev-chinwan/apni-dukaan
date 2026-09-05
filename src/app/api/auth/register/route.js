import { NextResponse } from 'next/server';
import { Users }         from '@/lib/db';
import { signToken, buildCookieString } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req) {
  try {
    const { name, mobile, role, adminCode } = await req.json();

    if (!name?.trim() || !mobile)
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });

    if (!/^[6-9]\d{9}$/.test(mobile))
      return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });

    if (role === 'admin' && adminCode !== process.env.ADMIN_SECRET_CODE)
      return NextResponse.json({ error: 'Invalid admin secret code' }, { status: 403 });

    const existing = await Users.findByMobile(mobile);
    if (existing && existing.role !== role)
      return NextResponse.json({ error: 'Mobile already registered with a different role' }, { status: 409 });

    const user = existing || await Users.create({
      id: randomUUID(),
      name: name.trim(),
      mobile,
      role: role === 'admin' ? 'admin' : 'customer',
    });

    if (existing && existing.name !== name.trim()) {
      await Users.update(existing.id, { name: name.trim() });
      user.name = name.trim();
    }

    const token = signToken({ id: user.id, name: user.name, mobile: user.mobile, role: user.role });
    const safeUser = { id: user.id, name: user.name, mobile: user.mobile, role: user.role };

    const res = NextResponse.json({ success: true, user: safeUser }, { status: 201 });
    res.headers.set('Set-Cookie', buildCookieString(token));
    return res;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
