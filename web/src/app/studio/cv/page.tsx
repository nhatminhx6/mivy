'use client';
// Tạo CV: chọn mẫu → điền thông tin → đổi màu/font → tải PDF A4 hoặc PNG. Render HTML bằng code, không gọi AI.

import { useEffect, useRef, useState } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  CV_DEFAULT, CV_FONTS, CV_FONT_CSS, CV_H, CV_LAYOUTS, CV_PALETTES, CV_W, CvSheet, ScaledCv, emptyEdu, emptyJob, sampleCv,
  type CvData, type CvEdu, type CvJob, type CvSpec,
} from '@/lib/cv-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { drawWatermark } from '@/lib/design-engine';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';

const KEY = 'mivy-cv-v1';
const FIELDS: { key: keyof CvData; label: string; ph: string; half?: boolean }[] = [
  { key: 'name', label: 'Họ và tên', ph: 'Trần Quốc Bảo', half: true },
  { key: 'title', label: 'Vị trí ứng tuyển', ph: 'Chuyên viên Marketing', half: true },
  { key: 'phone', label: 'Số điện thoại', ph: '0901 234 567', half: true },
  { key: 'email', label: 'Email', ph: 'ten@gmail.com', half: true },
  { key: 'address', label: 'Địa chỉ', ph: 'Quận 3, TP. Hồ Chí Minh', half: true },
  { key: 'link', label: 'LinkedIn / website', ph: 'linkedin.com/in/ten', half: true },
];

// ảnh đại diện: cắt vuông giữa, thu còn 360px cho nhẹ
function squarePhoto(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 360;
      c.getContext('2d')!.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 360, 360);
      URL.revokeObjectURL(im.src); res(c.toDataURL('image/jpeg', 0.9));
    };
    im.onerror = () => rej(new Error('Không đọc được ảnh'));
    im.src = URL.createObjectURL(file);
  });
}

