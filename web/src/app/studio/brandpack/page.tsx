'use client';
// Bộ nhận diện thương hiệu (gói bàn giao như designer): brand board + mạng xã hội + ấn phẩm in + mockup.
// Lấy sẵn từ bộ nhận diện (tên, logo, màu, liên hệ), chỉnh nhanh tại chỗ, tải 1 ZIP chia thư mục. Render 100% client.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Download, Loader2, Maximize2, Package, Save, Upload, X } from 'lucide-react';
import type { BrandKit } from '@/types';
import { loadBrand, saveBrand, type Palette } from '@/lib/brand-presets';
import { LOGO_FONTS, LOGO_PALETTES, logoFontCss, useLogoFonts } from '@/lib/logo-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { BOARD, DEFAULT_HIGHLIGHTS, HL_ICONS, LogoMark, PRINT, SOCIAL, Scaled, highlightAssets, hlIcon, type AssetDef, type HLItem, type PackCtx } from '@/components/BrandAssets';
import { useLightbox } from '@/components/ImageLightbox';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';

// font tiêu đề của bộ nhận diện (FONT_PRESETS) → font logo tương ứng
const FONT_MAP: Record<string, string> = { 'be-vietnam': 'bevietnam', montserrat: 'montserrat', lora: 'lora', playfair: 'playfair' };
const HEAD_FONTS = LOGO_FONTS.filter((f) => !f.script);

const kitPalette = (b: BrandKit): Palette => ({ name: 'Thương hiệu', colorPrimary: b.colorPrimary, colorSecondary: b.colorSecondary, colorAccent: b.colorAccent, colorInk: b.colorInk, colorSurface: b.colorSurface });

// Tô logo ảnh thành 1 màu (bản đen/trắng) giữ nguyên độ phân giải gốc.
async function tintLogo(src: string, color?: string): Promise<Blob> {
  const im = new Image();
  im.src = src;
  await im.decode();
  const c = document.createElement('canvas');
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(im, 0, 0);
  if (color) { ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height); }
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('rỗng'))), 'image/png'));
}

