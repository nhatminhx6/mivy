'use client';
// Tab "Xoá vật thể": tô / bấm chọn vật (SAM) / tự tìm chữ (PP-OCR) → MI-GAN vẽ lại nền chỗ đó.
// Chạy hết trên trình duyệt (miễn phí, không tốn server). Làm nhiều lần được, có hoàn tác.

import { useEffect, useRef, useState } from 'react';
import { Check, Download, Eraser, Loader2, Minus, MousePointerClick, Paintbrush, ScanText, Undo2, X } from 'lucide-react';
import { dilate, inpaintCanvas, loadInpainter } from '@/lib/inpaint';
import { getSamSession, type SamSession } from '@/lib/sam-select';
import { findText } from '@/lib/textdetect';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

export interface EraseBatch {
  count: number;
  /** Xoá chữ mọi ảnh trong bộ; trả số ảnh đã xoá. */
  run: (keepOnProduct: boolean, onProgress: (done: number, total: number) => void) => Promise<number>;
  undo: (() => void) | null;
}

export function ErasePanel({ shared, onApply, batch }: { shared: { src: string }; onApply: (url: string) => void; batch?: EraseBatch }) {
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const undo = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const sam = useRef<SamSession | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null); // bấm lúc AI chọn vật chưa sẵn sàng → làm khi xong
  const [mode, setMode] = useState<'brush' | 'unbrush' | 'pick'>('brush');
  const [size, setSize] = useState(36);
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState<'loading' | 'ready' | 'error'>('loading');
  const [samState, setSamState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [hasMask, setHasMask] = useState(false);
  const [busy, setBusy] = useState<'' | 'erase' | 'pick' | 'text'>('');
  const [edits, setEdits] = useState(0);
  const [err, setErr] = useState('');
  const [keepProd, setKeepProd] = useState(true);
  const [batchState, setBatchState] = useState<{ done: number; total: number } | null>(null);
  const [batchMsg, setBatchMsg] = useState('');

  // nạp ảnh vào canvas (kích thước gốc)
  useEffect(() => {
    let on = true;
    setReady(false); setEdits(0); setHasMask(false); setErr(''); undo.current = [];
    load(shared.src).then((im) => {
      if (!on || !baseRef.current || !maskRef.current) return;
      for (const cv of [baseRef.current, maskRef.current]) { cv.width = im.naturalWidth; cv.height = im.naturalHeight; }
      const ctx = baseRef.current.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, im.naturalWidth, im.naturalHeight); // ảnh PNG trong suốt → nền trắng cho AI vẽ lại đúng
      ctx.drawImage(im, 0, 0);
      setReady(true);
    }).catch(() => on && setErr('Không mở được ảnh này.'));
    return () => { on = false; };
  }, [shared.src]);
  // tải sẵn model xoá (lần đầu ~28MB, sau đó cache)
  useEffect(() => {
    let on = true;
    loadInpainter().then(() => on && setModel('ready')).catch(() => on && setModel('error'));
    return () => { on = false; };
  }, []);
  // AI bấm chọn vật: chỉ chuẩn bị khi cần
  useEffect(() => {
    if (mode !== 'pick') return;
    let on = true; sam.current = null; setSamState('loading');
    getSamSession(shared.src).then((s) => {
      if (!on) return;
      sam.current = s; setSamState('ready');
      const p = pending.current; pending.current = null; if (p) pick(p.x, p.y);
    }).catch(() => on && setSamState('error'));
    return () => { on = false; };
  }, [mode, shared.src]);

  const pt = (e: React.PointerEvent) => {
    const cv = maskRef.current!; const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height, k: cv.width / r.width };
  };
  const stamp = (x0: number, y0: number, x1: number, y1: number, rad: number) => {
    const ctx = maskRef.current!.getContext('2d')!;
    const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.ceil(d / (rad * 0.35)));
    ctx.save(); ctx.fillStyle = '#f43f5e'; ctx.beginPath();
    if (mode === 'unbrush') ctx.globalCompositeOperation = 'destination-out'; // bỏ tô: giữ lại chỗ lỡ chọn (vd logo của sản phẩm)
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); }
    ctx.fill(); ctx.restore(); if (mode === 'brush') setHasMask(true);
  };
  const pick = async (x: number, y: number) => {
    if (!sam.current) { pending.current = { x, y }; return; }
    if (busy) return;
    setBusy('pick');
    try {
      const cv = maskRef.current!; const W = cv.width, H = cv.height;
      paintMask(dilate(await sam.current.maskAt(x, y), W, H, Math.max(3, Math.round(Math.max(W, H) * 0.006))));
    } catch { setErr('Chưa chọn được vật ở chỗ này, thử tô bằng cọ nhé.'); }
    finally { setBusy(''); }
  };
  // thêm mask (1 = xoá) vào lớp tô
  const paintMask = (m: Uint8Array) => {
    const cv = maskRef.current!; const W = cv.width, H = cv.height;
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    const tctx = t.getContext('2d')!; const id = tctx.createImageData(W, H);
    let any = false;
    for (let i = 0; i < m.length; i++) if (m[i]) { any = true; id.data[i * 4] = 244; id.data[i * 4 + 1] = 63; id.data[i * 4 + 2] = 94; id.data[i * 4 + 3] = 255; }
    tctx.putImageData(id, 0, 0);
    cv.getContext('2d')!.drawImage(t, 0, 0); if (any) setHasMask(true);
    return any;
  };
  const autoText = async () => {
    if (!ready || busy) return;
    setBusy('text'); setErr('');
    try {
      if (!paintMask(await findText(baseRef.current!))) setErr('Không thấy chữ nào trên ảnh.');
    } catch { setErr('Chưa tìm được chữ (mất mạng khi tải AI?). Thử lại nhé.'); }
    finally { setBusy(''); }
  };
  const down = (e: React.PointerEvent) => {
    if (!ready || busy === 'erase') return;
    const p = pt(e);
    if (mode === 'pick') { pick(p.x, p.y); return; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    last.current = p; stamp(p.x, p.y, p.x, p.y, (size / 2) * p.k);
  };
  const move = (e: React.PointerEvent) => {
    if (!last.current) return;
    const p = pt(e); stamp(last.current.x, last.current.y, p.x, p.y, (size / 2) * p.k); last.current = p;
  };
  const clearMask = () => { const cv = maskRef.current; if (cv) cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height); setHasMask(false); };

  const erase = async () => {
    const base = baseRef.current!, mc = maskRef.current!;
    const W = base.width, H = base.height;
    const a = mc.getContext('2d')!.getImageData(0, 0, W, H).data;
    const m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 20 ? 1 : 0;
    setBusy('erase'); setErr('');
    const snap = base.getContext('2d')!.getImageData(0, 0, W, H);
    try {
      if (await inpaintCanvas(base, dilate(m, W, H, 2))) {
        undo.current.push(snap); if (undo.current.length > 10) undo.current.shift();
        setEdits((n) => n + 1); clearMask();
      }
    } catch { setErr('Xoá chưa được (máy yếu hoặc mất mạng khi tải AI). Thử lại nhé.'); }
    finally { setBusy(''); }
  };
  const back = () => { const s = undo.current.pop(); if (s) { baseRef.current!.getContext('2d')!.putImageData(s, 0, 0); setEdits((n) => n - 1); } };
  const download = () => {
    const a = document.createElement('a'); a.href = baseRef.current!.toDataURL('image/png'); a.download = 'mivy-da-xoa.png'; a.click();
  };

  const status = model === 'loading' ? 'Đang tải AI xoá vật thể (lần đầu ~28MB)…'
    : model === 'error' ? 'Không tải được AI xoá vật thể — kiểm tra mạng rồi tải lại trang.'
    : mode === 'pick' && samState === 'loading' ? 'Đang chuẩn bị AI chọn vật…' : '';
  const seg = (m: typeof mode, label: string, Icon: typeof Eraser) => (
    <button type="button" onClick={() => setMode(m)} data-active={mode === m} className="mv-seg-btn flex-1 !flex !flex-row !items-center !justify-center !gap-1.5"><Icon className="w-4 h-4" /> {label}</button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start" data-testid="erase-panel" data-sam={samState}>
      <div className="glass-panel border border-white/10 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white">Xoá chữ, logo, đồ thừa</p>
          <p className="text-xs text-slate-400 mt-1">Tô lên chỗ muốn xoá (hoặc để AI tự tìm chữ) rồi bấm Xoá, AI tự vẽ lại nền. Tô lỡ thì dùng Bỏ tô. Chạy ngay trên máy, miễn phí.</p>
        </div>
        <button type="button" onClick={autoText} disabled={!ready || !!busy} className="w-full mv-btn mv-btn-ghost !justify-center disabled:opacity-60" data-testid="erase-find-text">
          {busy === 'text' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />} Tự tìm chữ, watermark
        </button>
        <div className="mv-seg flex">{seg('brush', 'Tô', Paintbrush)}{seg('unbrush', 'Bỏ tô', Minus)}{seg('pick', 'Chọn vật', MousePointerClick)}</div>
        {mode !== 'pick' ? (
          <label className="block"><span className="mv-label">Cỡ cọ: {size}px</span>
            <input type="range" min={10} max={120} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full mt-1" /></label>
        ) : <p className="text-xs text-slate-400">Bấm vào vật muốn xoá, AI tự khoanh viền. Bấm nhiều vật để xoá cùng lúc.</p>}
        <div className="flex gap-2">
          <button type="button" onClick={erase} disabled={!hasMask || !!busy || model !== 'ready'} className="mv-btn mv-btn-primary flex-1 !justify-center disabled:opacity-60" data-testid="erase-run">
            {busy === 'erase' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />} {busy === 'erase' ? 'Đang xoá…' : 'Xoá vùng đã tô'}
          </button>
          <button type="button" onClick={clearMask} disabled={!hasMask || !!busy} title="Bỏ tô" className="mv-btn mv-btn-ghost !px-3 disabled:opacity-40"><X className="w-4 h-4" /></button>
          <button type="button" onClick={back} disabled={!edits || !!busy} title="Hoàn tác" className="mv-btn mv-btn-ghost !px-3 disabled:opacity-40" data-testid="erase-undo"><Undo2 className="w-4 h-4" /></button>
        </div>
        {(status || err) && <p className={`text-xs ${err || model === 'error' ? 'text-rose-300' : 'text-slate-400'}`} data-testid="erase-status">{err || status}</p>}
        {batch && batch.count > 1 && (
          <div className="space-y-2 pt-3 border-t border-white/10" data-testid="erase-batch">
            <p className="text-xs font-semibold text-white">Hàng loạt: xoá chữ cả {batch.count} ảnh</p>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={keepProd} onChange={(e) => setKeepProd(e.target.checked)} /> Giữ chữ, logo in trên sản phẩm (chỉ xoá chữ ở nền)
            </label>
            <button type="button" disabled={!!batchState || !!busy || model !== 'ready'} data-testid="erase-batch-run"
              onClick={async () => {
                setBatchMsg(''); setBatchState({ done: 0, total: batch.count });
                try { const n = await batch.run(keepProd, (done, total) => setBatchState({ done, total })); setBatchMsg(n ? `Đã xoá chữ ở ${n} ảnh.` : 'Không thấy chữ ở ảnh nào.'); }
                catch { setBatchMsg('Có lỗi giữa chừng, các ảnh đã xong vẫn được giữ.'); }
                finally { setBatchState(null); }
              }}
              className="w-full mv-btn mv-btn-ghost !justify-center disabled:opacity-60">
              {batchState ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />} {batchState ? `Đang xoá… ${batchState.done}/${batchState.total}` : `Tự xoá chữ cả ${batch.count} ảnh`}
            </button>
            {batchMsg && (
              <p className="text-xs text-slate-300 flex items-center gap-2" data-testid="erase-batch-msg">{batchMsg}
                {batch.undo && <button type="button" onClick={() => { batch.undo!(); setBatchMsg('Đã hoàn tác.'); }} className="text-indigo-300 hover:text-white underline-offset-2 hover:underline">Hoàn tác</button>}
              </p>
            )}
          </div>
        )}
        {edits > 0 && (
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <button type="button" onClick={() => onApply(baseRef.current!.toDataURL('image/png'))} className="mv-btn mv-btn-primary flex-1 !justify-center" data-testid="erase-apply"><Check className="w-4 h-4" /> Dùng ảnh này</button>
            <button type="button" onClick={download} className="mv-btn mv-btn-ghost" data-testid="erase-download"><Download className="w-4 h-4" /> Tải</button>
          </div>
        )}
      </div>
      <div className="glass-panel border border-white/10 rounded-2xl p-3">
        <div className="relative mx-auto w-fit max-w-full bg-[repeating-conic-gradient(#ffffff14_0%_25%,transparent_0%_50%)] [background-size:16px_16px] rounded-lg overflow-hidden">
          <canvas ref={baseRef} className="block max-w-full max-h-[70vh] w-auto h-auto" data-testid="erase-canvas" />
          <canvas ref={maskRef} onPointerDown={down} onPointerMove={move} onPointerUp={() => { last.current = null; }} onPointerLeave={() => { last.current = null; }}
            className={`absolute inset-0 w-full h-full opacity-55 touch-none ${mode === 'pick' ? 'cursor-pointer' : 'cursor-crosshair'}`} data-testid="erase-mask" />
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}
        </div>
      </div>
    </div>
  );
}
