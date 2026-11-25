'use client';
// Khung xem THÀNH PHẨM 3D (kéo để xoay) + ảnh thumbnail 3D — dùng chung cho mọi sản phẩm.
// Trang truyền vào `build`: hàm nạp động builder của sản phẩm (three.js chỉ tải khi cần, không nặng trang đầu).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Loader2, Move3d } from 'lucide-react';
import type { Builder, Viewer } from '@/lib/mockup3d';

type Core = typeof import('@/lib/mockup3d');
let coreP: Promise<Core> | null = null;
const loadCore = () => (coreP ??= import('@/lib/mockup3d'));

const BG = 'linear-gradient(180deg,#F7F5F1 0%,#E5E0D7 100%)';

/** nạp builder của sản phẩm (đọc thiết kế mới nhất tại thời điểm gọi) */
export type BuildFn = () => Promise<Builder>;

export interface Mockup3DHandle {
  /** ảnh w×h đúng góc đang xem (nền studio) */
  snapshot(w: number, h: number, opts?: { watermark?: boolean }): Promise<HTMLCanvasElement>;
}

export const Mockup3DView = forwardRef<Mockup3DHandle, {
  build: BuildFn;
  /** đổi giá trị → dựng lại mô hình (màu, chữ…) */
  rebuildKey: string;
  /** đổi giá trị → canh lại khung nhìn (loại, kích thước) */
  refitKey: string;
  debounce?: number;
  className?: string;
}>(function Mockup3DView({ build, rebuildKey, refitKey, debounce = 150, className }, ref) {
  const host = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<Viewer | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  const fitted = useRef(refitKey);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [core, b] = await Promise.all([loadCore(), buildRef.current()]);
        if (dead || !host.current) return;
        viewer.current = core.createViewer(host.current, b, () => setErr(true), () => { if (!dead) setReady(true); });
      } catch { if (!dead) setErr(true); }
    })();
    return () => { dead = true; viewer.current?.dispose(); viewer.current = null; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(async () => {
      const refit = fitted.current !== refitKey;
      fitted.current = refitKey;
      try { await viewer.current?.update(await buildRef.current(), refit); } catch { /* giữ mô hình cũ */ }
    }, debounce);
    return () => clearTimeout(t);
  }, [rebuildKey, refitKey, ready, debounce]);

  useImperativeHandle(ref, () => ({
    async snapshot(w, h, opts) {
      const [core, b] = await Promise.all([loadCore(), buildRef.current()]);
      return core.snapshot(b, w, h, { view: viewer.current?.view(), watermark: opts?.watermark });
    },
  }), []);

  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={{ background: BG }} data-testid="mockup-3d">
      <div ref={host} className="absolute inset-0" />
      {!ready && !err && <div className="absolute inset-0 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
      {err && <div className="absolute inset-0 grid place-items-center text-xs text-slate-500 px-6 text-center">Trình duyệt chưa hỗ trợ xem 3D — xem bản thiết kế phẳng nhé.</div>}
      {ready && !err && (
        <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
          <Move3d className="w-3.5 h-3.5" /> Kéo để xoay
        </span>
      )}
    </div>
  );
});

// thumbnail tĩnh: chụp bằng 1 renderer dùng chung (đỡ tốn GPU hơn nhiều khung 3D chạy cùng lúc)
export function Mockup3DThumb({ build, rebuildKey, px = 420 }: { build: BuildFn; rebuildKey: string; px?: number }) {
  const [src, setSrc] = useState('');
  const buildRef = useRef(build);
  buildRef.current = build;
  useEffect(() => {
    let dead = false;
    const t = setTimeout(async () => {
      try {
        const [core, b] = await Promise.all([loadCore(), buildRef.current()]);
        const c = await core.snapshot(b, px, px);
        if (!dead) setSrc(c.toDataURL('image/jpeg', 0.86));
      } catch { /* bỏ qua: giữ ảnh cũ */ }
    }, 350);
    return () => { dead = true; clearTimeout(t); };
  }, [rebuildKey, px]);
  return src
    ? <img src={src} alt="" className="w-full h-full object-cover block" draggable={false} />
    : <div className="w-full h-full grid place-items-center" style={{ background: BG }}><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>;
}

/** toggle "Thành phẩm 3D | Bản thiết kế" dùng chung cho ô xem trước */
export function PreviewTabs({ value, onChange }: { value: '3d' | 'flat'; onChange: (v: '3d' | 'flat') => void }) {
  return (
    <div className="mv-seg !p-0.5 text-xs" role="tablist">
      <button type="button" className="mv-seg-btn !py-1 !px-2.5" data-active={value === '3d'} onClick={() => onChange('3d')} data-testid="tab-3d">Thành phẩm 3D</button>
      <button type="button" className="mv-seg-btn !py-1 !px-2.5" data-active={value === 'flat'} onClick={() => onChange('flat')} data-testid="tab-flat">Bản thiết kế</button>
    </div>
  );
}
