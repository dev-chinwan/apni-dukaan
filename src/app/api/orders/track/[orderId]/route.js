import { NextResponse }  from 'next/server';
import { Orders }         from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req, { params }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const order = await Orders.findById(params.orderId);
  if (!order)  return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Customer can only see own orders; admin can see all
  if (user.role === 'customer' && order.customerId !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ order });
}
