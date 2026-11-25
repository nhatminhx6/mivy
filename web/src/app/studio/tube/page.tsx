'use client';
// Hộp ống tròn (ống giấy bồi): chọn mẫu theo ngành → kích thước thật + kiểu nắp + chất liệu (in màu / kraft / ép kim)
// → điền nội dung mặt trước + mặt sau (thành phần, mã vạch) → xem thành phẩm 3D (ống đóng + ống mở thấy hàng bên trong)
// → tải file in trải phẳng (giấy quấn thân, giấy quấn nắp, tem mặt nắp; lề xén, gấp mép, dán chồng; khuôn ép kim)
// hoặc gửi yêu cầu in. Render code 100%, không AI theo request.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  TB_FIELDS, TB_FINISHES, TB_FONTS, TB_FONT_CSS, TB_INDUSTRIES, TB_LAYOUTS, TB_PALETTES, TB_SIZES, TB_STYLES, TB_TEMPLATES,
  TubeMockSvg, TubePartSvg, TubeSheetSvg, defaultTBData, sheetLayout, templateData, tbPalette, tbSize, tubeGeom, useTBFonts,
  type TBData, type TBImage, type TBIndustry, type TBSpec,
} from '@/lib/tube-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: TBSpec = TB_TEMPLATES[0].spec;
const MM_PER_IN = 25.4;

async function loadImage(file: File, max = 900): Promise<TBImage> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return { href: c.toDataURL('image/png'), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}

