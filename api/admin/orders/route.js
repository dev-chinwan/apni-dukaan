import { NextResponse }  from 'next/server';
import { Orders }         from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get('status') || 'all';
  const search  = searchParams.get('search') || '';
  const page    = parseInt(searchParams.get('page') || '1');
  const limit   = parseInt(searchParams.get('limit') || '50');

  const { rows, total } = await Orders.findAll({ status, search, page, limit });
  return NextResponse.json({ orders: rows, total, page });
}
