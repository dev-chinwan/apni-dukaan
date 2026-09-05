'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ deliveryFee: 39, freeDeliveryAbove: 499, supportMobile: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setForm({
            deliveryFee: d.settings.deliveryFee,
            freeDeliveryAbove: d.settings.freeDeliveryAbove,
            supportMobile: d.settings.supportMobile || '',
          });
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryFee: Number(form.deliveryFee),
          freeDeliveryAbove: Number(form.freeDeliveryAbove),
          supportMobile: form.supportMobile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Settings saved');
    } catch (e1) {
      toast.error(e1.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-[#4B7A5B] text-sm py-8 text-center">Loading...</div>;

  return (
    <div>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50 mb-5">Settings</h1>

      <form onSubmit={save} className="card p-4 space-y-4 max-w-lg">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] mb-1 block">Delivery Fee (INR)</label>
          <input type="number" min="0" value={form.deliveryFee} onChange={set('deliveryFee')} className="input" required />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] mb-1 block">Free Delivery Above (INR)</label>
          <input type="number" min="0" value={form.freeDeliveryAbove} onChange={set('freeDeliveryAbove')} className="input" required />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] mb-1 block">Support Mobile</label>
          <input value={form.supportMobile} onChange={set('supportMobile')} className="input" placeholder="9876543210" />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-[#061810] bg-amber-500 hover:bg-amber-400 disabled:opacity-50"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
