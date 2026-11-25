'use client';
// Nhãn chai · hũ · lọ: chọn mẫu theo ngành → chọn vật chứa (kích thước thật) + kiểu nhãn (quấn / trước + sau, thêm nhãn nắp,
// nhãn cổ) → điền nội dung + THÔNG TIN BẮT BUỘC → xem thành phẩm 3D trên chai/hũ thật → tải file in đúng kích thước
// (lề xén, CutContour, ghi chú cuộn nhãn) hoặc gửi yêu cầu in. Render code 100%, không AI theo request.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  LB_CONTAINERS, LB_FIELDS, LB_FONTS, LB_FONT_CSS, LB_INDUSTRIES, LB_LAYOUTS, LB_MATERIALS, LB_PALETTES, LB_STYLES, LB_TEMPLATES,
  LabelFrontSvg, LabelSheetSvg, LabelSvg, PART_NAME, defaultLBData, templateData, lbContainer, partDims, partsOf, sheetLayout, useLBFonts,
  type LBData, type LBImage, type LBIndustry, type LBPart, type LBSpec,
} from '@/lib/label-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: LBSpec = LB_TEMPLATES[0].spec;
const CHECKER = 'repeating-conic-gradient(#E5E7EB 0% 25%, #FFFFFF 0% 50%) 50% / 10px 10px';

async function loadImage(file: File, max = 1400, png = false): Promise<LBImage> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return { href: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}

