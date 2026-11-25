'use client';
// Cờ phướn · cờ dây · cờ cầm tay: chọn loại → mẫu → nội dung (+ logo) → dáng/khổ/màu → xem cờ THẬT bằng 3D →
// tải file in đúng khổ (dáng cắt, ống luồn, lề xén) hoặc gửi yêu cầu in.

import { useRef, useState, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  BuntingRow, BuntingSheet, FG_BLEED, FG_DEFAULT_SPEC, FG_FIELDS, FG_FONTS, FG_FONT_CSS, FG_KINDS, FG_LAYOUTS, FG_MOTIFS, FG_PALETTES,
  FG_TEMPLATES, FlagPiece, HAND_SIZES, PENNANT_SIZES, PHUON_SIZES, PennantSvg, buntingSheetSize, fgDpi, fgMaterial, fgTitle, pennantList,
  pieceSize, useFGFonts, type FGData, type FGKind, type FGSpec, type FGTemplate,
} from '@/lib/flag-engine';
import { svgFileBlob, svgToPng, svgToPrintPdf, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const firstOf = (k: FGKind) => FG_TEMPLATES.find((t) => t.spec.kind === k)!;

// logo khách: thu nhỏ ≤ 800px, giữ nền trong (PNG) — chỉ nằm trên máy khách
function readLogo(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export default function FlagPage() {
  const ready = useFGFonts();

  const t0 = firstOf('phuon');
  const [spec, setSpec] = useState<FGSpec>({ ...FG_DEFAULT_SPEC, ...t0.spec });
  const [data, setData] = useState<FGData>({ ...t0.data });
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);   // nguồn texture 3D + PNG
  const backRef = useRef<HTMLDivElement | null>(null);
  const pennRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const printBackRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<FGSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTpl = (t: FGTemplate) => {
    setSpec((s) => ({ ...s, ...t.spec }));
    if (!dirty) setData({ ...t.data });
    else setData((d) => {
      const nd = { ...d };
      for (const f of FG_FIELDS[t.spec.kind]) if (!clean(nd[f.key])) nd[f.key] = t.data[f.key] || '';
      return nd;
    });
  };
  const pickKind = (k: FGKind) => { if (k !== spec.kind) pickTpl(firstOf(k)); };

  const { w: W, h: H, sleeve: SLV } = pieceSize(spec);
  const isBunting = spec.kind === 'bunting';
  const sheet = buntingSheetSize(spec, data, logo || undefined);
  const trim = isBunting ? { wMm: sheet.wMm, hMm: sheet.hMm } : { wMm: W + SLV, hMm: H };
  const bleed = isBunting ? 5 : FG_BLEED;
  const dpi = fgDpi(trim.wMm + bleed * 2, trim.hMm + bleed * 2);
  const title = fgTitle(spec);
  const slug = slugify(`co-${spec.kind}-${data.title || data.word || ''}`, 'co');

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const build3d = () => import('@/lib/flag-3d').then((m) => m.flagBuilder({
    spec, front: svgOf(frontRef), back: spec.sides === 2 ? svgOf(backRef) : null,
    pennants: Array.from(pennRef.current?.querySelectorAll('svg') || []) as SVGSVGElement[], fontCss: FG_FONT_CSS,
  }));
  const shotDefault = async (w: number, h: number, watermark = false) => {
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return core.snapshot(b, w, h, { watermark });
  };
  const shot3d = async (w: number, h: number, watermark: boolean) => (view3d.current && tab === '3d' ? view3d.current.snapshot(w, h, { watermark }) : shotDefault(w, h, watermark));
  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  // hook cho QC: ảnh 3D đúng góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __flagSnap?: (w: number, h: number) => Promise<string> }).__flagSnap = async (w, h) => (await shotDefault(w, h)).toDataURL('image/png');
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const printEls = (): SVGSVGElement[] => {
    if (isBunting) { const s = svgOf(printRef); return s ? [s] : []; }
    const f = svgOf(printRef), b = spec.sides === 2 ? svgOf(printBackRef) : null;
    return [f, b].filter(Boolean) as SVGSVGElement[];
  };
  const makePdf = async () => {
    const els = printEls();
    if (!els.length) throw new Error('Chưa dựng xong cờ, thử lại nhé.');
    return els.length === 1 ? svgToPrintPdf(els[0], FG_FONT_CSS, trim, bleed, dpi) : svgsToPrintPdf(els, FG_FONT_CSS, trim, bleed, dpi);
  };
  const downloadPng = () => run('png', async () => {
    const el = isBunting ? (document.querySelector('[data-testid="fg-row"]') as SVGSVGElement | null) : svgOf(frontRef);
    if (!el) return;
    const vb = el.viewBox.baseVal; const outW = Math.round(vb.width >= vb.height ? 2400 : (2400 * vb.width) / vb.height);
    downloadBlob(await svgToPng(el, FG_FONT_CSS, outW), `${slug}.png`);
  });
  const download3d = () => run('3d', async () => { downloadBlob(await toBlob(await shot3d(1600, 1200, true), 'image/png'), `${slug}-3d.png`); });
  const downloadPdf = () => run('pdf', async () => { downloadBlob(await makePdf(), `${slug}-file-in.pdf`); });
  const downloadSvg = () => run('svg', async () => {
    const els = printEls();
    for (let i = 0; i < els.length; i++) downloadBlob(await svgFileBlob(els[i], FG_FONT_CSS), `${slug}-file-in${els.length > 1 ? (i ? '-mat-sau' : '-mat-truoc') : ''}.svg`);
  });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([makePdf(), shot3d(900, 675, false).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-file-in.pdf`, preview };
  };

  const tpls = FG_TEMPLATES.filter((t) => t.spec.kind === spec.kind);
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const pennants = isBunting ? pennantList(spec, data, logo || undefined) : [];
  const tall = spec.kind === 'phuon';
  const box3d = tall ? 'aspect-[3/4] max-h-[64vh]' : 'aspect-[4/3]';
  const rebuildKey = JSON.stringify([spec, data, logo.length]);
  const refitKey = `${spec.kind}|${spec.shape}|${spec.height}|${spec.pSize}|${spec.hSize}|${isBunting ? pennants.length : 0}`;
  const thumbSpec = (t: FGTemplate): FGSpec => ({ ...spec, ...t.spec });
  const thumbData = (t: FGTemplate): FGData => (dirty ? { ...t.data, ...Object.fromEntries(Object.entries(data).filter(([, v]) => clean(v))) } : t.data);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Cờ phướn · cờ dây" sub="Cờ phướn giọt nước / lông vũ dựng trước cửa hàng, cờ dây chữ cái treo khai trương, cờ cầm tay sự kiện — xem cờ thật bằng 3D, tải file in đúng dáng cắt (ống luồn, lề xén) hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        {FG_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => pickKind(k.id)} data-testid={`fg-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className={`grid gap-2.5 ${isBunting ? 'grid-cols-1 sm:grid-cols-2' : spec.kind === 'hand' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-6'}`}>
                {tpls.map((t) => {
                  const ts = thumbSpec(t);
                  const on = spec.layout === ts.layout && spec.palette === ts.palette && spec.font === ts.font && (t.spec.shape ? spec.shape === t.spec.shape : true) && (t.spec.pennant ? spec.pennant === t.spec.pennant : true);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="fg-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-[#EFEDE8] flex items-center justify-center" style={{ aspectRatio: isBunting ? '3 / 1' : tall ? '1 / 2' : '3 / 2' }}>
                        {isBunting
                          ? <BuntingRow spec={ts} data={thumbData(t)} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                          : <FlagPiece spec={ts} data={thumbData(t)} logo={logo || undefined} style={{ width: '92%', height: '92%', display: 'block' }} />}
                      </div>
                      <div className="text-[10px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {FG_FIELDS[spec.kind].map((f) => (
                  <label key={f.key} className={`block ${f.key === 'word' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fg-${f.key}`} />
                  </label>
                ))}
                {isBunting && <div className="col-span-2 text-[11px] text-slate-400" data-testid="fg-count">{pennants.length} lá cờ · dây dài khoảng {((pennants.length * PENNANT_SIZES[spec.pSize].w * 1.18) / 1000).toFixed(1)}m</div>}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn){isBunting ? ' — thêm 1 lá logo ở 2 đầu dây' : spec.kind === 'phuon' ? ' — nằm trong huy hiệu tròn đầu cờ' : ''}</span>
                  <div className="flex items-center gap-3">
                    <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="fg-logo"
                        onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setLogo(await readLogo(f)); } catch (err) { alert((err as Error).message); } } }} />
                    </label>
                    {logo && (
                      <>
                        <img src={logo} alt="" className="h-10 w-10 rounded-md object-contain border border-mv-hair bg-white" />
                        <button type="button" onClick={() => setLogo('')} className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Bỏ logo</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Dáng, khổ & màu">
              <div className="space-y-4">
                {spec.kind === 'phuon' && (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Dáng cờ</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(['teardrop', 'feather'] as const).map((s) => <button key={s} type="button" onClick={() => set({ shape: s })} className={chip(spec.shape === s)} data-testid={`fg-shape-${s}`}>{s === 'teardrop' ? 'Giọt nước' : 'Lông vũ'}</button>)}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Chiều cao bộ cờ</div>
                      <div className="flex flex-wrap gap-1.5">
                        {([25, 35, 45] as const).map((h) => { const s = PHUON_SIZES[spec.shape][h]; return <button key={h} type="button" onClick={() => set({ height: h })} className={chip(spec.height === h)} data-testid="fg-height">{h / 10}m · vải {s.w / 10}×{s.h / 10}cm</button>; })}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Chân đế</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => set({ base: 'cross' })} className={chip(spec.base === 'cross')} data-testid="fg-base-cross">Chân chữ thập</button>
                        <button type="button" onClick={() => set({ base: 'water' })} className={chip(spec.base === 'water')} data-testid="fg-base-water">Chân bình nước</button>
                      </div>
                    </div>
                  </>
                )}
                {isBunting && (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Dáng lá cờ</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => set({ pennant: 'triangle' })} className={chip(spec.pennant === 'triangle')} data-testid="fg-pennant-triangle">Tam giác</button>
                        <button type="button" onClick={() => set({ pennant: 'swallow' })} className={chip(spec.pennant === 'swallow')} data-testid="fg-pennant-swallow">Đuôi nheo</button>
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Cỡ lá</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(['s', 'm'] as const).map((k) => <button key={k} type="button" onClick={() => set({ pSize: k })} className={chip(spec.pSize === k)} data-testid="fg-psize">{PENNANT_SIZES[k].name}</button>)}
                      </div>
                    </div>
                  </>
                )}
                {spec.kind === 'hand' && (
                  <div>
                    <div className="mv-label mb-1.5">Khổ cờ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['s', 'm'] as const).map((k) => <button key={k} type="button" onClick={() => set({ hSize: k })} className={chip(spec.hSize === k)} data-testid="fg-hsize">{HAND_SIZES[k].name}</button>)}
                    </div>
                  </div>
                )}
                {!isBunting && (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Mặt in</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => set({ sides: 1 })} className={chip(spec.sides === 1)} data-testid="fg-sides-1">1 mặt (mực thấm xuyên, mặt sau thấy ngược)</button>
                        <button type="button" onClick={() => set({ sides: 2 })} className={chip(spec.sides === 2)} data-testid="fg-sides-2">2 mặt (may 2 lớp, chữ xuôi cả 2 bên)</button>
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Bố cục</div>
                      <div className="flex flex-wrap gap-1.5">
                        {FG_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)} data-testid="fg-layout">{l.name}</button>)}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div className="mv-label mb-1.5">Hoạ tiết</div>
                  <div className="flex flex-wrap gap-1.5">
                    {FG_MOTIFS.map((m) => <button key={m.id} type="button" onClick={() => set({ motif: m.id })} className={chip(spec.motif === m.id)} data-testid="fg-motif">{m.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="fg-palettes">
                    {FG_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `conic-gradient(${pl.cycle.map((c, i) => `${c} ${(i / pl.cycle.length) * 360}deg ${((i + 1) / pl.cycle.length) * 360}deg`).join(', ')})` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ lớn</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5" data-testid="fg-fonts">
                    {FG_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={refitKey} debounce={450} className={`rounded-lg w-full ${box3d}`} />
            )}
            <div className={tab === '3d' ? 'hidden' : ''} data-testid="fg-flat">
              {isBunting ? (
                <BuntingRow spec={spec} data={data} logo={logo || undefined} testid="fg-row" style={{ width: '100%', display: 'block' }} />
              ) : (
                <div className={`flex gap-3 justify-center items-end ${tall ? 'h-[56vh]' : ''}`}>
                  <div className="flex flex-col items-center gap-1 h-full min-w-0">
                    <FlagPiece spec={spec} data={data} logo={logo || undefined} testid="fg-front" style={{ height: tall ? '100%' : 'auto', width: tall ? 'auto' : '100%', maxWidth: '100%', display: 'block' }} />
                    {spec.sides === 2 && <span className="text-[10px] text-slate-400">Mặt trước</span>}
                  </div>
                  {spec.sides === 2 && (
                    <div className="flex flex-col items-center gap-1 h-full min-w-0">
                      <FlagPiece spec={spec} data={data} logo={logo || undefined} mirror testid="fg-back" style={{ height: tall ? '100%' : 'auto', width: tall ? 'auto' : '100%', maxWidth: '100%', display: 'block' }} />
                      <span className="text-[10px] text-slate-400">Mặt sau</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {title}{isBunting ? ` · ${pennants.length} lá · tờ in ${(sheet.wMm / 10).toFixed(0)}×${(sheet.hMm / 10).toFixed(0)}cm` : ` · ống luồn ${SLV / 10}cm · ${spec.sides} mặt`} · lề xén {bleed}mm · {dpi}dpi
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fg-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG</button>
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fg-3dpng">{busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="fg-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fg-svg" title="File vector, chữ đã outline, có nét cắt">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG</button>
            </div>
            <PrintRequest product="flag" title={`${title} · ${(data.title || data.word || '').trim()}`} defaultMaterial={fgMaterial(spec)} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in đúng khổ thật: đường cắt theo dáng cờ (hồng), {isBunting ? 'viền luồn dây 3cm' : `ống luồn cột ${SLV / 10}cm`} (đường gấp xanh), lề xén {bleed}mm.
              {spec.kind === 'phuon' ? ' Bộ cờ gồm vải in + cột sợi thuỷ tinh + chân đế.' : ''} Tự in hoặc gửi yêu cầu, Mivy in + giao (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          {/* nguồn texture 3D (không lề xén) */}
          {!isBunting && <div ref={frontRef}><FlagPiece spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>}
          {!isBunting && spec.sides === 2 && <div ref={backRef}><FlagPiece spec={spec} data={data} logo={logo || undefined} mirror style={{ width: '100%', display: 'block' }} /></div>}
          {isBunting && <div ref={pennRef}>{pennants.map((p, i) => <PennantSvg key={i} spec={spec} info={p} logo={logo || undefined} style={{ width: 120, display: 'block' }} />)}</div>}
          {/* file in (lề xén + nét cắt) */}
          <div ref={printRef} data-testid="fg-print">
            {isBunting
              ? <BuntingSheet spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', display: 'block' }} />
              : <FlagPiece spec={spec} data={data} logo={logo || undefined} bleed={FG_BLEED} marks style={{ width: '100%', display: 'block' }} />}
          </div>
          {!isBunting && spec.sides === 2 && <div ref={printBackRef} data-testid="fg-print-back"><FlagPiece spec={spec} data={data} logo={logo || undefined} bleed={FG_BLEED} marks mirror style={{ width: '100%', display: 'block' }} /></div>}
        </div>
      )}
    </div>
  );
}

function clean(s: string | undefined) { return (s || '').replace(/\s+/g, ' ').trim(); }
