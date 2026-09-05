import { NextResponse }  from 'next/server';
import { Orders, Users }  from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const [orderStats, customerCount] = await Promise.all([
    Orders.getStats(),
    Users.count('customer'),
  ]);

  return NextResponse.json({ stats: { ...orderStats, totalCustomers: customerCount } });
}
