'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../layout';
import { toast } from '@/components/ui/Toast';

export default function CartPage() {
  const { cart, addToCart, removeFromCart, clearCart } = useCart();
  const router  = useRouter();
  const [products, setProducts] = useState([]);
  const [delivery, setDelivery] = useState({ fee: 39, freeAbove: 499 });
  const [addr, setAddr]   = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/catalog'), fetch('/api/settings')])
      .then(async ([catalogRes, settingsRes]) => {
        const catalog = await catalogRes.json();
        const settings = await settingsRes.json();
        setProducts(catalog.products || []);
        if (settings?.settings?.delivery) {
          setDelivery(settings.settings.delivery);
        }
      })
      .catch(() => toast.error('Failed to load latest catalog/settings'));
  }, []);

  const items = Object.entries(cart)
    .map(([id, qty]) => { const p = products.find(x => x.id === id); return p ? { ...p, quantity: qty } : null; })
    .filter(Boolean);

  const subtotal    = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= delivery.freeAbove ? 0 : delivery.fee;
  const total       = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (!items.length) return;
    setPlacing(true);
    try {
      const res  = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, name: i.name, emoji: i.emoji, price: i.price, unit: i.unit, quantity: i.quantity })),
          deliveryAddress: addr,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clearCart();
      toast.success('🎉 Order placed! Admin notified.');
      router.push('/customer/orders');
    } catch (e) {
      toast.error(e.message || 'Failed to place order');
    } finally { setPlacing(false); }
  };

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">🛒</div>
      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50 mb-2">Your cart is empty</h2>
      <p className="text-[#4B7A5B] mb-6">Add some fresh groceries first</p>
      <Link href="/customer" className="px-8 py-3 bg-leaf-500 hover:bg-leaf-600 text-[#061810] font-bold rounded-xl transition-all">Start Shopping</Link>
    </div>
  );

  return (
    <div className="pt-4 max-w-lg mx-auto">
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50 mb-4">Your Cart</h1>

      <div className="space-y-2 mb-4">
        {items.map(item => (
          <div key={item.id} className="card flex items-center gap-3 p-3">
            <span className="text-3xl">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-green-100 truncate">{item.name}</div>
              <div className="text-xs text-[#4B7A5B]">₹{item.price} / {item.unit}</div>
            </div>
            <div className="flex items-center gap-2 bg-[#1A3D2B] rounded-lg px-2 py-1">
              <button onClick={() => removeFromCart(item.id)} className="text-leaf-400 font-bold text-base w-4 leading-none">−</button>
              <span className="text-green-100 text-sm font-bold min-w-[14px] text-center">{item.quantity}</span>
              <button onClick={() => addToCart(item)} className="text-leaf-400 font-bold text-base w-4 leading-none">+</button>
            </div>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-leaf-400 text-sm min-w-[3rem] text-right">₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-4 space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] block mb-1">Delivery Address</label>
          <textarea value={addr} onChange={e => setAddr(e.target.value)}
            placeholder="House No., Street, Area, Pincode" rows={2}
            className="input resize-none" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] block mb-1">Special Instructions</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Leave at door, call on arrival, etc." className="input" />
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex justify-between text-sm text-[#4B7A5B] mb-2"><span>Subtotal ({items.length} items)</span><span>₹{subtotal}</span></div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-[#4B7A5B]">Delivery</span>
          <span className={deliveryFee === 0 ? 'text-leaf-400 font-semibold' : 'text-green-100'}>
            {deliveryFee === 0 ? 'FREE 🎉' : `₹${deliveryFee}`}
          </span>
        </div>
        {deliveryFee > 0 && (
          <p className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg mb-3">
            Add ₹{delivery.freeAbove - subtotal} more for free delivery
          </p>
        )}
        <div className="flex justify-between font-bold text-green-50 text-lg border-t border-[#1A3D2B] pt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          <span>Total</span><span>₹{total}</span>
        </div>
      </div>

      <button onClick={placeOrder} disabled={placing}
        className="w-full py-4 bg-leaf-500 hover:bg-leaf-600 text-[#061810] font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px' }}>
        {placing ? 'Placing Order…' : `Place Order · ₹${total}`}
      </button>
      <p className="text-center text-xs text-[#2D5A3F] mt-2">⚡ After Placing Order, you can track your order under Orders tab.</p>
    </div>
  );
}
