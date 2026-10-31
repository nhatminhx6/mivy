'use client';
// Tab "Làm nét": ảnh shop chụp mờ / nhỏ → Real-ESRGAN làm nét + phóng ×2 ×4, chạy trên máy user (miễn phí).
// Kéo thanh giữa ảnh để so trước/sau.

import { useEffect, useState } from 'react';
import { Check, Download, Loader2, Sparkles } from 'lucide-react';
import { loadUpscaler, MAX_OUT, scalesFor, upscaleImage } from '@/lib/upscale';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
const USE_MAX = 2048; // ảnh đưa sang các tab khác: đủ nét mà không nặng

export function UpscalePanel({ shared, onApply }: { shared: { src: string }; onApply: (url: string) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [model, setModel] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState<number | null>(null);
  const [out, setOut] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [split, setSplit] = useState(50);
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    setImg(null); setOut(null); setErr('');
    load(shared.src).then((im) => {
      if (!on) return;
      setImg(im);
      const ok = scalesFor(im.naturalWidth, im.naturalHeight);
      setScale(ok.includes(4) && Math.max(im.naturalWidth, im.naturalHeight) <= 600 ? 4 : 2);
    }).catch(() => on && setErr('Không mở được ảnh này.'));
    return () => { on = false; };
  }, [shared.src]);
  useEffect(() => {
    let on = true;
    loadUpscaler().then(() => on && setModel('ready')).catch(() => on && setModel('error'));
    return () => { on = false; };
  }, []);

  const W = img?.naturalWidth || 0, H = img?.naturalHeight || 0;
  const scales = img ? scalesFor(W, H) : [];
  const run = async () => {
    if (!img) return;
    setErr(''); setOut(null); setProgress(0);
    try {
      const canvas = await upscaleImage(img, scale, setProgress);
      setOut({ canvas, url: canvas.toDataURL('image/jpeg', 0.92) });
    } catch { setErr('Làm nét chưa được (máy yếu hoặc ảnh quá lớn). Thử mức ×2 nhé.'); }
    finally { setProgress(null); }
  };
  const download = (type: 'jpg' | 'png') => {
    if (!out) return;
    const a = document.createElement('a');
    a.href = type === 'png' ? out.canvas.toDataURL('image/png') : out.url; a.download = `mivy-lam-net-x${out.canvas.width / W}.${type}`; a.click();
  };
  const apply = () => {
    if (!out) return;
    const c = out.canvas, k = Math.min(1, USE_MAX / Math.max(c.width, c.height));
    if (k === 1) { onApply(out.url); return; }
    const t = document.createElement('canvas'); t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
    const ctx = t.getContext('2d')!; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, 0, 0, t.width, t.height);
    onApply(t.toDataURL('image/jpeg', 0.92));
  };

  const status = model === 'loading' ? 'Đang tải AI làm nét…' : model === 'error' ? 'Không tải được AI làm nét — kiểm tra mạng rồi tải lại trang.' : '';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start" data-testid="upscale-panel">
      <div className="glass-panel border border-white/10 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white">Làm nét, phóng to ảnh</p>
          <p className="text-xs text-slate-400 mt-1">Ảnh chụp điện thoại mờ, ảnh nhỏ in bị vỡ → AI làm nét và phóng to. Chạy ngay trên máy, miễn phí.</p>
        </div>
        {img && <p className="text-xs text-slate-300" data-testid="upscale-size">Ảnh gốc: {W}×{H}px → {W * scale}×{H * scale}px</p>}
        <div className="mv-seg flex">
          {([2, 4] as const).map((s) => (
            <button key={s} type="button" onClick={() => setScale(s)} disabled={!scales.includes(s) || progress !== null} data-active={scale === s}
              className="mv-seg-btn flex-1 !justify-center disabled:opacity-40" title={!scales.includes(s) ? `Ảnh ra sẽ vượt ${MAX_OUT}px` : undefined}>×{s}</button>
          ))}
        </div>
        {img && !scales.length && <p className="text-xs text-amber-200">Ảnh đã đủ lớn (trên {MAX_OUT / 2}px), không cần phóng thêm.</p>}
        <button type="button" onClick={run} disabled={!img || !scales.includes(scale) || model !== 'ready' || progress !== null} className="w-full mv-btn mv-btn-primary !justify-center disabled:opacity-60" data-testid="upscale-run">
          {progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {progress !== null ? `Đang làm nét… ${Math.round(progress * 100)}%` : 'Làm nét ảnh'}
        </button>
        {progress !== null && <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-indigo-400 transition-all" style={{ width: `${progress * 100}%` }} /></div>}
        {(status || err) && <p className={`text-xs ${err || model === 'error' ? 'text-rose-300' : 'text-slate-400'}`} data-testid="upscale-status">{err || status}</p>}
        {out && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <button type="button" onClick={apply} className="w-full mv-btn mv-btn-primary !justify-center" data-testid="upscale-apply"><Check className="w-4 h-4" /> Dùng ảnh này</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => download('jpg')} className="mv-btn mv-btn-ghost flex-1 !justify-center" data-testid="upscale-download"><Download className="w-4 h-4" /> Tải JPG</button>
              <button type="button" onClick={() => download('png')} className="mv-btn mv-btn-ghost flex-1 !justify-center"><Download className="w-4 h-4" /> Tải PNG</button>
            </div>
          </div>
        )}
      </div>
      <div className="glass-panel border border-white/10 rounded-2xl p-3">
        {img && (
          <div className="relative mx-auto select-none overflow-hidden rounded-lg bg-white" style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(70vh * ${W / H}))` }} data-testid="upscale-compare">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={out?.url || shared.src} alt="" className="absolute inset-0 w-full h-full object-contain" data-testid="upscale-result" />
            {out && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shared.src} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
                <div className="absolute inset-y-0 w-0.5 bg-white shadow pointer-events-none" style={{ left: `${split}%` }} />
                <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded">Trước</span>
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-indigo-500 text-white px-2 py-0.5 rounded">Sau ×{out.canvas.width / W}</span>
                <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(+e.target.value)} aria-label="So trước sau"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
