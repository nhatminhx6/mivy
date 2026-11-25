'use client';
// Thiệp mời sự kiện (khai trương, hội nghị, gala, kỷ niệm, ra mắt, hội thảo, tân gia, tốt nghiệp): chọn mẫu → điền thông tin
// → dán danh sách khách mời (mỗi người 1 thiệp "Trân trọng kính mời …") → xem thành phẩm 3D → tải PDF in (lề xén, vạch cắt,
// vạch gấp, khuôn ép kim, thẻ RSVP) + PDF cá nhân hoá, hoặc gửi yêu cầu in.

import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Download, FileDown, ImagePlus, Loader2, Mail, Users, X } from 'lucide-react';
import {
  GENERIC_RECIPIENT, IV_BLEED_MM, IV_FIELDS, IV_FONTS, IV_FONT_CSS, IV_LAYOUTS, IV_OCCASIONS, IV_OCC_KEYS, IV_PALETTES, IV_SIZES, IV_TEMPLATES,
  InvitationFace, InvitationSheet, RSVP_SIZE, defaultIVData, defaultIVSpec, ivHasFoil, ivOccText, ivPalette, ivSize, parseRecipients, useIVFonts,
  type IVData, type IVOcc, type IVSheet, type IVSpec, type Recipient,
} from '@/lib/invitation-engine';
import { selfContainedSvg, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { drawPrintPage, printPageDims } from '@/lib/print-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const MARK_ROOM = 5; // khớp print-export: khoảng trắng ngoài lề xén chứa vạch cắt
type PdfPage = { el: SVGSVGElement; trim: { wMm: number; hMm: number }; fold: boolean; label?: string };
type JsPdf = InstanceType<typeof import('jspdf').jsPDF>;

/** vẽ 1 trang (khổ riêng) vào pdf: lề xén + vạch cắt + vạch gấp (nếu có) */
async function drawPage(pdf: JsPdf, pg: PdfPage, css: string, first: boolean, dpi = 300) {
  const { pageW, pageH } = printPageDims(pg.trim, IV_BLEED_MM);
  const orientation = pageW >= pageH ? 'landscape' : 'portrait';
  if (!first) pdf.addPage([pageW, pageH], orientation);
  const outW = Math.round(((pg.trim.wMm + IV_BLEED_MM * 2) / 25.4) * dpi), outH = Math.round(((pg.trim.hMm + IV_BLEED_MM * 2) / 25.4) * dpi);
  const c = await svgToCanvas(await selfContainedSvg(pg.el, css, { outline: true }), outW, outH, '#ffffff');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawPrintPage(pdf as any, c.toDataURL('image/jpeg', 0.92), outW, outH, pg.trim, IV_BLEED_MM);
  if (pg.fold) {
    const fx = MARK_ROOM + IV_BLEED_MM + pg.trim.wMm / 2;
    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15); pdf.setLineDashPattern([0.8, 0.6], 0);
    pdf.line(fx, 0.4, fx, MARK_ROOM - 0.4); pdf.line(fx, pageH - MARK_ROOM + 0.4, fx, pageH - 0.4); pdf.setLineDashPattern([], 0);
  }
  if (pg.label) { pdf.setFontSize(5); pdf.setTextColor(90, 90, 90); pdf.text(pg.label, MARK_ROOM + IV_BLEED_MM + 6, 2.6); }
}
async function newPdf(trim: { wMm: number; hMm: number }): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const { pageW, pageH } = printPageDims(trim, IV_BLEED_MM);
  return new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: pageW >= pageH ? 'landscape' : 'portrait', compress: true });
}

