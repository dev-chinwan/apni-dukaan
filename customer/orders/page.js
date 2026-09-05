'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { toast } from '@/components/ui/Toast';

export default function OrdersPage() {
  const { user }          = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useSocket({
    role: 'customer', userId: user?.id,
    onOrderUpdate: (d) => {
      setOrders(prev => prev.map(o => o.orderId === d.orderId ? { ...o, status: d.status } : o));
      toast.info(`📦 Order ${d.orderId} → ${d.status}`);
    },
  });

  useEffect(() => {
    fetch('/api/orders').then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-[#4B7A5B]">Loading…</div>;

  if (!orders.length) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">📋</div>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50 mb-2">No orders yet</h2>
      <p className="text-[#4B7A5B] mb-6">Your order history will appear here</p>
      <Link href="/customer" className="px-8 py-3 bg-leaf-500 text-[#061810] font-bold rounded-xl">Start Shopping</Link>
    </div>
  );

  return (
    <div className="pt-4 max-w-lg mx-auto">
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50 mb-4">
        Your Orders <span className="text-[#4B7A5B] text-base font-normal">({orders.length})</span>
      </h1>
      <div className="space-y-3">
        {orders.map(o => (
          <Link key={o.orderId} href={`/customer/orders/${o.orderId}`}>
            <div className="card p-4 hover:border-leaf-500/20 transition-all cursor-pointer mb-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50">{o.orderId}</div>
                  <div className="text-xs text-[#4B7A5B] mt-0.5">
                    {new Date(o.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#4B7A5B]">
                  {o.items.map(i => i.emoji).slice(0,5).join(' ')}
                  {o.items.length > 5 && ` +${o.items.length-5}`}
                  <span className="ml-2 text-[#2D5A3F]">{o.items.length} items</span>
                </span>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-leaf-400">₹{o.total}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