/** tờ file in (khổ thật) → PDF nhiều trang (trang 2 = khuôn ép kim nếu có). dpi tự hạ cho tờ lớn */
async function sheetsToPdf(els: SVGSVGElement[], wMm: number, hMm: number): Promise<Blob> {
  const dpi = Math.max(120, Math.min(300, Math.floor(7000 / (Math.max(wMm, hMm) / MM_PER_IN))));
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  const { jsPDF } = await import('jspdf');
  const orientation = wMm >= hMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation, compress: true });
  for (let i = 0; i < els.length; i++) {
    const c = await svgToCanvas(await selfContainedSvg(els[i], TB_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    if (i > 0) pdf.addPage([wMm, hMm], orientation);
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function TubePage() {
  const ready = useTBFonts();
  const [spec, setSpec] = useState<TBSpec>(FIRST);
  const [data, setData] = useState<TBData>(templateData(TB_TEMPLATES[0]));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState<TBImage | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const texBody = useRef<HTMLDivElement | null>(null);
  const texLid = useRef<HTMLDivElement | null>(null);
  const texTop = useRef<HTMLDivElement | null>(null);
  const foilBody = useRef<HTMLDivElement | null>(null);
  const foilLid = useRef<HTMLDivElement | null>(null);
  const foilTop = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const logoIn = useRef<HTMLInputElement | null>(null);

  const g = tubeGeom(spec);
  const sz = tbSize(spec.size);
  const sheet = useMemo(() => sheetLayout(spec), [spec]);
  const set = (p: Partial<TBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof TB_TEMPLATES)[number]) => {
    setSpec(t.spec);
    if (!dirty) setData(templateData(t));
  };
  const pickIndustry = (id: TBIndustry) => {
    const ind = TB_INDUSTRIES.find((i) => i.id === id)!;
    set({ industry: id, size: ind.size });
    if (!dirty) setData(defaultTBData(id));
  };
  const slug = slugify(`ong-${data.brand || ''}-${data.name || ''}`, 'hop-ong');
  const opts = { spec, data, logo };
  const pal = tbPalette(spec.palette);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => (r.current?.querySelector('svg') as SVGSVGElement | null) ?? null;
  const need = (r: RefObject<HTMLDivElement | null>) => { const el = svgOf(r); if (!el) throw new Error('Chưa dựng xong file, thử lại nhé.'); return el; };
  const pdfName = `${slug}-${sz.id}-file-in.pdf`;
  const makePdf = () => sheetsToPdf(spec.foil ? [need(sheetRef), need(maskRef)] : [need(sheetRef)], sheet.W, sheet.H);
  const toBlob = (cv: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, 0.88));

  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-anh-3d.png`);
  });
  const downloadPng = () => run('png', async () => downloadBlob(await svgToPng(need(texBody), TB_FONT_CSS, 2400), `${slug}-giay-quan-than.png`));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName));
  const downloadSvg = () => run('svg', async () => downloadBlob(await svgFileBlob(need(sheetRef), TB_FONT_CSS), `${slug}-${sz.id}-file-in.svg`));

  const makeFiles = async () => {
    const pv = need(texBody);
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((cv) => toBlob(cv, 'image/jpeg')).catch(() => svgToJpeg(pv, TB_FONT_CSS, 900))
      : svgToJpeg(pv, TB_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/tube-3d').then((m) => m.tubeBuilder({
    spec, fontCss: TB_FONT_CSS,
    body: svgOf(texBody), lid: svgOf(texLid), top: svgOf(texTop),
    foilBody: spec.foil ? svgOf(foilBody) : null, foilLid: spec.foil ? svgOf(foilLid) : null, foilTop: spec.foil ? svgOf(foilTop) : null,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __tubeSnap?: (w: number, h: number) => Promise<string> }).__tubeSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const orderTitle = `Hộp ống tròn Ø${g.d}×${g.h}mm · ${spec.style === 'lid' ? 'nắp rời' : 'nắp liền vai'} · ${spec.finish === 'kraft' ? 'kraft' : 'giấy bồi in màu'}${spec.foil ? ' · ép kim' : ''}`;

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadImage(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const field = (f: (typeof TB_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[60px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tb-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tb-${f.key}`} />}
    </label>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp ống tròn" sub="Ống giấy bồi đựng trà, cà phê, rượu vang, khăn áo, nến thơm, poster — nắp rời hoặc nắp liền vai, in màu / kraft / ép kim. Xem thành phẩm 3D, tải file in trải phẳng (giấy quấn thân, giấy quấn nắp, tem mặt nắp) hoặc đặt Mivy in." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TB_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {TB_TEMPLATES.map((t) => {
                  const on = JSON.stringify(t.spec) === JSON.stringify(spec);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="tb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden aspect-[3/4] grid place-items-center" style={{ background: 'linear-gradient(180deg,#F5F2EC,#E7E1D6)' }}>
                        <TubeMockSvg spec={t.spec} data={dirty ? data : templateData(t)} logo={logo} style={{ width: '88%', height: '92%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-500 px-0.5 truncate">{tbSize(t.spec.size).short}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Kích thước, kiểu nắp & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Ngành hàng (đổi hàng bên trong 3D)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tb-industries">
                    {TB_INDUSTRIES.map((i) => <button key={i.id} type="button" onClick={() => pickIndustry(i.id)} className={chip(spec.industry === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kích thước ống (thật)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="tb-sizes">
                    {TB_SIZES.map((s) => (
                      <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={`${chip(spec.size === s.id)} text-left`} data-testid={`tb-size-${s.id}`}>
                        <div className="truncate">{s.name}</div><div className="text-[10px] opacity-60">nắp cao {s.lidH}mm</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Kiểu nắp</div>
                    <div className="grid gap-1.5" data-testid="tb-styles">
                      {TB_STYLES.map((s) => (
                        <button key={s.id} type="button" onClick={() => set({ style: s.id })} className={`${chip(spec.style === s.id)} text-left`} data-testid={`tb-style-${s.id}`}>
                          <div>{s.name}</div><div className="text-[10px] opacity-60">{s.note}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Chất liệu</div>
                    <div className="grid gap-1.5" data-testid="tb-finishes">
                      {TB_FINISHES.map((f) => (
                        <button key={f.id} type="button" onClick={() => set({ finish: f.id })} className={`${chip(spec.finish === f.id)} text-left`} data-testid={`tb-finish-${f.id}`}>
                          <div>{f.name}</div><div className="text-[10px] opacity-60">{f.note}</div>
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 cursor-pointer">
                      <input type="checkbox" checked={spec.foil} onChange={(e) => set({ foil: e.target.checked })} data-testid="tb-foil" />
                      Ép kim {pal.foilName} (logo, thương hiệu, hoạ tiết) — xuất kèm khuôn ép
                    </label>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Thân Ø{g.d} × cao {g.bodyH}mm · nắp Ø{g.lidD.toFixed(1)} × {g.lidH}mm · giấy quấn thân {(g.C + 10).toFixed(0)} × {(g.bodyH + 30).toFixed(0)}mm · tem nắp Ø{g.topD.toFixed(0)}mm
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung mặt trước & logo">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
                    {logo ? <img src={logo.href} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => logoIn.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="tb-logo-btn">
                        <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Thêm logo'}
                      </button>
                      {logo && <button type="button" onClick={() => setLogo(null)} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ</button>}
                    </div>
                    <p className="text-[11px] text-slate-500">PNG nền trong là đẹp nhất. Hiện ở huy hiệu mặt trước & tem nắp (ảnh chỉ xử lý trên máy anh/chị).</p>
                  </div>
                  <input ref={logoIn} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="tb-logo" />
                </div>
                <div className="grid grid-cols-2 gap-3">{TB_FIELDS.filter((f) => !f.back).map(field)}</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Mặt sau: thành phần, xuất xứ, mã vạch">
              <div className="grid grid-cols-2 gap-3">{TB_FIELDS.filter((f) => f.back).map(field)}</div>
              <p className="text-[11px] text-slate-500 mt-3">Mặt sau nằm đối diện mặt trước trên thân ống. Chữ tự co cho vừa; ống nhỏ (nến Ø6) sẽ tự bớt mục phụ để vẫn dễ đọc.</p>
            </CollapsibleSection>

            <CollapsibleSection title="5 · Bố cục, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tb-layouts">
                    {TB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="tb-palettes">
                    {TB_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 55%, ${pl.accent} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên sản phẩm</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="tb-fonts">
                    {TB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length || 0])} refitKey={`${spec.size}|${spec.style}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="tb-flat">
              <div className="grid grid-cols-2 gap-2 rounded-lg p-2" style={{ background: 'linear-gradient(180deg,#F5F2EC,#E7E1D6)' }}>
                <div><div className="text-[10px] text-slate-500 text-center mb-1">Mặt trước</div><TubeMockSvg {...opts} side="front" style={{ width: '100%', height: 260, display: 'block' }} /></div>
                <div><div className="text-[10px] text-slate-500 text-center mb-1">Mặt sau</div><TubeMockSvg {...opts} side="back" style={{ width: '100%', height: 260, display: 'block' }} /></div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">File in trải phẳng · {sheet.W.toFixed(0)} × {sheet.H.toFixed(0)} mm</div>
                <div className="rounded-md overflow-hidden border border-mv-hair bg-white"><TubeSheetSvg {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {spec.style === 'lid' ? 'nắp rời' : 'nắp liền vai'} · {spec.finish === 'kraft' ? 'kraft' : 'in màu'}{spec.foil ? ` · ép kim ${pal.foilName}` : ''}</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-3d" title="Ảnh thành phẩm 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-png" title="Ảnh giấy quấn thân">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tb-pdf" data-pages={spec.foil ? 2 : 1}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-svg" title="File vector (chữ đã outline) — lớp In, CutContour, Fold">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="tube" title={orderTitle} defaultMaterial={spec.finish === 'kraft' ? 'Ống giấy kraft' : 'Ống giấy bồi nắp rời'} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in gồm giấy quấn thân (chu vi + 10mm dán chồng, gấp mép 15mm), giấy quấn nắp và tem mặt nắp trên 1 tờ đúng kích thước thật, lề xén 3mm, đường cắt + đường gấp.{spec.foil ? ' Trang 2 là khuôn ép kim (vùng đen).' : ''}</p>
          </div>
        </div>
      )}

      {/* nguồn texture 3D + khuôn ép + tờ file in — ẩn */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={texBody} data-testid="tb-tex-body"><TubePartSvg part="body" {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          <div ref={texLid} data-testid="tb-tex-lid"><TubePartSvg part="lid" {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          <div ref={texTop} data-testid="tb-tex-top"><TubePartSvg part="top" {...opts} style={{ width: 400, height: 'auto', display: 'block' }} /></div>
          {spec.foil && (
            <>
              <div ref={foilBody}><TubePartSvg part="body" mode="foil3d" {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
              <div ref={foilLid}><TubePartSvg part="lid" mode="foil3d" {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
              <div ref={foilTop}><TubePartSvg part="top" mode="foil3d" {...opts} style={{ width: 400, height: 'auto', display: 'block' }} /></div>
              <div ref={maskRef} data-testid="tb-mask"><TubeSheetSvg {...opts} mask style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
            </>
          )}
          <div ref={sheetRef} data-testid="tb-sheet"><TubeSheetSvg {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
