'use client';
// Tờ rơi / flyer: chọn mẫu theo ngành → điền nội dung (+ ảnh của quán, tuỳ chọn) → khổ A6/A5/A4, 1 hay 2 mặt →
// xem thành phẩm 3D → tải PDF in (lề xén 2mm, vạch cắt, chữ outline) hoặc gửi yêu cầu in. Render code 100%.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  FL_BLEED_MM, FL_FIELDS, FL_FONTS, FL_FONT_CSS, FL_LAYOUTS, FL_PALETTES, FL_SAMPLES, FL_SIZES, FL_TEMPLATES,
  FlyerSvg, defaultFLData, flSize, useFLFonts, type FLData, type FLSpec,
} from '@/lib/flyer-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: FLSpec = { layout: 'grand', palette: 'red', font: 'montserrat', size: 'a5', sides: 2 };

// ảnh khách: thu nhỏ còn ≤1800px (đủ nét cho A4 ô ảnh) để trang nhẹ, không gửi đi đâu
async function loadPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export default function FlyerPage() {
  const ready = useFLFonts();
  const [spec, setSpec] = useState<FLSpec>(FIRST);
  const [data, setData] = useState<FLData>(defaultFLData(FIRST.layout));
  const [dirty, setDirty] = useState(false); // khách đã sửa chữ → đổi mẫu giữ nguyên nội dung
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const printFrontRef = useRef<HTMLDivElement | null>(null);
  const printBackRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const set = (p: Partial<FLSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof FL_TEMPLATES)[number]) => {
    set(t.spec);
    if (!dirty) setData(defaultFLData(t.spec.layout));
  };
  const sz = flSize(spec.size);
  const two = spec.sides === 2;
  const slug = slugify(`to-roi-${data.brand || ''}`, 'to-roi');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSvgs = () => {
    const fr = svgOf(printFrontRef), bk = svgOf(printBackRef);
    if (!fr || (two && !bk)) throw new Error('Chưa dựng xong tờ rơi, thử lại nhé.');
    return two ? [fr, bk!] : [fr];
  };
  const pdfName = `${slug}-${sz.id}-${two ? '2-mat' : '1-mat'}-file-in.pdf`;

  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    downloadBlob(await svgToPng(el, FL_FONT_CSS, 1600), `${slug}-mat-truoc.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await svgsToPrintPdf(printSvgs(), FL_FONT_CSS, sz, FL_BLEED_MM), pdfName));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printFrontRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, FL_FONT_CSS), `${slug}-mat-truoc-file-in.svg`);
  });

  const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    if (!pv) throw new Error('Chưa dựng xong tờ rơi, thử lại nhé.');
    // ảnh xem trước gửi kèm đơn: ưu tiên ảnh thành phẩm 3D, lỗi WebGL thì dùng mặt trước phẳng
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, FL_FONT_CSS, 900))
      : svgToJpeg(pv, FL_FONT_CSS, 900);
    const [file, pre] = await Promise.all([svgsToPrintPdf(printSvgs(), FL_FONT_CSS, sz, FL_BLEED_MM), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/flyer-3d').then((m) => m.flyerBuilder({ front: svgOf(frontRef), back: two ? svgOf(backRef) : null, wMm: sz.wMm, hMm: sz.hMm, fontCss: FL_FONT_CSS }));
  const orderTitle = `Tờ rơi ${sz.name} · ${two ? 'in 2 mặt' : 'in 1 mặt'} · ${FL_LAYOUTS.find((l) => l.id === spec.layout)?.name}`;

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await loadPhoto(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = FL_FIELDS.filter((f) => !f.back || two || (f.key === 'prices' && spec.layout === 'menu'));
  const ratio = `${sz.wMm} / ${sz.hMm}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tờ rơi" sub="Tờ rơi khai trương, khuyến mãi, dịch vụ, menu, tuyển dụng, lớp học — chọn mẫu, điền nội dung, tải PDF in chuẩn (lề xén, vạch cắt) hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${FL_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {FL_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="fl-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: ratio }}>
                        <FlyerSvg spec={{ ...spec, ...t.spec }} data={dirty ? data : FL_SAMPLES[t.spec.layout]} photo={photo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung & ảnh">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="fl-photo-btn">
                        <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh' : 'Thêm ảnh quán / sản phẩm'}
                      </button>
                      {photo && <button type="button" onClick={() => setPhoto('')} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                    </div>
                    <p className="text-[11px] text-slate-500">Không có ảnh cũng được — mẫu tự vẽ hình trang trí theo ngành.</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="fl-photo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[96px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fl-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fl-${f.key}`} />}
                    </label>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, số mặt, màu & font">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {FL_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="fl-size">{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">In</div>
                    <div className="flex gap-1.5">
                      {([1, 2] as const).map((n) => <button key={n} type="button" onClick={() => set({ sides: n })} className={chip(spec.sides === n)} data-testid={`fl-sides-${n}`}>{n === 1 ? '1 mặt' : '2 mặt (sau: bảng giá + bản đồ + QR)'}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="fl-palettes">
                    {FL_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="fl-fonts">
                    {FL_FONTS.map((f) => (
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photo.length])} refitKey={`${spec.size}|${spec.sides}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className={two ? 'grid grid-cols-2 gap-2' : ''}>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt trước</div>
                  <div ref={frontRef} className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="fl-front">
                    <FlyerSvg spec={spec} data={data} photo={photo} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                </div>
                {two && (
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>
                    <div ref={backRef} className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="fl-back">
                      <FlyerSvg spec={spec} data={data} photo={photo} side="back" style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {two ? '2 mặt' : '1 mặt'} · in 300dpi · lề xén {FL_BLEED_MM}mm · vạch cắt</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fl-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="fl-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fl-svg" title="File vector mặt trước, chữ đã outline — xưởng mở bằng AI/Corel, không cần font">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="flyer" title={orderTitle} design={{ spec, data, hasPhoto: !!photo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Tự in: tải PDF đúng khổ thật{two ? ' (2 trang: trước + sau)' : ''}, nền tràn lề xén + vạch cắt — xưởng in thẳng. Mã QR mặt sau quét ra website/fanpage của anh chị.</p>
          </div>
        </div>
      )}

      {/* bản có lề xén (ẩn) để xuất PDF */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={printFrontRef}><FlyerSvg spec={spec} data={data} photo={photo} side="front" bleed style={{ width: '100%', display: 'block' }} /></div>
          {two && <div ref={printBackRef}><FlyerSvg spec={spec} data={data} photo={photo} side="back" bleed style={{ width: '100%', display: 'block' }} /></div>}
        </div>
      )}
    </div>
  );
}
