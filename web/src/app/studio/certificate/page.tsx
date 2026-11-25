'use client';
// Giấy khen · Bằng khen · Chứng nhận: chọn mẫu → điền nội dung → dán danh sách người nhận (mỗi người 1 tấm + số hiệu)
// → xem thành phẩm 3D (khung kính + bìa nhung) → tải PDF in tất cả (tràn lề, vạch cắt, khuôn ép kim) / PNG / ảnh 3D.

import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Download, FileDown, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import {
  CT_BLEED_MM, CT_FIELDS, CT_FONT_CSS, CT_KINDS, CT_LAYOUTS, CT_NAME_FONTS, CT_PALETTES, CT_SIZES, CT_TEMPLATES, CT_TITLE_FONTS,
  CertificateSvg, ctDims, ctPalette, ctPeople, ctSerial, ctTitleFont, samplePreset, useCTFonts,
  type CTData, type CTKind, type CTSpec, type CTTemplate, type Frame3D,
} from '@/lib/certificate-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { drawPrintPage, printPageDims } from '@/lib/print-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = CT_TEMPLATES[0];
const MAX_PEOPLE = 300;

// ảnh tải lên → dataURL (giữ nền trong suốt), thu nhỏ tại máy — không gửi đi đâu
async function fileToDataUrl(file: File, maxSide = 900): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

