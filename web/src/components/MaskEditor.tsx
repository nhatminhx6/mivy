'use client';
// Sửa vùng tách nền bằng cọ (như remove.bg): "Giữ lại" tô lại phần AI lỡ xoá (vd mấy cây nến phía sau),
// "Xoá bớt" xoá phần thừa. "Bấm chọn/bỏ vật" dùng SlimSAM khoanh đúng viền vật thể chỉ với 1 cú bấm.
// Ảnh tách phải cùng kích thước ảnh gốc (tách không cắt viền).

import { useEffect, useRef, useState } from 'react';
import { Check, Eraser, Loader2, MousePointerClick, Paintbrush, SquareDashedMousePointer, Undo2, X } from 'lucide-react';
import { getSamSession, type SamSession } from '@/lib/sam-select';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

export function MaskEditor({ original, cut, onSave, onClose }: { original: string; cut: string; onSave: (url: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orig = useRef<HTMLImageElement | null>(null);
  const undo = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'pick-add' | 'pick-remove' | 'keep' | 'erase'>('pick-add');
  const sam = useRef<SamSession | null>(null);
  const [samState, setSamState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [picking, setPicking] = useState(false);
  const queue = useRef<{ x: number; y: number; add: boolean }[]>([]); // bấm lúc AI chưa sẵn sàng → làm sau
  const [size, setSize] = useState(40);
  const [ghost, setGhost] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    let on = true;
    Promise.all([load(original), load(cut)]).then(([o, c]) => {
      if (!on || !canvasRef.current) return;
      orig.current = o;
      const cv = canvasRef.current; cv.width = o.naturalWidth; cv.height = o.naturalHeight;
      cv.getContext('2d')!.drawImage(c, 0, 0, cv.width, cv.height);
      setReady(true);
    }).catch(() => null);
    return () => { on = false; };
  }, [original, cut]);
  // chuẩn bị AI chọn vật thể (mã hoá ảnh 1 lần)
  useEffect(() => {
    let on = true;
    setSamState('loading');
    getSamSession(original).then((ss) => { if (on) { sam.current = ss; setSamState('ready'); runQueue(); } }).catch(() => { if (on) setSamState('error'); });
    return () => { on = false; };
  }, [original]);

  // toạ độ chuột → pixel ảnh; cỡ cọ tính theo pixel màn hình cho dễ cầm
  const pt = (e: React.PointerEvent) => {
    const cv = canvasRef.current!; const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height, k: cv.width / r.width };
  };
  const stamp = (x0: number, y0: number, x1: number, y1: number, rad: number) => {
    const ctx = canvasRef.current!.getContext('2d')!;
    const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.ceil(d / (rad * 0.35)));
    ctx.save(); ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); }
    if (mode === 'erase') { ctx.globalCompositeOperation = 'destination-out'; ctx.fill(); }
    else { ctx.clip(); ctx.drawImage(orig.current!, 0, 0); }
    ctx.restore();
  };
  const snapshot = () => {
    const cv = canvasRef.current!;
    undo.current.push(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)); if (undo.current.length > 12) undo.current.shift(); setCanUndo(true);
  };
  // áp mask SAM: thêm = lấy lại pixel gốc trong vùng vật thể; bỏ = xoá vùng đó (viền làm mềm 1px)
  const applyMask = (m: Uint8Array, add: boolean) => {
    const cv = canvasRef.current!; const W = cv.width, H = cv.height;
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
    const mctx = mc.getContext('2d')!; const id = mctx.createImageData(W, H);
    for (let i = 0; i < m.length; i++) if (m[i]) id.data[i * 4 + 3] = 255;
    mctx.putImageData(id, 0, 0);
    const soft = document.createElement('canvas'); soft.width = W; soft.height = H;
    const sctx = soft.getContext('2d')!; sctx.filter = 'blur(1px)'; sctx.drawImage(mc, 0, 0);
    const ctx = cv.getContext('2d')!;
    if (add) {
      const t = document.createElement('canvas'); t.width = W; t.height = H;
      const tctx = t.getContext('2d')!; tctx.drawImage(orig.current!, 0, 0, W, H); tctx.globalCompositeOperation = 'destination-in'; tctx.drawImage(soft, 0, 0);
      ctx.drawImage(t, 0, 0);
    } else { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(soft, 0, 0); ctx.restore(); }
  };
  const busyRef = useRef(false);
  const runQueue = async () => {
    if (!sam.current || busyRef.current) return;
    busyRef.current = true; setPicking(true);
    try {
      while (queue.current.length) { const q = queue.current.shift()!; const m = await sam.current.maskAt(q.x, q.y); snapshot(); applyMask(m, q.add); }
    } finally { busyRef.current = false; setPicking(false); }
  };
  const pick = (e: React.PointerEvent) => {
    const p = pt(e);
    queue.current.push({ x: p.x, y: p.y, add: mode === 'pick-add' });
    setDots((d) => [...d, { x: p.x / canvasRef.current!.width, y: p.y / canvasRef.current!.height }]);
    runQueue();
  };
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => { if (!picking && samState === 'ready') setDots([]); }, [picking, samState]);
  const down = (e: React.PointerEvent) => {
    if (!ready) return;
    if (mode === 'pick-add' || mode === 'pick-remove') { pick(e); return; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    snapshot();
    const p = pt(e); last.current = p; stamp(p.x, p.y, p.x, p.y, (size / 2) * p.k);
  };
  const move = (e: React.PointerEvent) => {
    if (!last.current) return;
    const p = pt(e); stamp(last.current.x, last.current.y, p.x, p.y, (size / 2) * p.k); last.current = p;
  };
  const up = () => { last.current = null; };
  const doUndo = () => {
    const d = undo.current.pop(); if (d) canvasRef.current!.getContext('2d')!.putImageData(d, 0, 0);
    setCanUndo(undo.current.length > 0);
  };
  const save = () => {
    setSaving(true);
    canvasRef.current!.toBlob((b) => { setSaving(false); if (b) onSave(URL.createObjectURL(b)); }, 'image/png');
  };

  const tool = (on: boolean) => `mv-btn !px-3 !py-1.5 !text-xs ${on ? 'mv-btn-primary' : 'mv-btn-ghost'}`;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" data-testid="mask-editor">
      <div className="glass-card hover:!transform-none w-full max-w-4xl rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white">Sửa vùng tách nền</div>
            <div className="text-[11px] text-slate-400">Bấm vào vật bị xoá nhầm để lấy lại cả vật (vd cây nến). Chỗ nhỏ lẻ thì dùng cọ.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="mv-btn mv-btn-ghost !p-2"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setMode('pick-add')} className={tool(mode === 'pick-add')} data-testid="mask-pick-add"><MousePointerClick className="w-3.5 h-3.5" /> Bấm chọn vật</button>
          <button type="button" onClick={() => setMode('pick-remove')} className={tool(mode === 'pick-remove')} data-testid="mask-pick-remove"><SquareDashedMousePointer className="w-3.5 h-3.5" /> Bấm bỏ vật</button>
          <span className="w-px h-5 bg-white/10 mx-1" />
          <button type="button" onClick={() => setMode('keep')} className={tool(mode === 'keep')} data-testid="mask-keep"><Paintbrush className="w-3.5 h-3.5" /> Cọ giữ lại</button>
          <button type="button" onClick={() => setMode('erase')} className={tool(mode === 'erase')} data-testid="mask-erase"><Eraser className="w-3.5 h-3.5" /> Cọ xoá</button>
          {(mode === 'keep' || mode === 'erase') && <label className="flex items-center gap-2 text-[11px] text-slate-300 ml-2">Cỡ cọ
            <input type="range" min={8} max={140} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-28" />
          </label>}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 ml-2"><input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} /> Hiện ảnh gốc mờ</label>
          <button type="button" onClick={doUndo} disabled={!canUndo} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs ml-auto disabled:opacity-40"><Undo2 className="w-3.5 h-3.5" /> Hoàn tác</button>
        </div>
        <div className="relative mx-auto w-fit max-w-full rounded-xl overflow-hidden border border-white/10"
          style={{ background: 'repeating-conic-gradient(#d9dce1 0 25%, #f4f5f7 0 50%) 0 0/20px 20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {ghost && <img src={original} alt="" className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" />}
          <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
            className="relative block max-w-full max-h-[62vh] touch-none" style={{ cursor: mode.startsWith('pick') ? (samState === 'ready' ? 'pointer' : 'progress') : 'crosshair' }} data-testid="mask-canvas" />
          {dots.map((d, i) => <span key={i} className="pointer-events-none absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-indigo-500 ring-2 ring-white animate-pulse" style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }} />)}
          {!ready && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>}
          {(mode === 'pick-add' || mode === 'pick-remove') && (samState !== 'ready' || picking) && (
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1 text-[11px] text-white" data-testid="sam-status">
              {samState === 'error' ? 'Không tải được AI chọn vật thể — dùng cọ nhé' : <><Loader2 className="w-3 h-3 animate-spin" /> {samState === 'loading' ? (dots.length ? `Đã nhận ${dots.length} lần bấm — AI sẵn sàng là khoanh ngay…` : 'Đang chuẩn bị AI chọn vật thể (lần đầu ~10 giây)…') : 'Đang khoanh vật thể…'}</>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="mv-btn mv-btn-ghost !px-4 !py-2 !text-sm">Huỷ</button>
          <button type="button" onClick={save} disabled={!ready || saving} className="mv-btn mv-btn-primary !px-4 !py-2 !text-sm disabled:opacity-60" data-testid="mask-save">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
