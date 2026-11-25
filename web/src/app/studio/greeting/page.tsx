'use client';
// Thiệp Tết doanh nghiệp / thiệp chúc mừng: chọn mẫu (Tết, Giáng sinh, tri ân, kỷ niệm) → điền công ty + lời chúc + chữ ký →
// dán danh sách người nhận (mỗi người 1 trang "Kính gửi") → xem thành phẩm 3D → tải PDF in (lề xén, vạch cắt, vạch gấp,
// khuôn ép kim) + PDF trang trong cá nhân hoá, hoặc gửi yêu cầu in.

import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Download, FileDown, ImagePlus, Loader2, Mail, Users, X } from 'lucide-react';
import {
  GENERIC_RECIPIENT, GREETING_PRESETS, GT_BLEED_MM, GT_FIELDS, GT_FONTS, GT_FONT_CSS, GT_PALETTES, GT_SIZES, GT_TEMPLATES, OCCASIONS, OCC_KEYS,
  GreetingFace, GreetingSheet, defaultGTData, defaultGTSpec, gtHasFoil, gtPalette, gtSize, occOf, occText, parseRecipients, useGTFonts,
  type GTData, type GTSheet, type GTSpec, type Occasion, type Recipient,
} from '@/lib/greeting-engine';
import { selfContainedSvg, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { drawPrintPage, printPageDims } from '@/lib/print-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const MARK_ROOM = 5; // khớp print-export: khoảng trắng ngoài lề xén chứa vạch cắt
type PdfPage = { el: SVGSVGElement; fold: boolean; label?: string };

/** PDF in nhiều trang: mỗi tờ có lề xén + vạch cắt (print-export) + vạch GẤP đứt ở giữa (thiệp gấp) */
async function greetingPdf(pages: PdfPage[], css: string, trim: { wMm: number; hMm: number }, dpi = 300): Promise<Blob> {
  const { pageW, pageH } = printPageDims(trim, GT_BLEED_MM);
  const { jsPDF } = await import('jspdf');
  const orientation = pageW >= pageH ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
  const wMm = trim.wMm + GT_BLEED_MM * 2, hMm = trim.hMm + GT_BLEED_MM * 2;
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([pageW, pageH], orientation);
    const c = await svgToCanvas(await selfContainedSvg(pages[i].el, css, { outline: true }), outW, outH, '#ffffff');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawPrintPage(pdf as any, c.toDataURL('image/jpeg', 0.92), outW, outH, trim, GT_BLEED_MM);
    if (pages[i].fold) {
      const fx = MARK_ROOM + GT_BLEED_MM + trim.wMm / 2;
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
      pdf.setLineDashPattern([0.8, 0.6], 0);
      pdf.line(fx, 0.4, fx, MARK_ROOM - 0.4);
      pdf.line(fx, pageH - MARK_ROOM + 0.4, fx, pageH - 0.4);
      pdf.setLineDashPattern([], 0);
    }
    if (pages[i].label) { pdf.setFontSize(5); pdf.setTextColor(90, 90, 90); pdf.text(pages[i].label!, MARK_ROOM + GT_BLEED_MM + 6, 2.6); }
  }
  return pdf.output('blob');
}

// ảnh logo → dataURL ≤ 900px, giữ nền trong (chỉ xử lý trên máy khách)
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