export default function LabelPage() {
  const ready = useLBFonts();
  const [spec, setSpec] = useState<LBSpec>(FIRST);
  const [data, setData] = useState<LBData>(defaultLBData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState<LBImage | null>(null);
  const [photo, setPhoto] = useState<LBImage | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [guides, setGuides] = useState(true);
  const tex = useRef<Partial<Record<LBPart, HTMLDivElement | null>>>({});
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const logoIn = useRef<HTMLInputElement | null>(null);
  const photoIn = useRef<HTMLInputElement | null>(null);

  const c = lbContainer(spec.container);
  const parts = partsOf(spec);
  const sheet = useMemo(() => sheetLayout(spec), [spec]);
  const set = (p: Partial<LBSpec>) => setSpec((s) => {
    const n = { ...s, ...p };
    const cc = lbContainer(n.container);
    if (!cc.cap) n.cap = false;
    if (!cc.neck) n.neck = false;
    return n;
  });
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof LB_TEMPLATES)[number]) => {
    setSpec(t.spec);
    if (!dirty) setData(templateData(t));
  };
  const pickIndustry = (id: LBIndustry) => {
    const ind = LB_INDUSTRIES.find((i) => i.id === id)!;
    set({ industry: id, container: ind.container });
    if (!dirty) setData(defaultLBData(id));
  };
  const slug = slugify(`nhan-${data.brand || ''}-${data.name || ''}`, 'nhan-chai');
  const mat = LB_MATERIALS.find((m) => m.id === spec.material)!;
  const opts = { spec, data, logo, photo };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null> | HTMLDivElement | null | undefined) => {
    const el = r && 'current' in r ? r.current : r;
    return (el?.querySelector('svg') as SVGSVGElement | null) ?? null;
  };
  const sheetSvg = () => { const el = svgOf(sheetRef); if (!el) throw new Error('Chưa dựng xong file in, thử lại nhé.'); return el; };
  const pdfName = `${slug}-${c.id}-file-in.pdf`;
  const makePdf = () => svgToSizedPdf(sheetSvg(), LB_FONT_CSS, sheet.W, sheet.H, 300);
  const toBlob = (cv: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, 0.88));

  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-anh-3d.png`);
  });
  const downloadPng = () => run('png', async () => {
    const main = svgOf(tex.current[parts[0]]);
    if (!main) throw new Error('Chưa dựng xong nhãn.');
    downloadBlob(await svgToPng(main, LB_FONT_CSS, 2400), `${slug}-${parts[0]}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName));
  const downloadSvg = () => run('svg', async () => downloadBlob(await svgFileBlob(sheetSvg(), LB_FONT_CSS), `${slug}-${c.id}-file-in.svg`));

  const makeFiles = async () => {
    const pv = svgOf(tex.current[parts[0]]);
    if (!pv) throw new Error('Chưa dựng xong nhãn, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((cv) => toBlob(cv, 'image/jpeg')).catch(() => svgToJpeg(pv, LB_FONT_CSS, 900))
      : svgToJpeg(pv, LB_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/label-3d').then((m) => m.labelBuilder({
    spec, fontCss: LB_FONT_CSS,
    wrap: svgOf(tex.current.wrap), front: svgOf(tex.current.front), back: svgOf(tex.current.back),
    cap: svgOf(tex.current.cap), neck: svgOf(tex.current.neck),
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __lbSnap?: (w: number, h: number, el?: number) => Promise<string> }).__lbSnap = async (w, h, el) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h, el == null ? {} : { view: { az: 0.3, el } })).toDataURL('image/png');
    };
  }
  const orderTitle = `Nhãn ${c.short} · ${parts.map((p) => PART_NAME[p].toLowerCase().replace('nhãn ', '')).join(' + ')} · ${mat.name}`;

  const onImg = (kind: 'logo' | 'photo') => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const im = await loadImage(f, kind === 'logo' ? 900 : 1400, kind === 'logo');
      if (kind === 'logo') setLogo(im); else setPhoto(im);
    } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const field = (f: (typeof LB_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[64px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`lb-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`lb-${f.key}`} />}
    </label>
  );
  const ImgSlot = ({ kind, img, label, hint }: { kind: 'logo' | 'photo'; img: LBImage | null; label: string; hint: string }) => (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
        {img ? <img src={img.href} alt="" className={`w-full h-full ${kind === 'logo' ? 'object-contain' : 'object-cover'}`} /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="space-y-1.5 min-w-0">
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => (kind === 'logo' ? logoIn : photoIn).current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid={`lb-${kind}-btn`}>
            <ImagePlus className="w-3.5 h-3.5" /> {img ? `Đổi ${label}` : `Thêm ${label}`}
          </button>
          {img && <button type="button" onClick={() => (kind === 'logo' ? setLogo(null) : setPhoto(null))} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ</button>}
        </div>
        <p className="text-[11px] text-slate-500">{hint}</p>
      </div>
    </div>
  );
  const flatBg = spec.material === 'clear' ? CHECKER : undefined;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Nhãn chai · hũ · lọ" sub="Nhãn quấn chai nước, hũ mật ong, chai nước mắm, lọ serum, lon… đúng kích thước thật của từng loại vật chứa, có sẵn khung thông tin bắt buộc (thành phần, HDSD, NSX/HSD, mã vạch). Xem thành phẩm 3D, tải file in có đường bế hoặc đặt Mivy in." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${LB_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {LB_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.industry === t.spec.industry && spec.container === t.spec.container;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="lb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm aspect-[4/5] grid place-items-center" style={{ background: t.spec.material === 'clear' ? CHECKER : '#F3F1EC' }}>
                        <LabelFrontSvg spec={t.spec} data={dirty ? data : templateData(t)} logo={logo} photo={photo} style={{ width: '92%', height: '92%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-500 px-0.5 truncate">{lbContainer(t.spec.container).short}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Vật chứa & kiểu nhãn">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Ngành hàng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="lb-industries">
                    {LB_INDUSTRIES.map((i) => <button key={i.id} type="button" onClick={() => pickIndustry(i.id)} className={chip(spec.industry === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chai / hũ / lọ (kích thước thật)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="lb-containers">
                    {LB_CONTAINERS.map((k) => (
                      <button key={k.id} type="button" onClick={() => set({ container: k.id })} className={`${chip(spec.container === k.id)} text-left`} data-testid={`lb-c-${k.id}`}>
                        <div className="truncate">{k.short}</div><div className="text-[10px] opacity-60">Ø{k.r * 2} · nhãn cao {k.bandH}mm</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Kiểu nhãn</div>
                    <div className="flex flex-wrap gap-1.5">
                      {LB_STYLES.map((s) => <button key={s.id} type="button" onClick={() => set({ style: s.id })} className={chip(spec.style === s.id)} data-testid={`lb-style-${s.id}`}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Thêm</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" disabled={!c.cap} onClick={() => set({ cap: !spec.cap })} className={`${chip(spec.cap)} disabled:opacity-40`} data-testid="lb-cap">{spec.cap ? '✓ ' : ''}Nhãn nắp tròn</button>
                      <button type="button" disabled={!c.neck} onClick={() => set({ neck: !spec.neck })} className={`${chip(spec.neck)} disabled:opacity-40`} data-testid="lb-neck">{spec.neck ? '✓ ' : ''}Nhãn cổ chai</button>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu decal</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="lb-materials">
                    {LB_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`} data-testid={`lb-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] opacity-60 truncate">{m.note}</div>
                      </button>
                    ))}
                  </div>
                  {spec.material === 'clear' && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 cursor-pointer">
                      <input type="checkbox" checked={spec.white} onChange={(e) => set({ white: e.target.checked })} data-testid="lb-white" />
                      In lót trắng dưới ô thông tin (chữ nhỏ dễ đọc trên chai màu)
                    </label>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {parts.map((p) => { const d = partDims(spec, p); return `${PART_NAME[p]} ${d.round ? `Ø${d.w}` : `${d.w}×${d.h}`}mm`; }).join(' · ')}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung mặt trước, logo & ảnh">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <ImgSlot kind="logo" img={logo} label="logo" hint="PNG nền trong là đẹp nhất. Hiện ở huy hiệu mặt trước & nắp." />
                  <ImgSlot kind="photo" img={photo} label="ảnh" hint="Ảnh sản phẩm / nguyên liệu, cắt tròn vào ô hình." />
                  <input ref={logoIn} type="file" accept="image/*" className="hidden" onChange={onImg('logo')} data-testid="lb-logo" />
                  <input ref={photoIn} type="file" accept="image/*" className="hidden" onChange={onImg('photo')} data-testid="lb-photo" />
                </div>
                <div className="grid grid-cols-2 gap-3">{LB_FIELDS.filter((f) => !f.info).map(field)}</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Thông tin bắt buộc trên nhãn">
              <div className="grid grid-cols-2 gap-3">{LB_FIELDS.filter((f) => f.info).map(field)}</div>
              <p className="text-[11px] text-slate-500 mt-3">Theo quy định ghi nhãn hàng hoá: tên sản phẩm, định lượng, thành phần, HDSD, bảo quản, xuất xứ, cơ sở chịu trách nhiệm, NSX/HSD. Ô NSX / HSD / Số lô để trống để in phun date sau. Mã vạch tự tính số kiểm tra.</p>
            </CollapsibleSection>

            <CollapsibleSection title="5 · Bố cục, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="lb-layouts">
                    {LB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="lb-palettes">
                    {LB_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 55%, ${pl.accent} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên sản phẩm</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="lb-fonts">
                    {LB_FONTS.map((f) => (
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length || 0, photo?.href.length || 0])} refitKey={`${spec.container}|${spec.style}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`} data-testid="lb-flat">
              <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} data-testid="lb-guides" />
                Hiện đường bế · vùng an toàn · vùng mặt trước (không in)
              </label>
              {parts.map((p) => {
                const d = partDims(spec, p);
                return (
                  <div key={p}>
                    <div className="text-[11px] text-slate-400 mb-1">{PART_NAME[p]} · {d.round ? `Ø${d.w}` : `${d.w} × ${d.h}`} mm</div>
                    <div className={`overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] ${d.round ? 'rounded-full mx-auto' : 'rounded-md'}`} style={{ aspectRatio: `${d.w} / ${d.h}`, background: flatBg, width: d.round ? '45%' : p === 'neck' ? '80%' : '100%' }} data-testid={`lb-flat-${p}`}>
                      <LabelSvg part={p} guides={guides} {...opts} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{c.name} · {mat.name} · file in {sheet.W}×{sheet.H}mm</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lb-3d" title="Ảnh thành phẩm 3D đúng góc đang xem">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lb-png" title="Ảnh nhãn chính (không đường bế)">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="lb-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lb-svg" title="File vector (chữ đã outline) có lớp In + CutContour">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="label" title={orderTitle} defaultMaterial={spec.material === 'clear' ? 'Decal trong (chai thuỷ tinh)' : spec.material === 'kraft' ? 'Decal kraft' : spec.material === 'milky' ? 'Decal nhựa sữa chống nước' : 'Decal giấy cán màng (chai, hũ)'} design={{ spec, data, hasLogo: !!logo, hasPhoto: !!photo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in gồm mọi nhãn trên 1 tờ đúng kích thước thật, lề xén 2mm, đường bế CutContour bo góc và ghi chú cuộn nhãn cho xưởng. Chữ đã outline, nằm gọn trong vùng an toàn.</p>
          </div>
        </div>
      )}

      {/* nguồn texture 3D (không vạch) + tờ file in — ẩn */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          {parts.map((p) => (
            <div key={p} ref={(el) => { tex.current[p] = el; }} data-testid={`lb-tex-${p}`}>
              <LabelSvg part={p} {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ))}
          <div ref={sheetRef} data-testid="lb-sheet"><LabelSheetSvg {...opts} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
