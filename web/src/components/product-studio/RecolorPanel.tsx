'use client';
// Tab "Đổi màu": 1 ảnh sản phẩm → nhiều phân loại màu (áo, túi, giày…) bằng code, tức thì, miễn phí.
// Cần ảnh đã tách nền để biết đâu là sản phẩm. Mỗi màu "Dùng" thành 1 ảnh sản phẩm mới.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Package, Plus, Scissors, X } from 'lucide-react';
import { COLOR_PRESETS, planRecolor, readSource, renderVariant, type RecolorPlan, type RecolorSource } from '@/lib/recolor';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
const DEFAULT = ['Đen', 'Trắng', 'Be', 'Xanh navy', 'Hồng', 'Đỏ đô'];
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-');

function Variant({ src, plan, hex }: { src: RecolorSource; plan: RecolorPlan; hex: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => { if (ref.current) renderVariant(src, plan, hex, ref.current); }, [src, plan, hex]);
  return <canvas ref={ref} className="block w-full h-full object-contain" />;
}

export function RecolorPanel({ shared, name, cutting, onCut, onSend }: {
  shared: { src: string; cut?: string }; name: string; cutting: boolean; onCut: () => void;
  onSend: (items: { name: string; src: string; cut: string }[]) => void;
}) {
  const [imgs, setImgs] = useState<{ img: HTMLImageElement; cut: HTMLImageElement } | null>(null);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>(() => COLOR_PRESETS.filter((c) => DEFAULT.includes(c.name)));
  const [whole, setWhole] = useState(false);
  const [tol, setTol] = useState(28);
  const [custom, setCustom] = useState('#3a7bd5');
  const [busy, setBusy] = useState<'' | 'zip' | string>('');
  const [sent, setSent] = useState<string[]>([]);

  useEffect(() => {
    let on = true; setImgs(null); setSent([]);
    if (shared.cut) Promise.all([load(shared.src), load(shared.cut)]).then(([img, cut]) => on && setImgs({ img, cut })).catch(() => null);
    return () => { on = false; };
  }, [shared.src, shared.cut]);
  const small = useMemo(() => (imgs ? readSource(imgs.img, imgs.cut, 520) : null), [imgs]);
  const plan = useMemo(() => (small ? planRecolor(small, whole, tol) : null), [small, whole, tol]);

  // bản full cỡ: ảnh có nền + ảnh tách nền cùng màu (khỏi tách nền lại)
  const full = (hex: string) => {
    const s = readSource(imgs!.img, imgs!.cut), p = planRecolor(s, whole, tol);
    const c = renderVariant(s, p, hex);
    const cut = document.createElement('canvas'); cut.width = c.width; cut.height = c.height;
    const x = cut.getContext('2d')!; x.drawImage(c, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(imgs!.cut, 0, 0, c.width, c.height);
    return { src: c.toDataURL('image/jpeg', 0.92), cut: cut.toDataURL('image/png') };
  };
  const send = async (list: typeof colors) => {
    setBusy(list.length > 1 ? 'all' : list[0].hex);
    await new Promise((r) => setTimeout(r, 30)); // cho nút kịp hiện vòng quay
    try { onSend(list.map((c) => ({ name: `${name}-${slug(c.name)}`, ...full(c.hex) }))); setSent((s) => [...s, ...list.map((c) => c.hex)]); }
    finally { setBusy(''); }
  };
  const zip = async () => {
    setBusy('zip');
    try {
      const { zipSync } = await import('fflate');
      const files: Record<string, Uint8Array> = {};
      for (const c of colors) {
        const s = readSource(imgs!.img, imgs!.cut), cv = renderVariant(s, planRecolor(s, whole, tol), c.hex);
        const b = await new Promise<Blob>((r) => cv.toBlob((x) => r(x!), 'image/jpeg', 0.92));
        files[`${name}-${slug(c.name)}.jpg`] = new Uint8Array(await b.arrayBuffer());
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }));
      a.download = `${name}-${colors.length}-mau.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally { setBusy(''); }
  };
  const toggle = (c: { name: string; hex: string }) => setColors((l) => (l.some((x) => x.hex === c.hex) ? l.filter((x) => x.hex !== c.hex) : l.length >= 12 ? l : [...l, c]));

  if (!shared.cut) {
    return (
      <div className="glass-panel border border-white/10 rounded-2xl p-8 text-center space-y-3" data-testid="recolor-need-cut">
        <p className="text-sm text-slate-300">Cần tách nền trước để AI biết đâu là sản phẩm.</p>
        <button type="button" onClick={onCut} disabled={cutting} className="mv-btn mv-btn-primary disabled:opacity-60">
          {cutting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />} {cutting ? 'Đang tách nền…' : 'Tách nền ảnh này'}
        </button>
      </div>
    );
  }
  const swatch = plan && (plan.neutral ? 'linear-gradient(135deg,#fff,#111)' : `hsl(${plan.hue} 70% 50%)`);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start" data-testid="recolor-panel">
      <div className="glass-panel border border-white/10 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white">Đổi màu sản phẩm</p>
          <p className="text-xs text-slate-400 mt-1">1 ảnh ra đủ phân loại màu để đăng bán. Hợp nhất với áo, túi, giày 1 màu trơn.</p>
        </div>
        <div className="mv-seg flex">
          <button type="button" onClick={() => setWhole(false)} data-active={!whole} className="mv-seg-btn flex-1 !justify-center">Màu chính</button>
          <button type="button" onClick={() => setWhole(true)} data-active={whole} className="mv-seg-btn flex-1 !justify-center">Cả sản phẩm</button>
        </div>
        {!whole && plan && (
          <div className="space-y-2">
            <p className="text-xs text-slate-300 flex items-center gap-2" data-testid="recolor-main">
              <span className="w-4 h-4 rounded-full border border-white/30" style={{ background: swatch! }} />
              {plan.neutral ? 'Màu chính: trắng / đen / xám' : 'Màu chính tìm được'} — chi tiết khác màu (khoá, đế, logo) giữ nguyên
            </p>
            {!plan.neutral && (
              <label className="block"><span className="mv-label">Độ rộng vùng màu: {tol}°</span>
                <input type="range" min={10} max={60} value={tol} onChange={(e) => setTol(+e.target.value)} className="w-full mt-1" /></label>
            )}
          </div>
        )}
        <div>
          <span className="mv-label">Chọn màu ({colors.length}/12)</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5" data-testid="recolor-colors">
            {[...COLOR_PRESETS, ...colors.filter((c) => !COLOR_PRESETS.some((p) => p.hex === c.hex))].map((c) => {
              const on = colors.some((x) => x.hex === c.hex);
              return (
                <button key={c.hex} type="button" onClick={() => toggle(c)} title={c.name}
                  className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border text-[11px] ${on ? 'border-white text-white bg-white/10' : 'border-white/15 text-slate-400 hover:border-white/40'}`}>
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: c.hex }} />{c.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-9 h-8 rounded bg-transparent" aria-label="Màu tuỳ chọn" />
            <button type="button" onClick={() => toggle({ name: custom.toUpperCase(), hex: custom })} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Plus className="w-3.5 h-3.5" /> Thêm màu này</button>
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-white/10">
          <button type="button" onClick={() => send(colors)} disabled={!colors.length || !!busy || !imgs} className="w-full mv-btn mv-btn-primary !justify-center disabled:opacity-60" data-testid="recolor-use-all">
            {busy === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Thêm cả {colors.length} màu vào bộ ảnh
          </button>
          <button type="button" onClick={zip} disabled={!colors.length || !!busy || !imgs} className="w-full mv-btn mv-btn-ghost !justify-center disabled:opacity-60" data-testid="recolor-zip">
            {busy === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Tải ZIP {colors.length} màu
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="recolor-grid">
        <div className="glass-panel border border-white/10 rounded-xl p-2 space-y-1.5">
          <div className="aspect-square bg-white rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shared.src} alt="" className="w-full h-full object-contain" />
          </div>
          <p className="text-[11px] text-slate-400 text-center">Ảnh gốc</p>
        </div>
        {small && plan && colors.map((c) => (
          <div key={c.hex} className="glass-panel border border-white/10 rounded-xl p-2 space-y-1.5" data-testid="recolor-variant">
            <div className="aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center"><Variant src={small} plan={plan} hex={c.hex} /></div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.hex }} />
              <span className="text-[11px] text-slate-300 truncate flex-1">{c.name}</span>
              {sent.includes(c.hex) ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : (
                <button type="button" onClick={() => send([c])} disabled={!!busy} className="text-[11px] text-indigo-300 hover:text-white disabled:opacity-50">{busy === c.hex ? '…' : 'Dùng'}</button>
              )}
              <button type="button" onClick={() => toggle(c)} title="Bỏ màu này" className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        {!imgs && <div className="col-span-full flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
      </div>
    </div>
  );
}