export default function GreetingPage() {
  const ready = useGTFonts();
  const [spec, setSpec] = useState<GTSpec>(defaultGTSpec());
  const [data, setData] = useState<GTData>(defaultGTData());
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [logo, setLogo] = useState('');
  const [occFilter, setOccFilter] = useState<Occasion | 'all'>('all');
  const [pv, setPv] = useState(-1); // người nhận đang xem trước (-1 = "Quý khách hàng")
  const [pdfRcp, setPdfRcp] = useState<Recipient>(GENERIC_RECIPIENT);
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidden = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sz = gtSize(spec.size);
  const pal = gtPalette(spec.palette);
  const occ = occOf(spec.layout);
  const foil = gtHasFoil(spec);
  const recipients = useMemo(() => parseRecipients(data.recipients || ''), [data.recipients]);
  const rcp = pv >= 0 && recipients[pv] ? recipients[pv] : GENERIC_RECIPIENT;
  const slug = slugify(`thiep-${data.brand || ''}`, 'thiep');
  const trim = { wMm: spec.fold ? sz.w * 2 : sz.w, hMm: sz.h };

  const set = (p: Partial<GTSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setData((d) => ({ ...d, [key]: v })); setEdited((e) => (e.has(key) ? e : new Set(e).add(key))); };
  const pickTemplate = (t: (typeof GT_TEMPLATES)[number]) => {
    const o2 = occOf(t.spec.layout);
    set(t.spec);
    if (o2 !== occ) {
      // đổi dịp: ô nào khách chưa sửa thì nạp chữ mẫu đúng dịp mới
      const nt = occText(o2);
      setData((d) => { const n = { ...d }; for (const k of OCC_KEYS) if (!edited.has(k)) n[k] = nt[k]; return n; });
    }
  };
  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await logoDataUrl(f)); } catch { alert('Không đọc được ảnh logo.'); } };

  const q = (k: string) => hidden.current?.querySelector(`[data-k="${k}"] svg`) as SVGSVGElement | null;
  const build3d = () => import('@/lib/greeting-3d').then((m) => m.greetingBuilder({
    fontCss: GT_FONT_CSS, wMm: sz.w, hMm: sz.h, foil, flat: !spec.fold,
    envColor: pal.light ? pal.bg2 : pal.bg, liner: pal.foil ? pal.gold : pal.bg2, edge: '#F3F0E8',
    els: {
      cover: q('cover'), back: q('back'), inLeft: q('inLeft'), inRight: q('inRight'),
      coverFoil: q('coverFoil'), backFoil: q('backFoil'), inLeftFoil: q('inLeftFoil'), inRightFoil: q('inRightFoil'),
    },
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __gtSnap?: (w: number, h: number) => Promise<string> }).__gtSnap = async (w, h) => {
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
  const sheets: GTSheet[] = spec.fold ? ['outside', 'inside'] : ['front', 'back'];
  /** PDF in chính: 2 tờ (ngoài + trong / trước + sau) + khuôn ép kim nếu có */
  const mainPdf = async () => {
    const pages: PdfPage[] = sheets.map((s) => ({ el: q(`print-${s}`)!, fold: spec.fold, label: `${s.toUpperCase()} - ${trim.wMm}x${trim.hMm}mm + bleed ${GT_BLEED_MM}mm` }));
    if (foil) sheets.forEach((s) => pages.push({ el: q(`foil-${s}`)!, fold: spec.fold, label: `KHUON EP KIM - ${s.toUpperCase()} (den = ep kim)` }));
    if (pages.some((p) => !p.el)) throw new Error('Chưa dựng xong thiệp, thử lại nhé.');
    return greetingPdf(pages, GT_FONT_CSS, trim);
  };
  /** PDF trang trong cá nhân hoá: mỗi người nhận 1 trang (rasterize lần lượt để nhẹ máy) */
  const personalPdf = async () => {
    if (!recipients.length) throw new Error('Chưa có danh sách người nhận.');
    const { jsPDF } = await import('jspdf');
    const { pageW, pageH } = printPageDims(trim, GT_BLEED_MM);
    const orientation = pageW >= pageH ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
    const dpi = 300;
    const outW = Math.round(((trim.wMm + GT_BLEED_MM * 2) / 25.4) * dpi), outH = Math.round(((trim.hMm + GT_BLEED_MM * 2) / 25.4) * dpi);
    const inner = spec.fold ? 'inside' : 'back';
    for (let i = 0; i < recipients.length; i++) {
      flushSync(() => setPdfRcp(recipients[i]));
      setBusy(`pers ${i + 1}/${recipients.length}`);
      const el = q(`pers-${inner}`);
      if (!el) throw new Error('Chưa dựng xong trang trong.');
      const c = await svgToCanvas(await selfContainedSvg(el, GT_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
      if (i > 0) pdf.addPage([pageW, pageH], orientation);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      drawPrintPage(pdf as any, c.toDataURL('image/jpeg', 0.9), outW, outH, trim, GT_BLEED_MM);
      if (spec.fold) {
        const fx = MARK_ROOM + GT_BLEED_MM + trim.wMm / 2;
        pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15); pdf.setLineDashPattern([0.8, 0.6], 0);
        pdf.line(fx, 0.4, fx, MARK_ROOM - 0.4); pdf.line(fx, pageH - MARK_ROOM + 0.4, fx, pageH - 0.4); pdf.setLineDashPattern([], 0);
      }
      pdf.setFontSize(5); pdf.setTextColor(90, 90, 90); pdf.text(`#${i + 1}/${recipients.length}`, MARK_ROOM + GT_BLEED_MM + 6, 2.6);
    }
    return pdf.output('blob');
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadCoverPng = () => run('cover', async () => { const el = q('cover'); if (!el) return; downloadBlob(await svgToPng(el, GT_FONT_CSS, 1400), `${slug}-bia.png`); });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await mainPdf(), `${slug}-file-in.pdf`));
  const downloadPers = () => run('pers', async () => downloadBlob(await personalPdf(), `${slug}-trang-trong-${recipients.length}-nguoi.pdf`));

  const makeFiles = async () => {
    const preview = view3d.current
      ? await shot(900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await (async () => { const { svgToJpeg } = await import('@/lib/svg-export'); return svgToJpeg(q('cover')!, GT_FONT_CSS, 900); })();
    return { file: await mainPdf(), fileName: `${slug}-file-in.pdf`, preview };
  };
  const orderTitle = `Thiệp ${spec.fold ? 'gấp đôi' : 'phẳng'} ${sz.name}${foil ? ' · ép kim' : ''}${recipients.length ? ` · ${recipients.length} người nhận` : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fill = { width: '100%', height: '100%', display: 'block' } as const;
  const templates = GT_TEMPLATES.filter((t) => occFilter === 'all' || occOf(t.spec.layout) === occFilter);
  const fields = (g: 'brand' | 'cover' | 'inside') => GT_FIELDS.filter((f) => f.group === g && (f.key !== 'years' || occ === 'anniv'));
  const field = (f: (typeof GT_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[84px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`gt-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`gt-${f.key}`} />}
    </label>
  );
  const sheetBox = (child: ReactNode, label: string, testid: string) => (
    <div className="min-w-0">
      <div className="rounded-md overflow-hidden shadow-md bg-white" style={{ aspectRatio: `${trim.wMm} / ${trim.hMm}` }} data-testid={testid}>{child}</div>
      <div className="text-[11px] text-slate-400 text-center mt-1.5">{label}</div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thiệp Tết doanh nghiệp" sub="Thiệp chúc Tết, Giáng sinh, tri ân khách hàng — in tên từng người nhận, ép kim vàng. Xem thành phẩm 3D, tải PDF in có lề xén + vạch gấp, hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-sm" role="tablist">
        <button type="button" className="mv-seg-btn flex-1" data-active={spec.fold} onClick={() => set({ fold: true })} data-testid="gt-fold">Thiệp gấp đôi</button>
        <button type="button" className="mv-seg-btn flex-1" data-active={!spec.fold} onClick={() => set({ fold: false })} data-testid="gt-flat">Thiệp phẳng 1 tờ</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${GT_TEMPLATES.length})`}>
              <div className="flex flex-wrap gap-1.5 mb-3" data-testid="gt-occ">
                <button type="button" className={chip(occFilter === 'all')} onClick={() => setOccFilter('all')}>Tất cả</button>
                {OCCASIONS.map((o) => <button key={o.id} type="button" className={chip(occFilter === o.id)} onClick={() => setOccFilter(o.id)}>{o.name}</button>)}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {templates.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  const tOcc = occOf(t.spec.layout);
                  const tData = tOcc === occ ? data : { ...data, ...Object.fromEntries(OCC_KEYS.filter((k) => !edited.has(k)).map((k) => [k, occText(tOcc)[k]])) };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="gt-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-md overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.w} / ${sz.h}` }}>
                        <GreetingFace spec={{ ...spec, ...t.spec }} data={tData} face="cover" logo={logo} style={fill} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Công ty & logo">
              <div className="grid grid-cols-2 gap-3">
                {fields('brand').map(field)}
                <div className="col-span-2 flex items-center gap-3">
                  <button type="button" className="mv-btn mv-btn-ghost !py-2 !text-xs" onClick={() => fileRef.current?.click()} data-testid="gt-logo-btn"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}</button>
                  {logo && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded bg-white/80 p-0.5" />
                      <button type="button" className="text-xs text-slate-400 hover:text-mv-fg inline-flex items-center gap-1" onClick={() => setLogo('')}><X className="w-3 h-3" /> Bỏ logo</button>
                    </>
                  )}
                  <span className="text-[11px] text-slate-500">Không có logo → tự dựng chữ lồng ép kim. Ảnh chỉ xử lý trên máy anh/chị.</span>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} data-testid="gt-logo" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Bìa & lời chúc">
              <div className="grid grid-cols-2 gap-3">
                {fields('cover').map(field)}
                <div className="col-span-2">
                  <div className="mv-label mb-1.5">Lời chúc mẫu</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="gt-presets">
                    {GREETING_PRESETS[occ].map((p) => <button key={p.name} type="button" className={chip(data.greeting === p.text)} onClick={() => setField('greeting', p.text)}>{p.name}</button>)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{'{brand}'} tự thay bằng tên công ty{occ === 'anniv' ? ', {years} bằng số năm' : ''}.</div>
                </div>
                {fields('inside').map(field)}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={<span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> 4 · Người nhận ({recipients.length})</span>}>
              <label className="block">
                <span className="mv-label block mb-1.5">Mỗi dòng 1 người: Tên | Đơn vị (tuỳ chọn) → mỗi người 1 trang &quot;Kính gửi&quot; riêng</span>
                <textarea className="mv-input min-h-[110px] font-mono !text-xs" value={data.recipients || ''} onChange={(e) => { setField('recipients', e.target.value); setPv(-1); }}
                  placeholder={'Anh Trần Gia Khánh | Công ty Hải Đăng\nChị Lê Thu Hà'} data-testid="gt-recipients" />
              </label>
              <div className="text-[11px] text-slate-500 mt-1.5">Để trống → in chung &quot;Kính gửi: Quý khách hàng&quot;. Tải &quot;PDF trang trong cá nhân hoá&quot; để xưởng in tên từng người.</div>
            </CollapsibleSection>

            <CollapsibleSection title="5 · Màu, font, khổ & ép kim">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="gt-palettes">
                    {GT_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair grid place-items-center" style={{ background: p.bg }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.gold }} /></span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="gt-fonts">
                    {GT_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ (khi gập)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="gt-sizes">
                      {GT_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Ép kim vàng</div>
                    {pal.foil ? (
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={spec.foil} onChange={(e) => set({ foil: e.target.checked })} data-testid="gt-foil" />
                        Phần màu vàng ép nhũ kim thật (thêm khuôn ép trong file in)
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
                <select className="mv-input !py-1.5 !text-xs" value={pv} onChange={(e) => setPv(Number(e.target.value))} data-testid="gt-pv">
                  <option value={-1}>Quý khách hàng (chung)</option>
                  {recipients.map((r, i) => <option key={i} value={i}>{r.name}{r.org ? ` — ${r.org}` : ''}</option>)}
                </select>
              </label>
            )}
            {tab === '3d' ? (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, pv])} refitKey={`${spec.size}|${spec.fold}`} debounce={450} className="rounded-lg aspect-square w-full" />
            ) : (
              <div className="space-y-3">
                {spec.fold ? (
                  <>
                    {sheetBox(<GreetingSheet spec={spec} data={data} sheet="outside" logo={logo} style={fill} />, 'Mặt ngoài: mặt sau | bìa', 'gt-outside')}
                    {sheetBox(<GreetingSheet spec={spec} data={data} sheet="inside" recipient={rcp} logo={logo} style={fill} />, 'Mặt trong: trang trái | lời chúc', 'gt-inside')}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sheetBox(<GreetingSheet spec={spec} data={data} sheet="front" logo={logo} style={fill} />, 'Mặt trước', 'gt-front')}
                    {sheetBox(<GreetingSheet spec={spec} data={data} sheet="back" recipient={rcp} logo={logo} style={fill} />, 'Mặt sau (lời chúc)', 'gt-back')}
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">
              {spec.fold ? `Trải phẳng ${sz.w * 2}×${sz.h}mm, gập còn ${sz.w}×${sz.h}mm` : `${sz.w}×${sz.h}mm`} · lề xén {GT_BLEED_MM}mm{foil ? ' · có khuôn ép kim' : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="gt-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadCoverPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="gt-cover-png">{busy === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG bìa</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="gt-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
            </div>
            {recipients.length > 0 && (
              <button type="button" onClick={downloadPers} className="mv-btn mv-btn-ghost w-full !flex justify-center !py-2.5 !text-xs" data-testid="gt-pers">
                {busy.startsWith('pers') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy.split(' ')[1] || ''}</> : <><Users className="w-3.5 h-3.5" /> PDF trang trong cá nhân hoá ({recipients.length} người)</>}
              </button>
            )}
            <PrintRequest product="greeting" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles}
              defaultMaterial={spec.fold ? (foil ? 'Thiệp gấp đôi mỹ thuật ép kim' : 'Thiệp gấp đôi couche cán mờ') : 'Thiệp phẳng 1 tờ + phong bì'} />
            <Link href="/studio/envelope" className="flex items-center gap-2 rounded-lg border border-mv-hair px-3 py-2 text-xs text-slate-300 hover:border-mv-hair-strong" data-testid="gt-envelope-link">
              <Mail className="w-3.5 h-3.5 shrink-0" /> Thêm phong bì đồng bộ in logo công ty → Lì xì & phong bì
            </Link>
            <p className="text-[11px] leading-relaxed text-slate-500">{foil ? 'Ép kim: phần vàng trên mẫu được ép nhũ vàng thật (file in có trang khuôn ép riêng). ' : ''}PDF có lề xén 3mm, vạch cắt 4 góc{spec.fold ? ' và vạch gấp đứt ở giữa' : ''}. Mivy chốt giấy + báo giá qua Zalo rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={hidden} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          {/* texture 3D: 4 mặt + khuôn ép kim từng mặt */}
          <div data-k="cover"><GreetingFace spec={spec} data={data} face="cover" logo={logo} style={fill} /></div>
          <div data-k="back"><GreetingFace spec={spec} data={data} face="back" logo={logo} style={fill} /></div>
          <div data-k="inLeft"><GreetingFace spec={spec} data={data} face="inLeft" logo={logo} style={fill} /></div>
          <div data-k="inRight"><GreetingFace spec={spec} data={data} face="inRight" recipient={rcp} flat={!spec.fold} logo={logo} style={fill} /></div>
          {foil && (
            <>
              <div data-k="coverFoil"><GreetingFace spec={spec} data={data} face="cover" mode="foil3d" logo={logo} style={fill} /></div>
              <div data-k="backFoil"><GreetingFace spec={spec} data={data} face="back" mode="foil3d" logo={logo} style={fill} /></div>
              <div data-k="inLeftFoil"><GreetingFace spec={spec} data={data} face="inLeft" mode="foil3d" logo={logo} style={fill} /></div>
              <div data-k="inRightFoil"><GreetingFace spec={spec} data={data} face="inRight" recipient={rcp} flat={!spec.fold} mode="foil3d" logo={logo} style={fill} /></div>
            </>
          )}
          {/* tờ in có lề xén */}
          {sheets.map((s) => <div key={s} data-k={`print-${s}`}><GreetingSheet spec={spec} data={data} sheet={s} logo={logo} bleed style={fill} /></div>)}
          {foil && sheets.map((s) => <div key={s} data-k={`foil-${s}`}><GreetingSheet spec={spec} data={data} sheet={s} logo={logo} mode="foilPrint" bleed style={fill} /></div>)}
          <div data-k={`pers-${spec.fold ? 'inside' : 'back'}`}><GreetingSheet spec={spec} data={data} sheet={spec.fold ? 'inside' : 'back'} recipient={pdfRcp} logo={logo} bleed style={fill} /></div>
        </div>
      )}
    </div>
  );
}
