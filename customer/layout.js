'use client';
import { useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ToastContainer } from '@/components/ui/Toast';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [cart, setCart] = useState({});

  const addToCart    = (p)  => setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
  const removeFromCart = (id) => setCart(c => {
    const n = { ...c };
    if (n[id] > 1) n[id]--; else delete n[id];
    return n;
  });
  const clearCart = () => setCart({});
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const navLinks = [
    { href: '/customer',        icon: '🏪', label: 'Shop' },
    { href: '/customer/cart',   icon: '🛒', label: 'Cart', badge: cartCount },
    { href: '/customer/orders', icon: '📋', label: 'Orders' },
  ];

  return (
    <CartCtx.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount }}>
      <div className="min-h-screen bg-[#0D2B1F]">

        {/* Top bar */}
        <nav className="sticky top-0 z-50 bg-[#0A2318] border-b border-[#1A3D2B]">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/customer" className="flex items-center gap-2">
              <span className="text-2xl">🥦</span>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50 text-lg">FreshCart</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    pathname === l.href ? 'bg-[#1A3D2B] text-leaf-400' : 'text-[#4B7A5B] hover:text-green-300'
                  }`}>
                  {l.icon} {l.label}
                  {l.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-leaf-500 text-[#061810] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {l.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-[#4B7A5B]">
                Hi, <span className="text-green-300">{user?.name?.split(' ')[0]}</span>
              </span>
              <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-[#1A3D2B] text-[#4B7A5B] hover:text-red-400 hover:border-red-500/20 transition-all">
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-5xl mx-auto px-4 pb-24 sm:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0A2318] border-t border-[#1A3D2B]">
          <div className="flex">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={`flex-1 flex flex-col items-center py-3 text-xs relative ${pathname === l.href ? 'text-leaf-400' : 'text-[#4B7A5B]'}`}>
                <span className="text-xl mb-0.5">{l.icon}</span>
                {l.label}
                {l.badge > 0 && (
                  <span className="absolute top-2 right-1/4 bg-leaf-500 text-[#061810] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {l.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <ToastContainer />
    </CartCtx.Provider>
  );
}
