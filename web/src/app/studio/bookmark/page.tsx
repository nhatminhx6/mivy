'use client';
// Bookmark kẹp sách: chọn mẫu (nhà sách, ra mắt sách, trường học, quà cưới, Tết, thơ văn…) → khổ + kiểu đầu + lỗ dây tua
// → điền 2 mặt (logo/ảnh tải lên trên máy) → xem thành phẩm 3D (kẹp trong sách mở + dây tua) → tải file in bình tờ có đường bế.

import { useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  BM_BLEED_MM, BM_FIELDS, BM_FONTS, BM_FONT_CSS, BM_MATERIALS, BM_PALETTES, BM_SHEETS, BM_SIZES, BM_TASSELS, BM_TEMPLATES, BM_TOPS,
  BookmarkSheetSvg, BookmarkSvg, bmSheetFit, bmSize, sampleFor, useBMFonts, type BMData, type BMSpec, type BMTemplate,
} from '@/lib/bookmark-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const T0 = BM_TEMPLATES[0];
const FIRST: BMSpec = { ...T0.spec, size: 's50', hole: true };

// ảnh khách: thu nhỏ trên máy (≤1600px), không gửi đi đâu
async function loadImage(file: File, max: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

// tờ in → PDF đúng khổ tờ (mỗi tờ 1 trang), chữ đã outline
async function sheetsPdf(els: SVGSVGElement[], wMm: number, hMm: number): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const dpi = wMm > 250 ? 240 : 300;
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation: 'portrait', compress: true });
  for (let i = 0; i < els.length; i++) {
    if (i) pdf.addPage([wMm, hMm], 'portrait');
    const c = await svgToCanvas(await selfContainedSvg(els[i], BM_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

// đổi mẫu khi khách đã sửa chữ: giữ ô khách tự viết, ô còn nguyên chữ mẫu cũ → thay bằng chữ mẫu mới
function switchData(d: BMData, from: BMTemplate, to: BMTemplate): BMData {
  const oldS = sampleFor(from), next = sampleFor(to);
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

export default function BookmarkPage() {
  const ready = useBMFonts();
  const [spec, setSpec] = useState<BMSpec>(FIRST);
  const [tplId, setTplId] = useState(T0.id);
  const [data, setData] = useState<BMData>(sampleFor(T0));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [photo, setPhoto] = useState('');
  const [sheetId, setSheetId] = useState('a4');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const texFront = useRef<HTMLDivElement | null>(null);
  const texBack = useRef<HTMLDivElement | null>(null);
  const foilFront = useRef<HTMLDivElement | null>(null);
  const foilBack = useRef<HTMLDivElement | null>(null);
  const sheetFront = useRef<HTMLDivElement | null>(null);
  const sheetBack = useRef<HTMLDivElement | null>(null);
  const sheetFoilF = useRef<HTMLDivElement | null>(null);
  const sheetFoilB = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = bmSize(spec.size);
  const lgo = logo || undefined, pht = photo || undefined;
  const foil = spec.material === 'foil';
  const tpl = BM_TEMPLATES.find((t) => t.id === tplId) || T0;
  const set = (p: Partial<BMSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: BMTemplate) => {
    setSpec((s) => ({ ...s, ...t.spec }));
    setData((d) => (dirty ? switchData(d, tpl, t) : sampleFor(t)));
    setTplId(t.id);
  };
  const fit = bmSheetFit(spec.size, sheetId);
  const sheet = BM_SHEETS.find((s) => s.id === sheetId)!;
  const slug = slugify(`bookmark-${data.brand || ''}`, 'bookmark');
  const usesPhoto = spec.layout === 'book' || spec.layout === 'wedding';

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const pick = async (f: File | undefined, kind: 'logo' | 'photo') => {
    if (!f) return;
    try {
      const url = await loadImage(f, kind === 'logo' ? 900 : 1600);
      if (kind === 'logo') setLogo(url); else setPhoto(url);
    } catch { alert('Không đọc được ảnh này, thử file PNG/JPG khác nhé.'); }
  };
  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, BM_FONT_CSS, 1200), `${slug}-mat-${side === 'front' ? 'truoc' : 'sau'}.png`);
  });
  const makePdf = async () => {
    const els = [svgOf(sheetFront), svgOf(sheetBack), ...(foil ? [svgOf(sheetFoilF), svgOf(sheetFoilB)] : [])];
    if (els.some((e) => !e)) throw new Error('Chưa dựng xong tờ in, thử lại nhé.');
    return sheetsPdf(els as SVGSVGElement[], sheet.wMm, sheet.hMm);
  };
  const pdfName = `${slug}-${sz.id}-${sheetId}-${fit.per}con-file-in-2-mat${foil ? '-ep-kim' : ''}.pdf`;
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(sheetFront); if (!el) return;
    downloadBlob(await svgFileBlob(el, BM_FONT_CSS), `${slug}-${sz.id}-${sheetId}-mat-truoc-file-cat.svg`);
  });

  const build3d = () => import('@/lib/bookmark-3d').then((m) => m.bookmarkBuilder({
    spec, front: svgOf(texFront), back: svgOf(texBack), foilFront: svgOf(foilFront), foilBack: svgOf(foilBack), fontCss: BM_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __bmSnap?: (w: number, h: number) => Promise<string> }).__bmSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const makeFiles = async () => {
    const file = await makePdf();
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await svgToPng(svgOf(frontRef)!, BM_FONT_CSS, 900);
    return { file, fileName: pdfName, preview };
  };
  const matName = BM_MATERIALS.find((m) => m.id === spec.material)?.name || '';
  const tasselName = BM_TASSELS.find((t) => t.id === spec.tassel)?.name || '';
  const orderTitle = `Bookmark ${sz.name} · ${BM_TOPS.find((t) => t.id === spec.top)?.name} · ${matName}${spec.hole ? ` · dây tua ${tasselName.toLowerCase()}` : ''}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = BM_FIELDS.filter((f) => f.layouts.includes(spec.layout));
  const field = (f: (typeof BM_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`bm-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`bm-${f.key}`} />}
    </label>
  );
  const sv = { width: '100%', height: '100%', display: 'block' } as const;
  const uploadBtn = (kind: 'logo' | 'photo', label: string, val: string, clear: () => void, ref: RefObject<HTMLInputElement>) => (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0], kind); e.target.value = ''; }} data-testid={`bm-${kind}-input`} />
      <button type="button" onClick={() => ref.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid={`bm-${kind}-btn`}>
        <ImagePlus className="w-3.5 h-3.5" /> {val ? `Đổi ${label}` : `Tải ${label} (tuỳ chọn)`}
      </button>
      {val && (
        <>
          <img src={val} alt={label} className="h-9 w-9 object-cover rounded border border-mv-hair bg-white" />
          <button type="button" onClick={clear} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ</button>
        </>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bookmark kẹp sách" sub="Bookmark nhà sách, quán cà phê sách, ra mắt sách, trường học, quà cưới, Tết — 2 mặt, dây tua, ép kim; file in bình tờ có đường bế, xưởng in–bế thẳng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${BM_TEMPLATES.length})`}>
              <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-6 gap-2.5">
                {BM_TEMPLATES.map((t) => {
                  const on = t.id === tplId;
                  const tdata = dirty ? switchData(data, tpl, t) : sampleFor(t);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="bm-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-ink/[0.04] py-2 grid place-items-center" style={{ aspectRatio: '1 / 2' }}>
                        <div style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}`, height: '100%', filter: 'drop-shadow(0 4px 8px rgba(15,23,42,0.18))' }}>
                          <BookmarkSvg spec={{ ...spec, ...t.spec }} data={tdata} side="front" logo={lgo} photo={pht} style={sv} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate" title={t.name}>{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Khổ, kiểu đầu & dây tua">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="bm-sizes">
                    {BM_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kiểu đầu / đuôi</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="bm-tops">
                    {BM_TOPS.map((t) => <button key={t.id} type="button" onClick={() => set({ top: t.id })} className={chip(spec.top === t.id)}>{t.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="bm-materials">
                    {BM_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" checked={spec.hole} onChange={(e) => set({ hole: e.target.checked })} data-testid="bm-hole" />
                  Đục lỗ Ø5mm + xỏ dây tua
                </label>
                {spec.hole && (
                  <div>
                    <div className="mv-label mb-1.5">Màu dây tua</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="bm-tassels">
                      {BM_TASSELS.map((t) => (
                        <button key={t.id} type="button" onClick={() => set({ tassel: t.id })} className={`flex items-center gap-1.5 ${chip(spec.tassel === t.id)}`}>
                          <span className="w-3.5 h-3.5 rounded-full border border-mv-hair" style={{ background: t.color }} />{t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung 2 mặt">
              <div className="space-y-4">
                {uploadBtn('logo', 'logo', logo, () => setLogo(''), logoRef)}
                {usesPhoto && uploadBtn('photo', 'ảnh', photo, () => setPhoto(''), photoRef)}
                {usesPhoto && !photo && <div className="text-[11px] text-slate-500 -mt-2">Chưa có ảnh → dùng tranh vẽ sẵn ({spec.layout === 'book' ? 'phong cảnh bìa sách' : 'đôi nhẫn cưới'}).</div>}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="bm-palettes">
                    {BM_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="bm-fonts">
                    {BM_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {f.name}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, photo.length])} refitKey={`${spec.size}|${spec.top}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`grid grid-cols-2 gap-4 rounded-lg bg-ink/[0.04] p-3 justify-items-center ${tab === '3d' ? 'hidden' : ''}`} data-testid="bm-flat">
              {(['front', 'back'] as const).map((side) => (
                <div key={side} className="w-full flex flex-col items-center">
                  <div className="text-[11px] text-slate-400 mb-1">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}</div>
                  <div ref={side === 'front' ? frontRef : backRef} style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}`, width: '62%', filter: 'drop-shadow(0 8px 14px rgba(15,23,42,0.22))' }} data-testid={`bm-${side}`}>
                    <BookmarkSvg spec={spec} data={data} side={side} logo={lgo} photo={pht} style={sv} uid={`bmv-${side}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · nền tràn {BM_BLEED_MM}mm · {fit.per} con/tờ {sheet.name.split(' ')[0]}{fit.rot ? ' (xếp ngang)' : ''}</div>
            <div className="flex flex-wrap justify-center gap-1.5" data-testid="bm-sheets">
              {BM_SHEETS.map((s) => <button key={s.id} type="button" onClick={() => setSheetId(s.id)} className={chip(sheetId === s.id)}>Tờ {s.name}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bm-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bm-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="bm-pdf" title="Tờ mặt trước + tờ mặt sau (đã đảo để in 2 mặt khớp), có đường bế; ép kim thêm 2 trang khuôn ép">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in 2 mặt
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bm-svg" title="File vector: lớp In + lớp CutContour (đường bế + lỗ), chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG file cắt
              </button>
            </div>
            <PrintRequest product="bookmark" title={orderTitle} defaultMaterial={foil ? 'Giấy mỹ thuật ép kim' : 'Couche 300 cán mờ + dây tua'} design={{ spec, data, template: tplId }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đã bình sẵn {fit.per} con/tờ, nền tràn lề, lớp CutContour (màu hồng) là đường bế{spec.hole ? ' gồm lỗ xỏ dây tua — dây tua do xưởng thắt khi gia công' : ''}.{foil ? ' Ép kim: PDF có thêm 2 trang khuôn ép (trắng = phần ép).' : ''}</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D (lớp in), mặt nạ ép kim, tờ in 2 mặt (+ khuôn ép) */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texFront}><BookmarkSvg spec={spec} data={data} side="front" logo={lgo} photo={pht} layer="print" uid="bmt-f" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBack}><BookmarkSvg spec={spec} data={data} side="back" logo={lgo} photo={pht} layer="print" uid="bmt-b" style={{ width: '100%', display: 'block' }} /></div>
          {foil && (
            <>
              <div ref={foilFront}><BookmarkSvg spec={spec} data={data} side="front" logo={lgo} photo={pht} layer="foil" uid="bmk-f" style={{ width: '100%', display: 'block' }} /></div>
              <div ref={foilBack}><BookmarkSvg spec={spec} data={data} side="back" logo={lgo} photo={pht} layer="foil" uid="bmk-b" style={{ width: '100%', display: 'block' }} /></div>
              <div ref={sheetFoilF} data-testid="bm-sheet-foil-front"><BookmarkSheetSvg spec={spec} data={data} logo={lgo} photo={pht} sheetId={sheetId} side="front" layer="foil" style={{ width: '100%', display: 'block' }} /></div>
              <div ref={sheetFoilB} data-testid="bm-sheet-foil-back"><BookmarkSheetSvg spec={spec} data={data} logo={lgo} photo={pht} sheetId={sheetId} side="back" layer="foil" style={{ width: '100%', display: 'block' }} /></div>
            </>
          )}
          <div ref={sheetFront} data-testid="bm-sheet-front"><BookmarkSheetSvg spec={spec} data={data} logo={lgo} photo={pht} sheetId={sheetId} side="front" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetBack} data-testid="bm-sheet-back"><BookmarkSheetSvg spec={spec} data={data} logo={lgo} photo={pht} sheetId={sheetId} side="back" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
