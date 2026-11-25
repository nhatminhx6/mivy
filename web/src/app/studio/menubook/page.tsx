'use client';
// Menu dạng sổ: chọn phong cách nhà hàng → dán thực đơn (mục + món | giá | mô tả | tên EN | cay chay best dacbiet)
// → tự chia trang, cân cột, món đặc biệt có ảnh → xem thành phẩm 3D trên bàn → tải PDF ruột / PDF bìa (khuôn ép)
// hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  CoverSvg, MB_BINDS, MB_BLEED_MM, MB_COVERS, MB_CUISINES, MB_FIELDS, MB_FIRST, MB_FOILS, MB_FONTS, MB_FONT_CSS, MB_LEATHERS,
  MB_PAGE_OPTS, MB_PRICES, MB_SAMPLES, MB_SIZES, MB_STYLES, MB_WRAP_MM, PageSvg, applyStyle, defaultMBData, featuredItems,
  layoutMenu, mbFoil, mbLeather, mbPdf, mbSize, mbStyle, switchMBData, useMBFonts,
  type MBCover, type MBData, type MBLogo, type MBPdfPage, type MBPhotos, type MBSpec, type MBStyle,
} from '@/lib/menubook-engine';
import { logoToMask } from '@/lib/tape-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const MATERIAL: Record<MBCover, string> = {
  leather: 'Menu bìa da ép logo + ruột cán màng', hard: 'Menu bìa cứng in màu', pvc: 'Menu nhựa PVC chống nước',
};
const SYNTAX = `## Tên mục | Tên tiếng Anh
Tên món | Giá | Mô tả ngắn | Tên tiếng Anh | cay chay best dacbiet`;

