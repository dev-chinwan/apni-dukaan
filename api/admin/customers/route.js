import { NextResponse }  from 'next/server';
import { Users, Orders }  from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const customers = await Users.findAll('customer');

  // Enrich with order counts
  const enriched = await Promise.all(
    customers.map(async (c) => {
      const orders = await Orders.findByCustomer(c.id, 999);
      return {
        id:         c.id,
        name:       c.name,
        mobile:     c.mobile,
        createdAt:  c.createdAt,
        orderCount: orders.length,
        totalSpent: orders.reduce((s, o) => s + o.total, 0),
        lastOrder:  orders[0]?.createdAt || null,
      };
    })
  );

  enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return NextResponse.json({ customers: enriched });
}
