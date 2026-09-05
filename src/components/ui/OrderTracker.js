import { STATUS_STEPS } from '@/config/products.config';

export function OrderTracker({ status }) {
  const cur = STATUS_STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex items-start justify-between relative py-2">
      {STATUS_STEPS.map((step, i) => {
        const done   = i <= cur;
        const active = i === cur;
        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
            {i < STATUS_STEPS.length - 1 && (
              <div className={`absolute top-5 left-1/2 w-full h-0.5 z-0 transition-all duration-700 ${i < cur ? 'opacity-50' : 'opacity-10'}`}
                style={{ background: i < cur ? step.color : '#1A3D2B' }} />
            )}
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 border-2 transition-all duration-500`}
              style={done ? { borderColor: step.color, background: step.color + '22' } : { borderColor: '#1A3D2B', background: '#0A2318' }}>
              <span>{step.icon}</span>
              {active && <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ background: step.color }} />}
            </div>
            <span className="mt-2 text-center text-[10px] font-medium leading-tight max-w-[56px]"
              style={done ? { color: step.color } : { color: '#4B7A5B' }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
