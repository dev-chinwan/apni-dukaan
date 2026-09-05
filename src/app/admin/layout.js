'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ToastContainer } from '@/components/ui/Toast';

const NAV = [
  { href: '/admin',           icon: '📊', label: 'Dashboard' },
  { href: '/admin/orders',    icon: '📋', label: 'Orders' },
  { href: '/admin/customers', icon: '👥', label: 'Customers' },
  { href: '/admin/groceries', icon: '🥦', label: 'Groceries' },
  { href: '/admin/settings',  icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0D2B1F] flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[#0A2318] border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥦</span>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="font-bold text-green-50">Dukaan</span>
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Admin</span>
              </div>
              <p className="hidden sm:block text-[10px] text-[#4B7A5B] -mt-0.5">Local freshness, delivered with trust.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-[#4B7A5B]">
              ⚙️ <span className="text-amber-400">{user?.name}</span>
            </span>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/20 text-[#4B7A5B] hover:text-red-400 hover:border-red-500/20 transition-all">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden sm:flex flex-col w-52 bg-[#0A2318] border-r border-[#1A3D2B] py-4 px-3 gap-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === n.href
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-[#4B7A5B] hover:text-green-300 hover:bg-[#1A3D2B]'
              }`}>
              {n.icon} {n.label}
            </Link>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24 sm:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0A2318] border-t border-amber-500/20">
        <div className="flex">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex-1 flex flex-col items-center py-3 text-xs transition-all ${pathname === n.href ? 'text-amber-400' : 'text-[#4B7A5B]'}`}>
              <span className="text-xl mb-0.5">{n.icon}</span>{n.label}
            </Link>
          ))}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
