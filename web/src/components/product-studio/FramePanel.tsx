'use client';
// Khung sale cho ảnh bìa: chọn đợt sale + kiểu khung, nhập giá từng sản phẩm → tải 1 ảnh hoặc cả loạt (ZIP).
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { BrandKit } from '@/types';
import { loadBrand } from '@/lib/brand-presets';
import { FRAME_STYLES, SALE_EVENTS, drawSaleFrame, type FrameOpts, type FrameStyle } from '@/lib/sale-frame-engine';
import { marketingZip } from '@/lib/marketing-zip';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';

export interface FrameProduct { id: string; name: string; src: string; cut?: string }
type Prices = Record<string, { price: string; old: string }>;
interface Saved { eventId: string; style: FrameStyle; label: string; sub: string; extra: string; main: string; accent: string; useLogo: boolean; prices: Prices }

const KEY = 'mivy-sale-frame';
const E0 = SALE_EVENTS[0];
const DEFAULT: Saved = { eventId: E0.id, style: 'band', label: E0.label, sub: E0.sub, extra: '', main: E0.main, accent: E0.accent, useLogo: true, prices: {} };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

export function FramePanel({ products, selId }: { products: FrameProduct[]; selId: string }) {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [s, setS] = useState<Saved>(DEFAULT);
  const [restored, setRestored] = useState(false);
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement>>({});
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const bigRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<Partial<Record<FrameStyle, HTMLCanvasElement | null>>>({});

  useEffect(() => {
    const b = loadBrand(); setKit(b);
    if (b?.logo) loadImage(b.logo).then(setLogoImg).catch(() => {});
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null; if (v) setS({ ...DEFAULT, ...v }); } catch { /* bỏ qua */ }
    setRestored(true);
    document.fonts?.ready.then(() => setTick((n) => n + 1));
  }, []);
  useEffect(() => { if (restored) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* bỏ qua */ } }, [restored, s]);

  // tải ảnh mọi sản phẩm (để xuất cả loạt)
  const srcKey = products.map((p) => p.cut || p.src).join('|');
  useEffect(() => {
    let live = true;
    Promise.all(products.map((p) => loadImage(p.cut || p.src).then((im) => [p.id, im] as const).catch(() => null)))
      .then((list) => { if (live) setImgs(Object.fromEntries(list.filter(Boolean) as [string, HTMLImageElement][])); });
    return () => { live = false; };
  }, [srcKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = products.find((p) => p.id === selId) || products[0];
  const pr = (id: string) => s.prices[id] || { price: '', old: '' };
  const set = (p: Partial<Saved>) => setS((v) => ({ ...v, ...p }));
  const setPrice = (k: 'price' | 'old', v: string) => sel && setS((x) => ({ ...x, prices: { ...x.prices, [sel.id]: { ...pr(sel.id), [k]: v } } }));
  const opts = (p: FrameProduct, style: FrameStyle, scale: number): FrameOpts => ({
    style, img: imgs[p.id] || null, cut: !!p.cut, label: s.label, sub: s.sub, extra: s.extra, price: pr(p.id).price, oldPrice: pr(p.id).old,
    main: s.main, accent: s.accent, logo: s.useLogo ? logoImg : null, fontId: kit?.fontHeadingId, scale,
  });

  useEffect(() => {
    if (!sel) return;
    if (bigRef.current) drawSaleFrame(bigRef.current, opts(sel, s.style, 0.6));
    for (const f of FRAME_STYLES) { const c = thumbRefs.current[f.id]; if (c) drawSaleFrame(c, { ...opts(sel, f.id, 0.2), watermark: false }); }
  }); // vẽ lại mỗi lần render (7 canvas, rẻ)

  const render = async (p: FrameProduct) => {
    await document.fonts?.ready;
    const c = document.createElement('canvas'); drawSaleFrame(c, opts(p, s.style, 1));
    return new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.92));
  };
  const name = (p: FrameProduct, i: number) => `${String(i + 1).padStart(2, '0')}-${slugify(p.name, 'san-pham')}-${s.eventId}.jpg`;
  const downloadOne = async () => { if (!sel) return; const b = await render(sel); if (b) downloadBlob(b, name(sel, products.indexOf(sel))); };
  const downloadAll = async () => {
    setBusy(true);
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const [i, p] of products.entries()) { const b = await render(p); if (b) files.push({ name: name(p, i), data: new Uint8Array(await b.arrayBuffer()) }); }
      downloadBlob(marketingZip(files), `mivy-khung-${s.eventId}.zip`);
    } finally { setBusy(false); }
  };

  const input = 'mv-input !py-2 !text-sm';
  const missing = products.filter((p) => !pr(p.id).price.trim()).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-6 items-start" data-testid="frame-panel" data-tick={tick}>
      <div className="space-y-4">
        <section className="glass-panel border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="mv-label">Đợt sale</div>
          <div className="flex flex-wrap gap-1.5" data-testid="frame-events">
            {SALE_EVENTS.map((e) => (
              <button key={e.id} type="button" onClick={() => set({ eventId: e.id, label: e.label, sub: e.sub, main: e.main, accent: e.accent })} data-active={s.eventId === e.id}
                className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold border transition-colors ${s.eventId === e.id ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`}>
                <span className="w-4 h-4 rounded-full border border-white/30" style={{ background: `linear-gradient(135deg, ${e.main} 50%, ${e.accent} 50%)` }} />{e.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={input} value={s.label} onChange={(e) => set({ label: e.target.value })} placeholder="Chữ lớn (vd 11.11)" data-testid="frame-label" />
            <input className={input} value={s.sub} onChange={(e) => set({ sub: e.target.value })} placeholder="Chữ nhỏ (vd SIÊU SALE)" />
          </div>
          <input className={input} value={s.extra} onChange={(e) => set({ extra: e.target.value })} placeholder="Ưu đãi thêm (vd Mua 2 giảm 10%)" data-testid="frame-extra" />
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-1.5">Màu chính <input type="color" value={s.main} onChange={(e) => set({ main: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent" /></label>
            <label className="flex items-center gap-1.5">Màu nhấn <input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent" /></label>
            {kit?.logo && <label className="flex items-center gap-1.5 ml-auto"><input type="checkbox" checked={s.useLogo} onChange={(e) => set({ useLogo: e.target.checked })} /> Logo shop</label>}
          </div>
        </section>

        <section className="glass-panel border border-white/10 rounded-2xl p-4 space-y-2.5">
          <div className="mv-label">Kiểu khung</div>
          <div className="grid grid-cols-3 gap-2" data-testid="frame-styles">
            {FRAME_STYLES.map((f) => (
              <button key={f.id} type="button" onClick={() => set({ style: f.id })} data-active={s.style === f.id} title={f.name}
                className={`rounded-xl p-1 border-2 transition-colors ${s.style === f.id ? 'border-white' : 'border-transparent hover:border-white/30'}`}>
                <canvas ref={(el) => { thumbRefs.current[f.id] = el; }} className="block w-full aspect-square rounded-lg" />
                <div className="text-[10px] text-slate-300 mt-1 truncate">{f.name}</div>
              </button>
            ))}
          </div>
        </section>

        {sel && (
          <section className="glass-panel border border-white/10 rounded-2xl p-4 space-y-2.5">
            <div className="mv-label">Giá của sản phẩm đang chọn</div>
            <div className="grid grid-cols-2 gap-2">
              <input className={input} inputMode="numeric" value={pr(sel.id).price} onChange={(e) => setPrice('price', e.target.value)} placeholder="Giá bán (vd 199000)" data-testid="frame-price" />
              <input className={input} inputMode="numeric" value={pr(sel.id).old} onChange={(e) => setPrice('old', e.target.value)} placeholder="Giá gốc (tự tính % giảm)" data-testid="frame-old" />
            </div>
            <p className="text-[11px] text-slate-500">Mỗi sản phẩm một giá: bấm ảnh khác ở thanh trên rồi nhập tiếp. Bỏ trống giá thì khung chỉ hiện chữ sale.</p>
          </section>
        )}
      </div>

      <div className="glass-panel border border-white/10 rounded-2xl p-4 lg:sticky lg:top-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-xs text-slate-400">Ảnh bìa 1080×1080 · Shopee, Lazada, TikTok Shop{products.length > 1 && missing > 0 && <span className="text-amber-400"> · {missing}/{products.length} ảnh chưa nhập giá</span>}</div>
          <div className="flex gap-2">
            <button type="button" onClick={downloadOne} className="mv-btn mv-btn-ghost !py-2 !text-xs"><Download className="w-4 h-4" /> Tải ảnh này</button>
            <button type="button" onClick={downloadAll} disabled={busy} className="mv-btn mv-btn-primary !py-2 !text-xs disabled:opacity-50" data-testid="frame-download-all">
              <Download className="w-4 h-4" /> {busy ? 'Đang xuất…' : `Tải cả loạt (${products.length})`}
            </button>
          </div>
        </div>
        <canvas ref={bigRef} data-testid="frame-preview" className="block w-full max-w-[640px] mx-auto aspect-square h-auto rounded-xl shadow-lg" />
      </div>
    </div>
  );
}
