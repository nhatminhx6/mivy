'use client';
// Ảnh sản phẩm chuẩn sàn — HÀNG LOẠT, chạy 100% trên trình duyệt (không server, không AI realtime):
// tải nhiều ảnh → (bấm) tách nền → chọn nền/bóng/cỡ → xuất đủ khổ Shopee·Lazada 1:1, FB·IG 4:5, TikTok 9:16 → ZIP theo sàn.

import { useEffect, useRef, useState } from 'react';
import { Check, Clapperboard, Download, Frame, LayoutList, Eraser, ImagePlus, Palette, ScanSearch, Loader2, Maximize2, Package, Paintbrush, Scissors, Shirt, Tag, Trash2, Undo2, Upload, Wand2 } from 'lucide-react';
import type { BrandKit } from '@/types';
import { loadBrand } from '@/lib/brand-presets';
import { POSTER_THEMES, type PosterThemeId } from '@/lib/infographic-engine';
import { posterColorsFromBrand } from '@/lib/poster-engine';
import { BG_KINDS, SCENE_CATS, SHOT_PLATFORMS, drawProductShot, sceneUrl, type BgKind, type MarkPos, type ShadowKind, type ShotBg, type ShotLayout, type ShotOpts } from '@/lib/product-shot';
import { cutoutImage, scaleImage, slugify } from '@/lib/image-utils';
import { downloadBlob } from '@/lib/html-export';
import { useLightbox } from '@/components/ImageLightbox';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { MaskEditor } from '@/components/MaskEditor';
import { takeHandoff } from '@/lib/model-shot';
import { clearProject, loadProject, persistUrl, saveProject } from '@/lib/project-store';
import { getSamSession } from '@/lib/sam-select';
import { PageHeader } from '@/components/PageHeader';
import { AsyncButton } from '@/components/AsyncButton';
import { BannerPanel } from '@/components/product-studio/BannerPanel';
import { ModelPanel } from '@/components/product-studio/ModelPanel';
import { ErasePanel } from '@/components/product-studio/ErasePanel';
import { UpscalePanel } from '@/components/product-studio/UpscalePanel';
import { RecolorPanel } from '@/components/product-studio/RecolorPanel';
import { VideoPanel } from '@/components/product-studio/VideoPanel';
import { DetailPanel } from '@/components/product-studio/DetailPanel';
import { FramePanel } from '@/components/product-studio/FramePanel';

// Trang chung "Ảnh & video sản phẩm": 1 bộ ảnh → 4 kiểu (nền studio, người mẫu AI, banner giá, video)
type Tab = 'studio' | 'erase' | 'sharpen' | 'recolor' | 'model' | 'banner' | 'frame' | 'detail' | 'video';
const TABS: { id: Tab; name: string; icon: typeof Wand2 }[] = [
  { id: 'studio', name: 'Nền studio', icon: Wand2 },
  { id: 'erase', name: 'Xoá vật thể', icon: Eraser },
  { id: 'sharpen', name: 'Làm nét', icon: ScanSearch },
  { id: 'recolor', name: 'Đổi màu', icon: Palette },
  { id: 'model', name: 'Người mẫu AI', icon: Shirt },
  { id: 'banner', name: 'Banner giá', icon: Tag },
  { id: 'frame', name: 'Khung sale', icon: Frame },
  { id: 'detail', name: 'Bộ ảnh chi tiết', icon: LayoutList },
  { id: 'video', name: 'Video', icon: Clapperboard },
];

interface Prod { id: string; name: string; src: string; cut?: string; status: 'raw' | 'cutting' | 'error' }
const SAMPLES = ['10-perfume', '04-sneaker'];
const SHADOWS: { id: ShadowKind; name: string }[] = [{ id: 'soft', name: 'Bóng mềm' }, { id: 'contact', name: 'Bóng chạm sàn' }, { id: 'none', name: 'Không bóng' }];
const MAX = 30;
const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