function Tile({ a, i, ctx, busy, loading, onOpen, onDownload, setNode }: {
a: AssetDef; i: number; ctx: PackCtx; busy: string; loading: number | null;
onOpen: (i: number) => void; onDownload: (a: AssetDef) => void; setNode: (id: string, el: HTMLDivElement | null) => void;
}) {
return (
  <div className="glass-card !p-2 group">
    <button type="button" onClick={() => onOpen(i)} aria-label={`Xem lớn ${a.label}`} data-testid="asset-tile"
      className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/[0.06]"
      style={{ background: 'repeating-conic-gradient(#20242c 0 25%, #171a20 0 50%) 0 0/16px 16px' }}>
      <Scaled w={a.w} h={a.h} nodeRef={(el) => setNode(a.id, el)}>{a.render(ctx)}</Scaled>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/45 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900">
          {loading === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Maximize2 className="w-3.5 h-3.5" />} Xem lớn
        </span>
      </span>
    </button>
    <div className="flex items-start justify-between gap-2 mt-2 px-1">
      <span className="text-[11px] font-medium text-slate-300 leading-snug">{a.label} <span className="text-slate-500 font-normal">· {a.w}×{a.h}</span></span>
      <button type="button" onClick={() => onDownload(a)} aria-label={`Tải ${a.label}`} title={`Tải ${a.label}`} className="text-slate-400 hover:text-indigo-300 shrink-0 mt-0.5">
        {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      </button>
    </div>
  </div>
);
}

export default function BrandPackPage() {
  const ready = useLogoFonts();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [c, setC] = useState<PackCtx>({ name: '', slogan: '', p: LOGO_PALETTES.find((p) => p.name === 'Xanh dương') || LOGO_PALETTES[0], headFontId: 'bevietnam', highlights: DEFAULT_HIGHLIGHTS });
  const [busy, setBusy] = useState('');
  const [saved, setSaved] = useState(false);
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const b = loadBrand();
    if (!b) return;
    setKit(b);
    setC({
      name: b.name || '', slogan: b.slogan || '', p: kitPalette(b), headFontId: FONT_MAP[b.fontHeadingId] || 'bevietnam', logo: b.logo,
      phone: b.contact?.phone || b.contact?.zalo, web: b.contact?.facebook || b.contact?.website, address: b.contact?.address,
      highlights: DEFAULT_HIGHLIGHTS,
    });
  }, []);

  const set = (patch: Partial<PackCtx>) => setC((x) => ({ ...x, ...patch }));
  const ctx: PackCtx = { ...c, name: c.name.trim() || 'Tên shop', slogan: c.slogan.trim(), highlights: (c.highlights && c.highlights.length ? c.highlights : DEFAULT_HIGHLIGHTS) };
  const slug = slugify(ctx.name, 'thuong-hieu');
  const palettes = kit ? [kitPalette(kit), ...LOGO_PALETTES] : LOGO_PALETTES;
  const fontCss = logoFontCss([c.headFontId, 'dancing']);
  const socialAll = [...SOCIAL, ...highlightAssets(ctx.highlights || DEFAULT_HIGHLIGHTS)];
  const ALL: AssetDef[] = [BOARD, ...socialAll, ...PRINT];
  const updateHL = (idx: number, patch: Partial<HLItem>) => setC((x) => ({ ...x, highlights: (x.highlights || DEFAULT_HIGHLIGHTS).map((h, i) => (i === idx ? { ...h, ...patch } : h)) }));
  const addHL = () => setC((x) => ({ ...x, highlights: [...(x.highlights || DEFAULT_HIGHLIGHTS), { id: `hl-${Date.now()}`, icon: 'star', label: 'Mục mới' }] }));
  const removeHL = (idx: number) => setC((x) => ({ ...x, highlights: (x.highlights || DEFAULT_HIGHLIGHTS).filter((_, i) => i !== idx) }));

  // ---------- xuất ----------
  const exportNode = async (key: string, w: number, h: number, pixelRatio = 1): Promise<Blob> => {
    const el = nodes.current[key];
    if (!el) throw new Error(`thiếu ${key}`);
    const { toBlob } = await import('html-to-image');
    const b = await toBlob(el, { width: w, height: h, pixelRatio, fontEmbedCSS: await embedFontCss(fontCss), cacheBust: false, style: { transform: 'none' } });
    if (!b) throw new Error('rỗng');
    return b;
  };
  const renderAsset = (a: AssetDef) => exportNode(a.id, a.w, a.h);
  // logo gốc (ảnh trong bộ nhận diện) hoặc logo chữ tạm, ở kích thước tự nhiên
  const logoPng = (tone?: 'black' | 'white') => {
    if (c.logo) return tintLogo(c.logo, tone === 'black' ? '#000000' : tone === 'white' ? '#ffffff' : undefined);
    const el = nodes.current[`logo-${tone || 'color'}`];
    const svg = el?.querySelector('svg');
    if (!svg) throw new Error('chưa có logo');
    return exportNode(`logo-${tone || 'color'}`, svg.viewBox.baseVal.width, svg.viewBox.baseVal.height, 2000 / svg.viewBox.baseVal.width);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } finally { setBusy(''); }
  };
  const downloadAsset = (a: AssetDef) => run(a.id, async () => downloadBlob(await renderAsset(a), `${slug}-${a.id}.png`));
  const lb = useLightbox(ALL, (i) => renderAsset(ALL[i]), (i) => downloadAsset(ALL[i]));

  const downloadAll = () => run('zip', async () => {
    const files: Record<string, Uint8Array> = {};
    const add = async (name: string, b: Blob) => { files[name] = new Uint8Array(await b.arrayBuffer()); };
    const steps = ALL.length + 3;
    let n = 0;
    const tick = () => setBusy(`zip:${++n}/${steps}`);
    for (const a of ALL) { tick(); await add(`${a.folder ? a.folder + '/' : ''}${slug}-${a.id}.png`, await renderAsset(a)); }
    tick(); await add(`01-logo/${slug}-logo-mau.png`, await logoPng());
    tick(); await add(`01-logo/${slug}-logo-den.png`, await logoPng('black'));
    tick(); await add(`01-logo/${slug}-logo-trang.png`, await logoPng('white'));
    const p = ctx.p;
    const guide = [
      `BỘ NHẬN DIỆN THƯƠNG HIỆU — ${ctx.name}`, ctx.slogan && `Slogan: ${ctx.slogan}`, '',
      'BẢNG MÀU', `  Màu chính : ${p.colorPrimary}`, `  Màu phụ   : ${p.colorSecondary}`, `  Màu nhấn  : ${p.colorAccent}`, `  Màu chữ   : ${p.colorInk}`, `  Màu nền   : ${p.colorSurface}`, '',
      'FONT (Google Fonts, có dấu tiếng Việt)', `  Tiêu đề : ${LOGO_FONTS.find((f) => f.id === c.headFontId)?.family}`, '  Nội dung: Be Vietnam Pro', '',
      'KÍCH THƯỚC', '  Name card 1050×600 px = 3.5×2 inch @300dpi', '  Thiệp cảm ơn 1748×1240 px = A6 ngang @300dpi', '  Bìa Facebook 1640×624 px', '',
      'Tạo bằng Mivy',
    ].filter((x): x is string => typeof x === 'string').join('\n');
    files['bang-mau-va-font.txt'] = new TextEncoder().encode(guide);
    const { zipSync } = await import('fflate');
    downloadBlob(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }), `${slug}-bo-nhan-dien.zip`);
  });

  const saveToKit = () => {
    const b = loadBrand() || kit;
    if (!b) return;
    const p = c.p;
    const next: BrandKit = {
      ...b, name: c.name.trim() || b.name, slogan: c.slogan.trim(), logo: c.logo,
      colorPrimary: p.colorPrimary, colorSecondary: p.colorSecondary, colorAccent: p.colorAccent, colorInk: p.colorInk, colorSurface: p.colorSurface,
      contact: { ...(b.contact || {}), phone: c.phone || undefined, facebook: c.web || undefined, address: c.address || undefined },
    };
    if (saveBrand(next)) { setKit(next); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };
  const onLogo = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set({ logo: String(r.result) });
    r.readAsDataURL(f);
  };

  const tileProps = { ctx, busy, loading: lb.loading, onOpen: lb.open, onDownload: downloadAsset, setNode: (id: string, el: HTMLDivElement | null) => { nodes.current[id] = el; } };

  const zipLabel = busy.startsWith('zip:') ? `Đang xuất ${busy.slice(4)}…` : busy === 'zip' ? 'Đang chuẩn bị…' : 'Tải trọn bộ (.zip)';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bộ nhận diện thương hiệu" sub="Gói bàn giao trọn bộ: brand board, ảnh mạng xã hội, ấn phẩm in và mockup — lấy sẵn từ bộ nhận diện, tải 1 file ZIP."
        actions={
          <button type="button" onClick={downloadAll} disabled={!!busy || !ready} className="mv-btn mv-btn-primary disabled:opacity-60">
            {busy.startsWith('zip') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} {zipLabel}
          </button>
        } />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            {!c.logo && (
              <div className="glass-panel border border-amber-400/30 bg-amber-400/[0.06] rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-amber-100">
                <span className="flex-1">Chưa có logo nên bộ đang dùng <b>logo chữ tạm</b>. Tạo logo đẹp trong 1 phút rồi quay lại đây.</span>
                <Link href="/studio/logo" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs shrink-0">Tạo logo</Link>
              </div>
            )}
            <CollapsibleSection title="1 · Brand board">
              <div className="max-w-sm"><Tile {...tileProps} a={BOARD} i={0} /></div>
            </CollapsibleSection>
            <CollapsibleSection title="2 · Mạng xã hội">
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3">
                {socialAll.map((a, k) => (
                  <div key={a.id} className={a.w > a.h * 1.5 ? 'col-span-3 sm:col-span-2 xl:col-span-2' : ''}><Tile {...tileProps} a={a} i={1 + k} /></div>
                ))}
              </div>
              {/* Tuỳ chỉnh bìa Highlight: chọn icon, sửa chữ, thêm/bớt */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <div className="mv-label">Tuỳ chỉnh bìa Highlight</div>
                {(ctx.highlights || []).map((h, idx) => {
                  const Ic = hlIcon(h.icon);
                  return (
                    <div key={h.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ background: ctx.p.colorAccent }}><Ic size={16} color="#ffffff" weight="bold" /></span>
                        <input className="mv-input !py-1.5 !text-xs flex-1 min-w-0" value={h.label} onChange={(e) => updateHL(idx, { label: e.target.value })} placeholder="Tên mục" />
                        <button type="button" onClick={() => removeHL(idx)} disabled={(ctx.highlights || []).length <= 1} className="text-slate-400 hover:text-rose-400 disabled:opacity-30 shrink-0" aria-label="Xoá mục"><X className="w-4 h-4" /></button>
                      </div>
                      <select className="mv-input !py-1.5 !text-xs w-full" value={h.icon} onChange={(e) => updateHL(idx, { icon: e.target.value })} aria-label="Icon">
                        {HL_ICONS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </div>
                  );
                })}
                {(ctx.highlights || []).length < 6 && (
                  <button type="button" onClick={addHL} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs">+ Thêm mục</button>
                )}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="3 · Ấn phẩm in">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {PRINT.map((a, k) => <Tile key={a.id} {...tileProps} a={a} i={1 + socialAll.length + k} />)}
              </div>
            </CollapsibleSection>
          </div>

          {/* Chỉnh nhanh (ghim) */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-4 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="text-sm font-bold text-white">Chỉnh nhanh</div>
            <div>
              <div className="mv-label mb-1.5">Logo</div>
              <div className="flex items-center gap-2">
                {c.logo ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logo} alt="logo" className="w-14 h-14 object-contain rounded-lg bg-white p-1" />
                    <button type="button" onClick={() => set({ logo: undefined })} aria-label="Bỏ logo" className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ) : <span className="text-[11px] text-slate-400">Đang dùng logo chữ tạm</span>}
                <label className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải logo
                  <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="sr-only" data-testid="pack-logo" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} /></label>
                <Link href="/studio/logo" className="text-[11px] text-indigo-300 hover:text-indigo-200">Tạo logo mới</Link>
              </div>
            </div>
            <div className="space-y-2">
              <input className="mv-input" value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Tên thương hiệu" data-testid="pack-name" />
              <input className="mv-input" value={c.slogan} onChange={(e) => set({ slogan: e.target.value })} placeholder="Slogan" data-testid="pack-slogan" />
              <input className="mv-input" value={c.phone || ''} onChange={(e) => set({ phone: e.target.value })} placeholder="Số điện thoại / Zalo" />
              <input className="mv-input" value={c.web || ''} onChange={(e) => set({ web: e.target.value })} placeholder="Facebook / website" />
              <input className="mv-input" value={c.address || ''} onChange={(e) => set({ address: e.target.value })} placeholder="Địa chỉ" />
            </div>
            <div>
              <div className="mv-label mb-1.5">Màu</div>
              <div className="flex flex-wrap gap-2">
                {palettes.map((p) => (
                  <button key={p.name} type="button" title={p.name} onClick={() => set({ p })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${c.p.name === p.name ? 'border-white scale-110' : 'border-white/10 hover:border-white/40'}`}
                    style={{ background: `linear-gradient(135deg, ${p.colorPrimary} 50%, ${p.colorAccent} 50%)` }} />
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mv-label block mb-1.5">Font tiêu đề</span>
              <select className="mv-input" value={c.headFontId} onChange={(e) => set({ headFontId: e.target.value })}>
                {HEAD_FONTS.map((f) => <option key={f.id} value={f.id}>{f.family}</option>)}
              </select>
            </label>
            <button type="button" onClick={saveToKit} disabled={!kit} className="w-full mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-sm disabled:opacity-50" title={kit ? '' : 'Chưa có bộ nhận diện để lưu'}>
              {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />} {saved ? 'Đã lưu' : 'Lưu thay đổi vào bộ nhận diện'}
            </button>
          </div>
        </div>
      )}

      {/* logo chữ tạm ở kích thước tự nhiên (khi chưa có ảnh logo) để xuất bản màu/đen/trắng */}
      {ready && !c.logo && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          {(['color', 'black', 'white'] as const).map((t) => (
            <div key={t} ref={(el) => { nodes.current[`logo-${t}`] = el; }} style={{ display: 'inline-block' }}>
              <LogoMark c={ctx} tone={t} style={{ display: 'block' }} />
            </div>
          ))}
        </div>
      )}
      {lb.node}
    </div>
  );
}
