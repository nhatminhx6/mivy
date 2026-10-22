'use client';
// Xem lớn ảnh (render PNG theo yêu cầu): ←/→ chuyển, Esc / bấm nền để đóng, nút tải ảnh đang xem.
// Vị trí đích ghi NGAY khi bấm nên bấm mũi tên nhanh không mất lượt; kết quả render cũ bị bỏ.

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

export function useLightbox(items: { label: string }[], render: (i: number) => Promise<Blob>, onDownload: (i: number) => void) {
  const [view, setView] = useState<{ idx: number; url: string } | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const idxRef = useRef(0);
  const reqRef = useRef(0);
  const n = items.length;

  const open = async (i: number) => {
    const idx = ((i % n) + n) % n;
    idxRef.current = idx;
    const req = ++reqRef.current;
    setLoading(idx);
    try {
      const url = URL.createObjectURL(await render(idx));
      if (req !== reqRef.current) { URL.revokeObjectURL(url); return; }
      setView((v) => { if (v) URL.revokeObjectURL(v.url); return { idx, url }; });
    } finally { if (req === reqRef.current) setLoading(null); }
  };
  const close = () => { reqRef.current++; setLoading(null); setView((v) => { if (v) URL.revokeObjectURL(v.url); return null; }); };

  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') open(idxRef.current + 1);
      if (e.key === 'ArrowLeft') open(idxRef.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const node = view && (
    <div role="dialog" aria-modal="true" aria-label={items[view.idx].label} data-testid="lightbox" onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="relative w-full" style={{ maxWidth: 'min(88vw, 1100px)' }} onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={view.url} alt={items[view.idx].label} className="mx-auto block max-w-full rounded-2xl shadow-2xl"
          style={{ maxHeight: '78vh', background: 'repeating-conic-gradient(#ffffff1a 0 25%, transparent 0 50%) 0 0/20px 20px' }} />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">{items[view.idx].label} · {view.idx + 1}/{n}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => open(idxRef.current - 1)} aria-label="Ảnh trước" className="mv-btn mv-btn-ghost !p-2"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" onClick={() => open(idxRef.current + 1)} aria-label="Ảnh sau" className="mv-btn mv-btn-ghost !p-2"><ChevronRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => onDownload(view.idx)} className="mv-btn mv-btn-primary !px-3 !py-2 !text-xs"><Download className="w-3.5 h-3.5" /> Tải ảnh này</button>
          </div>
        </div>
        <button type="button" onClick={close} aria-label="Đóng" className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
  return { open, loading, node };
}