export default function CertificatePage() {
  const ready = useCTFonts();
  const [spec, setSpec] = useState<CTSpec>(FIRST.spec);
  const [preset, setPreset] = useState(FIRST.preset);
  const [data, setData] = useState<CTData>(() => samplePreset(FIRST.preset));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [idx, setIdx] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [logo, setLogo] = useState(''); const [seal, setSeal] = useState(''); const [sig, setSig] = useState('');
  const flatRef = useRef<HTMLDivElement | null>(null);
  const foilRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const dm = ctDims(spec);
  const people = ctPeople(data);
  const cur = Math.min(idx, people.length - 1);
  const P = ctPalette(spec.palette);
  const kindName = CT_KINDS.find((k) => k.id === spec.kind)!.name;
  const slug = slugify(`${kindName}-${data.org || ''}`, 'giay-khen');
  const set = (p: Partial<CTSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };

  // đổi mẫu: chưa sửa → nạp chữ mẫu; đã sửa → giữ chữ khách, chỉ thay ô còn nguyên chữ mẫu cũ (và ô theo loại khi đổi loại)
  const pickTpl = (t: CTTemplate) => {
    const oldS = samplePreset(preset), newS = samplePreset(t.preset);
    setSpec({ ...t.spec, size: spec.size });
    setPreset(t.preset);
    if (!dirty) { setData((d) => ({ ...newS, list: d.list })); return; }
    setData((d) => {
      const out: CTData = { ...newS };
      for (const [k, v] of Object.entries(d)) if (v.trim() && (v !== oldS[k] || k === 'list')) out[k] = v;
      if (t.spec.kind !== spec.kind) for (const k of ['title', 'titleEn', 'lead', 'leadEn', 'issuer', 'signRole2', 'signName2', 'detail', 'reasonEn', 'unitLabel']) out[k] = newS[k];
      return out;
    });
  };
  const setKind = (k: CTKind) => { if (k !== spec.kind) pickTpl(CT_TEMPLATES.find((t) => t.spec.kind === k)!); };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // ---- PDF in tất cả người nhận (+ trang khuôn ép kim) ----
  const buildPdf = async (): Promise<Blob> => {
    flushSync(() => setPrinting(true));
    try {
      const box = printRef.current; if (!box) throw new Error('Chưa dựng xong file in');
      const els = Array.from(box.querySelectorAll(':scope > div > svg')) as SVGSVGElement[];
      const trim = { wMm: dm.wMm, hMm: dm.hMm };
      const { pageW, pageH } = printPageDims(trim, CT_BLEED_MM);
      const { jsPDF } = await import('jspdf');
      const orientation = pageW >= pageH ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
      const dpi = spec.size === 'a3' ? 220 : 300;
      const outW = Math.round(((dm.wMm + 2 * CT_BLEED_MM) / 25.4) * dpi), outH = Math.round(((dm.hMm + 2 * CT_BLEED_MM) / 25.4) * dpi);
      for (let i = 0; i < els.length; i++) {
        setBusy(`pdf ${i + 1}/${els.length}`);
        if (i > 0) pdf.addPage([pageW, pageH], orientation);
        const isMask = els[i].closest('[data-mask]');
        const c = await svgToCanvas(await selfContainedSvg(els[i], CT_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
        // trang thiết kế: JPEG chất lượng cao cho nhẹ file; khuôn ép kim: PNG nét tuyệt đối
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        drawPrintPage(pdf as any, isMask ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.93), outW, outH, trim, CT_BLEED_MM);
      }
      return pdf.output('blob');
    } finally { flushSync(() => setPrinting(false)); }
  };

  const downloadPng = () => run('png', async () => {
    const el = svgOf(flatRef); if (!el) return;
    downloadBlob(await svgToPng(el, CT_FONT_CSS, 2400), `${slug}-${slugify(people[cur]?.name || '', 'mau')}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${people.length}tam-${spec.size}-file-in.pdf`));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/png')), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const pv = svgOf(flatRef); if (!pv) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const file = await buildPdf();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, CT_FONT_CSS, 900))
      : await svgToJpeg(pv, CT_FONT_CSS, 900);
    return { file, fileName: `${slug}-${people.length}tam-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/certificate-3d').then((m) => m.certificateBuilder({
    front: svgOf(flatRef), foil: spec.foil ? svgOf(foilRef) : null, wMm: dm.wMm, hMm: dm.hMm, frame: spec.frame3d,
    pal: { frame: P.frame, frame2: P.frame2, gold: P.gold, paper: P.paper },
    title: (data.title || '').toUpperCase(), org: (data.org || '').toUpperCase(),
    titleFont: { family: ctTitleFont(spec.font).fam, weight: ctTitleFont(spec.font).wt }, fontCss: CT_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __ctSnap?: (w: number, h: number) => Promise<string> }).__ctSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const upload = (setter: (v: string) => void, maxSide = 900) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setter(await fileToDataUrl(f, maxSide)); } catch { alert('Không đọc được ảnh này'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = CT_FIELDS.filter((f) => (!f.kinds || f.kinds.includes(spec.kind)) && (!f.bi || spec.bilingual) && !(f.key === 'name' && data.list?.trim()));
  const tpls = CT_TEMPLATES.filter((t) => t.spec.kind === spec.kind);
  const others = CT_TEMPLATES.filter((t) => t.spec.kind !== spec.kind);
  const orderTitle = `${kindName} ${spec.size.toUpperCase()} ${spec.orient === 'land' ? 'ngang' : 'dọc'} · ${people.length} tấm${spec.foil ? ' · ép kim' : ''}`;
  const busyTxt = (k: string, txt: string) => (busy.startsWith(k) && busy.includes(' ') ? busy.split(' ')[1] : txt);
  const ar = `${dm.wMm} / ${dm.hMm}`;
  const imgs = { logo: logo || undefined, seal: seal || undefined, sig: sig || undefined };

  const thumb = (t: CTTemplate) => {
    const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.kind === t.spec.kind && spec.orient === t.spec.orient;
    const td = dirty ? { ...data, list: '' } : samplePreset(t.preset);
    return (
      <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="ct-tpl" data-kind={t.spec.kind}
        className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
        <div className="flex items-center justify-center bg-slate-100/60 rounded-md overflow-hidden" style={{ aspectRatio: '297 / 210' }}>
          <div className="shadow-sm h-full" style={{ aspectRatio: t.spec.orient === 'land' ? '297 / 210' : '210 / 297' }}>
            <CertificateSvg spec={{ ...t.spec, size: 'a4' }} data={td} logo={imgs.logo} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        </div>
        <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
      </button>
    );
  };
  const uploader = (label: string, val: string, setter: (v: string) => void, id: string, hint: string) => (
    <div className="rounded-xl border border-mv-hair p-2.5 flex items-center gap-2.5">
      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
        {val ? <img src={val} alt="" className="max-w-full max-h-full object-contain" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-mv-fg">{label}</div>
        <div className="text-[10px] text-slate-400 leading-snug">{hint}</div>
      </div>
      <label className="mv-btn mv-btn-ghost !py-1.5 !px-2.5 !text-xs cursor-pointer">
        Chọn<input type="file" accept="image/*" className="hidden" onChange={upload(setter)} data-testid={`ct-up-${id}`} />
      </label>
      {val && <button type="button" onClick={() => setter('')} className="text-slate-400 hover:text-rose-500" title="Bỏ"><X className="w-4 h-4" /></button>}
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Giấy khen · chứng nhận" sub="Giấy khen, bằng khen, chứng nhận khoá học / sự kiện — viền hoa văn sắc nét, in hàng loạt theo danh sách (mỗi người 1 tấm + số hiệu), file in tràn lề có khuôn ép kim." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {CT_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`ct-kind-${k.id}`} title={k.note}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CT_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">{tpls.map(thumb)}</div>
              <div className="text-[11px] text-slate-400 mt-3 mb-1.5">Mẫu loại khác</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{others.map(thumb)}</div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`ct-field-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`ct-field-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`3 · Danh sách người nhận (${people.length} tấm)`}>
              <label className="block">
                <span className="mv-label block mb-1.5">Mỗi dòng 1 người: Họ tên | Lớp/Phòng ban | Thành tích (bỏ trống cột 3 = dùng nội dung chung; dùng “ / ” để xuống dòng)</span>
                <textarea className="mv-input min-h-[120px] font-mono !text-xs" value={data.list || ''} data-testid="ct-list"
                  placeholder={'Trần Gia Khánh | 9A3\nPhạm Bảo Ngọc | 9A1 | Đã đạt danh hiệu Học sinh Xuất sắc / Năm học 2026 – 2027\nLê Quốc Bảo | 9A2'}
                  onChange={(e) => { setField('list', e.target.value.split('\n').slice(0, MAX_PEOPLE).join('\n')); setIdx(0); }} />
              </label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="block"><span className="mv-label block mb-1.5">Tiền tố số hiệu</span>
                  <input className="mv-input" value={data.prefix || ''} maxLength={6} onChange={(e) => setField('prefix', e.target.value.toUpperCase())} data-testid="ct-field-prefix" /></label>
                <label className="block"><span className="mv-label block mb-1.5">Số bắt đầu</span>
                  <input className="mv-input" inputMode="numeric" value={data.start || ''} onChange={(e) => setField('start', e.target.value.replace(/\D/g, ''))} data-testid="ct-field-start" /></label>
              </div>
              <p className="text-[11px] text-slate-400 mt-2" data-testid="ct-serial-info">
                Số hiệu chạy từ <b className="text-mv-fg">{ctSerial(data, 0)}</b> đến <b className="text-mv-fg">{ctSerial(data, people.length - 1)}</b> · {people.length} tấm
              </p>
              {people.length > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="mv-label">Xem tấm</span>
                  <select className="mv-input !w-auto !py-1.5 !text-xs" value={cur} onChange={(e) => setIdx(Number(e.target.value))} data-testid="ct-person">
                    {people.map((p, i) => <option key={i} value={i}>{i + 1}. {p.name || '(chưa có tên)'}</option>)}
                  </select>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="4 · Logo · con dấu · chữ ký (tuỳ chọn)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {uploader('Logo', logo, setLogo, 'logo', 'Đặt trên đầu giấy')}
                {uploader('Con dấu', seal, setSeal, 'seal', 'Ảnh PNG nền trong, đè lên chữ ký')}
                {uploader('Chữ ký', sig, setSig, 'sig', 'Ảnh chữ ký nền trong')}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Ảnh chỉ xử lý trên máy của bạn. Không có con dấu thì xưởng in để trống — đơn vị tự ký, đóng dấu sau.</p>
            </CollapsibleSection>

            <CollapsibleSection title="5 · Kiểu dáng">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Viền hoa văn</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ct-layouts">
                    {CT_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="ct-palettes">
                    {CT_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair relative overflow-hidden" style={{ background: pl.frame }}><span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full" style={{ background: pl.gold }} /></span>
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Font tiêu đề</div>
                    <div className="grid grid-cols-2 gap-1.5" data-testid="ct-fonts">
                      {CT_TITLE_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.fam}"`, fontWeight: f.wt }}>GIẤY KHEN</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font họ tên</div>
                    <div className="grid grid-cols-2 gap-1.5" data-testid="ct-name-fonts">
                      {CT_NAME_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ nameFont: f.id })} title={f.name} className={`${chip(spec.nameFont === f.id)} !py-1.5 truncate`} style={{ fontFamily: `"${f.fam}"`, fontWeight: f.wt, fontSize: f.fam.includes('Vibes') || f.fam.includes('Brush') ? 18 : 13 }}>Thu Hà</button>)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex gap-1.5" data-testid="ct-sizes">{CT_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}</div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Hướng</div>
                    <div className="flex gap-1.5" data-testid="ct-orient">
                      <button type="button" onClick={() => set({ orient: 'land' })} className={chip(spec.orient === 'land')}>Ngang</button>
                      <button type="button" onClick={() => set({ orient: 'port' })} className={chip(spec.orient === 'port')}>Dọc</button>
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Khung trưng bày (3D)</div>
                    <div className="flex gap-1.5" data-testid="ct-frame3d">
                      {([['gold', 'Phào vàng'], ['wood', 'Gỗ óc chó'], ['black', 'Đen bóng']] as [Frame3D, string][]).map(([id, n]) => <button key={id} type="button" onClick={() => set({ frame3d: id })} className={chip(spec.frame3d === id)}>{n}</button>)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {(spec.kind === 'khen' || spec.kind === 'bangkhen') && (
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                      <input type="checkbox" checked={spec.quochieu} onChange={(e) => set({ quochieu: e.target.checked })} data-testid="ct-quochieu" /> Có Quốc hiệu (CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM…)
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={spec.bilingual} onChange={(e) => set({ bilingual: e.target.checked })} data-testid="ct-bilingual" /> Song ngữ Việt – Anh
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={spec.foil} onChange={(e) => set({ foil: e.target.checked })} data-testid="ct-foil" />
                    <Sparkles className="w-4 h-4 text-amber-500" /> Ép kim vàng (viền, hoa văn, huy chương thành nhũ kim loại)
                  </label>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước{people.length > 1 ? ` · tấm ${cur + 1}/${people.length}` : ''}</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, cur, logo.length, seal.length, sig.length])} refitKey={`${spec.orient}|${spec.size}`} debounce={500} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div ref={flatRef} className="mx-auto shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ar, maxHeight: '62vh' }} data-testid="ct-flat">
                <CertificateSvg spec={spec} data={data} index={cur} {...imgs} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{dm.wMm / 10} × {dm.hMm / 10} cm · {people.length} tấm · tràn lề {CT_BLEED_MM}mm{spec.foil ? ' · ép kim' : ''}</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ct-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="ct-3d-png" title={tab !== '3d' ? 'Mở tab 3D để chụp' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ct-pdf" title="Tất cả người nhận, mỗi người 1 trang (tràn lề, vạch cắt) + khuôn ép kim">
                {busy.startsWith('pdf') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyTxt('pdf', `PDF in (${people.length + (spec.foil ? 1 : 0)} trang)`)}
              </button>
            </div>
            <PrintRequest product="certificate" title={orderTitle} defaultMaterial={spec.foil ? 'Giấy mỹ thuật 250 ép kim' : 'Couche 300 cán mờ'} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF in: mỗi người nhận 1 trang đúng khổ, tràn lề {CT_BLEED_MM}mm + vạch cắt, chữ đã chuyển nét{spec.foil ? <>, trang cuối là <b>khuôn ép kim</b> (vùng đen = nhũ)</> : null}. Muốn đóng bìa da đựng giấy khen, ghi chú khi gửi yêu cầu in.
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: khuôn ép kim (3D) + file in tất cả người nhận (chỉ dựng khi xuất) */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1100, pointerEvents: 'none' }}>
          <div ref={foilRef}>{spec.foil && <CertificateSvg spec={spec} data={data} index={cur} foilMask style={{ width: '100%', display: 'block' }} />}</div>
          <div ref={printRef} data-testid="ct-print">
            {printing && people.map((_, i) => <div key={i}><CertificateSvg spec={spec} data={data} index={i} bleed print {...imgs} style={{ width: '100%', display: 'block' }} /></div>)}
            {printing && spec.foil && <div data-mask="1"><CertificateSvg spec={spec} data={data} index={0} bleed print foilMask="print" style={{ width: '100%', display: 'block' }} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
