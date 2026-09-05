import { STATUS_STEPS } from '@/config/products.config';

const COLORS = {
  placed:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  packing:   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  out:       'bg-orange-500/15 text-orange-400 border-orange-500/30',
  delivered: 'bg-leaf-500/15 text-leaf-400 border-leaf-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function StatusBadge({ status }) {
  const step = STATUS_STEPS.find(s => s.key === status);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${COLORS[status] || 'bg-forest-700/20 text-forest-400'}`}>
      {step?.icon} {step?.label || status}
    </span>
  );
}
