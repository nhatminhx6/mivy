'use client';
// Ảnh sản phẩm chuẩn sàn — HÀNG LOẠT, chạy 100% trên trình duyệt (không server, không AI realtime):
// tải nhiều ảnh → (bấm) tách nền → chọn nền/bóng/cỡ → xuất đủ khổ Shopee·Lazada 1:1, FB·IG 4:5, TikTok 9:16 → ZIP theo sàn.

import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, Maximize2, Package, Scissors, Trash2, Upload } from 'lucide-react';
import type { BrandKit } from '@/types';
import { loadBrand } from '@/lib/brand-presets';
import { POSTER_THEMES, type PosterThemeId } from '@/lib/infographic-engine';
import { posterColorsFromBrand } from '@/lib/poster-engine';
import { BG_KINDS, SCENE_CATS, SHOT_PLATFORMS, drawProductShot, sceneUrl, type BgKind, type ShadowKind, type ShotBg, type ShotLayout, type ShotOpts } from '@/lib/product-shot';
import { cutoutImage, scaleImage, slugify } from '@/lib/image-utils';
import { downloadBlob } from '@/lib/html-export';
import { useLightbox } from '@/components/ImageLightbox';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';

interface Prod { id: string; name: string; src: string; cut?: string; status: 'raw' | 'cutting' | 'error' }
const SAMPLES = ['04-sneaker', '02-dress', '01-tshirt'];
const SHADOWS: { id: ShadowKind; name: string }[] = [{ id: 'soft', name: 'Bóng mềm' }, { id: 'contact', name: 'Bóng chạm sàn' }, { id: 'none', name: 'Không bóng' }];
const MAX = 30;
const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

