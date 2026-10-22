'use client';
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Section thu/mở dùng chung (marketing + infographic + ...)
export function CollapsibleSection({ title, children, right, defaultOpen = true, tone = 'panel' }: {
  title: ReactNode; children: ReactNode; right?: ReactNode; defaultOpen?: boolean; tone?: 'panel' | 'card' | 'accent';
}) {
  const [open, setOpen] = useState(defaultOpen);
  const base = tone === 'accent'
    ? 'glass-panel border border-indigo-500/30 bg-indigo-500/[0.04]'
    : tone === 'card' ? 'glass-card hover:!transform-none' : 'glass-panel border border-white/10';
  return (
    <div className={`${base} rounded-2xl`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="text-sm font-bold text-white truncate">{title}</span>
        </button>
        {right}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