async function logoDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function InvitationPage() {
  const ready = useIVFonts();
  const [spec, setSpec] = useState<IVSpec>(defaultIVSpec());
  const [data, setData] = useState<IVData>(defaultIVData(defaultIVSpec().occ));
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [logo, setLogo] = useState('');
  const [occFilter, setOccFilter] = useState<IVOcc | 'all'>('all');
  const [pv, setPv] = useState(-1);
  const [pdfRcp, setPdfRcp] = useState<Recipient>(GENERIC_RECIPIENT);
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidden = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sz = ivSize(spec.size);
  const pal = ivPalette(spec.palette);
  const foil = ivHasFoil(spec);
  const recipients = useMemo(() => parseRecipients(data.recipients || ''), [data.recipients]);
  const rcp = pv >= 0 && recipients[pv] ? recipients[pv] : GENERIC_RECIPIENT;
  const slug = slugify(`thiep-moi-${data.brand || ''}`, 'thiep-moi');
  const trim = { wMm: spec.fold ? sz.w * 2 : sz.w, hMm: sz.h };

  const set = (p: Partial<IVSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setData((d) => ({ ...d, [key]: v })); setEdited((e) => (e.has(key) ? e : new Set(e).add(key))); };
  const pickTemplate = (t: (typeof IV_TEMPLATES)[number]) => {
    if (t.spec.occ !== spec.occ) {
      const nt = ivOccText(t.spec.occ);
      setData((d) => { const n = { ...d }; for (const k of IV_OCC_KEYS) if (!edited.has(k)) n[k] = nt[k]; return n; });
    }
    set(t.spec);
  };
  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await logoDataUrl(f)); } catch { alert('Không đọc được ảnh logo.'); } };

  const q = (k: string) => hidden.current?.querySelector(`[data-k="${k}"] svg`) as SVGSVGElement | null;
  const build3d = () => import('@/lib/invitation-3d').then((m) => m.invitationBuilder({
    fontCss: IV_FONT_CSS, wMm: sz.w, hMm: sz.h, fold: spec.fold, foil, rsvpCard: spec.rsvpCard,
    envColor: pal.light ? (pal.foil ? pal.bg2 : pal.accent) : pal.bg, liner: pal.foil ? pal.gold : pal.bg2, edge: '#F4F1EA', standColor: pal.foil ? '#C9A45A' : '#B9BEC6',
    els: {
      front: q('front'), back: q('back'), cover: q('cover'), backOut: q('backOut'), inLeft: q('inLeft'), inRight: q('inRight'), rsvp: q('rsvp'),
      foil: { front: q('foil-front'), back: q('foil-back'), cover: q('foil-cover'), backOut: q('foil-backOut'), inLeft: q('foil-inLeft'), inRight: q('foil-inRight'), rsvp: q('foil-rsvp') },
    },
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __ivSnap?: (w: number, h: number) => Promise<string> }).__ivSnap = async (w, h) => {
      const core = await import('@/lib/mockup3d');
      return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png');
    };
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const toBlob = (c: HTMLCanvasElement, type: string, qv?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, qv));
  const shot = async (px: number, watermark = false) => {
    if (!view3d.current) throw new Error('Đang ở bản thiết kế — bấm "Thành phẩm 3D" rồi thử lại nhé.');
    return view3d.current.snapshot(px, px, { watermark });
  };
  const sheets: IVSheet[] = spec.fold ? ['outside', 'inside'] : ['front', 'back'];
  /** PDF in chính: 2 tờ + (thẻ RSVP) + khuôn ép kim từng tờ */
  const mainPdf = async () => {
    const pages: PdfPage[] = sheets.map((s) => ({ el: q(`print-${s}`)!, trim, fold: spec.fold, label: `${s.toUpperCase()} - ${trim.wMm}x${trim.hMm}mm + bleed ${IV_BLEED_MM}mm` }));
    const rTrim = { wMm: RSVP_SIZE.w, hMm: RSVP_SIZE.h };
    if (spec.rsvpCard) pages.push({ el: q('print-rsvp')!, trim: rTrim, fold: false, label: `THE XAC NHAN RSVP - ${RSVP_SIZE.w}x${RSVP_SIZE.h}mm` });
    if (foil) {
      sheets.forEach((s) => pages.push({ el: q(`foilp-${s}`)!, trim, fold: spec.fold, label: `KHUON EP KIM - ${s.toUpperCase()} (den = ep kim)` }));
      if (spec.rsvpCard) pages.push({ el: q('foilp-rsvp')!, trim: rTrim, fold: false, label: 'KHUON EP KIM - RSVP' });
    }
    if (pages.some((p) => !p.el)) throw new Error('Chưa dựng xong thiệp, thử lại nhé.');
    const pdf = await newPdf(pages[0].trim);
    for (let i = 0; i < pages.length; i++) await drawPage(pdf, pages[i], IV_FONT_CSS, i === 0);
    return pdf.output('blob');
  };
  /** PDF cá nhân hoá: mỗi khách 1 trang (mặt có "Trân trọng kính mời") */
  const personalPdf = async () => {
    if (!recipients.length) throw new Error('Chưa có danh sách khách mời.');
    const inner: IVSheet = spec.fold ? 'inside' : 'front';
    const pdf = await newPdf(trim);
    for (let i = 0; i < recipients.length; i++) {
      flushSync(() => setPdfRcp(recipients[i]));
      setBusy(`pers ${i + 1}/${recipients.length}`);
      const el = q(`pers-${inner}`);
      if (!el) throw new Error('Chưa dựng xong trang kính mời.');
      await drawPage(pdf, { el, trim, fold: spec.fold, label: `#${i + 1}/${recipients.length}` }, IV_FONT_CSS, i === 0);
    }
    return pdf.output('blob');
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadFacePng = () => run('face', async () => { const el = q(spec.fold ? 'inRight' : 'front'); if (!el) return; downloadBlob(await svgToPng(el, IV_FONT_CSS, 1400), `${slug}-mat-chinh.png`); });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await mainPdf(), `${slug}-file-in.pdf`));
  const downloadPers = () => run('pers', async () => downloadBlob(await personalPdf(), `${slug}-ca-nhan-hoa-${recipients.length}-khach.pdf`));

  const makeFiles = async () => {
    const preview = view3d.current
      ? await shot(900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await (async () => { const { svgToJpeg } = await import('@/lib/svg-export'); return svgToJpeg(q(spec.fold ? 'cover' : 'front')!, IV_FONT_CSS, 900); })();
    return { file: await mainPdf(), fileName: `${slug}-file-in.pdf`, preview };
  };
  const orderTitle = `Thiệp mời ${spec.fold ? 'gấp đôi' : 'phẳng'} ${sz.name}${foil ? ' · ép kim' : ''}${spec.rsvpCard ? ' · kèm thẻ RSVP' : ''}${recipients.length ? ` · ${recipients.length} khách` : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fill = { width: '100%', height: '100%', display: 'block' } as const;
  const templates = IV_TEMPLATES.filter((t) => occFilter === 'all' || t.spec.occ === occFilter);
  const fields = (g: 'host' | 'event' | 'program') => IV_FIELDS.filter((f) => f.group === g);
  const field = (f: (typeof IV_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[96px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`iv-${f.key}`} />
        : <input className="mv-input" type={f.type || 'text'} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`iv-${f.key}`} />}
    </label>
  );
  const sheetBox = (child: ReactNode, label: string, testid: string, ratio = `${trim.wMm} / ${trim.hMm}`) => (
    <div className="min-w-0">
      <div className="rounded-md overflow-hidden shadow-md bg-white" style={{ aspectRatio: ratio }} data-testid={testid}>{child}</div>
      <div className="text-[11px] text-slate-400 text-center mt-1.5">{label}</div>
    </div>
  );
  const faceKeys = spec.fold ? (['cover', 'backOut', 'inLeft', 'inRight'] as const) : (['front', 'back'] as const);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thiệp mời sự kiện" sub="Thiệp mời khai trương, hội nghị, gala, kỷ niệm, ra mắt sản phẩm — in tên từng khách mời, ép kim vàng, kèm thẻ xác nhận RSVP có QR. Xem thành phẩm 3D, tải PDF in hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-sm" role="tablist">
        <button type="button" className="mv-seg-btn flex-1" data-active={!spec.fold} onClick={() => set({ fold: false })} data-testid="iv-flat">Thiệp phẳng 1 tờ</button>
        <button type="button" className="mv-seg-btn flex-1" data-active={spec.fold} onClick={() => set({ fold: true })} data-testid="iv-fold">Thiệp gấp đôi</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${IV_TEMPLATES.length})`}>
              <div className="flex flex-wrap gap-1.5 mb-3" data-testid="iv-occ">
                <button type="button" className={chip(occFilter === 'all')} onClick={() => setOccFilter('all')}>Tất cả</button>
                {IV_OCCASIONS.map((o) => <button key={o.id} type="button" className={chip(occFilter === o.id)} onClick={() => setOccFilter(o.id)}>{o.name}</button>)}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {templates.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.occ === t.spec.occ;
                  const tData = t.spec.occ === spec.occ ? data : { ...data, ...Object.fromEntries(IV_OCC_KEYS.filter((k) => !edited.has(k)).map((k) => [k, ivOccText(t.spec.occ)[k]])) };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="iv-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-md overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.w} / ${sz.h}` }}>
                        <InvitationFace spec={{ ...spec, ...t.spec }} data={tData} face={spec.fold ? 'cover' : 'front'} logo={logo} style={fill} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Đơn vị mời & logo">
              <div className="grid grid-cols-2 gap-3">
                {fields('host').map(field)}
                <div className="col-span-2 flex flex-wrap items-center gap-3">
                  <button type="button" className="mv-btn mv-btn-ghost !py-2 !text-xs" onClick={() => fileRef.current?.click()} data-testid="iv-logo-btn"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}</button>
                  {logo && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded bg-white/80 p-0.5" />
                      <button type="button" className="text-xs text-slate-400 hover:text-mv-fg inline-flex items-center gap-1" onClick={() => setLogo('')}><X className="w-3 h-3" /> Bỏ logo</button>
                    </>
                  )}
                  <span className="text-[11px] text-slate-500">Không có logo → tự dựng chữ lồng ép kim. Ảnh chỉ xử lý trên máy anh/chị.</span>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} data-testid="iv-logo" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Sự kiện, thời gian & địa điểm">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="mv-label mb-1.5">Dịp</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="iv-occ-pick">
                    {IV_OCCASIONS.map((o) => <button key={o.id} type="button" className={chip(spec.occ === o.id)} onClick={() => {
                      const nt = ivOccText(o.id);
                      setData((d) => { const n = { ...d }; for (const k of IV_OCC_KEYS) if (!edited.has(k)) n[k] = nt[k]; return n; });
                      set({ occ: o.id });
                    }}>{o.name}</button>)}
                  </div>
                </div>
                {fields('event').map(field)}
                <label className="col-span-2 flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" checked={spec.lunar} onChange={(e) => set({ lunar: e.target.checked })} data-testid="iv-lunar" />
                  In thêm ngày âm lịch (tự tính)
                </label>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Chương trình & xác nhận tham dự">
              <div className="grid grid-cols-2 gap-3">
                {fields('program').map(field)}
                <label className="col-span-2 flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" checked={spec.rsvpCard} onChange={(e) => set({ rsvpCard: e.target.checked })} data-testid="iv-rsvp-card" />
                  Kèm thẻ xác nhận RSVP rời {RSVP_SIZE.w}×{RSVP_SIZE.h}mm (có QR)
                </label>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={<span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> 5 · Khách mời ({recipients.length})</span>}>
              <label className="block">
                <span className="mv-label block mb-1.5">Mỗi dòng 1 khách: Tên | Chức vụ / Đơn vị (tuỳ chọn) → mỗi người 1 thiệp riêng</span>
                <textarea className="mv-input min-h-[110px] font-mono !text-xs" value={data.recipients || ''} onChange={(e) => { setField('recipients', e.target.value); setPv(-1); }}
                  placeholder={'Ông Lê Gia Khánh | Giám đốc Công ty Hải Đăng\nBà Nguyễn Thu Hà | Trưởng phòng Kinh doanh'} data-testid="iv-recipients" />
              </label>
              <div className="text-[11px] text-slate-500 mt-1.5">Để trống → in chung &quot;Trân trọng kính mời: Quý khách&quot;. Tải &quot;PDF cá nhân hoá&quot; để xưởng in tên từng khách.</div>
            </CollapsibleSection>

            <CollapsibleSection title="6 · Bố cục, màu, font, khổ & ép kim">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="iv-layouts">
                    {IV_LAYOUTS.map((l) => <button key={l.id} type="button" className={chip(spec.layout === l.id)} onClick={() => set({ layout: l.id })}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="iv-palettes">
                    {IV_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair grid place-items-center" style={{ background: p.bg }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.gold }} /></span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="iv-fonts">
                    {IV_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ {spec.fold ? '(khi gập)' : ''}</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="iv-sizes">
                      {IV_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Ép kim vàng</div>
                    {pal.foil ? (
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={spec.foil} onChange={(e) => set({ foil: e.target.checked })} data-testid="iv-foil" />
                        Phần vàng ép nhũ kim thật (thêm khuôn ép trong file in)
                      </label>
                    ) : <div className="text-xs text-slate-500">Bảng màu này in màu thường (không ép kim).</div>}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Thành phẩm</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {recipients.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <span className="shrink-0">Xem trước cho:</span>
                <select className="mv-input !py-1.5 !text-xs" value={pv} onChange={(e) => setPv(Number(e.target.value))} data-testid="iv-pv">
                  <option value={-1}>Quý khách (chung)</option>
                  {recipients.map((r, i) => <option key={i} value={i}>{r.name}{r.org ? ` — ${r.org}` : ''}</option>)}
                </select>
              </label>
            )}
            {tab === '3d' ? (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, pv])} refitKey={`${spec.size}|${spec.fold}|${spec.rsvpCard}`} debounce={450} className="rounded-lg aspect-square w-full" />
            ) : (
              <div className="space-y-3">
                {spec.fold ? (
                  <>
                    {sheetBox(<InvitationSheet spec={spec} data={data} sheet="outside" logo={logo} style={fill} />, 'Mặt ngoài: mặt sau | bìa', 'iv-outside')}
                    {sheetBox(<InvitationSheet spec={spec} data={data} sheet="inside" recipient={rcp} logo={logo} style={fill} />, 'Mặt trong: chương trình | kính mời', 'iv-inside')}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sheetBox(<InvitationSheet spec={spec} data={data} sheet="front" recipient={rcp} logo={logo} style={fill} />, 'Mặt trước (kính mời)', 'iv-front')}
                    {sheetBox(<InvitationSheet spec={spec} data={data} sheet="back" logo={logo} style={fill} />, 'Mặt sau (chương trình)', 'iv-back')}
                  </div>
                )}
                {spec.rsvpCard && <div className="max-w-[260px] mx-auto">{sheetBox(<InvitationFace spec={spec} data={data} face="rsvp" logo={logo} style={fill} />, 'Thẻ xác nhận RSVP', 'iv-rsvp', `${RSVP_SIZE.w} / ${RSVP_SIZE.h}`)}</div>}
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">
              {spec.fold ? `Trải phẳng ${sz.w * 2}×${sz.h}mm, gập còn ${sz.w}×${sz.h}mm` : `${sz.w}×${sz.h}mm`} · lề xén {IV_BLEED_MM}mm{foil ? ' · có khuôn ép kim' : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="iv-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadFacePng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="iv-face-png">{busy === 'face' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG thiệp</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="iv-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
            </div>
            {recipients.length > 0 && (
              <button type="button" onClick={downloadPers} className="mv-btn mv-btn-ghost w-full !flex justify-center !py-2.5 !text-xs" data-testid="iv-pers">
                {busy.startsWith('pers') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy.split(' ')[1] || ''}</> : <><Users className="w-3.5 h-3.5" /> PDF cá nhân hoá ({recipients.length} khách)</>}
              </button>
            )}
            <PrintRequest product="invitation" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles}
              defaultMaterial={foil ? 'Thiệp mời mỹ thuật ép kim + phong bì' : 'Thiệp mời couche cán mờ'} />
            <Link href="/studio/envelope" className="flex items-center gap-2 rounded-lg border border-mv-hair px-3 py-2 text-xs text-slate-300 hover:border-mv-hair-strong" data-testid="iv-envelope-link">
              <Mail className="w-3.5 h-3.5 shrink-0" /> Thêm phong bì đồng bộ in logo → Lì xì & phong bì
            </Link>
            <p className="text-[11px] leading-relaxed text-slate-500">{foil ? 'Ép kim: phần vàng được ép nhũ thật (file in có trang khuôn ép riêng). ' : ''}PDF có lề xén 3mm, vạch cắt 4 góc{spec.fold ? ', vạch gấp đứt ở giữa' : ''}{spec.rsvpCard ? ', thẻ RSVP trang riêng' : ''}. Mivy chốt giấy + báo giá qua Zalo rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={hidden} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          {/* texture 3D: các mặt + khuôn ép kim */}
          {faceKeys.map((f) => <div key={f} data-k={f}><InvitationFace spec={spec} data={data} face={f} recipient={rcp} logo={logo} style={fill} /></div>)}
          <div data-k="rsvp"><InvitationFace spec={spec} data={data} face="rsvp" logo={logo} style={fill} /></div>
          {foil && faceKeys.map((f) => <div key={f} data-k={`foil-${f}`}><InvitationFace spec={spec} data={data} face={f} recipient={rcp} mode="foil3d" logo={logo} style={fill} /></div>)}
          {foil && <div data-k="foil-rsvp"><InvitationFace spec={spec} data={data} face="rsvp" mode="foil3d" logo={logo} style={fill} /></div>}
          {/* tờ in có lề xén */}
          {sheets.map((s) => <div key={s} data-k={`print-${s}`}><InvitationSheet spec={spec} data={data} sheet={s} logo={logo} bleed style={fill} /></div>)}
          <div data-k="print-rsvp"><InvitationFace spec={spec} data={data} face="rsvp" logo={logo} bleed style={fill} /></div>
          {foil && sheets.map((s) => <div key={s} data-k={`foilp-${s}`}><InvitationSheet spec={spec} data={data} sheet={s} logo={logo} mode="foilPrint" bleed style={fill} /></div>)}
          {foil && <div data-k="foilp-rsvp"><InvitationFace spec={spec} data={data} face="rsvp" logo={logo} mode="foilPrint" bleed style={fill} /></div>}
          <div data-k={`pers-${spec.fold ? 'inside' : 'front'}`}><InvitationSheet spec={spec} data={data} sheet={spec.fold ? 'inside' : 'front'} recipient={pdfRcp} logo={logo} bleed style={fill} /></div>
        </div>
      )}
    </div>
  );
}
