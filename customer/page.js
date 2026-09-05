'use client';
import { useState, useEffect } from 'react';
import { useCart } from './layout';
import { toast } from '@/components/ui/Toast';

export default function ShopPage() {
  const { cart, addToCart, removeFromCart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setCategories(d.categories || ['All']);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const inStockProducts = products.filter((p) => p.inStock);
  const cats = categories;

  const filtered = inStockProducts
    .filter(p => (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAdd = (p) => { addToCart(p); toast.success(`${p.emoji} ${p.name} added`); };

  return (
    <div className="pt-4">
      {/* Hero */}
      <div className="text-center py-6 sm:py-10">
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-3xl sm:text-4xl font-bold text-green-50 leading-tight">
          Fresh groceries,<br /><span className="text-leaf-400">delivered fast</span>
        </h1>
        <p className="text-[#4B7A5B] text-sm mt-2">Order before 10 PM · Same-day delivery</p>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="input mt-4 max-w-xs mx-auto block" />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              cat === c ? 'bg-leaf-500 text-[#061810] border-leaf-500' : 'border-[#1A3D2B] text-[#4B7A5B] hover:text-green-300'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
        {loading && [...Array(8)].map((_, i) => <div key={`s-${i}`} className="card p-4 h-40 animate-pulse" />)}
        {filtered.map(p => {
          const qty = cart[p.id] || 0;
          return (
            <div key={p.id} className="card p-4 relative hover:border-leaf-500/20 transition-all">
              {p.badge && (
                <span className="absolute top-2 right-2 bg-leaf-500/20 text-leaf-400 text-[9px] font-bold px-2 py-0.5 rounded-full">{p.badge}</span>
              )}
              <div className="text-4xl text-center mb-2">{p.emoji}</div>
              <div className="font-semibold text-sm text-green-100 leading-tight">{p.name}</div>
              <div className="text-xs text-[#4B7A5B] mb-3">per {p.unit}</div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-leaf-400">₹{p.price}</span>
                {qty === 0 ? (
                  <button onClick={() => handleAdd(p)}
                    className="px-3 py-1.5 rounded-lg bg-leaf-500/20 hover:bg-leaf-500 text-leaf-400 hover:text-[#061810] text-xs font-bold border border-leaf-500/30 transition-all">
                    + Add
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-[#1A3D2B] rounded-lg px-2 py-1">
                    <button onClick={() => removeFromCart(p.id)} className="text-leaf-400 font-bold text-base w-4 text-center leading-none">−</button>
                    <span className="text-green-100 text-sm font-bold min-w-[14px] text-center">{qty}</span>
                    <button onClick={() => handleAdd(p)} className="text-leaf-400 font-bold text-base w-4 text-center leading-none">+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-[#4B7A5B]">
            <div className="text-4xl mb-3">🔍</div>
            <p>No products found for "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
