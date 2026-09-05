import { NextResponse }  from 'next/server';
import { Orders }         from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { STATUS_TRANSITIONS } from '@/config/products.config';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const routeParams = await params;
  const orderId = routeParams?.orderId;
  if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

  const { status, adminNote } = await req.json();
  const order = await Orders.findById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const allowed = STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status))
    return NextResponse.json({ error: `Cannot move from "${order.status}" to "${status}"` }, { status: 400 });

  const updated = await Orders.updateStatus(orderId, status, adminNote || '');

  // 🔌 Notify the specific customer
  const io = global._freshcartIO;
  if (io) {
    io.to(`customer:${order.customerId}`).emit('order_status_update', {
      orderId: order.orderId,
      status,
      adminNote: adminNote || '',
      updatedAt: updated.updatedAt,
    });
    // Also notify all admins so dashboards sync
    io.to('admins').emit('order_updated', {
      orderId: order.orderId,
      status,
      updatedAt: updated.updatedAt,
    });
  }

  return NextResponse.json({ success: true, order: updated });
}
