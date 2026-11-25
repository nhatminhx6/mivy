'use client';
// Lịch Tết để bàn 2027: chọn mẫu → điền thương hiệu → xem từng tháng (âm lịch chuẩn) → tải PDF in 13 trang
// (lề xén 3mm, vạch cắt) hoặc gửi yêu cầu in. Mẫu = bố cục × màu × font × hoa, render code 100%.

import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  CAL_BLEED_MM, CAL_FIELDS, CAL_FONTS, CAL_FONT_CSS, CAL_LAYOUTS, CAL_PALETTES, CAL_SIZES, CAL_TEMPLATES, CAL_YEAR,
  CalendarSvg, WALL_LAYOUTS, WALL_SHEETS, WALL_SIZES, WALL_TEMPLATES, calKind, calPageCount, calPageLabel, calPalette, calSize, defaultCalData, useCalFonts,
  wallSheets, type CalData, type CalKind, type CalSpec, type Flower,
  BLOC_FIELDS, BLOC_LAYOUTS, BLOC_SIZES, BLOC_TEMPLATES, BlocPreviewSvg, BlocSheetSvg, blocDay, blocDaysInYear, blocSize, blocSlot, doyOf,
} from '@/lib/calendar-engine';
import { embedFontCss } from '@/lib/html-export';
import { printPageDims } from '@/lib/print-export';
import { svgFileBlob, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: CalSpec = { ...CAL_TEMPLATES[0].spec, size: '210x150' };
const FIRST_WALL: CalSpec = { ...WALL_TEMPLATES[0].spec, size: '330x480', sheets: 13 };
const FIRST_BLOC: CalSpec = { ...BLOC_TEMPLATES[0].spec, size: '300x400' };
const firstOf = (k: CalKind) => (k === 'wall' ? FIRST_WALL : k === 'bloc' ? FIRST_BLOC : FIRST);
const TET_DOY = doyOf(6, 2);                                   // mở sẵn tờ mùng 1 Tết
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const fmtDate = (doy: number) => { const D = blocDay(doy); return `${D.y}-${String(D.m).padStart(2, '0')}-${String(D.d).padStart(2, '0')}`; };

// PDF tờ bloc: dựng SVG từng ngày bằng renderToStaticMarkup (không gắn DOM) → ảnh JPEG 200dpi → trang có lề xén + vạch cắt.
// 365 trang vẫn nhẹ (JPEG) và chạy hết trên trình duyệt; chia theo tháng nếu cần file nhỏ.
async function blocPdf(spec: CalSpec, data: CalData, days: number[], onProgress?: (i: number, n: number) => void): Promise<Blob> {
  const [{ renderToStaticMarkup }, { jsPDF }, css] = await Promise.all([import('react-dom/server'), import('jspdf'), embedFontCss(CAL_FONT_CSS)]);
  const bs = blocSize(spec.size);
  const trim = { wMm: bs.blocW, hMm: bs.blocH };
  const { pageW, pageH, bleedBoxW, bleedBoxH } = printPageDims(trim, CAL_BLEED_MM);
  const room = (pageW - bleedBoxW) / 2;
  const dpi = 200;
  const outW = Math.round((bleedBoxW / 25.4) * dpi), outH = Math.round((bleedBoxH / 25.4) * dpi);
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait', compress: true });
  const c = document.createElement('canvas'); c.width = outW; c.height = outH;
  const ctx = c.getContext('2d')!;
  const style = `<style>${css}</style>`;
  for (let i = 0; i < days.length; i++) {
    let svg = renderToStaticMarkup(<BlocSheetSvg spec={spec} data={data} doy={days[i]} bleed />);
    svg = svg.replace(/^<svg([^>]*)>/, (m0, a) => `<svg${a.includes('xmlns=') ? a : `${a} xmlns="http://www.w3.org/2000/svg"`} width="${outW}" height="${outH}">${style}`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      let im = new Image(); im.src = url; await im.decode();
      if (i === 0) { await new Promise((r) => setTimeout(r, 80)); im = new Image(); im.src = url; await im.decode(); } // lần đầu: chờ font subset tiếng Việt
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(im, 0, 0, outW, outH);
    } finally { URL.revokeObjectURL(url); }
    if (i > 0) pdf.addPage([pageW, pageH], 'portrait');
    pdf.addImage(c.toDataURL('image/jpeg', 0.86), 'JPEG', room, (pageH - bleedBoxH) / 2, bleedBoxW, bleedBoxH, undefined, 'FAST');
    // vạch cắt 4 góc vùng thành phẩm (nằm ngoài lề xén)
    const tx0 = room + CAL_BLEED_MM, ty0 = (pageH - bleedBoxH) / 2 + CAL_BLEED_MM, tx1 = tx0 + trim.wMm, ty1 = ty0 + trim.hMm;
    const len = Math.max(3, room - CAL_BLEED_MM - 1);
    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
    for (const [x, y, sx, sy] of [[tx0, ty0, 1, 1], [tx1, ty0, -1, 1], [tx0, ty1, 1, -1], [tx1, ty1, -1, -1]] as const) {
      pdf.line(x - sx * CAL_BLEED_MM, y, x - sx * (CAL_BLEED_MM + len), y);
      pdf.line(x, y - sy * CAL_BLEED_MM, x, y - sy * (CAL_BLEED_MM + len));
    }
    onProgress?.(i + 1, days.length);
    if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0)); // nhường UI cập nhật tiến độ
  }
  return pdf.output('blob');
}

