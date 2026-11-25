'use client';
// Tag treo quần áo + thẻ cảm ơn: chọn mẫu → hình bế → điền thông tin (mặt trước, mặt sau: size, giá, mã vạch, chất liệu)
// → xem thành phẩm 3D (tag + dây + kim băng trên áo gấp) → tải file in bình tờ A4/SRA3 có đường bế, hoặc gửi yêu cầu in.

import { useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  HT_BLEED_MM, HT_FIELDS, HT_FONTS, HT_FONT_CSS, HT_MATERIALS, HT_PALETTES, HT_SHAPES, HT_SHEETS, HT_TEMPLATES,
  HangtagSheetSvg, HangtagSvg, defaultHTData, htSheetFit, htShape, useHTFonts, type HTData, type HTKind, type HTSpec,
} from '@/lib/hangtag-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: HTSpec = { ...HT_TEMPLATES[0].spec, eyelet: false };

// logo khách: thu nhỏ trên máy (giữ nền trong suốt), không gửi đi đâu
async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

// tờ in → PDF đúng khổ tờ (mỗi mặt 1 trang), chữ đã outline
async function sheetsPdf(els: SVGSVGElement[], wMm: number, hMm: number): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const dpi = wMm > 250 ? 240 : 300;
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation: 'portrait', compress: true });
  for (let i = 0; i < els.length; i++) {
    if (i) pdf.addPage([wMm, hMm], 'portrait');
    const c = await svgToCanvas(await selfContainedSvg(els[i], HT_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function HangtagPage() {
  const ready = useHTFonts();
  const [spec, setSpec] = useState<HTSpec>(FIRST);
  const [data, setData] = useState<HTData>(defaultHTData());
  const [logo, setLogo] = useState('');
  const [sheetId, setSheetId] = useState('a4');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const texFront = useRef<HTMLDivElement | null>(null);
  const texBack = useRef<HTMLDivElement | null>(null);
  const foilFront = useRef<HTMLDivElement | null>(null);
  const foilBack = useRef<HTMLDivElement | null>(null);
  const sheetFront = useRef<HTMLDivElement | null>(null);
  const sheetBack = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sh = htShape(spec.shape);
  const lgo = logo || undefined;
  const isTag = spec.kind === 'tag';
  const set = (p: Partial<HTSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const setKind = (k: HTKind) => { if (k !== spec.kind) { const t = HT_TEMPLATES.find((x) => x.spec.kind === k)!; setSpec({ ...t.spec, eyelet: spec.eyelet }); } };
  const fit = htSheetFit(spec.shape, sheetId);
  const sheet = HT_SHEETS.find((s) => s.id === sheetId)!;
  const name = isTag ? 'Tag treo' : 'Thẻ cảm ơn';
  const slug = slugify(`${isTag ? 'tag-treo' : 'the-cam-on'}-${data.brand || ''}`, 'tag-treo');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh logo này, thử file PNG/JPG khác nhé.'); }
  };
  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, HT_FONT_CSS, 1200), `${slug}-mat-${side === 'front' ? 'truoc' : 'sau'}.png`);
  });
  const makePdf = async () => {
    const f = svgOf(sheetFront), b = svgOf(sheetBack);
    if (!f || !b) throw new Error('Chưa dựng xong tờ in, thử lại nhé.');
    return sheetsPdf([f, b], sheet.wMm, sheet.hMm);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${sh.id}-${sheetId}-${fit.per}con-file-in-2-mat.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(sheetFront); if (!el) return;
    downloadBlob(await svgFileBlob(el, HT_FONT_CSS), `${slug}-${sh.id}-${sheetId}-mat-truoc-file-cat.svg`);
  });

  const build3d = () => import('@/lib/hangtag-3d').then((m) => m.hangtagBuilder({
    spec, front: svgOf(texFront), back: svgOf(texBack), foilFront: svgOf(foilFront), foilBack: svgOf(foilBack), fontCss: HT_FONT_CSS,
  }));
  // hook cho QC/soi ảnh (chỉ bản dev): chụp 3D đúng góc mặc định, khổ lớn
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __htSnap?: (w: number, h: number) => Promise<string> }).__htSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const makeFiles = async () => {
    const file = await makePdf();
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await svgToPng(svgOf(frontRef)!, HT_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sh.id}-${sheetId}-file-in-2-mat.pdf`, preview };
  };
  const matName = HT_MATERIALS.find((m) => m.id === spec.material)?.name || '';
  const orderTitle = `${name} ${sh.name} · ${matName}${isTag && spec.eyelet ? ' · khoen kim loại' : ''}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = HT_TEMPLATES.filter((t) => t.spec.kind === spec.kind);
  const shapes = HT_SHAPES.filter((s) => s.kind === spec.kind);
  const fields = HT_FIELDS.filter((f) => f.kinds.includes(spec.kind));
  const field = (f: (typeof HT_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`ht-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`ht-${f.key}`} />}
    </label>
  );
  const sv = { width: '100%', height: '100%', display: 'block' } as const;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tag treo quần áo" sub="Tag treo shop thời trang (size, giá, mã vạch, ký hiệu giặt) và thẻ cảm ơn bỏ kèm đơn online — file in bình tờ có đường bế, xưởng in–bế thẳng." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        <button type="button" className="mv-seg-btn" data-active={spec.kind === 'tag'} onClick={() => setKind('tag')} data-testid="ht-kind-tag">Tag treo</button>
        <button type="button" className="mv-seg-btn" data-active={spec.kind === 'thanks'} onClick={() => setKind('thanks')} data-testid="ht-kind-thanks">Thẻ cảm ơn</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {tpls.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  const ts = htShape(t.spec.shape);
                  return (
                    <button key={t.id} type="button" onClick={() => setSpec({ ...t.spec, eyelet: spec.eyelet })} data-testid="ht-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-ink/[0.04] p-2 grid place-items-center" style={{ aspectRatio: isTag ? '3 / 4' : '16 / 11' }}>
                        <div style={{ aspectRatio: `${ts.wMm} / ${ts.hMm}`, height: isTag ? '100%' : undefined, width: isTag ? undefined : '100%', filter: 'drop-shadow(0 4px 8px rgba(15,23,42,0.18))' }}>
                          <HangtagSvg spec={{ ...t.spec, eyelet: spec.eyelet }} data={data} side="front" logo={lgo} style={sv} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Hình bế & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Hình & khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ht-shapes">
                    {shapes.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="ht-materials">
                    {HT_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {isTag && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={spec.eyelet} onChange={(e) => set({ eyelet: e.target.checked })} data-testid="ht-eyelet" />
                    Đóng khoen kim loại quanh lỗ xỏ dây (bền, sang hơn)
                  </label>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} data-testid="ht-logo-input" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid="ht-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                  </button>
                  {logo && (
                    <>
                      <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded border border-mv-hair bg-white" />
                      <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>
                    </>
                  )}
                  <span className="text-[11px] text-slate-500">Không có logo → tự dựng logo chữ từ tên shop.</span>
                </div>
                <div className="mv-label">Mặt trước</div>
                <div className="grid grid-cols-2 gap-3">{fields.filter((f) => f.side === 'front').map(field)}</div>
                <div className="mv-label pt-1">Mặt sau</div>
                <div className="grid grid-cols-2 gap-3">{fields.filter((f) => f.side === 'back').map(field)}</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="ht-palettes">
                    {HT_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên shop</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="ht-fonts">
                    {HT_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {data.brand || 'Thu Hà'}
                      </button>
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
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.kind}|${spec.shape}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`grid grid-cols-2 gap-3 rounded-lg bg-ink/[0.04] p-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="ht-flat">
              {(['front', 'back'] as const).map((side) => (
                <div key={side}>
                  <div className="text-[11px] text-slate-400 mb-1">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}</div>
                  <div ref={side === 'front' ? frontRef : backRef} style={{ aspectRatio: `${sh.wMm} / ${sh.hMm}`, filter: 'drop-shadow(0 8px 14px rgba(15,23,42,0.22))' }} data-testid={`ht-${side}`}>
                    <HangtagSvg spec={spec} data={data} side={side} logo={lgo} style={sv} uid={`htv-${side}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sh.name} · nền tràn {HT_BLEED_MM}mm · {fit.per} con/tờ {sheet.name.split(' ')[0]}</div>
            <div className="flex flex-wrap justify-center gap-1.5" data-testid="ht-sheets">
              {HT_SHEETS.map((s) => <button key={s.id} type="button" onClick={() => setSheetId(s.id)} className={chip(sheetId === s.id)}>Tờ {s.name}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ht-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ht-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ht-pdf" title="2 trang: tờ mặt trước + tờ mặt sau (đã đảo cột để in 2 mặt khớp), có đường bế">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in 2 mặt
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ht-svg" title="File vector: lớp In + lớp CutContour (đường bế), chữ đã outline — xưởng mở bằng AI/Corel">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG file cắt
              </button>
            </div>
            <PrintRequest product="hangtag" title={orderTitle} defaultMaterial={spec.material === 'kraft' ? 'Giấy kraft 350 + dây gai' : spec.material === 'foil' ? 'Giấy mỹ thuật ép kim' : undefined} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đã bình sẵn {fit.per} con/tờ, nền tràn lề, lớp CutContour (màu hồng) là đường bế gồm cả lỗ xỏ dây. {isTag ? 'Dây, kim băng/khoen do xưởng gắn khi gia công.' : ''}</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D (lớp in, không cắt), mặt nạ ép kim, tờ in 2 mặt */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texFront}><HangtagSvg spec={spec} data={data} side="front" logo={lgo} layer="print" uid="htt-f" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBack}><HangtagSvg spec={spec} data={data} side="back" logo={lgo} layer="print" uid="htt-b" style={{ width: '100%', display: 'block' }} /></div>
          {spec.material === 'foil' && (
            <>
              <div ref={foilFront}><HangtagSvg spec={spec} data={data} side="front" logo={lgo} layer="foil" uid="htk-f" style={{ width: '100%', display: 'block' }} /></div>
              <div ref={foilBack}><HangtagSvg spec={spec} data={data} side="back" logo={lgo} layer="foil" uid="htk-b" style={{ width: '100%', display: 'block' }} /></div>
            </>
          )}
          <div ref={sheetFront} data-testid="ht-sheet-front"><HangtagSheetSvg spec={spec} data={data} logo={lgo} sheetId={sheetId} side="front" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetBack} data-testid="ht-sheet-back"><HangtagSheetSvg spec={spec} data={data} logo={lgo} sheetId={sheetId} side="back" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
