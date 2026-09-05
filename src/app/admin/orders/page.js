'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OrderTracker } from '@/components/ui/OrderTracker';
import { STATUS_STEPS, STATUS_TRANSITIONS } from '@/config/products.config';
import { toast } from '@/components/ui/Toast';

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState(searchParams.get('search') || '');
  const [status, setStatus]   = useState(searchParams.get('status') || 'all');
  const [selected, setSelected] = useState(null); // expanded order
  const [updating, setUpdating] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useSocket({
    role: 'admin',
    onNewOrder:     () => load(),
    onOrderUpdated: (d) => setOrders(prev => prev.map(o => o.orderId === d.orderId ? { ...o, status: d.status } : o)),
  });

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ status, search }).toString();
    const res = await fetch(`/api/admin/orders?${q}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/update/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`✅ Order ${orderId} → ${newStatus}`);
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o));
      if (selected?.orderId === orderId) setSelected({ ...selected, status: newStatus });
      setAdminNote('');
    } catch (e) { toast.error(e.message); }
    finally { setUpdating(false); }
  };

  const STATUS_FILTER = ['all', 'placed', 'confirmed', 'packing', 'out', 'delivered', 'cancelled'];

  return (
    <div>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50 mb-5">Orders</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search order ID, name, mobile…"
          className="input flex-1" />
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTER.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                status === s ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-[#1A3D2B] text-[#4B7A5B] hover:text-green-300'
              }`}>
              {s === 'all' ? 'All' : STATUS_STEPS.find(x => x.key === s)?.label || s}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-[#4B7A5B] text-sm py-8 text-center">Loading…</div>}

      {!loading && orders.length === 0 && (
        <div className="text-center py-16 text-[#4B7A5B]">
          <div className="text-4xl mb-3">📭</div>
          <p>No orders found</p>
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.orderId} className={`card overflow-hidden transition-all ${selected?.orderId === order.orderId ? 'border-amber-500/30' : 'hover:border-[#2D5A3F]'}`}>
            {/* Summary row */}
            <button onClick={() => setSelected(selected?.orderId === order.orderId ? null : order)}
              className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50">{order.orderId}</span>
                  <StatusBadge status={order.status} />
                  {order.status === 'placed' && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full animate-pulse">ACTION NEEDED</span>}
                </div>
                <div className="text-xs text-[#4B7A5B] mt-1">
                  📱 {order.customerMobile} · {order.customerName} ·{' '}
                  {new Date(order.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                </div>
                <div className="text-xs text-[#4B7A5B] mt-0.5">
                  {order.items.map(i => i.emoji).slice(0, 6).join(' ')} · {order.items.length} items
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-leaf-400 text-lg">₹{order.total}</span>
                <span className="text-[#4B7A5B] text-sm">{selected?.orderId === order.orderId ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded detail */}
            {selected?.orderId === order.orderId && (
              <div className="border-t border-[#1A3D2B] p-4 space-y-4 animate-slide-up">
                {/* Tracker */}
                <OrderTracker status={order.status} />

                {/* Items */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-2">Items</div>
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-green-200">{item.emoji} {item.name} <span className="text-[#4B7A5B]">×{item.quantity}</span></span>
                        <span className="text-leaf-400">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#1A3D2B] pt-2 flex justify-between text-xs text-[#4B7A5B]">
                      <span>Subtotal</span><span>₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#4B7A5B]">
                      <span>Delivery</span><span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-50 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      <span>Total</span><span>₹{order.total}</span>
                    </div>
                  </div>
                </div>

                {order.deliveryAddress && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-1">Delivery Address</div>
                    <div className="text-sm text-green-200">{order.deliveryAddress}</div>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-1">Customer Note</div>
                    <div className="text-sm text-green-200">{order.notes}</div>
                  </div>
                )}

                {/* Status actions */}
                {STATUS_TRANSITIONS[order.status]?.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-2">Update Status</div>
                    <input value={adminNote} onChange={e => setAdminNote(e.target.value)}
                      placeholder="Optional note to customer…" className="input mb-2 text-xs" />
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_TRANSITIONS[order.status].map(next => {
                        const step = STATUS_STEPS.find(s => s.key === next);
                        return (
                          <button key={next}
                            disabled={updating}
                            onClick={() => updateStatus(order.orderId, next)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50"
                            style={{ background: step?.color + '20', color: step?.color, borderColor: step?.color + '44' }}>
                            {step?.icon} Mark as {step?.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="flex items-center gap-2 text-leaf-400 text-sm bg-leaf-500/10 px-4 py-2 rounded-xl border border-leaf-500/20">
                    ✅ Order completed successfully
                  </div>
                )}

                {/* Status history */}
                {order.statusHistory?.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-2">Timeline</div>
                    <div className="space-y-1.5">
                      {[...order.statusHistory].reverse().map((h, i) => {
                        const step = STATUS_STEPS.find(s => s.key === h.status);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span>{step?.icon}</span>
                            <span className="flex-1 text-green-300">{step?.label || h.status}</span>
                            <span className="text-[#4B7A5B]">{new Date(h.ts).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
