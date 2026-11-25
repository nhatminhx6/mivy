'use client';
// Brochure gấp 3 (A4, gấp cuộn): chọn mẫu theo ngành → điền nội dung từng ô (+ ảnh bìa, ảnh trong, tuỳ chọn) →
// xem thành phẩm 3D (đứng mở hé + cuốn gập kín) → tải PDF in 2 trang (ngoài + trong, lề xén 2mm, vạch cắt, vạch gấp,
// chữ outline) hoặc gửi yêu cầu in. Render code 100%, 0 AI.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  BR_BLEED_MM, BR_FIELDS, BR_FONTS, BR_FONT_CSS, BR_LAYOUTS, BR_PALETTES, BR_ROLE_NAME, BR_SAMPLES, BR_TEMPLATES,
  BrochureSvg, brLayout, brochurePdf, defaultBRData, outsideRoles, useBRFonts, usesPhoto2, type BRData, type BRSpec, type Role,
} from '@/lib/brochure-engine';
import { svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// Đổi ngành khi khách đã sửa chữ: GIỮ ô khách tự viết; ô còn nguyên chữ mẫu ngành cũ (vd "Vì sao chọn An Phát")
// → thay bằng chữ mẫu ngành mới, và tên thương hiệu mẫu trong đó đổi thành tên khách đã nhập.
function switchLayoutData(d: BRData, from: string, to: string): BRData {
  const oldS = BR_SAMPLES[from] || {}, newS = defaultBRData(to), next: BRData = {};
  const kept = new Set<string>();
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) { next[k] = v; kept.add(k); }
  const sb = (newS.brand || '').trim(), ub = (next.brand || '').trim();
  for (const [k, v] of Object.entries(newS)) {
    if (kept.has(k)) continue;
    next[k] = ub && sb && k !== 'brand' ? v.split(sb).join(ub) : v;
  }
  return next;
}
const FIRST: BRSpec = { layout: 'company', palette: 'navy', font: 'montserrat' };
const RATIO = '297 / 210';

// ảnh khách: thu nhỏ còn ≤1800px, chỉ ở trên máy, không gửi đi đâu
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