function ShotCanvas({ opts }: { opts: ShotOpts | null }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // chỉ vẽ lại khi thông số vẽ thật sự đổi (gõ tên ảnh… không làm 90 canvas vẽ lại)
  const key = opts ? [opts.layout, opts.img.src, opts.cut, opts.bg.kind, opts.bg.tint, opts.bg.soft, opts.bg.main, opts.bg.scene?.src, opts.size, opts.shadow, opts.safeZone].join('|') : '';
  useEffect(() => { if (ref.current && opts) drawProductShot(ref.current, { ...opts, scale: 0.32 }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} data-ready={opts ? '1' : undefined} className="block w-full h-full" />;
}

export default function ProductShotPage() {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [prods, setProds] = useState<Prod[]>([]);
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement>>({});
  const [bgKind, setBgKind] = useState<BgKind>('white');
  const [themeId, setThemeId] = useState<PosterThemeId | 'brand'>('pink');
  const [sceneCat, setSceneCat] = useState('retail');
  const [sceneIdx, setSceneIdx] = useState(0);
  const [sceneImg, setSceneImg] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState(0.8);
  const [shadow, setShadow] = useState<ShadowKind>('soft');
  const [platforms, setPlatforms] = useState<ShotLayout[]>(['1:1', '4:5', '9:16']);
  const [safeZone, setSafeZone] = useState(false);
  const [busy, setBusy] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { const b = loadBrand(); if (b) setKit(b); }, []);
  // nạp ảnh (gốc + đã tách nền) thành HTMLImageElement để vẽ canvas
  useEffect(() => {
    prods.flatMap((p) => [p.src, p.cut]).filter((u): u is string => !!u && !imgs[u])
      .forEach((u) => loadImage(u).then((im) => setImgs((m) => ({ ...m, [u]: im }))).catch(() => null));
  }, [prods, imgs]);
  useEffect(() => {
    if (bgKind !== 'scene') return;
    let on = true;
    loadImage(sceneUrl(sceneCat, sceneIdx)).then((im) => { if (on) setSceneImg(im); }).catch(() => null);
    return () => { on = false; };
  }, [bgKind, sceneCat, sceneIdx]);

  const theme = themeId === 'brand' && kit ? posterColorsFromBrand(kit) : (POSTER_THEMES.find((t) => t.id === themeId) || POSTER_THEMES[0]);
  const brandC = kit ? posterColorsFromBrand(kit) : theme;
  const bg: ShotBg = bgKind === 'brand'
    ? { kind: 'brand', tint: brandC.tint, soft: brandC.soft, main: brandC.main }
    : { kind: bgKind, tint: theme.tint, soft: theme.soft, main: theme.main, scene: bgKind === 'scene' ? sceneImg : null };
  const optsFor = (p: Prod, layout: ShotLayout, preview = true): ShotOpts | null => {
    const img = imgs[p.cut || p.src];
    if (!img || (bgKind === 'scene' && p.cut && !sceneImg)) return null;
    return { layout, img, cut: !!p.cut, bg, size, shadow, safeZone: preview && safeZone };
  };

  // ---------- ảnh vào ----------
  const addFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, MAX - prods.length));
    for (const f of list) {
      const src = await scaleImage(f, 1600);
      setProds((ps) => [...ps, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: f.name.replace(/\.[^.]+$/, ''), src, status: 'raw' }]);
    }
  };
  const addSamples = () => setProds((ps) => [...ps, ...SAMPLES.map((s) => ({ id: `${s}-${Date.now()}`, name: s.replace(/^\d+-/, ''), src: `/sample-products/${s}.png`, cut: `/sample-products/${s}.png`, status: 'raw' as const }))]);
  const cutOne = async (id: string) => {
    const p = prods.find((x) => x.id === id);
    if (!p || p.status === 'cutting') return;
    setProds((ps) => ps.map((x) => (x.id === id ? { ...x, status: 'cutting' } : x)));
    try {
      const cut = await cutoutImage(p.src);
      setProds((ps) => ps.map((x) => (x.id === id ? { ...x, cut, status: 'raw' } : x)));
    } catch {
      setProds((ps) => ps.map((x) => (x.id === id ? { ...x, status: 'error' } : x)));
    }
  };
  const cutAll = async () => { if (busy) return; setBusy('cutall'); try { for (const p of prods.filter((x) => !x.cut)) await cutOne(p.id); } finally { setBusy(''); } };
  const togglePlatform = (id: ShotLayout) => setPlatforms((l) => (l.includes(id) ? (l.length > 1 ? l.filter((x) => x !== id) : l) : SHOT_PLATFORMS.map((p) => p.id).filter((x) => x === id || l.includes(x))));

  // ---------- xuất (JPG nhẹ, nền đặc) ----------
  const shotBlob = (p: Prod, layout: ShotLayout): Promise<Blob> => {
    const o = optsFor(p, layout, false);
    if (!o) return Promise.reject(new Error('Ảnh chưa sẵn sàng'));
    const c = document.createElement('canvas');
    drawProductShot(c, o);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('rỗng'))), 'image/jpeg', 0.92));
  };
  const fileName = (p: Prod, l: ShotLayout) => `${slugify(p.name, 'san-pham')}-${l.replace(':', 'x')}.jpg`;
  const cells = prods.flatMap((p) => platforms.map((l) => ({ p, l, label: `${p.name} · ${SHOT_PLATFORMS.find((x) => x.id === l)!.name}` })));
  const lb = useLightbox(cells, (i) => shotBlob(cells[i].p, cells[i].l), (i) => shotBlob(cells[i].p, cells[i].l).then((b) => downloadBlob(b, fileName(cells[i].p, cells[i].l))));
  const downloadAll = async () => {
    if (busy || !prods.length) return;
    setBusy('zip');
    try {
      const files: Record<string, Uint8Array> = {};
      for (const { p, l } of cells) {
        const folder = SHOT_PLATFORMS.find((x) => x.id === l)!.folder;
        files[`${folder}/${fileName(p, l)}`] = new Uint8Array(await (await shotBlob(p, l)).arrayBuffer());
      }
      const { zipSync } = await import('fflate');
      downloadBlob(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }), `anh-san-pham-chuan-san-${prods.length}-anh.zip`);
    } finally { setBusy(''); }
  };

  const uncut = prods.filter((p) => !p.cut).length;
  const themeChips = (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {kit && (
        <button type="button" onClick={() => setThemeId('brand')} className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold ${themeId === 'brand' ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>
          <span className="w-5 h-5 rounded-full" style={{ background: brandC.main, boxShadow: `inset 0 0 0 3px ${brandC.soft}` }} />Thương hiệu
        </button>
      )}
      {POSTER_THEMES.map((t) => (
        <button key={t.id} type="button" onClick={() => setThemeId(t.id)} className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold ${themeId === t.id ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>
          <span className="w-5 h-5 rounded-full" style={{ background: t.main, boxShadow: `inset 0 0 0 3px ${t.soft}` }} />{t.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ảnh sản phẩm chuẩn sàn" sub="Tải nhiều ảnh một lúc → tách nền → chọn nền & bóng → xuất đủ khổ Shopee, Facebook, TikTok trong 1 file ZIP. Chạy ngay trên máy, không cần chờ server."
        actions={
          <button type="button" onClick={downloadAll} disabled={!!busy || !prods.length} className="mv-btn mv-btn-primary disabled:opacity-60">
            {busy === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} {busy === 'zip' ? 'Đang đóng gói…' : `Tải tất cả (${cells.length} ảnh)`}
          </button>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6 items-start">
        {/* Cài đặt (áp cho cả loạt) */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <CollapsibleSection title="1 · Ảnh sản phẩm" right={<span className="text-[11px] text-slate-400">{prods.length}/{MAX}</span>}>
            <button type="button" onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${drag ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-400/60'}`}>
              <Upload className="w-6 h-6 mx-auto text-slate-300" />
              <div className="mt-2 text-sm font-semibold text-white">Kéo thả hoặc bấm để chọn ảnh</div>
              <div className="text-[11px] text-slate-400">Chọn nhiều ảnh cùng lúc · JPG / PNG / WEBP · tối đa {MAX} ảnh</div>
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" data-testid="shot-upload" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={cutAll} disabled={!uncut || !!busy} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-50">
                {busy === 'cutall' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} Tách nền tất cả ({uncut})
              </button>
              <button type="button" onClick={addSamples} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><ImagePlus className="w-3.5 h-3.5" /> Dùng ảnh mẫu</button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Tách nền chạy trên máy anh, lần đầu sẽ tải mô hình (~vài chục MB) nên hơi lâu.</p>
          </CollapsibleSection>

          <CollapsibleSection title="2 · Nền">
            <div className="flex flex-wrap gap-1.5">{BG_KINDS.map((b) => <button key={b.id} type="button" onClick={() => setBgKind(b.id)} className={chip(bgKind === b.id)}>{b.name}</button>)}</div>
            {(bgKind === 'gradient' || bgKind === 'podium') && themeChips}
            {bgKind === 'brand' && !kit && <p className="text-[11px] text-amber-200 mt-2">Chưa có bộ nhận diện — đang dùng màu mặc định.</p>}
            {bgKind === 'scene' && (
              <div className="mt-2.5 space-y-2">
                <div className="flex flex-wrap gap-1.5">{SCENE_CATS.map((c) => <button key={c.id} type="button" onClick={() => { setSceneCat(c.id); setSceneIdx(0); }} className={chip(sceneCat === c.id)}>{c.name}</button>)}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <button key={i} type="button" onClick={() => setSceneIdx(i)} className={`aspect-square rounded-lg overflow-hidden border-2 ${sceneIdx === i ? 'border-indigo-400' : 'border-transparent hover:border-white/30'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sceneUrl(sceneCat, i)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2.5">Ảnh chưa tách nền sẽ được chuẩn hoá khổ với nền mờ từ chính ảnh đó.</p>
          </CollapsibleSection>

          <CollapsibleSection title="3 · Bố cục & khổ xuất">
            <label className="block">
              <span className="mv-label flex justify-between mb-1.5"><span>Cỡ sản phẩm</span><span className="normal-case text-slate-400">{Math.round(size * 100)}%</span></span>
              <input type="range" min={55} max={95} value={Math.round(size * 100)} onChange={(e) => setSize(Number(e.target.value) / 100)} className="w-full accent-indigo-400" />
            </label>
            <div className="mv-label mt-3 mb-1.5">Bóng đổ</div>
            <div className="flex flex-wrap gap-1.5">{SHADOWS.map((s) => <button key={s.id} type="button" onClick={() => setShadow(s.id)} className={chip(shadow === s.id)}>{s.name}</button>)}</div>
            <div className="mv-label mt-3 mb-1.5">Xuất cho</div>
            <div className="space-y-1.5">
              {SHOT_PLATFORMS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-slate-200">
                  <input type="checkbox" checked={platforms.includes(p.id)} onChange={() => togglePlatform(p.id)} /> {p.name} <span className="text-slate-500">· {p.w}×{p.h}</span>
                </label>
              ))}
            </div>
            {platforms.includes('9:16') && (
              <label className="flex items-center gap-2 text-xs text-slate-300 mt-3">
                <input type="checkbox" checked={safeZone} onChange={(e) => setSafeZone(e.target.checked)} /> Hiện vùng bị nút TikTok che (chỉ để xem, không xuất)
              </label>
            )}
          </CollapsibleSection>
        </div>

        {/* Kết quả */}
        <div className="min-w-0 space-y-4" data-testid="shot-results">
          {!prods.length ? (
            <div className="glass-panel border border-white/10 rounded-2xl p-10 text-center">
              <ImagePlus className="w-10 h-10 mx-auto text-slate-400" />
              <div className="mt-3 text-base font-bold text-white">Chưa có ảnh nào</div>
              <p className="text-sm text-slate-400 mt-1">Tải ảnh sản phẩm ở cột bên trái, hoặc bấm “Dùng ảnh mẫu” để xem thử.</p>
            </div>
          ) : prods.map((p) => (
            <div key={p.id} className="glass-panel border border-white/10 rounded-2xl p-3" data-testid="shot-product">
              <div className="flex items-center gap-2.5 mb-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.cut || p.src} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/90 p-0.5" />
                <input value={p.name} onChange={(e) => setProds((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} className="mv-input !py-1.5 !text-sm flex-1 min-w-0" aria-label="Tên ảnh" />
                {p.cut ? <span className="text-[11px] font-semibold text-emerald-300 shrink-0">Đã tách nền</span>
                  : p.status === 'error' ? <span className="text-[11px] text-rose-300 shrink-0">Tách lỗi</span> : null}
                {!p.cut && (
                  <button type="button" onClick={() => cutOne(p.id)} disabled={p.status === 'cutting'} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs shrink-0 disabled:opacity-60">
                    {p.status === 'cutting' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tách…</> : <><Scissors className="w-3.5 h-3.5" /> Tách nền</>}
                  </button>
                )}
                <button type="button" onClick={() => setProds((ps) => ps.filter((x) => x.id !== p.id))} aria-label="Xoá ảnh" className="mv-btn mv-btn-ghost !p-2 !text-rose-300 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-3 items-end overflow-x-auto pb-1">
                {platforms.map((l) => {
                  const P = SHOT_PLATFORMS.find((x) => x.id === l)!;
                  const i = cells.findIndex((c) => c.p.id === p.id && c.l === l);
                  return (
                    <div key={l} className="shrink-0" style={{ width: l === '9:16' ? 150 : l === '4:5' ? 190 : 210 }}>
                      <button type="button" onClick={() => lb.open(i)} aria-label={`Xem lớn ${cells[i].label}`} data-testid="shot-cell"
                        className="group relative block w-full rounded-xl overflow-hidden border border-white/10 hover:border-indigo-400 cursor-zoom-in bg-white" style={{ aspectRatio: `${P.w} / ${P.h}` }}>
                        <ShotCanvas opts={optsFor(p, l)} />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/30 group-hover:opacity-100">
                          <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900">{lb.loading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Maximize2 className="w-3 h-3" />} Xem lớn</span>
                        </span>
                      </button>
                      <div className="flex items-center justify-between mt-1 px-0.5">
                        <span className="text-[10px] text-slate-400 truncate">{l} · {P.name.split(' · ')[0]}</span>
                        <button type="button" onClick={() => shotBlob(p, l).then((b) => downloadBlob(b, fileName(p, l)))} aria-label={`Tải ${cells[i].label}`} className="text-slate-400 hover:text-white"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {lb.node}
    </div>
  );
}
