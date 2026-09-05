'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { OrderTracker } from '@/components/ui/OrderTracker';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { STATUS_STEPS } from '@/config/products.config';
import { toast } from '@/components/ui/Toast';

export default function OrderDetailPage() {
  const { orderId }       = useParams();
  const { user }          = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useSocket({
    role: 'customer', userId: user?.id,
    onOrderUpdate: (d) => {
      if (d.orderId !== orderId) return;
      setOrder(prev => prev ? { ...prev, status: d.status } : prev);
      const step = STATUS_STEPS.find(s => s.key === d.status);
      toast.info(`${step?.icon} ${step?.label}`);
    },
  });

  useEffect(() => {
    fetch(`/api/orders/track/${orderId}`)
      .then(r => r.json())
      .then(d => setOrder(d.order || null))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-[#4B7A5B]">Loading…</div>;
  if (!order)  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">❓</div>
      <p className="text-[#4B7A5B]">Order not found</p>
      <Link href="/customer/orders" className="text-leaf-400 text-sm mt-2 block">← Back to orders</Link>
    </div>
  );

  const curStep = STATUS_STEPS.find(s => s.key === order.status);

  return (
    <div className="pt-4 max-w-lg mx-auto">
      <Link href="/customer/orders" className="text-[#4B7A5B] text-sm hover:text-green-300 transition-colors">← All Orders</Link>

      <div className="flex items-center justify-between mt-3 mb-5">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-xl font-bold text-green-50">{order.orderId}</h1>
          <p className="text-xs text-[#4B7A5B] mt-0.5">
            {new Date(order.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-xl font-bold text-leaf-400">₹{order.total}</div>
      </div>

      {/* Status tracker */}
      <div className="card p-5 mb-4">
        <OrderTracker status={order.status} />
      </div>

      {/* Live status card */}
      <div className="card p-4 flex items-center gap-4 mb-4" style={{ borderColor: curStep?.color + '44' }}>
        <span className="text-3xl">{curStep?.icon}</span>
        <div className="flex-1">
          <div className="font-semibold text-green-100">{curStep?.label}</div>
          <div className="text-xs text-[#4B7A5B] mt-0.5">
            {order.status === 'placed'    && 'Waiting for admin to confirm your order…'}
            {order.status === 'confirmed' && 'Great! Your order is confirmed.'}
            {order.status === 'packing'   && 'Your items are being carefully packed.'}
            {order.status === 'out'       && 'Your delivery partner is on the way! 🛵'}
            {order.status === 'delivered' && 'Order delivered! Enjoy your groceries 🎉'}
            {order.status === 'cancelled' && 'This order was cancelled.'}
          </div>
          {order.adminNote && <div className="text-xs text-amber-400 mt-1">Note: {order.adminNote}</div>}
        </div>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: curStep?.color }} />
      </div>

      {/* Status history */}
      {order.statusHistory?.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-3">Timeline</h3>
          <div className="space-y-2">
            {[...order.statusHistory].reverse().map((h, i) => {
              const step = STATUS_STEPS.find(s => s.key === h.status);
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span>{step?.icon}</span>
                  <span className="flex-1 text-green-200">{step?.label || h.status}</span>
                  <span className="text-xs text-[#4B7A5B]">
                    {new Date(h.ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card p-4 mb-4">
        <h3 className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-3">Items Ordered</h3>
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[#1A3D2B] last:border-0 text-sm">
            <span className="text-green-200">{item.emoji} {item.name} <span className="text-[#4B7A5B]">×{item.quantity}</span></span>
            <span className="text-leaf-400 font-medium">₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 text-xs text-[#4B7A5B]">
          <span>Subtotal</span><span>₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-xs text-[#4B7A5B] mt-1">
          <span>Delivery</span><span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
        </div>
        <div className="flex justify-between font-bold text-green-50 mt-2 pt-2 border-t border-[#1A3D2B]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          <span>Total</span><span>₹{order.total}</span>
        </div>
      </div>

      {order.deliveryAddress && (
        <div className="card p-4 text-sm">
          <div className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-1">Delivery Address</div>
          <div className="text-green-200">{order.deliveryAddress}</div>
        </div>
      )}
    </div>
  );
}