export default function CvPage() {
  const [spec, setSpec] = useState<CvSpec>(CV_DEFAULT);
  const [data, setData] = useState<CvData>(sampleCv);
  const [overflow, setOverflow] = useState(false);
  const [busy, setBusy] = useState('');
  const [loaded, setLoaded] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.data) { setData({ ...sampleCv(), ...s.data }); if (s.spec?.layout && CV_LAYOUTS.some((l) => l.id === s.spec.layout)) setSpec({ ...CV_DEFAULT, ...s.spec }); } } catch { /* bỏ qua */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify({ spec, data })); } catch { /* đầy bộ nhớ / chế độ riêng tư */ }
  }, [spec, data, loaded]);

  const set = (p: Partial<CvSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: keyof CvData, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setJob = (i: number, p: Partial<CvJob>) => setData((d) => ({ ...d, jobs: d.jobs.map((j, k) => (k === i ? { ...j, ...p } : j)) }));
  const setEdu = (i: number, p: Partial<CvEdu>) => setData((d) => ({ ...d, edus: d.edus.map((e, k) => (k === i ? { ...e, ...p } : e)) }));
  const slug = slugify(`cv-${data.name || ''}`, 'cv');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const toCanvas = async () => {
    const el = printRef.current?.querySelector('[data-cv-sheet]') as HTMLElement | null;
    if (!el) throw new Error('Chưa dựng xong CV, thử lại nhé.');
    await document.fonts?.ready;
    const { toCanvas } = await import('html-to-image');
    const fontEmbedCSS = await embedFontCss(CV_FONT_CSS);
    return toCanvas(el, { width: CV_W, height: CV_H, pixelRatio: 2.5, cacheBust: false, fontEmbedCSS, skipFonts: !fontEmbedCSS, backgroundColor: '#ffffff' });
  };
  const downloadPdf = () => run('pdf', async () => {
    const c = await toCanvas();
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    downloadBlob(pdf.output('blob'), `${slug}.pdf`);
  });
  const downloadPng = () => run('png', async () => {
    const c = await toCanvas(); drawWatermark(c);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
    if (!blob) throw new Error('Xuất ảnh rỗng');
    downloadBlob(blob, `${slug}.png`);
  });
  const pickPhoto = async (f?: File) => { if (f) setData({ ...data, photo: await squarePhoto(f) }); };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const del = 'shrink-0 w-8 h-8 rounded-lg border border-mv-hair text-slate-400 hover:text-rose-500 hover:border-rose-300 flex items-center justify-center';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tạo CV" sub="Chọn mẫu, điền thông tin, tải CV khổ A4 (PDF) gửi nhà tuyển dụng. Nội dung tự lưu trên máy anh/chị." />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <CollapsibleSection title={`1 · Chọn bố cục (${CV_LAYOUTS.length})`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
              {CV_LAYOUTS.map((l) => (
                <button key={l.id} type="button" onClick={() => set({ layout: l.id })} data-testid="cv-tpl"
                  className={`rounded-xl border p-1.5 text-left transition-all ${spec.layout === l.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                  <ScaledCv spec={{ ...spec, layout: l.id }} data={data} className="rounded-md shadow-sm border border-mv-hair" />
                  <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{l.name}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="2 · Màu & font">
            <div className="space-y-4">
              <div>
                <div className="mv-label mb-1.5">Màu chủ đạo</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5" data-testid="cv-palettes">
                  {CV_PALETTES.map((p) => (
                    <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                      <span className="w-5 h-5 rounded-full shrink-0" style={{ background: p.accent }} /><span className="truncate">{p.name}</span>
                    </button>
                  ))}
                  <label className={`flex items-center gap-2 cursor-pointer ${chip(spec.palette === 'custom')}`} title="Chọn màu bất kỳ">
                    <span className="relative w-5 h-5 rounded-full shrink-0 overflow-hidden border border-mv-hair" style={{ background: spec.palette === 'custom' && spec.color ? spec.color : 'conic-gradient(#e11d48,#f59e0b,#2563eb,#7c3aed,#e11d48)' }}>
                      <input type="color" value={spec.color || '#1f3a68'} onChange={(e) => set({ palette: 'custom', color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" data-testid="cv-color" />
                    </span>
                    <span className="truncate">Màu khác</span>
                  </label>
                </div>
              </div>
              <div>
                <div className="mv-label mb-1.5">Font tiêu đề</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="cv-fonts">
                  {CV_FONTS.map((f) => (
                    <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: f.head, fontWeight: f.headW }}>{f.name}</button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="3 · Thông tin cá nhân">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-ink/[0.05] border border-mv-hair flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {data.photo ? <img src={data.photo} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
              </div>
              <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5" /> {data.photo ? 'Đổi ảnh' : 'Thêm ảnh đại diện'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} data-testid="cv-photo" />
              </label>
              {data.photo && <button type="button" onClick={() => setData({ ...data, photo: undefined })} className="mv-btn mv-btn-ghost !text-xs"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                  <span className="mv-label block mb-1.5">{f.label}</span>
                  <input className="mv-input" value={String(data[f.key] || '')} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cv-${f.key}`} />
                </label>
              ))}
              <label className="block col-span-2">
                <span className="mv-label block mb-1.5">Giới thiệu bản thân</span>
                <textarea className="mv-input min-h-[80px]" rows={3} value={data.summary} onChange={(e) => setField('summary', e.target.value)} placeholder="2–3 câu về kinh nghiệm và điểm mạnh" data-testid="cv-summary" />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={`4 · Kinh nghiệm làm việc (${data.jobs.length})`}>
            <div className="space-y-3">
              {data.jobs.map((j, i) => (
                <div key={i} className="rounded-xl border border-mv-hair p-3 space-y-2" data-testid="cv-job">
                  <div className="flex gap-2">
                    <input className="mv-input" value={j.role} onChange={(e) => setJob(i, { role: e.target.value })} placeholder="Chức danh" />
                    <button type="button" onClick={() => setData({ ...data, jobs: data.jobs.filter((_, k) => k !== i) })} className={del} title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="mv-input" value={j.org} onChange={(e) => setJob(i, { org: e.target.value })} placeholder="Công ty" />
                    <input className="mv-input" value={j.time} onChange={(e) => setJob(i, { time: e.target.value })} placeholder="03/2023 – nay" />
                  </div>
                  <textarea className="mv-input min-h-[70px]" rows={3} value={j.desc} onChange={(e) => setJob(i, { desc: e.target.value })} placeholder="Mỗi dòng 1 việc / thành tích" />
                </div>
              ))}
              <button type="button" onClick={() => setData({ ...data, jobs: [...data.jobs, emptyJob()] })} className="mv-btn mv-btn-ghost !text-xs" data-testid="cv-add-job"><Plus className="w-3.5 h-3.5" /> Thêm kinh nghiệm</button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={`5 · Học vấn (${data.edus.length})`}>
            <div className="space-y-3">
              {data.edus.map((e, i) => (
                <div key={i} className="rounded-xl border border-mv-hair p-3 space-y-2">
                  <div className="flex gap-2">
                    <input className="mv-input" value={e.degree} onChange={(ev) => setEdu(i, { degree: ev.target.value })} placeholder="Bằng cấp / chuyên ngành" />
                    <button type="button" onClick={() => setData({ ...data, edus: data.edus.filter((_, k) => k !== i) })} className={del} title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="mv-input" value={e.school} onChange={(ev) => setEdu(i, { school: ev.target.value })} placeholder="Trường" />
                    <input className="mv-input" value={e.time} onChange={(ev) => setEdu(i, { time: ev.target.value })} placeholder="2017 – 2021" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setData({ ...data, edus: [...data.edus, emptyEdu()] })} className="mv-btn mv-btn-ghost !text-xs"><Plus className="w-3.5 h-3.5" /> Thêm học vấn</button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="6 · Kỹ năng & khác">
            <div className="space-y-3">
              {([['skills', 'Kỹ năng', 'Facebook Ads, Excel, Canva…'], ['langs', 'Ngoại ngữ', 'Tiếng Anh — IELTS 7.0'], ['hobbies', 'Sở thích', 'Đọc sách, chạy bộ']] as const).map(([k, l, ph]) => (
                <label key={k} className="block">
                  <span className="mv-label block mb-1.5">{l} <span className="normal-case font-normal text-slate-500">· cách nhau bằng dấu phẩy</span></span>
                  <input className="mv-input" value={data[k]} onChange={(e) => setField(k, e.target.value)} placeholder={ph} data-testid={`cv-${k}`} />
                </label>
              ))}
            </div>
          </CollapsibleSection>


        </div>

        {/* Xem trước ghim + tải */}
        <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
          <span className="text-sm font-bold text-mv-fg">Xem trước</span>
          <div className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] bg-white" data-testid="cv-preview">
            <ScaledCv spec={spec} data={data} onFit={setOverflow} />
          </div>
          {overflow && <div className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2" data-testid="cv-overflow">Nội dung dài quá 1 trang A4 — rút gọn bớt mô tả hoặc bỏ mục ít quan trọng.</div>}
          <div className="text-[11px] text-slate-400 text-center">Khổ A4 · 210 × 297 mm</div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cv-pdf">
              {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Tải PDF
            </button>
            <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cv-png">
              {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
            </button>
          </div>
          <button type="button" onClick={() => { if (confirm('Xoá hết nội dung đã điền và dùng lại mẫu ví dụ?')) setData(sampleCv()); }} className="w-full text-[11px] text-slate-500 hover:text-slate-300">Dùng lại nội dung ví dụ</button>
        </div>
      </div>

      {/* bản đúng cỡ (ẩn) để xuất file */}
      <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
        <CvSheet spec={spec} data={data} />
      </div>
    </div>
  );
}