function PhotoPick({ label, value, onChange, testid }: { label: string; value: string; onChange: (v: string) => void; testid: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { onChange(await loadPhoto(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => ref.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid={`${testid}-btn`}>
          <ImagePlus className="w-3.5 h-3.5" /> {value ? 'Đổi ảnh' : label}
        </button>
        {value && <button type="button" onClick={() => onChange('')} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid={testid} />
    </div>
  );
}

export default function BrochurePage() {
  const ready = useBRFonts();
  const [spec, setSpec] = useState<BRSpec>(FIRST);
  const [data, setData] = useState<BRData>(defaultBRData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [photo1, setPhoto1] = useState('');
  const [photo2, setPhoto2] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const outRef = useRef<HTMLDivElement | null>(null);
  const inRef = useRef<HTMLDivElement | null>(null);
  const printOutRef = useRef<HTMLDivElement | null>(null);
  const printInRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const L = brLayout(spec.layout);
  const set = (p: Partial<BRSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof BR_TEMPLATES)[number]) => {
    const changed = t.spec.layout !== spec.layout;
    set(t.spec);
    // khách chưa sửa chữ → nạp nội dung mẫu đúng ngành; đã sửa → giữ chữ, chỉ bù các ô ngành mới cần mà còn trống
    if (!dirty) setData(defaultBRData(t.spec.layout));
    else if (changed) setData((d) => switchLayoutData(d, spec.layout, t.spec.layout));
  };
  const slug = slugify(`brochure-${data.brand || ''}`, 'brochure');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSvgs = () => {
    const o = svgOf(printOutRef), i = svgOf(printInRef);
    if (!o || !i) throw new Error('Chưa dựng xong brochure, thử lại nhé.');
    return [o, i] as const;
  };
  const pdfName = `${slug}-a4-gap-3-file-in.pdf`;
  const downloadPng = (side: 'out' | 'in') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'out' ? outRef : inRef); if (!el) return;
    downloadBlob(await svgToPng(el, BR_FONT_CSS, 2400), `${slug}-${side === 'out' ? 'mat-ngoai' : 'mat-trong'}.png`);
  });
  const downloadPdf = () => run('pdf', async () => { const [o, i] = printSvgs(); downloadBlob(await brochurePdf(o, i, BR_FONT_CSS), pdfName); });

  const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  const makeFiles = async () => {
    const pv = svgOf(outRef);
    if (!pv) throw new Error('Chưa dựng xong brochure, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, BR_FONT_CSS, 1200))
      : svgToJpeg(pv, BR_FONT_CSS, 1200);
    const [o, i] = printSvgs();
    const [file, pre] = await Promise.all([brochurePdf(o, i, BR_FONT_CSS), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/brochure-3d').then((m) => m.brochureBuilder({ outside: svgOf(outRef), inside: svgOf(inRef), fontCss: BR_FONT_CSS }));
  const orderTitle = `Brochure gấp 3 · A4 · ${L.name}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  // nhóm ô nhập theo đúng thứ tự cầm brochure: bìa → ô gập trong → 3 ô trong → lưng
  const roleOrder: Role[] = ['cover', L.flap, ...L.inside, 'back'].filter((r, i, a) => a.indexOf(r) === i) as Role[];
  const where = (r: Role) => (r === 'cover' ? 'mặt ngoài · bìa' : r === 'back' ? 'mặt ngoài · lưng' : outsideRoles(L)[0] === r ? 'mặt ngoài · ô gập vào' : `mặt trong · ô ${L.inside.indexOf(r) + 1}`);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Brochure gấp 3" sub="Brochure A4 gấp 3 cho công ty, spa, nhà hàng, trường học, dự án, phòng khám — điền nội dung từng ô, xem thành phẩm 3D, tải PDF in chuẩn (lề xén, vạch cắt, vạch gấp) hoặc đặt Mivy in + gấp + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${BR_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {BR_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="br-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: RATIO }}>
                        <BrochureSvg spec={t.spec} data={dirty ? switchLayoutData(data, spec.layout, t.spec.layout) : BR_SAMPLES[t.spec.layout]} side="outside" photo1={photo1} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Ảnh (tuỳ chọn)">
              <div className="space-y-3">
                <PhotoPick label="Thêm ảnh bìa" value={photo1} onChange={setPhoto1} testid="br-photo1" />
                {usesPhoto2(L) && <PhotoPick label="Thêm ảnh ô hình ảnh (mặt trong)" value={photo2} onChange={setPhoto2} testid="br-photo2" />}
                <p className="text-[11px] text-slate-500">Không có ảnh cũng được — mẫu tự vẽ hình minh hoạ theo ngành. Ảnh chỉ nằm trên máy anh chị.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung từng ô">
              <div className="space-y-5">
                {roleOrder.map((r) => (
                  <div key={r} className="space-y-2.5" data-testid={`br-role-${r}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-mv-fg">{BR_ROLE_NAME[r]}</span>
                      <span className="text-[11px] text-slate-500">{where(r)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {BR_FIELDS[r].map((f) => (
                        <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                          <span className="mv-label block mb-1.5">{f.label}</span>
                          {f.multiline
                            ? <textarea className="mv-input min-h-[96px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`br-${f.key}`} />
                            : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`br-${f.key}`} />}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Bố cục, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục theo ngành</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="br-layouts">
                    {BR_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => { const t = BR_TEMPLATES.find((x) => x.spec.layout === l.id)!; pickTemplate({ ...t, spec: { ...t.spec, palette: spec.palette, font: spec.font } }); }} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="br-palettes">
                    {BR_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="br-fonts">
                    {BR_FONTS.map((f) => (
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photo1.length, photo2.length])} refitKey="br" debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt ngoài · ô gập vào trong | lưng | bìa</div>
                <div ref={outRef} className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: RATIO }} data-testid="br-outside">
                  <BrochureSvg spec={spec} data={data} side="outside" photo1={photo1} photo2={photo2} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt trong · 3 ô khi mở ra</div>
                <div ref={inRef} className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: RATIO }} data-testid="br-inside">
                  <BrochureSvg spec={spec} data={data} side="inside" photo1={photo1} photo2={photo2} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">A4 297×210mm · gấp cuộn 3 ô (97 | 100 | 100mm) · 300dpi · lề xén {BR_BLEED_MM}mm · vạch cắt + vạch gấp</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('out')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="br-png-out">
                {busy === 'png-out' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG ngoài
              </button>
              <button type="button" onClick={() => downloadPng('in')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="br-png-in">
                {busy === 'png-in' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG trong
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="br-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
            </div>
            <PrintRequest product="brochure" title={orderTitle} design={{ spec, data, hasPhoto1: !!photo1, hasPhoto2: !!photo2 }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">PDF 2 trang: trang 1 mặt ngoài, trang 2 mặt trong — in 2 mặt lật cạnh dài, nét đứt trên/dưới là vạch gấp. Ô gập vào trong hẹp hơn 3mm để gấp phẳng, không cấn.</p>
          </div>
        </div>
      )}

      {/* bản có lề xén (ẩn) để xuất PDF */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printOutRef}><BrochureSvg spec={spec} data={data} side="outside" bleed photo1={photo1} photo2={photo2} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printInRef}><BrochureSvg spec={spec} data={data} side="inside" bleed photo1={photo1} photo2={photo2} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