async function readImage(file: File, max: number): Promise<{ href: string; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return { href: c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88), w: c.width, h: c.height };
}
const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function MenubookPage() {
  const ready = useMBFonts();
  const [spec, setSpec] = useState<MBSpec>(MB_FIRST);
  const [data, setData] = useState<MBData>(defaultMBData(mbStyle(MB_FIRST.style).cuisine));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState<MBLogo | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [invert, setInvert] = useState(false);
  const [photos, setPhotos] = useState<MBPhotos>({});
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [flat, setFlat] = useState<'spread' | 'cover'>('spread');
  const hidden = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const logoRef = useRef<HTMLInputElement | null>(null);

  const st = mbStyle(spec.style);
  const sz = mbSize(spec.size);
  const set = (p: Partial<MBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pick = (t: MBStyle) => {
    if (!dirty) setData(defaultMBData(t.cuisine));
    else if (t.cuisine !== st.cuisine) setData((d) => switchMBData(d, st.cuisine, t.cuisine));
    setSpec((s) => applyStyle(s, t));
  };

  const layout = useMemo(() => (ready ? layoutMenu(spec, data, photos) : null), [ready, spec, data, photos]);
  const pages = layout?.pages || [];
  const spreads = Math.max(1, Math.ceil(pages.length / 2));
  const si = Math.min(spreadIdx, spreads - 1);
  const leftI = si * 2, rightI = si * 2 + 1;
  const feats = useMemo(() => featuredItems(data.menu || ''), [data.menu]);

  // thumbnail mẫu = trang thực đơn đầu tiên của phong cách đó
  const thumbs = useMemo(() => {
    if (!ready) return [] as { t: MBStyle; spec: MBSpec; data: MBData; model: ReturnType<typeof layoutMenu>['pages'][number] | null }[];
    return MB_STYLES.map((t) => {
      const sp = applyStyle({ ...spec, intro: false, pages: 'auto' }, t);
      const d = dirty ? switchMBData(data, st.cuisine, t.cuisine) : MB_SAMPLES[t.cuisine];
      const l = layoutMenu(sp, d, photos);
      return { t, spec: sp, data: d, model: l.pages.find((p) => p.kind === 'menu') || null };
    });
  }, [ready, spec, data, dirty, photos, st.cuisine]);

  const slug = slugify(`menu-${data.brand || ''}`, 'menu');
  const el = (role: string) => hidden.current?.querySelector(`[data-role="${role}"] svg`) as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const innerDpi = sz.wMm <= 150 ? 300 : 220;
  const innerPages = (): MBPdfPage[] => pages.map((_, i) => ({ el: el(`pg-${i}`)!, trim: { wMm: sz.wMm, hMm: sz.hMm }, bleed: MB_BLEED_MM, dpi: innerDpi }));
  const coverPages = (): MBPdfPage[] => {
    const trim = { wMm: sz.wMm, hMm: sz.hMm };
    if (spec.cover === 'leather') return [
      { el: el('proof-front')!, trim, bleed: 0, dpi: 150 },
      { el: el('print-mask')!, trim, bleed: 0, dpi: 600, png: true },
    ];
    const ext = spec.cover === 'hard' ? MB_WRAP_MM : MB_BLEED_MM;
    return [{ el: el('print-front')!, trim, bleed: ext, dpi: 220 }, { el: el('print-back')!, trim, bleed: ext, dpi: 220 }];
  };
  const coverName = spec.cover === 'leather' ? 'bia-da-khuon-ep' : spec.cover === 'hard' ? 'bia-cung-le-gap-15mm' : 'bia-pvc-to-in';
  const dlInner = () => run('inner', async () => downloadBlob(await mbPdf(innerPages(), MB_FONT_CSS), `${slug}-${sz.id}-ruot-${pages.length}trang.pdf`));
  const dlCover = () => run('cover', async () => downloadBlob(await mbPdf(coverPages(), MB_FONT_CSS), `${slug}-${sz.id}-${coverName}.pdf`));
  const dlSpread = () => run('png', async () => {
    const H = 1400, Wp = Math.round((H * sz.wMm) / sz.hMm);
    const out = document.createElement('canvas'); out.width = Wp * 2; out.height = H;
    const ctx = out.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height);
    for (const [j, role] of (['view-left', 'view-right'] as const).entries()) {
      const v = el(role); if (!v) continue;
      ctx.drawImage(await svgToCanvas(await selfContainedSvg(v, MB_FONT_CSS), Wp, H, '#ffffff'), j * Wp, 0);
    }
    downloadBlob(await toBlob(out), `${slug}-trang-${leftI + 1}-${rightI + 1}.png`);
  });
  const dlSvg = () => run('svg', async () => {
    const v = spec.cover === 'leather' ? el('print-mask') : el('print-front');
    if (v) downloadBlob(await svgFileBlob(v, MB_FONT_CSS), `${slug}-${coverName}.svg`);
  });
  const dl3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (c) downloadBlob(await toBlob(c), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await mbPdf([...coverPages(), ...innerPages()], MB_FONT_CSS);
    const c = await view3d.current?.snapshot(1200, 900).catch(() => null);
    let preview: Blob;
    if (c) preview = await toBlob(c, 'image/jpeg', 0.86);
    else { const v = el('view-left'); preview = await toBlob(await svgToCanvas(await selfContainedSvg(v!, MB_FONT_CSS), 700, Math.round((700 * sz.hMm) / sz.wMm), '#fff'), 'image/jpeg', 0.86); }
    return { file, fileName: `${slug}-${sz.id}-bia-va-ruot.pdf`, preview };
  };

  const build3d = () => import('@/lib/menubook-3d').then((m) => m.menubookBuilder({
    wMm: sz.wMm, hMm: sz.hMm, cover: spec.cover, bind: spec.bind,
    sheets: Math.ceil(pages.length / 2), spread: si, spreads,
    left: el('view-left'), right: el('view-right'), front: el('view-front'), mask: el('view-mask'),
    leatherColor: mbLeather(spec.leather).color, foil: spec.foil, foilColor: mbFoil(spec.foil).color,
    coverColor: st.pal.cover, insideColor: st.pal.inside, fontCss: MB_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __mbSnap?: (w: number, h: number) => Promise<string> }).__mbSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onLogo = async (f?: File | null, inv = invert) => {
    if (!f) return;
    try {
      const im = await readImage(f, 900);
      const mask = await logoToMask(im.href, 150, inv);
      setLogo({ ...im, mask: mask || undefined }); setLogoFile(f);
    } catch { alert('Không đọc được ảnh logo, anh/chị thử file PNG/JPG khác nhé.'); }
    if (logoRef.current) logoRef.current.value = '';
  };
  const onPhoto = async (name: string, f?: File | null) => {
    if (!f) return;
    try { const im = await readImage(f, 1200); setPhotos((p) => ({ ...p, [name]: im.href })); }
    catch { alert('Không đọc được ảnh món, anh/chị thử file khác nhé.'); }
  };

  const cuisineName = MB_CUISINES.find((c) => c.id === st.cuisine)?.name || '';
  const orderTitle = `Menu ${MB_COVERS.find((c) => c.id === spec.cover)!.name.toLowerCase()} ${sz.name} · ${pages.length} trang · ${cuisineName}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const rebuildKey = JSON.stringify([spec, data, si, logo?.href.length || 0, Object.values(photos).map((p) => p.length)]);
  const fullW = { width: '100%', display: 'block' } as const;
  const offscreen = (role: string, node: ReactNode, w = 620) => <div key={role} data-role={role} style={{ width: w }}>{node}</div>;
  const info = `${sz.name} · ${pages.length} trang ruột ép plastic · ${MB_COVERS.find((c) => c.id === spec.cover)!.name.toLowerCase()} · ${MB_BINDS.find((b) => b.id === spec.bind)!.name.toLowerCase()}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Menu dạng sổ" sub="Menu nhà hàng nhiều trang: dán thực đơn là tự chia trang, cân cột, song ngữ Việt – Anh, món đặc biệt có ảnh. Bìa da ép logo, bìa cứng hoặc bìa nhựa — xem thành phẩm 3D, tải file in chuẩn xưởng." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {MB_COVERS.map((c) => (
          <button key={c.id} type="button" className="mv-seg-btn" data-active={spec.cover === c.id} onClick={() => set({ cover: c.id })} data-testid={`mb-cover-${c.id}`}>{c.name}</button>
        ))}
      </div>

      {!ready || !layout ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn phong cách (${MB_STYLES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {thumbs.map(({ t, spec: ts, data: td, model }) => (
                  <button key={t.id} type="button" onClick={() => pick(t)} data-testid="mb-tpl" data-style={t.id}
                    className={`rounded-xl border p-1.5 text-left transition-all ${spec.style === t.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                    <div className="rounded-lg overflow-hidden shadow-sm bg-white" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                      {model && <PageSvg spec={ts} data={td} model={model} pageNo={1} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />}
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thực đơn">
              <label className="block">
                <span className="mv-label block mb-1.5">Dán thực đơn (mỗi dòng 1 món)</span>
                <textarea className="mv-input font-mono !text-xs min-h-[260px]" value={data.menu || ''} onChange={(e) => setField('menu', e.target.value)} data-testid="mb-menu" spellCheck={false} />
              </label>
              <pre className="mt-2 text-[11px] leading-relaxed text-slate-500 whitespace-pre-wrap">{SYNTAX}</pre>
              <p className="text-[11px] text-slate-500 mt-1">Giá gõ 65k, 65 hoặc 65000 đều được. Nhãn: <b className="text-slate-400">cay</b>, <b className="text-slate-400">chay</b>, <b className="text-slate-400">best</b> (bán chạy), <b className="text-slate-400">dacbiet</b> (món đặc biệt — khung ảnh lớn). Không cần tiếng Anh thì bỏ trống cột 4.</p>
              {feats.length > 0 && (
                <div className="mt-4 space-y-2" data-testid="mb-feats">
                  <div className="mv-label">Ảnh món đặc biệt ({feats.length})</div>
                  {feats.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 text-xs">
                      <div className="w-12 h-9 rounded overflow-hidden bg-slate-700/40 shrink-0">{photos[f.name] && <img src={photos[f.name]} alt="" className="w-full h-full object-cover" />}</div>
                      <span className="flex-1 truncate text-slate-300">{f.name}</span>
                      <label className="mv-btn mv-btn-ghost !text-xs !py-1.5 cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5" /> {photos[f.name] ? 'Đổi ảnh' : 'Tải ảnh'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { onPhoto(f.name, e.target.files?.[0]); e.target.value = ''; }} data-testid="mb-photo-input" />
                      </label>
                      {photos[f.name] && <button type="button" className="mv-btn mv-btn-ghost !text-xs !py-1.5" onClick={() => setPhotos((p) => { const n = { ...p }; delete n[f.name]; return n; })}><X className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500">Chưa có ảnh thì Mivy vẽ đĩa món minh hoạ. Ảnh chỉ nằm trên máy anh/chị.</p>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="3 · Thông tin quán & logo">
              <div className="grid grid-cols-2 gap-3">
                {MB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input" rows={f.rows || 3} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`mb-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`mb-${f.key}`} />}
                  </label>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="mv-label">Logo (tuỳ chọn)</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} data-testid="mb-logo-input" />
                  <button type="button" onClick={() => logoRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}</button>
                  {logo && <button type="button" onClick={() => { setLogo(null); setLogoFile(null); }} className="mv-btn mv-btn-ghost !text-xs !py-2"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  {logo && (
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <input type="checkbox" checked={invert} onChange={(e) => { setInvert(e.target.checked); onLogo(logoFile, e.target.checked); }} /> Logo màu sáng (đảo)
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Chưa có logo thì Mivy vẽ chữ cái đầu tên quán. Bìa da ép kim nên logo tự chuyển 1 màu.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ, trang, bìa & kiểu chữ">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="mb-sizes">
                      {MB_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Số cột</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="mb-cols">
                      {([1, 2] as const).map((n) => <button key={n} type="button" onClick={() => set({ cols: n })} className={chip(spec.cols === n)}>{n} cột</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Số trang ruột</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mb-pages">
                    <button type="button" onClick={() => set({ pages: 'auto' })} className={chip(spec.pages === 'auto')} data-testid="mb-pages-auto">Tự động ({Math.min(16, Math.max(4, layout.needed + (layout.needed % 2)))})</button>
                    {MB_PAGE_OPTS.map((n) => <button key={n} type="button" onClick={() => set({ pages: n })} className={chip(spec.pages === n)} data-testid={`mb-pages-${n}`}>{n}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Định dạng giá</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="mb-prices">
                      {MB_PRICES.map((p) => <button key={p.id} type="button" onClick={() => set({ price: p.id })} className={chip(spec.price === p.id)} data-testid={`mb-price-${p.id}`}>{p.name}</button>)}
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-5">
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={spec.bilingual} onChange={(e) => set({ bilingual: e.target.checked })} data-testid="mb-bilingual" /> Song ngữ Việt – Anh</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={spec.intro} onChange={(e) => set({ intro: e.target.checked })} data-testid="mb-intro" /> Trang mở đầu (câu chuyện quán)</label>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Gáy</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mb-binds">
                    {MB_BINDS.map((b) => <button key={b.id} type="button" onClick={() => set({ bind: b.id })} className={chip(spec.bind === b.id)}>{b.name}</button>)}
                  </div>
                </div>
                {spec.cover === 'leather' && (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Màu da</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="mb-leathers">
                        {MB_LEATHERS.map((l) => (
                          <button key={l.id} type="button" onClick={() => set({ leather: l.id })} className={`flex items-center gap-2 ${chip(spec.leather === l.id)}`}>
                            <span className="w-5 h-5 rounded-full border border-mv-hair" style={{ background: l.color }} />{l.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Kiểu ép logo</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="mb-foils">
                        {MB_FOILS.map((f) => (
                          <button key={f.id} type="button" onClick={() => set({ foil: f.id })} className={`flex items-center gap-2 ${chip(spec.foil === f.id)}`}>
                            <span className="w-5 h-5 rounded-full border border-mv-hair" style={{ background: f.color || mbLeather(spec.leather).color }} />{f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="mb-fonts">
                    {MB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>Thực đơn</button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            <div className="flex items-center justify-center gap-2" data-testid="mb-spread-nav">
              <button type="button" className="mv-btn mv-btn-ghost !p-1.5" disabled={si === 0} onClick={() => setSpreadIdx(si - 1)} aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-slate-300 tabular-nums" data-testid="mb-spread-label">Trang {leftI + 1}–{Math.min(rightI + 1, pages.length)} / {pages.length}</span>
              <button type="button" className="mv-btn mv-btn-ghost !p-1.5" disabled={si >= spreads - 1} onClick={() => setSpreadIdx(si + 1)} aria-label="Trang sau" data-testid="mb-next"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.size}|${spec.cover}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className="space-y-2" data-testid="mb-flat">
                <div className="mv-seg !p-0.5 text-xs inline-flex">
                  <button type="button" className="mv-seg-btn !py-1 !px-2.5" data-active={flat === 'spread'} onClick={() => setFlat('spread')} data-testid="mb-flat-spread">Trang ruột</button>
                  <button type="button" className="mv-seg-btn !py-1 !px-2.5" data-active={flat === 'cover'} onClick={() => setFlat('cover')} data-testid="mb-flat-cover">Bìa</button>
                </div>
                {flat === 'spread' ? (
                  <div className="grid grid-cols-2 gap-0.5 rounded overflow-hidden shadow-md bg-slate-400" data-testid="mb-view-spread">
                    {[leftI, rightI].map((i) => pages[i]
                      ? <PageSvg key={i} spec={spec} data={data} model={pages[i]} pageNo={i + 1} logo={logo} style={fullW} />
                      : <div key={i} className="bg-slate-300" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2" data-testid="mb-view-cover">
                    <div><div className="text-[10px] text-slate-500 mb-1">Bìa sau</div><div className="rounded overflow-hidden shadow-md"><CoverSvg spec={spec} data={data} logo={logo} face="back" style={fullW} /></div></div>
                    <div><div className="text-[10px] text-slate-500 mb-1">Bìa trước</div><div className="rounded overflow-hidden shadow-md"><CoverSvg spec={spec} data={data} logo={logo} style={fullW} /></div></div>
                  </div>
                )}
              </div>
            )}
            {layout.overflow && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-200" data-testid="mb-overflow">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Thực đơn cần {layout.needed} trang nhưng đang chọn {pages.length} — phần cuối bị cắt. Tăng số trang, chọn &quot;Tự động&quot; hoặc chuyển 2 cột.</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center" data-testid="mb-info" data-pages={pages.length} data-needed={layout.needed} data-overflow={layout.overflow ? '1' : '0'}>{info}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={dlInner} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="mb-pdf-inner">
                {busy === 'inner' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF ruột ({pages.length} trang)
              </button>
              <button type="button" onClick={dlCover} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mb-pdf-cover">
                {busy === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {spec.cover === 'leather' ? 'PDF bìa + khuôn ép' : 'PDF bìa in'}
              </button>
              <button type="button" onClick={dl3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mb-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh' : undefined}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={dlSpread} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mb-png" title="Ảnh trang đôi đang xem">
                  {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
                </button>
                <button type="button" onClick={dlSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mb-svg" title="Bìa trước dạng vector, chữ đã outline">
                  {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
                </button>
              </div>
            </div>
            <PrintRequest product="menubook" title={orderTitle} defaultMaterial={MATERIAL[spec.cover]} design={{ spec, data: { ...data }, photos: Object.keys(photos), logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Ruột: mỗi trang có lề xén {MB_BLEED_MM}mm + vạch cắt, xưởng in rồi ép plastic từng tờ.{' '}
              {spec.cover === 'leather' && 'Bìa da không in màu: trang 2 PDF bìa là khuôn ép (đen = vùng ép kim / ép chìm).'}
              {spec.cover === 'hard' && `Bìa cứng: giấy in có lề gập ${MB_WRAP_MM}mm để bồi ôm tấm bìa.`}
              {spec.cover === 'pvc' && 'Bìa nhựa: tờ in bìa kẹp trong túi PVC trong.'}
            </p>
          </div>
        </div>
      )}

      {/* bản dựng ẩn: texture 3D + file in */}
      {ready && layout && (
        <div ref={hidden} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }} data-testid="mb-hidden">
          {pages[leftI] && offscreen('view-left', <PageSvg spec={spec} data={data} model={pages[leftI]} pageNo={leftI + 1} logo={logo} style={fullW} />)}
          {pages[rightI] && offscreen('view-right', <PageSvg spec={spec} data={data} model={pages[rightI]} pageNo={rightI + 1} logo={logo} style={fullW} />)}
          {offscreen('view-front', <CoverSvg spec={spec} data={data} logo={logo} style={fullW} />)}
          {spec.cover === 'leather' && offscreen('view-mask', <CoverSvg spec={spec} data={data} logo={logo} mode="alpha" style={fullW} />)}
          {spec.cover === 'leather' && offscreen('proof-front', <CoverSvg spec={spec} data={data} logo={logo} style={fullW} />)}
          {spec.cover === 'leather' && offscreen('print-mask', <CoverSvg spec={spec} data={data} logo={logo} mode="mask" style={fullW} />)}
          {spec.cover !== 'leather' && offscreen('print-front', <CoverSvg spec={spec} data={data} logo={logo} ext={spec.cover === 'hard' ? MB_WRAP_MM : MB_BLEED_MM} style={fullW} />)}
          {spec.cover !== 'leather' && offscreen('print-back', <CoverSvg spec={spec} data={data} logo={logo} face="back" ext={spec.cover === 'hard' ? MB_WRAP_MM : MB_BLEED_MM} style={fullW} />)}
          {pages.map((m, i) => offscreen(`pg-${i}`, <PageSvg spec={spec} data={data} model={m} pageNo={i + 1} logo={logo} bleed={MB_BLEED_MM} style={fullW} />))}
        </div>
      )}
    </div>
  );
}
