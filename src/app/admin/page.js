'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { toast } from '@/components/ui/Toast';

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [pulse, setPulse]   = useState(false);

  const isCompleted = (status) => ['delivered', 'cancelled'].includes(status);

  useSocket({
    role: 'admin',
    onNewOrder: (d) => {
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
      setNotifs(prev => [{ ...d, ts: Date.now() }, ...prev].slice(0, 10));
      setActiveOrders((prev) => {
        const existing = prev.find((o) => o.orderId === d.orderId);
        if (existing) return prev;
        return [{
          orderId: d.orderId,
          customerName: d.customerName,
          customerMobile: d.customerMobile,
          itemCount: d.itemCount,
          total: d.total,
          status: 'placed',
          createdAt: d.placedAt || new Date().toISOString(),
        }, ...prev].slice(0, 10);
      });
      toast.success(`🔌 New order ${d.orderId} — ₹${d.total}`);
      loadStats();
    },
    onOrderUpdated: (d) => {
      setActiveOrders((prev) => prev
        .map((o) => o.orderId === d.orderId ? { ...o, status: d.status } : o)
        .filter((o) => !isCompleted(o.status)));
      loadStats();
    },
  });

  const loadStats = async () => {
    const [sRes, catalogRes, settingsRes, ordersRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/catalog'),
      fetch('/api/admin/settings'),
      fetch('/api/admin/orders?status=all&limit=50'),
    ]);
    const { stats: s } = await sRes.json();
    const { products: p } = await catalogRes.json();
    const { settings: set } = await settingsRes.json();
    const { orders } = await ordersRes.json();

    setStats(s);
    setProducts(p || []);
    setSettings(set || null);
    const openOrders = (orders || [])
      .filter((o) => !isCompleted(o.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((o) => ({
        orderId: o.orderId,
        customerName: o.customerName,
        customerMobile: o.customerMobile,
        itemCount: o.items?.length || 0,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      }));
    setActiveOrders(openOrders);
  };

  useEffect(() => { loadStats(); }, []);

  const statCards = stats ? [
    { label: "Today's Orders",   value: stats.todayCount,      icon: '📦', color: '#22C55E' },
    { label: "Today's Revenue",  value: `₹${stats.todayRevenue}`, icon: '💰', color: '#F59E0B' },
    { label: 'Pending',          value: stats.pending,          icon: '⏳', color: '#F97316' },
    { label: 'Total Customers',  value: stats.totalCustomers,   icon: '👥', color: '#3B82F6' },
    { label: 'Total Orders',     value: stats.total,            icon: '📋', color: '#8B5CF6' },
    { label: 'Total Revenue',    value: `₹${stats.totalRevenue}`, icon: '📈', color: '#22C55E' },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50">Dukaan Dashboard</h1>
          <p className="text-xs text-[#4B7A5B] mt-0.5">Local freshness, delivered with trust.</p>
          <p className="text-sm text-[#4B7A5B] mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
        {/* Socket status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
          pulse ? 'bg-leaf-500/20 border-leaf-500/50 text-leaf-400' : 'bg-[#0A2318] border-[#1A3D2B] text-[#4B7A5B]'
        }`}>
          <span className={`w-2 h-2 rounded-full ${pulse ? 'bg-leaf-500 animate-pulse' : 'bg-leaf-500'}`} style={{ animation: 'socketPulse 2s ease-out infinite' }} />
          {pulse ? 'New order!' : 'Dukaan Live'}
        </div>
      </div>

      {/* Stats grid */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-[10px] text-[#4B7A5B]">{s.label}</span>
              </div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }} className="text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse" />)}
        </div>
      )}

      {/* Status breakdown */}
      {stats?.statusBreakdown && (
        <div className="card p-4 mb-6">
          <h2 className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-3">Orders by Status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <Link key={status} href={`/admin/orders?status=${status}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0D2B1F] rounded-xl border border-[#1A3D2B] hover:border-leaf-500/20 transition-all">
                <StatusBadge status={status} />
                <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Groceries + settings summary */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase tracking-widest text-[#4B7A5B]">Groceries</h2>
            <Link href="/admin/groceries" className="text-xs text-amber-400">Manage →</Link>
          </div>
          <div className="text-sm text-green-100">
            Total Products: <span className="text-leaf-400 font-bold">{products.length}</span>
          </div>
          <div className="text-sm text-green-100 mt-1">
            In Stock: <span className="text-leaf-400 font-bold">{products.filter(p => p.inStock).length}</span>
          </div>
          <div className="text-xs text-[#4B7A5B] mt-3">
            {products.slice(0, 6).map((p) => p.emoji).join(' ')}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase tracking-widest text-[#4B7A5B]">Settings</h2>
            <Link href="/admin/settings" className="text-xs text-amber-400">Manage →</Link>
          </div>
          <div className="text-sm text-green-100">
            Delivery Fee: <span className="text-leaf-400 font-bold">₹{settings?.delivery?.fee ?? '--'}</span>
          </div>
          <div className="text-sm text-green-100 mt-1">
            Free Above: <span className="text-leaf-400 font-bold">₹{settings?.delivery?.freeAbove ?? '--'}</span>
          </div>
          {settings?.supportMobile && (
            <div className="text-xs text-[#4B7A5B] mt-3">Support: +91 {settings.supportMobile}</div>
          )}
        </div>
      </div>

      {/* Live notifications */}
      {activeOrders.length > 0 && (
        <div className="card p-4 mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest text-red-400">Action Required</h2>
            <Link href="/admin/orders?status=all" className="text-xs text-amber-400">Open Orders Queue →</Link>
          </div>
          <div className="space-y-2">
            {activeOrders.map((o) => (
              <div key={o.orderId} className="rounded-xl border border-red-500/40 bg-[#0D2B1F] px-3 py-2 animate-pulse">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50 text-sm">{o.orderId}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-xs text-[#4B7A5B] mt-0.5 truncate">{o.customerName} · {o.itemCount} items · ₹{o.total}</div>
                  </div>
                  <Link
                    href={`/admin/orders?search=${o.orderId}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 whitespace-nowrap"
                  >
                    Process Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifs.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-xs uppercase tracking-widest text-[#4B7A5B] mb-3">🔔 Live Notifications</h2>
          <div className="space-y-2">
            {notifs.map((n, i) => (
              <Link key={i} href={`/admin/orders?search=${n.orderId}`}
                className="flex items-center justify-between py-2 border-b border-[#1A3D2B] last:border-0 hover:text-leaf-400 transition-colors">
                <div>
                  <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50 text-sm">{n.orderId}</span>
                  <span className="text-xs text-[#4B7A5B] ml-2">{n.customerName} · {n.itemCount} items</span>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-leaf-400 text-sm">₹{n.total}</div>
                  <div className="text-[10px] text-[#4B7A5B]">{new Date(n.ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href="/admin/orders" className="flex items-center justify-center gap-2 w-full py-3 card hover:border-amber-500/30 text-amber-400 font-medium transition-all text-sm">
        View All Orders →
      </Link>
    </div>
  );
}
