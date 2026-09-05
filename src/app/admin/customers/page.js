'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    fetch('/api/admin/customers')
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []))
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50">
          Customers <span className="text-[#4B7A5B] font-normal text-base">({customers.length})</span>
        </h1>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or mobile…" className="input mb-4" />

      {loading && <div className="text-[#4B7A5B] text-sm py-8 text-center">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-[#4B7A5B]">
          <div className="text-4xl mb-3">👥</div>
          <p>No customers found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="card p-4 hover:border-[#2D5A3F] transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A3D2B] flex items-center justify-center text-lg font-bold text-leaf-400">
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-green-100">{c.name}</div>
                  <div className="text-xs text-[#4B7A5B] mt-0.5">📱 +91 {c.mobile}</div>
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-leaf-400">₹{c.totalSpent}</div>
                <div className="text-xs text-[#4B7A5B]">{c.orderCount} orders</div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-[#4B7A5B]">
              <span>Joined {new Date(c.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
              {c.lastOrder && (
                <span>Last order {new Date(c.lastOrder).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