// ảnh khách tải lên: thu nhỏ còn ≤1800px (JPEG) → nhẹ, xuất PDF nhanh; chỉ nằm trên máy khách
async function readPhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88);
}

export default function CalendarPage() {
  return <Suspense fallback={null}><CalendarStudio /></Suspense>;
}

function CalendarStudio() {
  const ready = useCalFonts();
  const qs = useSearchParams();
  const qk = qs.get('kind');
  const qKind: CalKind = qk === 'wall' ? 'wall' : qk === 'bloc' ? 'bloc' : 'desk';
  const [spec, setSpec] = useState<CalSpec>(() => firstOf(qKind));
  const [data, setData] = useState<CalData>(defaultCalData());
  const [page, setPage] = useState(0);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [doy, setDoy] = useState(TET_DOY);
  const [blocMonth, setBlocMonth] = useState(0);        // 0 = cả năm
  const [progress, setProgress] = useState('');
  const boardRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetPrintRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const logoRef = useRef<HTMLInputElement | null>(null);
  const [logo, setLogo] = useState('');
  const kind = calKind(spec);
  const wall = kind === 'wall';
  const bloc = kind === 'bloc';
  const nPages = calPageCount(spec);
  const PAGES = Array.from({ length: nPages }, (_, i) => i);
  const templates = wall ? WALL_TEMPLATES : bloc ? BLOC_TEMPLATES : CAL_TEMPLATES;
  const nDays = blocDaysInYear(CAL_YEAR);
  const bsz = blocSize(spec.size);
  const D = blocDay(doy);
  const setKind = (k: CalKind) => { if (k === kind) return; setSpec(firstOf(k)); setPage(0); };
  // đổi ?kind trên URL (vd bấm link catalog khi đang ở trang) → chuyển loại lịch
  useEffect(() => { setKind(qKind); }, [qKind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (page >= (bloc ? 2 : nPages)) setPage(0); }, [page, nPages, bloc]);

  const set = (p: Partial<CalSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const sz = calSize(spec.size);
  const slug = slugify(`lich-${wall ? 'treo-tuong-' : bloc ? 'bloc-' : ''}${CAL_YEAR}-${data.brand || ''}`, `lich-${CAL_YEAR}`);
  const pageSlug = (i: number) => (bloc ? (i === 0 ? 'bang-treo' : `ngay-${D.d}-${D.m}`) : i === 0 ? 'bia' : `to-${i}`);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSvgs = () => Array.from(printRef.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];

  const downloadPng = () => run('png', async () => {
    const el = svgOf(viewRef); if (!el) return;
    downloadBlob(await svgToPng(el, CAL_FONT_CSS, 2000), `${slug}-${pageSlug(page)}.png`);
  });
  const blocDaysOf = (m: number) => Array.from({ length: nDays }, (_, i) => i + 1).filter((d) => !m || blocDay(d).m === m);
  const downloadBlocPdf = () => run('bloc', async () => {
    const days = blocDaysOf(blocMonth);
    const blob = await blocPdf(spec, data, days, (i, n) => setProgress(`${i}/${n}`));
    setProgress('');
    downloadBlob(blob, `${slug}-bloc-${bsz.blocW}x${bsz.blocH}-${blocMonth ? `thang-${blocMonth}` : 'ca-nam'}-${days.length}-to.pdf`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const els = printSvgs(); if (els.length !== nPages) return;
    if (bloc) { downloadBlob(await svgsToPrintPdf(els, CAL_FONT_CSS, sz, CAL_BLEED_MM, 150), `${slug}-bang-treo-${sz.id}-file-in.pdf`); return; }
    downloadBlob(await svgsToPrintPdf(els, CAL_FONT_CSS, sz, CAL_BLEED_MM, wall ? 200 : 300), `${slug}-${sz.id}-${nPages}-trang-file-in.pdf`);
  });
  const downloadSvg = () => run('svg', async () => {
    const el = bloc ? (page === 0 ? printSvgs()[0] : (sheetPrintRef.current?.querySelector('svg') as SVGSVGElement | null)) : printSvgs()[page]; if (!el) return;
    downloadBlob(await svgFileBlob(el, CAL_FONT_CSS), `${slug}-${pageSlug(page)}-file-in.svg`);
  });

  const makeFiles = async () => {
    const els = printSvgs(), pv = svgOf(viewRef);
    if (els.length !== nPages || !pv) throw new Error('Chưa dựng xong lịch, thử lại nhé.');
    const preview = async () => {
      const c = tab === '3d' ? await view3d.current?.snapshot(900, 640).catch(() => null) : null;
      if (c) return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
      return svgToJpeg(pv, CAL_FONT_CSS, 900);
    };
    if (bloc) {
      // gửi xưởng: bảng treo (PDF in) — tờ bloc 365 ngày Mivy dựng lại từ thiết kế (spec + data) khi chốt đơn
      const [file, pre] = await Promise.all([svgsToPrintPdf(els, CAL_FONT_CSS, sz, CAL_BLEED_MM, 150), preview()]);
      return { file, fileName: `${slug}-bang-treo-${sz.id}-file-in.pdf`, preview: pre };
    }
    const [file, pre] = await Promise.all([svgsToPrintPdf(els, CAL_FONT_CSS, sz, CAL_BLEED_MM, wall ? 200 : 300), preview()]);
    return { file, fileName: `${slug}-${sz.id}-${nPages}-trang-file-in.pdf`, preview: pre };
  };

  const build3d = () => import('@/lib/calendar-3d').then((m) => (bloc
    ? m.blocCalendarBuilder({
      board: boardRef.current?.querySelector('svg') as SVGSVGElement | null, sheet: sheetRef.current?.querySelector('svg') as SVGSVGElement | null, fontCss: CAL_FONT_CSS,
      wMm: bsz.wMm, hMm: bsz.hMm, blocW: bsz.blocW, blocH: bsz.blocH, slotX: blocSlot(spec.size).x / 4, slotY: blocSlot(spec.size).y / 4, doy, total: nDays,
      accent: spec.palette === 'white' ? '#1F1F1F' : calPalette(spec.palette).accent,
    })
    : wall
    ? m.wallCalendarBuilder({ el: svgOf(viewRef), wMm: sz.wMm, hMm: sz.hMm, fontCss: CAL_FONT_CSS, page, pages: nPages, strip: spec.palette === 'white' || spec.layout === 'w-mini' ? '#C7CBD1' : calPalette(spec.palette).accent2 })
    : m.calendarBuilder({ el: svgOf(viewRef), wMm: sz.wMm, hMm: sz.hMm, fontCss: CAL_FONT_CSS, page, pages: nPages })));
  // hook cho QC (chụp 3D ở góc mặc định để soi) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __calSnap?: (w: number, h: number) => Promise<string> }).__calSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); };
  const layoutName = [...CAL_LAYOUTS, ...WALL_LAYOUTS, ...BLOC_LAYOUTS].find((l) => l.id === spec.layout)?.name;
  const orderTitle = wall
    ? `Lịch treo tường ${CAL_YEAR} ${wallSheets(spec)} tờ ${sz.name} · ${layoutName}`
    : bloc ? `Lịch bloc Tết ${CAL_YEAR} · ${sz.name} · ${layoutName}`
    : `Lịch để bàn ${CAL_YEAR} ${sz.name} · ${layoutName}`;
  const material = wall ? `Lịch treo tường ${wallSheets(spec)} tờ` : bloc ? 'Lịch bloc Tết + bảng treo' : 'Lịch để bàn chữ A, gáy lò xo';
  const onLogo = async (f?: File | null) => {
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      const sc = Math.min(1, 600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      setLogo(c.toDataURL('image/png'));
    } catch { alert('Không đọc được logo này, anh/chị thử ảnh PNG/JPG khác nhé.'); }
    if (logoRef.current) logoRef.current.value = '';
  };

  const photoKey = bloc ? 0 : page;                         // lịch bloc: ảnh thay tranh của bảng treo
  const onPhoto = async (f?: File | null) => {
    if (!f) return;
    try { const url = await readPhoto(f); setPhotos((p) => ({ ...p, [photoKey]: url })); } catch { alert('Không đọc được ảnh này, anh/chị thử ảnh JPG/PNG khác nhé.'); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const pageNav = (d: number) => setPage((p) => (p + d + nPages) % nPages);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={wall ? `Lịch treo tường ${CAL_YEAR}` : bloc ? `Lịch bloc Tết ${CAL_YEAR}` : `Lịch Tết để bàn ${CAL_YEAR}`} sub={bloc
        ? 'Bảng treo in tranh Tết / phong cảnh / thương hiệu doanh nghiệp + tập bloc xé 365 tờ: số ngày cực lớn, âm lịch, can chi ngày–tháng–năm, ngày hoàng đạo, giờ hoàng đạo, tục ngữ mỗi ngày — quà Tết truyền thống.'
        : wall
        ? 'Lịch treo tường nẹp thiếc 7 tờ (2 tháng/tờ) hoặc 13 tờ, tranh Tết lớn hoặc ảnh sản phẩm, âm lịch chuẩn, dải logo + hotline của doanh nghiệp — quà Tết tặng khách treo cả năm.'
        : 'Lịch chữ A gáy lò xo, 13 tờ (bìa + 12 tháng) có âm lịch chuẩn, ngày lễ, thương hiệu của shop — làm quà Tết tặng khách. Tải PDF in chuẩn hoặc đặt Mivy in + giao.'} />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        <button type="button" className="mv-seg-btn" data-active={!wall} onClick={() => setKind('desk')} data-testid="cal-kind-desk">Lịch để bàn</button>
        <button type="button" className="mv-seg-btn" data-active={wall} onClick={() => setKind('wall')} data-testid="cal-kind-wall">Lịch treo tường</button>
        <button type="button" className="mv-seg-btn" data-active={bloc} onClick={() => setKind('bloc')} data-testid="cal-kind-bloc">Lịch bloc</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${templates.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {templates.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set({ ...t.spec, sheets: spec.sheets })} data-testid="cal-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        {bloc
                          ? <BlocPreviewSvg spec={{ ...t.spec, size: spec.size }} data={data} doy={doy} photo={photos[0]} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                          : <CalendarSvg spec={{ ...t.spec, size: spec.size, sheets: spec.sheets }} data={data} page={page} photo={photos[page]} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />}
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin thương hiệu">
              <div className="grid grid-cols-2 gap-3">
                {(bloc ? BLOC_FIELDS : CAL_FIELDS).map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cal-${f.key}`} />
                  </label>
                ))}
              </div>
              {(wall || bloc) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} data-testid="cal-logo-input" />
                  <button type="button" onClick={() => logoRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Thêm logo (dải thương hiệu)'}</button>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">{bloc ? 'Logo in ở dải dưới bảng treo (mẫu Doanh nghiệp: in to đầu bảng).' : 'Logo in ở dải dưới mọi tờ.'} Ảnh chỉ nằm trên máy anh/chị.</span>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font, hoa & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="cal-palettes">
                    {CAL_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-3 gap-1.5" data-testid="cal-fonts">
                    {CAL_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        Xuân {CAL_YEAR}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wall && (
                    <div className="sm:col-span-2">
                      <div className="mv-label mb-1.5">Số tờ</div>
                      <div className="flex gap-1.5" data-testid="cal-sheets">
                        {WALL_SHEETS.map((n) => (
                          <button key={n} type="button" onClick={() => { set({ sheets: n }); setPage(0); }} className={chip(wallSheets(spec) === n)}>
                            {n === 7 ? '7 tờ (bìa + 6 tờ, 2 tháng/tờ)' : '13 tờ (bìa + 12 tháng)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="mv-label mb-1.5">Hoa trang trí</div>
                    <div className="flex gap-1.5" data-testid="cal-flowers">
                      {([['mai', 'Hoa mai'], ['dao', 'Hoa đào']] as [Flower, string][]).map(([id, name]) => (
                        <button key={id} type="button" onClick={() => set({ flower: id })} className={chip(spec.flower === id)}>{name}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(wall ? WALL_SIZES : bloc ? BLOC_SIZES : CAL_SIZES).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="cal-size">{s.name}</button>)}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Ảnh riêng (tuỳ chọn)" defaultOpen={false}>
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Thay hoạ tiết bằng ảnh sản phẩm/cửa hàng cho <b className="text-mv-fg">{bloc ? 'bảng treo' : calPageLabel(spec, page)}</b>. Ảnh chỉ nằm trên máy anh/chị, không tải lên đâu cả.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} data-testid="cal-photo-input" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> Chọn ảnh cho {bloc ? 'bảng treo' : calPageLabel(spec, page)}</button>
                  {photos[photoKey] && (
                    <button type="button" onClick={() => setPhotos((p) => { const n = { ...p }; delete n[photoKey]; return n; })} className="mv-btn mv-btn-ghost !text-xs !py-2"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>
                  )}
                  {!bloc && Object.keys(photos).length > 0 && <span className="text-[11px] text-slate-500">Đã có ảnh: {Object.keys(photos).filter((k) => +k < nPages).map((k) => calPageLabel(spec, +k)).join(', ')}</span>}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, bloc ? doy : page, photos[photoKey]?.length || 0, logo.length])} refitKey={`${kind}|${spec.size}`} debounce={400} className={`rounded-lg w-full ${wall || bloc ? 'aspect-[4/5] max-h-[68vh]' : 'aspect-[4/3]'}`} />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div ref={viewRef} className={`rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] ${bloc && page === 1 ? 'mx-auto max-w-[300px]' : ''}`} style={{ aspectRatio: bloc && page === 1 ? `${bsz.blocW} / ${bsz.blocH}` : `${sz.wMm} / ${sz.hMm}` }} data-testid="cal-view">
                {bloc
                  ? (page === 0
                    ? <BlocPreviewSvg spec={spec} data={data} doy={doy} photo={photos[0]} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                    : <CalendarSvg spec={spec} data={data} page={doy} style={{ width: '100%', height: '100%', display: 'block' }} />)
                  : <CalendarSvg spec={spec} data={data} page={page} photo={photos[page]} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />}
              </div>
            </div>
            {bloc ? (
              <div className="space-y-2" data-testid="bloc-nav">
                <div className="flex items-center justify-center gap-1.5">
                  {(['Bảng treo + bloc', 'Tờ ngày'] as const).map((lb, i) => (
                    <button key={lb} type="button" onClick={() => setPage(i)} data-testid="cal-page" className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${page === i ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-400 hover:border-mv-hair-strong'}`}>{lb}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setDoy((d) => (d - 2 + nDays) % nDays + 1)} className="mv-btn mv-btn-ghost !p-1.5" aria-label="Ngày trước" data-testid="bloc-prev"><ChevronLeft className="w-4 h-4" /></button>
                  <input type="date" className="mv-input flex-1 !py-1.5 text-center" min={`${CAL_YEAR}-01-01`} max={`${CAL_YEAR}-12-31`} value={fmtDate(doy)} data-testid="bloc-date"
                    onChange={(e) => { const [y, m, d] = e.target.value.split('-').map(Number); if (y === CAL_YEAR && m && d) setDoy(doyOf(d, m)); }} />
                  <button type="button" onClick={() => setDoy((d) => d % nDays + 1)} className="mv-btn mv-btn-ghost !p-1.5" aria-label="Ngày sau" data-testid="bloc-next"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="text-[11px] text-slate-400 text-center" data-testid="bloc-info">
                  {D.d}/{D.m}/{D.y} · Âm lịch {D.lunar.day}/{D.lunar.month}{D.lunar.leap ? ' nhuận' : ''} năm {D.ccYear} · ngày {D.ccDay}{D.holiday ? ` · ${D.holiday}` : ''}
                  {' · '}<button type="button" className="underline" onClick={() => setDoy(TET_DOY)}>Mùng 1 Tết</button>
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => pageNav(-1)} className="mv-btn mv-btn-ghost !p-1.5" aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex-1 flex flex-wrap justify-center gap-1" data-testid="cal-pages">
                {PAGES.map((i) => (
                  <button key={i} type="button" onClick={() => setPage(i)} data-testid="cal-page"
                    className={`min-w-[30px] rounded-md border px-1.5 py-1 text-[11px] font-semibold transition-colors ${page === i ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-400 hover:border-mv-hair-strong'}`}>
                    {calPageLabel(spec, i, true)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => pageNav(1)} className="mv-btn mv-btn-ghost !p-1.5" aria-label="Trang sau"><ChevronRight className="w-4 h-4" /></button>
            </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">{bloc ? `${sz.name} · bloc ${nDays} tờ · lề xén ${CAL_BLEED_MM}mm · vạch cắt` : `${sz.name} · ${nPages} tờ · in ${wall ? 200 : 300}dpi · lề xén ${CAL_BLEED_MM}mm · vạch cắt`}</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cal-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cal-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {bloc ? 'PDF bảng' : `PDF ${nPages} tờ`}
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cal-svg" title="File vector trang đang xem, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            {bloc && (
              <div className="rounded-lg border border-mv-hair p-2.5 space-y-2" data-testid="bloc-export">
                <div className="text-[11px] font-semibold text-slate-300">File tờ bloc ({bsz.blocName}, 200dpi, lề xén + vạch cắt)</div>
                <div className="flex flex-wrap gap-1" data-testid="bloc-months">
                  {[0, ...MONTHS].map((m) => (
                    <button key={m} type="button" onClick={() => setBlocMonth(m)} className={`rounded-md border px-1.5 py-0.5 text-[11px] ${blocMonth === m ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-400'}`}>{m ? `T${m}` : 'Cả năm'}</button>
                  ))}
                </div>
                <button type="button" onClick={downloadBlocPdf} className="mv-btn mv-btn-ghost w-full !flex justify-center !py-2 !text-xs" data-testid="bloc-pdf">
                  {busy === 'bloc' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang dựng {progress}</> : <><FileDown className="w-3.5 h-3.5" /> PDF bloc {blocMonth ? `tháng ${blocMonth}` : `cả năm (${nDays} tờ)`}</>}
                </button>
              </div>
            )}
            <PrintRequest key={material} product="calendar" title={orderTitle} defaultMaterial={material} design={{ spec, data, photos: Object.keys(photos).map(Number), logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Âm lịch tính theo múi giờ Việt Nam, đã đánh dấu Tết {CAL_YEAR} (6/2), ngày lễ và mùng 1, rằm. {bloc ? 'Can chi ngày theo số ngày Julius; ngày hoàng đạo theo thập nhị trực tinh, giờ hoàng đạo theo bảng lịch vạn niên. Tờ bloc dán gáy + ghim lên bảng do xưởng gia công.' : wall ? 'Nẹp thiếc + móc treo do xưởng gia công (chừa 16mm đầu tờ).' : 'Gáy lò xo + đế chữ A do xưởng gia công.'}</p>
          </div>
        </div>
      )}

      {/* lịch bloc: bảng (không bloc) + tờ ngày cho texture 3D, tờ ngày có lề xén cho file SVG */}
      {ready && bloc && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={boardRef}><CalendarSvg spec={spec} data={data} page={0} photo={photos[0]} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef}><CalendarSvg spec={spec} data={data} page={doy} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetPrintRef} data-testid="bloc-sheet"><CalendarSvg spec={spec} data={data} page={doy} bleed style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
      {/* 13 trang có lề xén (ẩn) để xuất PDF in */}
      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }} data-testid="cal-print">
          {PAGES.map((i) => (
            <div key={i}><CalendarSvg spec={spec} data={data} page={i} photo={photos[i]} logo={logo} bleed style={{ width: '100%', display: 'block' }} /></div>
          ))}
        </div>
      )}
    </div>
  );
}
