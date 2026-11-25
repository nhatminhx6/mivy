'use client';
// Giấy note in logo: giấy note dán (sticky, cả dáng bế), sổ note xé có bìa, hộp note vuông in 4 mặt hông, bộ sticky bìa cứng.
// Chọn loại → mẫu → điền thương hiệu → dáng/khổ/kẻ dòng/màu → xem 3D → tải PDF in (đủ trang cho loại đó) hoặc gửi yêu cầu in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  CUBE_MM, FLAG, HAND_SAMPLE, NP_BLEED_MM, NP_FIELDS, NP_FONTS, NP_FONT_CSS, NP_KINDS, NP_LAYOUTS, NP_PAD_SIZES, NP_PALETTES,
  NP_PAPERS, NP_RULINGS, NP_SHAPES, NP_TEMPLATES, SET, SET_PADS,
  CubeSideSvg, CubeWrapSvg, FlagsSvg, NoteSheetSvg, PadCoverSvg, SetCoverSvg, SetInsideSvg,
  defaultNPData, mainPaper, mainSheetDims, npPaper, npPdf, npSample, useNPFonts,
  type NPData, type NPKind, type NPPdfPage, type NPSpec,
} from '@/lib/notepad-engine';
import { svgFileBlob, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: NPSpec = { kind: 'sticky', layout: 'band', palette: 'navy', font: 'bvp', paper: 'yellow', shape: 'sq', padSize: 'a6', ruling: 'lines', sheets: 100 };

async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const s = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

const MATERIAL: Record<NPKind, string> = {
  sticky: 'Giấy note dán (sticky) in logo', pad: 'Sổ note xé 50 tờ + bìa', cube: 'Hộp giấy note vuông', set: 'Giấy note dán (sticky) in logo',
};

export default function NotepadPage() {
  const fontsReady = useNPFonts();
  const [spec, setSpec] = useState<NPSpec>(FIRST);
  const [data, setData] = useState<NPData>(defaultNPData());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const mainRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<NPSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof NP_TEMPLATES)[number]) => {
    set(t.spec);
    if (!dirty) setData((d) => ({ ...npSample(t.sample), logo: d.logo }));
  };
  const dims = mainSheetDims(spec);
  const paperHex = mainPaper(spec);
  const kindName = NP_KINDS.find((k) => k.id === spec.kind)!.name;
  const slug = slugify(`giay-note-${data.brand || ''}`, 'giay-note');
  const hand = spec.ruling === 'blank' ? undefined : HAND_SAMPLE;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgsOf = (r: RefObject<HTMLDivElement | null>) => Array.from(r.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const byKey = (k: string) => texRef.current?.querySelector(`[data-tex="${k}"] > svg`) as SVGSVGElement | null;

  // trang PDF theo loại
  const pageTrims = (): { wMm: number; hMm: number }[] => {
    if (spec.kind === 'sticky') return [{ wMm: dims.wMm, hMm: dims.hMm }];
    if (spec.kind === 'pad') return [{ wMm: dims.wMm, hMm: dims.hMm }, { wMm: dims.wMm, hMm: dims.hMm }];
    if (spec.kind === 'cube') return Array.from({ length: 5 }, () => ({ wMm: CUBE_MM, hMm: CUBE_MM }));
    return [{ wMm: SET.wMm * 2 + SET.spineMm, hMm: SET.hMm }, { wMm: SET_PADS[0].wMm, hMm: SET_PADS[0].hMm }, { wMm: SET_PADS[1].wMm, hMm: SET_PADS[1].hMm },
      { wMm: FLAG.n * FLAG.wMm + (FLAG.n - 1) * FLAG.gapMm, hMm: FLAG.hMm }];
  };
  const pageCount = pageTrims().length;
  const printPdf = async () => {
    const els = svgsOf(printRef);
    const trims = pageTrims();
    if (els.length !== trims.length) throw new Error('Chưa dựng xong file in, thử lại nhé.');
    const pages: NPPdfPage[] = els.map((el, i) => ({ el, trim: trims[i], bleed: NP_BLEED_MM, dpi: 300 }));
    return npPdf(pages, NP_FONT_CSS);
  };
  const pdfName = `${slug}-${spec.kind}-file-in.pdf`;
  const downloadPng = () => run('png', async () => {
    const el = svgOf(mainRef); if (!el) return;
    downloadBlob(await svgToPng(el, NP_FONT_CSS, 1600), `${slug}-${spec.kind}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), pdfName));
  const downloadSvg = () => run('svg', async () => {
    const el = svgsOf(printRef)[spec.kind === 'set' ? 1 : 0]; if (!el) return;
    downloadBlob(await svgFileBlob(el, NP_FONT_CSS), `${slug}-${spec.kind}-to-in.svg`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const file = await printPdf();
    let preview: Blob;
    if (view3d.current) {
      const c = await view3d.current.snapshot(1200, 900);
      preview = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
    } else {
      const el = svgOf(mainRef); if (!el) throw new Error('Chưa dựng xong ảnh xem trước');
      preview = await svgToPng(el, NP_FONT_CSS, 900, { watermark: false });
    }
    return { file, fileName: pdfName, preview };
  };

  const build3d = () => import('@/lib/notepad-3d').then((m) => m.notepadBuilder({
    kind: spec.kind, fontCss: NP_FONT_CSS,
    sheet: byKey('sheet'), hand: byKey('hand'), cover: byKey('cover'), small: byKey('small'), inside: byKey('inside'),
    sides: [0, 1, 2, 3].map((i) => byKey(`side${i}`)),
    wMm: dims.wMm, hMm: dims.hMm, shape: dims.shape, paperHex, sheets: spec.sheets,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __npSnap?: (w: number, h: number) => Promise<string> }).__npSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setData((d) => ({ ...d, logo: '' })); const u = await loadLogo(f); setData((d) => ({ ...d, logo: u })); } catch { alert('Không đọc được ảnh này, thử ảnh PNG/JPG khác nhé.'); }
  };

  const sizeName = spec.kind === 'sticky' ? NP_SHAPES.find((s) => s.id === spec.shape)!.name
    : spec.kind === 'pad' ? NP_PAD_SIZES.find((s) => s.id === spec.padSize)!.name
      : spec.kind === 'cube' ? 'Hộp 9×9×9 cm' : 'Bộ bìa cứng 9×12 cm';
  const orderTitle = `${kindName} ${sizeName} · ${spec.sheets} tờ · ${(data.brand || '').trim()}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const showPaper = spec.kind === 'sticky' || spec.kind === 'set';
  const mainProps = { spec, data, wMm: dims.wMm, hMm: dims.hMm, shape: dims.shape, paperHex };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Giấy note in logo" sub="Giấy note dán, sổ note xé, hộp note vuông in 4 mặt hông, bộ sticky bìa cứng — quà văn phòng, hội nghị, ngân hàng, trường học. Tải file in hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {NP_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => set({ kind: k.id, sheets: k.id === 'pad' ? 50 : 100 })} data-testid={`np-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!fontsReady ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${NP_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {NP_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  const tSpec = { ...spec, ...t.spec };
                  const tData = dirty ? data : { ...npSample(t.sample), logo: data.logo };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="np-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden grid place-items-center p-2" style={{ aspectRatio: '1 / 1', background: '#E9ECF1' }}>
                        <NoteSheetSvg spec={tSpec} data={tData} wMm={76} hMm={76} shape="sq" paperHex={npPaper(t.spec.paper).hex} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.15))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thương hiệu & nội dung">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-mv-hair bg-white grid place-items-center overflow-hidden shrink-0">
                    {data.logo ? <img src={data.logo} alt="logo" className="w-full h-full object-contain" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer" data-testid="np-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {data.logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="np-logo" />
                  </label>
                  {data.logo && <button type="button" className="mv-btn mv-btn-ghost !text-xs" onClick={() => setData((d) => ({ ...d, logo: '' }))}><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                </div>
                {NP_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} maxLength={60} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`np-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Dáng, khổ & kẻ dòng">
              <div className="space-y-4">
                {spec.kind === 'sticky' && (
                  <div>
                    <div className="mv-label mb-1.5">Dáng giấy note (bế theo hình)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="np-shapes">
                      {NP_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                )}
                {spec.kind === 'pad' && (
                  <div>
                    <div className="mv-label mb-1.5">Khổ sổ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="np-pad-sizes">
                      {NP_PAD_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ padSize: s.id })} className={chip(spec.padSize === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                )}
                {spec.kind !== 'set' && (
                  <div>
                    <div className="mv-label mb-1.5">Số tờ / {spec.kind === 'pad' ? 'cuốn' : spec.kind === 'cube' ? 'hộp (≈900 tờ)' : 'xấp'}</div>
                    <div className="flex gap-1.5">{([50, 100] as const).map((n) => <button key={n} type="button" onClick={() => set({ sheets: n })} className={chip(spec.sheets === n)}>{n} tờ</button>)}</div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Kẻ dòng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="np-rulings">
                    {NP_RULINGS.map((r) => <button key={r.id} type="button" onClick={() => set({ ruling: r.id })} className={chip(spec.ruling === r.id)}>{r.name}</button>)}
                  </div>
                </div>
                {showPaper && (
                  <div>
                    <div className="mv-label mb-1.5">Màu giấy note (giấy màu, không in nền)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="np-papers">
                      {NP_PAPERS.map((p) => (
                        <button key={p.id} type="button" onClick={() => set({ paper: p.id })} className={`flex items-center gap-1.5 ${chip(spec.paper === p.id)}`}>
                          <span className="w-4 h-4 rounded-sm border border-slate-300" style={{ background: p.hex }} /> {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Bố cục, màu mực & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="np-layouts">
                    {NP_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu mực</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="np-palettes">
                    {NP_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.ink} 55%, ${pl.accent} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font thương hiệu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="np-fonts">
                    {NP_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={`${spec.kind}|${dims.shape}|${spec.padSize}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'space-y-3'}>
              <div className="rounded-lg p-4 grid place-items-center" style={{ background: '#E9ECF1' }}>
                <div ref={mainRef} data-testid="np-main" style={{ width: spec.kind === 'pad' ? '62%' : '82%', aspectRatio: `${dims.wMm} / ${dims.hMm}` }}>
                  <NoteSheetSvg {...mainProps} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.18))' }} />
                </div>
              </div>
              {spec.kind === 'pad' && (
                <div className="rounded-lg p-4 grid place-items-center" style={{ background: '#E9ECF1' }} data-testid="np-cover">
                  <div style={{ width: '62%', aspectRatio: `${dims.wMm} / ${dims.hMm}` }}><PadCoverSvg spec={spec} data={data} wMm={dims.wMm} hMm={dims.hMm} style={{ width: '100%', height: '100%', display: 'block' }} /></div>
                </div>
              )}
              {spec.kind === 'cube' && (
                <div data-testid="np-wrap"><div className="text-[11px] text-slate-400 mb-1">In 4 mặt hông (đường nét đứt = cạnh hộp)</div><CubeWrapSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} /></div>
              )}
              {spec.kind === 'set' && (
                <div className="space-y-2" data-testid="np-set">
                  <SetCoverSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} />
                  <SetInsideSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} />
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kindName} · {sizeName} · lề xén {NP_BLEED_MM}mm · PDF {pageCount} trang</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="np-3d">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="np-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG tờ note
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="np-pdf" data-pages={pageCount}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({pageCount} trang)
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="np-svg" title="File vector, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG {spec.kind === 'sticky' && spec.shape !== 'sq' && spec.shape !== 'rect' ? 'in–cắt' : 'tờ note'}
              </button>
            </div>
            <PrintRequest product="notepad" title={orderTitle} defaultMaterial={MATERIAL[spec.kind]} design={{ spec, data: { ...data, logo: data.logo ? '(logo)' : '' } }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              {spec.kind === 'sticky' && 'Màu giấy note là giấy màu — file in chỉ có mực. Dáng bế có đường cắt CutContour.'}
              {spec.kind === 'pad' && 'PDF: trang ruột (in lặp cho mọi tờ) + bìa trước. Gáy keo phía trên, bìa sau kraft.'}
              {spec.kind === 'cube' && 'PDF: tờ ruột 9×9 + 4 mặt hông (in lên mép xấp giấy, hình liền mạch quanh hộp).'}
              {spec.kind === 'set' && 'PDF: bìa ngoài (sau | gáy | trước) + sticky 76×51 + sticky 51×38 + tờ 5 flag đánh dấu.'}
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: file in + texture 3D */}
      {fontsReady && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="np-print">
            {spec.kind === 'sticky' && <div><NoteSheetSvg {...mainProps} bleed print style={{ width: '100%', display: 'block' }} /></div>}
            {spec.kind === 'pad' && (<>
              <div><NoteSheetSvg {...mainProps} bleed print style={{ width: '100%', display: 'block' }} /></div>
              <div><PadCoverSvg spec={spec} data={data} wMm={dims.wMm} hMm={dims.hMm} bleed style={{ width: '100%', display: 'block' }} /></div>
            </>)}
            {spec.kind === 'cube' && (<>
              <div><NoteSheetSvg {...mainProps} bleed print style={{ width: '100%', display: 'block' }} /></div>
              {[0, 1, 2, 3].map((i) => <div key={i}><CubeSideSvg spec={spec} data={data} side={i} bleed style={{ width: '100%', display: 'block' }} /></div>)}
            </>)}
            {spec.kind === 'set' && (<>
              <div><SetCoverSvg spec={spec} data={data} bleed style={{ width: '100%', display: 'block' }} /></div>
              <div><NoteSheetSvg spec={spec} data={data} wMm={SET_PADS[0].wMm} hMm={SET_PADS[0].hMm} shape="rect" bleed print compact style={{ width: '100%', display: 'block' }} /></div>
              <div><NoteSheetSvg spec={spec} data={data} wMm={SET_PADS[1].wMm} hMm={SET_PADS[1].hMm} shape="rect" bleed print compact style={{ width: '100%', display: 'block' }} /></div>
              <div><FlagsSvg spec={spec} data={data} bleed style={{ width: '100%', display: 'block' }} /></div>
            </>)}
          </div>
          <div ref={texRef}>
            <div data-tex="sheet"><NoteSheetSvg {...mainProps} compact={spec.kind === 'set'} /></div>
            <div data-tex="hand"><NoteSheetSvg {...mainProps} hand={hand} compact={spec.kind === 'set'} /></div>
            {spec.kind === 'pad' && <div data-tex="cover"><PadCoverSvg spec={spec} data={data} wMm={dims.wMm} hMm={dims.hMm} /></div>}
            {spec.kind === 'cube' && [0, 1, 2, 3].map((i) => <div key={i} data-tex={`side${i}`}><CubeSideSvg spec={spec} data={data} side={i} /></div>)}
            {spec.kind === 'set' && (<>
              <div data-tex="cover"><SetCoverSvg spec={spec} data={data} /></div>
              <div data-tex="inside"><SetInsideSvg spec={spec} data={data} withPads={false} /></div>
              <div data-tex="small"><NoteSheetSvg spec={spec} data={data} wMm={SET_PADS[1].wMm} hMm={SET_PADS[1].hMm} shape="rect" paperHex={npPaper('pink').hex} compact /></div>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
