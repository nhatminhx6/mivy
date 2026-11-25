'use client';
// Sổ tay in logo: chọn loại sổ (lò xo bìa cứng / bìa da ép kim / kraft bìa mềm) → mẫu → điền thương hiệu, logo →
// xem thành phẩm 3D → tải PDF bìa (lề gập 15mm / trải bìa có gáy / khuôn ép kim) + PDF ruột, hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  CoverSvg, InnerSvg, NB_BLEED_MM, NB_FIELDS, NB_FIRST, NB_FOILS, NB_FONTS, NB_FONT_CSS, NB_KINDS, NB_LAYOUTS, NB_LEATHERS, NB_PAGES,
  NB_SAMPLES, NB_WRAP_MM, SPINE_MM, SpreadSvg, applyTemplate, defaultNBData, nbFoil, nbLeather, nbPalette, nbPdf, nbSize,
  palettesOfKind, sizesOfKind, switchNBData, templatesOfKind, useNBFonts,
  type NBData, type NBKind, type NBLogo, type NBPdfPage, type NBRule, type NBSpec, type NBTemplate,
} from '@/lib/notebook-engine';
import { logoToMask } from '@/lib/tape-engine';
import { svgFileBlob, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const RULES: { id: NBRule; name: string }[] = [
  { id: 'lined', name: 'Kẻ ngang' }, { id: 'dot', name: 'Chấm bi' }, { id: 'grid', name: 'Ô ly' }, { id: 'blank', name: 'Trơn' },
];
const MATERIAL: Record<NBKind, string> = { wire: 'Sổ lò xo bìa cứng A5', leather: 'Sổ bìa da khâu gáy A5', kraft: 'Sổ kraft bìa mềm A6' };

// logo khách: thu nhỏ ≤900px (giữ nền trong suốt) + mặt nạ 1 màu cho ép kim / in 1 màu — chỉ nằm trên máy khách
async function readLogo(file: File, invert: boolean): Promise<NBLogo> {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const href = c.toDataURL('image/png');
  const mask = await logoToMask(href, 150, invert);
  return { href, w: c.width, h: c.height, mask: mask || undefined };
}

export default function NotebookPage() {
  const ready = useNBFonts();
  const [spec, setSpec] = useState<NBSpec>(NB_FIRST);
  const [data, setData] = useState<NBData>(defaultNBData(NB_FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState<NBLogo | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [invert, setInvert] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [flat, setFlat] = useState<'cover' | 'inner'>('cover');
  const hidden = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sz = nbSize(spec.size);
  const sp = SPINE_MM[spec.kind];
  const set = (p: Partial<NBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pick = (t: NBTemplate) => {
    const next = applyTemplate(spec, t);
    if (!dirty) setData(defaultNBData(t.spec.layout));
    else if (t.spec.layout !== spec.layout) setData((d) => switchNBData(d, spec.layout, t.spec.layout));
    setSpec(next);
  };
  const setKind = (k: NBKind) => { if (k !== spec.kind) pick(templatesOfKind(k)[0]); };
  const tpls = templatesOfKind(spec.kind);
  const slug = slugify(`so-tay-${data.brand || ''}`, 'so-tay');

  const el = (role: string) => hidden.current?.querySelector(`[data-role="${role}"] svg`) as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const coverPages = (): NBPdfPage[] => {
    const W = sz.wMm, H = sz.hMm;
    if (spec.kind === 'wire') return [
      { el: el('print-front')!, trim: { wMm: W, hMm: H }, bleed: NB_WRAP_MM },
      { el: el('print-back')!, trim: { wMm: W, hMm: H }, bleed: NB_WRAP_MM },
    ];
    if (spec.kind === 'kraft') return [{ el: el('print-spread')!, trim: { wMm: W * 2 + sp, hMm: H }, bleed: NB_BLEED_MM }];
    return [
      { el: el('proof-spread')!, trim: { wMm: W * 2 + sp, hMm: H }, bleed: 0, dpi: 150 },
      { el: el('print-mask')!, trim: { wMm: W, hMm: H }, bleed: 0, dpi: 600 },
    ];
  };
  const innerPage = (): NBPdfPage => ({ el: el('print-inner')!, trim: { wMm: sz.wMm, hMm: sz.hMm }, bleed: NB_BLEED_MM });
  const coverName = spec.kind === 'leather' ? 'bia-da-khuon-ep' : spec.kind === 'wire' ? 'bia-cung-le-gap-15mm' : 'bia-kraft-trai';

  const dlCover = () => run('cover', async () => downloadBlob(await nbPdf(coverPages(), NB_FONT_CSS), `${slug}-${sz.id}-${coverName}.pdf`));
  const dlInner = () => run('inner', async () => downloadBlob(await nbPdf([innerPage()], NB_FONT_CSS), `${slug}-${sz.id}-ruot-${spec.rule}.pdf`));
  const dlPng = () => run('png', async () => { const v = el('view-front'); if (v) downloadBlob(await svgToPng(v, NB_FONT_CSS, 1600), `${slug}-bia-truoc.png`); });
  const dlSvg = () => run('svg', async () => {
    const v = spec.kind === 'wire' ? el('print-front') : spec.kind === 'kraft' ? el('print-spread') : el('print-mask');
    if (v) downloadBlob(await svgFileBlob(v, NB_FONT_CSS), `${slug}-${coverName}.svg`);
  });
  const dl3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await nbPdf([...coverPages(), innerPage()], NB_FONT_CSS);
    const c = await view3d.current?.snapshot(1200, 900).catch(() => null);
    const preview = c
      ? await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86))
      : await svgToPng(el('view-front')!, NB_FONT_CSS, 900, { watermark: false });
    return { file, fileName: `${slug}-${sz.id}-bia-va-ruot.pdf`, preview };
  };

  const coverColor = spec.kind === 'leather' ? nbLeather(spec.leather).color : spec.kind === 'kraft' ? '#C49F72' : nbPalette(spec.palette).bg;
  const build3d = () => import('@/lib/notebook-3d').then((m) => m.notebookBuilder({
    kind: spec.kind, bind: spec.bind, wMm: sz.wMm, hMm: sz.hMm,
    front: el('view-front'), frontInk: el('view-ink'), inner: el('view-inner'), innerLeft: el('view-inner-left'), mask: el('view-mask'),
    coverColor, bandColor: nbLeather(spec.leather).band, foil: spec.foil, foilColor: nbFoil(spec.foil).color, fontCss: NB_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __nbSnap?: (w: number, h: number) => Promise<string> }).__nbSnap = async (w, h) => {
      // QC: chụp ở GÓC MẶC ĐỊNH (không theo góc đang tự xoay)
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onLogo = async (f?: File | null, inv = invert) => {
    if (!f) return;
    try { setLogo(await readLogo(f, inv)); setLogoFile(f); } catch { alert('Không đọc được ảnh logo, anh/chị thử file PNG/JPG khác nhé.'); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const kindName = NB_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `${kindName} ${sz.name} · ${NB_LAYOUTS.find((l) => l.id === spec.layout)?.name}${spec.kind === 'leather' ? ` · ${nbFoil(spec.foil).name}` : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const thumbData = (t: NBTemplate) => (dirty ? switchNBData(data, spec.layout, t.spec.layout) : NB_SAMPLES[t.spec.layout]);
  const info = spec.kind === 'wire'
    ? `${sz.name} · bìa cứng in màu, lề gập ${NB_WRAP_MM}mm · ${NB_PAGES.wire} trang · gáy ${spec.bind === 'top' ? 'trên' : 'cạnh dài'}`
    : spec.kind === 'leather'
      ? `${sz.name} · bìa da ${nbLeather(spec.leather).name.toLowerCase()} · ${nbFoil(spec.foil).name.toLowerCase()} · ${NB_PAGES.leather} trang`
      : `${sz.name} · bìa kraft in mực, gáy ${sp}mm · ${NB_PAGES.kraft} trang`;
  const rebuildKey = useMemo(() => JSON.stringify([spec, data, logo?.href.length || 0, logo?.mask?.href.length || 0]), [spec, data, logo]);

  const fullW = { width: '100%', display: 'block' } as const;
  const offscreen = (role: string, node: ReactNode, w = 700) => <div data-role={role} style={{ width: w }}>{node}</div>;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Sổ tay in logo" sub="Sổ lò xo bìa cứng, sổ bìa da ép kim, sổ kraft — in logo, tên công ty làm quà tặng, hội nghị, trường học. Xem thành phẩm 3D, tải file in chuẩn xưởng hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {NB_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`nb-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {tpls.map((t) => {
                  const ts = applyTemplate(spec, t);
                  const on = spec.layout === t.spec.layout && (spec.kind === 'leather' ? spec.leather === ts.leather && spec.foil === ts.foil : spec.palette === ts.palette);
                  return (
                    <button key={t.id} type="button" onClick={() => pick(t)} data-testid="nb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <CoverSvg spec={ts} data={thumbData(t)} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung & logo">
              <div className="grid grid-cols-2 gap-3">
                {NB_FIELDS.filter((f) => f.key !== 'date' || spec.layout === 'event').map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`nb-${f.key}`} />
                  </label>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="mv-label">Logo (tuỳ chọn)</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} data-testid="nb-logo-input" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}</button>
                  {logo && <button type="button" onClick={() => { setLogo(null); setLogoFile(null); }} className="mv-btn mv-btn-ghost !text-xs !py-2"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  {logo && (
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <input type="checkbox" checked={invert} onChange={(e) => { setInvert(e.target.checked); onLogo(logoFile, e.target.checked); }} /> Logo màu sáng (đảo)
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Chưa có logo thì Mivy vẽ chữ cái đầu tên thương hiệu. Sổ da / kraft in 1 màu nên logo tự chuyển thành 1 màu. Ảnh chỉ nằm trên máy anh/chị.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, chất liệu, khổ & ruột">
              <div className="space-y-4">
                {spec.kind === 'leather' ? (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Màu da</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="nb-leathers">
                        {NB_LEATHERS.map((l) => (
                          <button key={l.id} type="button" onClick={() => set({ leather: l.id })} className={`flex items-center gap-2 ${chip(spec.leather === l.id)}`}>
                            <span className="w-5 h-5 rounded-full border border-mv-hair" style={{ background: l.color }} />{l.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Kiểu ép logo</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="nb-foils">
                        {NB_FOILS.map((f) => (
                          <button key={f.id} type="button" onClick={() => set({ foil: f.id })} className={`flex items-center gap-2 ${chip(spec.foil === f.id)}`}>
                            <span className="w-5 h-5 rounded-full border border-mv-hair" style={{ background: f.color || nbLeather(spec.leather).color }} />{f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="mv-label mb-1.5">{spec.kind === 'kraft' ? 'Màu mực in trên kraft' : 'Bảng màu bìa'}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="nb-palettes">
                      {palettesOfKind(spec.kind).map((pl) => (
                        <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                          <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 55%, ${pl.kraft ? pl.ink : pl.accent} 55%)` }} />
                          <span className="truncate">{pl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5" data-testid="nb-fonts">
                    {NB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>Sổ tay</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="nb-sizes">
                      {sizesOfKind(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  {spec.kind === 'wire' && (
                    <div>
                      <div className="mv-label mb-1.5">Gáy lò xo</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="nb-binds">
                        <button type="button" onClick={() => set({ bind: 'side' })} className={chip(spec.bind === 'side')}>Cạnh trái</button>
                        <button type="button" onClick={() => set({ bind: 'top' })} className={chip(spec.bind === 'top')}>Cạnh trên</button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Ruột sổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="nb-rules">
                    {RULES.map((r) => <button key={r.id} type="button" onClick={() => set({ rule: r.id })} className={chip(spec.rule === r.id)}>{r.name}</button>)}
                  </div>
                </div>
                {spec.kind === 'wire' && logo && (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={spec.logoMono} onChange={(e) => set({ logoMono: e.target.checked })} /> In logo 1 màu theo màu chữ (hợp bìa tối)
                  </label>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.kind}|${spec.size}|${spec.bind}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className="space-y-2" data-testid="nb-flat">
                <div className="mv-seg !p-0.5 text-xs inline-flex">
                  <button type="button" className="mv-seg-btn !py-1 !px-2.5" data-active={flat === 'cover'} onClick={() => setFlat('cover')} data-testid="nb-flat-cover">Bìa</button>
                  <button type="button" className="mv-seg-btn !py-1 !px-2.5" data-active={flat === 'inner'} onClick={() => setFlat('inner')} data-testid="nb-flat-inner">Ruột</button>
                </div>
                {flat === 'cover' ? (
                  spec.kind === 'wire' ? (
                    <div className="grid grid-cols-2 gap-2" data-testid="nb-view-cover">
                      <div><div className="text-[10px] text-slate-500 mb-1">Bìa sau</div><div className="rounded overflow-hidden shadow-md"><CoverSvg spec={spec} data={data} logo={logo} face="back" holes style={fullW} /></div></div>
                      <div><div className="text-[10px] text-slate-500 mb-1">Bìa trước</div><div className="rounded overflow-hidden shadow-md"><CoverSvg spec={spec} data={data} logo={logo} holes style={fullW} /></div></div>
                    </div>
                  ) : (
                    <div data-testid="nb-view-cover">
                      <div className="text-[10px] text-slate-500 mb-1">Trải bìa: sau · gáy {sp}mm · trước</div>
                      <div className="rounded overflow-hidden shadow-md"><SpreadSvg spec={spec} data={data} logo={logo} style={fullW} /></div>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-0.5 rounded overflow-hidden shadow-md bg-slate-300" data-testid="nb-view-inner">
                    <InnerSvg spec={spec} data={data} logo={logo} side="left" style={fullW} />
                    <InnerSvg spec={spec} data={data} logo={logo} side="right" style={fullW} />
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center" data-testid="nb-info">{info}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={dlCover} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="nb-pdf-cover">
                {busy === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {spec.kind === 'leather' ? 'PDF bìa + khuôn ép' : 'PDF bìa in'}
              </button>
              <button type="button" onClick={dlInner} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nb-pdf-inner">
                {busy === 'inner' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF ruột
              </button>
              <button type="button" onClick={dl3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nb-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh' : undefined}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={dlPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nb-png">
                  {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
                </button>
                <button type="button" onClick={dlSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nb-svg" title="File vector, chữ đã outline">
                  {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
                </button>
              </div>
            </div>
            <PrintRequest product="notebook" title={orderTitle} defaultMaterial={MATERIAL[spec.kind]} design={{ spec, data, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              {spec.kind === 'wire' && `File bìa có lề gập ${NB_WRAP_MM}mm để bồi ôm tấm bìa cứng; vùng lỗ lò xo đã chừa trống.`}
              {spec.kind === 'leather' && 'Bìa da không in màu: trang 2 của PDF là khuôn ép (đen = vùng ép kim / ép chìm) đúng vị trí trên mặt bìa.'}
              {spec.kind === 'kraft' && 'Nền kraft là màu giấy, file in chỉ có lớp mực — xưởng in trực tiếp lên bìa kraft.'}
            </p>
          </div>
        </div>
      )}

      {/* bản dựng ẩn: texture 3D + file in */}
      {ready && (
        <div ref={hidden} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }} data-testid="nb-hidden">
          {offscreen('view-front', <CoverSvg spec={spec} data={data} logo={logo} style={fullW} />)}
          {offscreen('view-ink', <CoverSvg spec={spec} data={data} logo={logo} mode="print" style={fullW} />)}
          {offscreen('view-mask', <SpreadSvg spec={spec} data={data} logo={logo} mode="alpha" frontOnly style={fullW} />)}
          {offscreen('view-inner', <InnerSvg spec={spec} data={data} logo={logo} side="right" style={fullW} />)}
          {offscreen('view-inner-left', <InnerSvg spec={spec} data={data} logo={logo} side="left" style={fullW} />)}
          {spec.kind === 'wire' && offscreen('print-front', <CoverSvg spec={spec} data={data} logo={logo} ext={NB_WRAP_MM} style={fullW} />)}
          {spec.kind === 'wire' && offscreen('print-back', <CoverSvg spec={spec} data={data} logo={logo} face="back" ext={NB_WRAP_MM} style={fullW} />)}
          {spec.kind === 'kraft' && offscreen('print-spread', <SpreadSvg spec={spec} data={data} logo={logo} mode="print" bleed={NB_BLEED_MM} style={fullW} />, 1200)}
          {spec.kind === 'leather' && offscreen('proof-spread', <SpreadSvg spec={spec} data={data} logo={logo} style={fullW} />, 1200)}
          {spec.kind === 'leather' && offscreen('print-mask', <SpreadSvg spec={spec} data={data} logo={logo} mode="mask" frontOnly style={fullW} />)}
          {offscreen('print-inner', <InnerSvg spec={spec} data={data} logo={logo} bleed={NB_BLEED_MM} style={fullW} />)}
        </div>
      )}
    </div>
  );
}
