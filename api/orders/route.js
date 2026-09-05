import { NextResponse }     from 'next/server';
import { Orders }            from '@/lib/db';
import { getCurrentUser }    from '@/lib/auth';
import { generateOrderId }   from '@/lib/orderId';
import { AppSettings }       from '@/lib/catalog';

// GET /api/orders — customer's own orders
export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await Orders.findByCustomer(user.id);
  return NextResponse.json({ orders });
}

// POST /api/orders — place new order
export async function POST(req) {
  const user = await getCurrentUser(req);
  if (!user)              return NextResponse.json({ error: 'Unauthorized' },               { status: 401 });
  if (user.role !== 'customer') return NextResponse.json({ error: 'Customers only' }, { status: 403 });

  const { items, deliveryAddress, notes } = await req.json();
  if (!items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });

  const settings = await AppSettings.get();
  const deliveryConfig = settings.delivery;
  const subtotal    = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= deliveryConfig.freeAbove ? 0 : deliveryConfig.fee;
  const total       = subtotal + deliveryFee;

  const order = await Orders.create({
    orderId:         generateOrderId(),
    customerId:      user.id,
    customerName:    user.name,
    customerMobile:  user.mobile,
    items,
    subtotal,
    deliveryFee,
    total,
    status:          'placed',
    deliveryAddress: deliveryAddress || '',
    notes:           notes || '',
    adminNote:       '',
  });

  // 🔌 Real-time push to all admins via Socket.IO
  const io = global._freshcartIO;
  if (io) {
    io.to('admins').emit('new_order', {
      orderId:        order.orderId,
      customerName:   user.name,
      customerMobile: user.mobile,
      itemCount:      items.length,
      total,
      placedAt:       order.createdAt,
    });
  }

  return NextResponse.json({ success: true, order }, { status: 201 });
}
