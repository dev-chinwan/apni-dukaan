'use client';
import { useState, useEffect } from 'react';

let _push = null;
export const toast = {
  success: (msg) => _push?.({ msg, type: 'success', id: Date.now() }),
  error:   (msg) => _push?.({ msg, type: 'error',   id: Date.now() }),
  info:    (msg) => _push?.({ msg, type: 'info',     id: Date.now() }),
};

export function ToastContainer() {
  const [list, setList] = useState([]);

  useEffect(() => {
    _push = (t) => {
      setList(p => [...p, t]);
      setTimeout(() => setList(p => p.filter(x => x.id !== t.id)), 3200);
    };
    return () => { _push = null; };
  }, []);

  if (!list.length) return null;

  const cls = {
    success: 'bg-[#0A2318]/95 border-leaf-500/30 text-green-100',
    error:   'bg-red-950/90 border-red-500/40 text-red-200',
    info:    'bg-blue-950/90 border-blue-500/40 text-blue-200',
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] flex flex-col items-center gap-2" style={{ transform: 'translateX(-50%)' }}>
      {list.map(t => (
        <div key={t.id} className={`animate-toast-in px-5 py-3 rounded-full text-sm font-semibold border backdrop-blur-sm shadow-xl whitespace-nowrap ${cls[t.type]}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