function ShotCanvas({ opts }: { opts: ShotOpts | null }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // chỉ vẽ lại khi thông số vẽ thật sự đổi (gõ tên ảnh… không làm 90 canvas vẽ lại)
  const key = opts ? [opts.layout, opts.img.src, opts.cut, opts.bg.kind, opts.bg.tint, opts.bg.soft, opts.bg.main, opts.bg.scene?.src, opts.size, opts.shadow, opts.safeZone, opts.mark?.img.src.length, opts.mark?.img.src.slice(-40), opts.mark?.pos, opts.mark?.opacity].join('|') : '';
  useEffect(() => { if (ref.current && opts) drawProductShot(ref.current, { ...opts, scale: 0.32 }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} data-ready={opts ? '1' : undefined} className="block w-full h-full" />;
}

export default function ProductStudioPage() {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [prods, setProds] = useState<Prod[]>([]);
  const [tab, setTab] = useState<Tab>('studio');
  const [selId, setSelId] = useState<string | null>(null);
  // ?tab=model|banner|video (link cũ chuyển hướng về đây)
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab') as Tab | null; if (t && TABS.some((x) => x.id === t)) setTab(t); }, []);
  const changeTab = (t: Tab) => { setTab(t); try { window.history.replaceState(null, '', t === 'studio' ? '/studio/image' : `/studio/image?tab=${t}`); } catch { /* bỏ qua */ } };
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
  // logo shop đóng lên ảnh xuất (lấy từ bộ nhận diện hoặc tải riêng)
  const [mark, setMark] = useState<{ on: boolean; pos: MarkPos; opacity: number; src?: string }>({ on: false, pos: 'br', opacity: 0.9 });
  const [markImg, setMarkImg] = useState<HTMLImageElement | null>(null);
  const markRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState('');
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { const b = loadBrand(); if (b) setKit(b); }, []);
  // ảnh chuyển sang từ trang Người mẫu AI
  // tự lưu bài (IndexedDB): nạp lại khi mở trang, lưu chậm 0,8s mỗi khi đổi
  interface Saved { prods: { id: string; name: string; src: string; cut?: string }[]; s: { bgKind: BgKind; themeId: PosterThemeId | 'brand'; sceneCat: string; sceneIdx: number; size: number; shadow: ShadowKind; platforms: ShotLayout[]; tab: Tab; selId: string | null; mark?: typeof mark } }
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    loadProject<Saved>('product-studio').then((v) => {
      if (!v) return;
      setProds((ps) => (ps.length ? ps : v.prods.map((x) => ({ ...x, status: 'raw' as const }))));
      setBgKind(v.s.bgKind); setThemeId(v.s.themeId); setSceneCat(v.s.sceneCat); setSceneIdx(v.s.sceneIdx); setSize(v.s.size); setShadow(v.s.shadow); setPlatforms(v.s.platforms); setSelId(v.s.selId); if (v.s.mark) setMark(v.s.mark);
      if (!new URLSearchParams(window.location.search).get('tab')) setTab(v.s.tab);
    }).catch(() => null).finally(() => setRestored(true));
  }, []);
  useEffect(() => {
    if (!restored) return;
    setSavedAt(null); // có thay đổi chưa lưu
    const id = setTimeout(async () => {
      try {
        const ps = await Promise.all(prods.filter((x) => x.status !== 'cutting').map(async (x) => ({ id: x.id, name: x.name, src: await persistUrl(x.src), cut: x.cut ? await persistUrl(x.cut) : undefined })));
        await saveProject<Saved>('product-studio', { prods: ps, s: { bgKind, themeId, sceneCat, sceneIdx, size, shadow, platforms, tab, selId, mark: { ...mark, src: mark.src ? await persistUrl(mark.src) : undefined } } });
        setSavedAt(Date.now());
      } catch { /* bộ nhớ trình duyệt đầy → bỏ qua */ }
    }, 800);
    return () => clearTimeout(id);
  }, [restored, prods, bgKind, themeId, sceneCat, sceneIdx, size, shadow, platforms, tab, selId, mark]);
  const markSrc = mark.src || kit?.logo || '';
  useEffect(() => { setMarkImg(null); if (markSrc) loadImage(markSrc).then(setMarkImg).catch(() => null); }, [markSrc]);
  const newProject = async () => { if (!confirm('Xoá hết ảnh đang làm để bắt đầu bài mới?')) return; await clearProject('product-studio').catch(() => null); setProds([]); setSelId(null); };
  useEffect(() => { const h = takeHandoff('image'); if (h) setProds((ps) => [...ps, { id: `model-${Date.now()}`, name: 'nguoi-mau-ai', src: h, status: 'raw' }]); }, []);
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
    if (!img || (bgKind === 'scene' && !sceneImg)) return null;
    return { layout, img, cut: !!p.cut, bg, size, shadow, safeZone: preview && safeZone, mark: mark.on && markImg ? { img: markImg, pos: mark.pos, opacity: mark.opacity } : undefined };
  };

  // ---------- ảnh vào ----------
  const addFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, MAX - prods.length));
    for (const f of list) {
      const src = await scaleImage(f, 1600);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setProds((ps) => [...ps, { id, name: f.name.replace(/\.[^.]+$/, ''), src, status: 'raw' }]);
    }
  };
  const cutSrc = async (id: string, src: string) => {
    setProds((ps) => ps.map((x) => (x.id === id ? { ...x, status: 'cutting' } : x)));
    try {
      const cut = await cutoutImage(src, false); // không cắt viền → sửa bằng cọ khớp ảnh gốc
      setProds((ps) => ps.map((x) => (x.id === id ? { ...x, cut, status: 'raw' } : x)));
      getSamSession(src).catch(() => null); // chuẩn bị sẵn AI chọn vật cho khung sửa
    } catch {
      setProds((ps) => ps.map((x) => (x.id === id ? { ...x, status: 'error' } : x)));
    }
  };
  // ảnh đã sửa (xoá vật, làm nét) thay ảnh gốc → tách nền lại rồi sang Nền studio
  const replaceSrc = (id: string, url: string) => {
    setProds((ps) => ps.map((x) => (x.id === id ? { ...x, src: url, cut: undefined, status: 'raw' } : x)));
    cutSrc(id, url); changeTab('studio');
  };
  // xoá chữ hàng loạt (tab Xoá vật thể) — giữ bản cũ để hoàn tác 1 lần
  const [batchUndo, setBatchUndo] = useState<Record<string, { src: string; cut?: string }> | null>(null);
  const eraseTextAll = async (keepOnProduct: boolean, onProgress: (done: number, total: number) => void) => {
    const { autoEraseText } = await import('@/lib/textdetect');
    const list = prods.filter((p) => p.status !== 'cutting'); const old: Record<string, { src: string; cut?: string }> = {};
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const r = await autoEraseText(p.src, p.cut, keepOnProduct).catch(() => null);
      if (r) { old[p.id] = { src: p.src, cut: p.cut }; n++; setProds((ps) => ps.map((x) => (x.id === p.id ? { ...x, src: r.src, cut: r.cut } : x))); }
      onProgress(i + 1, list.length);
    }
    setBatchUndo(n ? old : null);
    return n;
  };
  const undoBatch = () => {
    if (!batchUndo) return;
    setProds((ps) => ps.map((x) => (batchUndo[x.id] ? { ...x, ...batchUndo[x.id] } : x))); setBatchUndo(null);
  };
  const addSamples = () => setProds((ps) => [...ps, ...SAMPLES.map((s) => ({ id: `${s}-${Date.now()}`, name: s.replace(/^\d+-/, ''), src: `/sample-products/${s}.png`, cut: `/sample-products/${s}.png`, status: 'raw' as const }))]);
  const cutOne = async (id: string) => {
    const p = prods.find((x) => x.id === id);
    if (!p || p.status === 'cutting') return;
    await cutSrc(id, p.src);
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
    <div className="p-2 sm:p-6 lg:p-8">
      <PageHeader title="Ảnh & video sản phẩm" sub="Tải ảnh sản phẩm 1 lần → chọn kiểu: nền studio, người mẫu AI, banner giá hoặc video → xuất đủ khổ Shopee, Facebook, TikTok."
        actions={tab === 'studio' ? (
          <button type="button" onClick={downloadAll} disabled={!!busy || !prods.length} className="mv-btn mv-btn-primary disabled:opacity-60">
            {busy === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} {busy === 'zip' ? 'Đang đóng gói…' : `Tải tất cả (${cells.length} ảnh)`}
          </button>
        ) : undefined} />

      {/* 3 bước + 4 kiểu */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs" data-testid="studio-steps">
        <div className="order-last ml-auto flex items-center gap-3">
          {savedAt && prods.length > 0 && <span className="text-[11px] text-slate-500" data-testid="studio-saved">Đã tự lưu</span>}
          {prods.length > 0 && <button type="button" onClick={newProject} className="text-[11px] text-slate-400 hover:text-white underline-offset-2 hover:underline">Làm bài mới</button>}
        </div>
        {[{ n: 1, t: 'Tải ảnh', done: prods.length > 0 }, { n: 2, t: 'Chọn kiểu', done: false }, { n: 3, t: 'Xuất đa sàn', done: false }].map((st, i) => (
          <div key={st.n} className="flex items-center gap-2">
            {i > 0 && <span className="hidden sm:block w-6 h-px bg-white/15" />}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${st.done ? 'border-emerald-400/40 text-emerald-200' : (st.n === 1 && !prods.length) || (st.n === 2 && prods.length) ? 'border-indigo-400/60 text-white bg-indigo-500/15' : 'border-white/10 text-slate-400'}`}>
              {st.done ? <Check className="w-3.5 h-3.5" /> : <span className="font-bold">{st.n}</span>} {st.t}
            </span>
          </div>
        ))}
      </div>
      <div className="mv-seg !grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 w-full mb-5" data-testid="studio-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => changeTab(t.id)} data-active={tab === t.id} className="mv-seg-btn flex-1 !flex !flex-row !items-center !justify-center !gap-2 whitespace-nowrap"><t.icon className="w-4 h-4 shrink-0" /> <span>{t.name}</span></button>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" data-testid="shot-upload" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      {tab !== 'studio' && (() => {
        const sel = prods.find((x) => x.id === selId) || prods[0];
        return (
          <div className="space-y-4">
            <div className="glass-panel border border-white/10 rounded-2xl p-3 flex items-center gap-2.5 overflow-x-auto" data-testid="studio-product-strip">
              <span className="text-xs text-slate-400 shrink-0">Sản phẩm:</span>
              {prods.map((p) => (
                <button key={p.id} type="button" onClick={() => setSelId(p.id)} title={p.name}
                  className={`w-14 h-14 shrink-0 rounded-lg bg-white/90 p-0.5 border-2 ${sel?.id === p.id ? 'border-indigo-400' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.cut || p.src} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs shrink-0"><Upload className="w-3.5 h-3.5" /> Thêm ảnh</button>
              {!prods.length && <button type="button" onClick={addSamples} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs shrink-0"><ImagePlus className="w-3.5 h-3.5" /> Dùng ảnh mẫu</button>}
              {sel && !sel.cut && !['model', 'erase', 'sharpen', 'recolor'].includes(tab) && (
                <button type="button" onClick={() => cutOne(sel.id)} disabled={sel.status === 'cutting'} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs shrink-0 disabled:opacity-60">
                  {sel.status === 'cutting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} Tách nền ảnh này
                </button>
              )}
            </div>
            {!sel ? (
              <div className="glass-panel border border-white/10 rounded-2xl p-10 text-center text-sm text-slate-400">Tải ảnh sản phẩm ở thanh trên để bắt đầu.</div>
            ) : tab === 'model' ? (
              <ModelPanel shared={{ src: sel.src, cut: sel.cut }} onFree={() => changeTab('studio')} onSend={(url, target) => {
                const id = `model-${Date.now()}`;
                setProds((ps) => [...ps, { id, name: 'nguoi-mau-ai', src: url, status: 'raw' }]); setSelId(id);
                changeTab(target === 'video' ? 'video' : 'studio');
              }} />
            ) : tab === 'erase' ? (
              <ErasePanel shared={{ src: sel.src }} onApply={(url) => replaceSrc(sel.id, url)} batch={{ count: prods.length, run: eraseTextAll, undo: batchUndo ? undoBatch : null }} />
            ) : tab === 'recolor' ? (
              <RecolorPanel shared={{ src: sel.src, cut: sel.cut }} name={sel.name} cutting={sel.status === 'cutting'} onCut={() => cutOne(sel.id)}
                onSend={(items) => setProds((ps) => [...ps, ...items.slice(0, Math.max(0, MAX - ps.length)).map((it, i) => ({ id: `color-${Date.now()}-${i}`, name: it.name, src: it.src, cut: it.cut, status: 'raw' as const }))])} />
            ) : tab === 'sharpen' ? (
              <UpscalePanel shared={{ src: sel.src }} onApply={(url) => replaceSrc(sel.id, url)} />
            ) : tab === 'banner' ? (
              <BannerPanel product={{ src: sel.src, cut: sel.cut }} />
            ) : tab === 'frame' ? (
              <FramePanel products={prods.map((p) => ({ id: p.id, name: p.name, src: p.src, cut: p.cut }))} selId={sel.id} />
            ) : tab === 'detail' ? (
              <DetailPanel product={{ src: sel.src, cut: sel.cut }} />
            ) : (
              <VideoPanel shared={{ src: sel.src, cut: sel.cut }} />
            )}
          </div>
        );
      })()}

      {tab === 'studio' && <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6 items-start">
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
            {(['gradient', 'podium', 'pop', 'spotlight', 'aurora', 'burst', 'neon', 'shapes', 'shelf'] as BgKind[]).includes(bgKind) && themeChips}
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
            <p className="text-[11px] text-slate-500 mt-2.5">Ảnh chưa tách nền sẽ đặt dạng khung ảnh viền trắng trên nền đã chọn. Bấm “Tách nền” để sản phẩm đứng tự nhiên trên nền.</p>
          </CollapsibleSection>

          <CollapsibleSection title="3 · Bố cục & khổ xuất">
            <label className="block">
              <span className="mv-label flex justify-between mb-1.5"><span>Cỡ sản phẩm</span><span className="normal-case text-slate-400">{Math.round(size * 100)}%</span></span>
              <input type="range" min={55} max={95} value={Math.round(size * 100)} onChange={(e) => setSize(Number(e.target.value) / 100)} className="w-full accent-indigo-400" />
            </label>
            <div className="mv-label mt-3 mb-1.5">Bóng đổ</div>
            <div className="flex flex-wrap gap-1.5">{SHADOWS.map((s) => <button key={s.id} type="button" onClick={() => setShadow(s.id)} className={chip(shadow === s.id)}>{s.name}</button>)}</div>
            <div className="mt-3 rounded-xl border border-white/10 p-3 space-y-2" data-testid="shot-mark">
              <label className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
                <input type="checkbox" checked={mark.on} onChange={(e) => setMark((m) => ({ ...m, on: e.target.checked }))} data-testid="shot-mark-on" /> Đóng logo shop lên ảnh
              </label>
              {mark.on && (
                <>
                  {!markSrc ? (
                    <p className="text-[11px] text-amber-200">Chưa có logo — tải logo lên hoặc tạo ở Bộ nhận diện.</p>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={markSrc} alt="" className="h-8 max-w-[120px] object-contain bg-white/90 rounded p-0.5" />
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {([['br', 'Góc phải dưới'], ['bl', 'Góc trái dưới'], ['tr', 'Góc phải trên'], ['tl', 'Góc trái trên'], ['tile', 'Lặp chéo (chống lấy ảnh)']] as [MarkPos, string][]).map(([id, nm]) => (
                      <button key={id} type="button" onClick={() => setMark((m) => ({ ...m, pos: id, opacity: id === 'tile' ? 0.14 : m.pos === 'tile' ? 0.9 : m.opacity }))} className={chip(mark.pos === id)}>{nm}</button>
                    ))}
                  </div>
                  <label className="block">
                    <span className="mv-label flex justify-between mb-1"><span>Độ đậm</span><span className="normal-case text-slate-400">{Math.round(mark.opacity * 100)}%</span></span>
                    <input type="range" min={5} max={100} value={Math.round(mark.opacity * 100)} onChange={(e) => setMark((m) => ({ ...m, opacity: Number(e.target.value) / 100 }))} className="w-full accent-indigo-400" />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => markRef.current?.click()} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Upload className="w-3.5 h-3.5" /> {mark.src ? 'Đổi logo' : 'Tải logo khác'}</button>
                    {mark.src && kit?.logo && <button type="button" onClick={() => setMark((m) => ({ ...m, src: undefined }))} className="text-[11px] text-slate-400 hover:text-white">Dùng logo bộ nhận diện</button>}
                  </div>
                  <input ref={markRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" data-testid="shot-mark-upload"
                    onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { const src = await scaleImage(f, 600); setMark((m) => ({ ...m, src })); } }} />
                </>
              )}
            </div>
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
                {p.cut && p.cut !== p.src && (
                  <>
                    <button type="button" onClick={() => setEditing(p.id)} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs shrink-0" data-testid="shot-edit-mask"><Paintbrush className="w-3.5 h-3.5" /> Thêm / bớt vật</button>
                    <button type="button" onClick={() => setProds((ps) => ps.map((x) => (x.id === p.id ? { ...x, cut: undefined } : x)))} title="Dùng lại ảnh gốc" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs shrink-0"><Undo2 className="w-3.5 h-3.5" /> Bỏ tách</button>
                  </>
                )}
                <button type="button" onClick={() => setProds((ps) => ps.filter((x) => x.id !== p.id))} aria-label="Xoá ảnh" className="mv-btn mv-btn-ghost !p-2 !text-rose-300 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
              {p.cut && p.cut !== p.src && (
                <p className="text-[11px] text-slate-400 -mt-1 mb-2">AI chỉ giữ vật chính. Thiếu vật (vd mấy cây nến phía sau) → bấm <b className="text-slate-200">Thêm / bớt vật</b> rồi bấm thẳng vào vật đó.</p>
              )}
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
                        <AsyncButton iconOnly onClick={() => shotBlob(p, l).then((b) => downloadBlob(b, fileName(p, l)))} aria-label={`Tải ${cells[i].label}`} className="text-slate-400 hover:text-white"><Download className="w-3.5 h-3.5" /></AsyncButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>}
      {lb.node}
      {(() => {
        const ep = editing ? prods.find((x) => x.id === editing) : null;
        return ep && ep.cut ? (
          <MaskEditor original={ep.src} cut={ep.cut} onClose={() => setEditing(null)}
            onSave={(url) => { setProds((ps) => ps.map((x) => (x.id === ep.id ? { ...x, cut: url } : x))); setEditing(null); }} />
        ) : null;
      })()}
    </div>
  );
}
