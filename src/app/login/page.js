'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const params = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm] = useState({ name: '', mobile: '' });

  useEffect(() => {
    if (params.get('admin') === '1') setIsAdmin(true);
  }, [params]);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          mobile: form.mobile,
          adminMode: isAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Something went wrong');
      window.location.href = data.user.role === 'admin' ? '/admin' : '/customer';
    } catch { setError('Network error. Check your connection.'); }
    finally  { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0D2B1F] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥦</div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-3xl font-bold text-green-50">FreshCart</h1>
          <p className="text-[#4B7A5B] text-sm mt-1">Fresh groceries · Fast delivery</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] mb-1 block">Full Name (first time only)</label>
            <input value={form.name} onChange={set('name')} placeholder="Ravi Kumar" className="input" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] mb-1 block">Mobile Number</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-[#0A2318] border border-[#1A3D2B] rounded-xl text-[#4B7A5B] text-sm">+91</span>
              <input value={form.mobile} onChange={set('mobile')} placeholder="9876543210"
                maxLength={10} pattern="[6-9][0-9]{9}" type="tel"
                className="input flex-1" required />
            </div>
          </div>

          {/* <button
            type="button"
            onClick={() => { setIsAdmin(v => !v); setError(''); }}
            className={`w-full py-2 rounded-xl text-sm font-semibold border transition-all ${
              isAdmin
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-[#1A3D2B] text-[#4B7A5B] hover:text-green-300'
            }`}
          >
            {isAdmin ? 'Admin Login Mode: ON' : 'Switch to Admin Login'}
          </button> */}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm animate-slide-up">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className={`w-full py-3 px-6 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 mt-1 text-[#061810]
              ${isAdmin ? 'bg-amber-500 hover:bg-amber-400' : 'bg-leaf-500 hover:bg-leaf-600'}`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {loading ? '…' : `Continue as ${isAdmin ? 'Admin ⚙️' : 'Customer 🛒'}`}
          </button>
        </form>

        {/* {isAdmin && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500">
            Admin mode is ON. You will continue to the admin dashboard after login.
          </div>
        )} */}

        <p className="text-center text-[#2D5A3F] text-xs mt-6">Your mobile number is your unique login ID. Existing users can continue with mobile only.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D2B1F] flex items-center justify-center p-4 text-[#4B7A5B]">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
