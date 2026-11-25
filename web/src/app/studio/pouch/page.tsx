'use client';
// Túi zip đứng / bao bì màng ghép: chọn mẫu theo ngành → điền nội dung (mặt trước + mặt sau: thành phần, HDSD, NSX/HSD,
// mã vạch) → chọn khổ, chất liệu, cửa sổ, lỗ treo, vết xé, van → xem thành phẩm 3D → tải file in trải phẳng
// (mặt trước + sau + đáy, lề xén, vạch kỹ thuật) hoặc gửi yêu cầu in. Render code 100%, không AI theo request.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  PC_FIELDS, PC_FONTS, PC_FONT_CSS, PC_MATERIALS, PC_PALETTES, PC_SAMPLES, PC_SIZES, PC_TEMPLATES, PC_WINDOWS,
  PouchFaceSvg, PouchSheetSvg, defaultPCData, pcSize, pouchSheetDims, usePCFonts, type PCData, type PCSpec,
} from '@/lib/pouch-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PCSpec = { ...PC_TEMPLATES[0].spec, size: '15x22', euro: false, notch: true };
const CHECKER = 'repeating-conic-gradient(#E5E7EB 0% 25%, #FFFFFF 0% 50%) 50% / 10px 10px';

async function loadPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export default function PouchPage() {
  const ready = usePCFonts();
  const [spec, setSpec] = useState<PCSpec>(FIRST);
  const [data, setData] = useState<PCData>(defaultPCData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [guides, setGuides] = useState(true);
  const texFront = useRef<HTMLDivElement | null>(null);
  const texBack = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const set = (p: Partial<PCSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof PC_TEMPLATES)[number]) => {
    set(t.spec);
    if (!dirty) setData(defaultPCData(t.spec.industry));
  };
  const sz = pcSize(spec.size);
  const sheet = useMemo(() => pouchSheetDims(spec), [spec]);
  const slug = slugify(`tui-zip-${data.brand || ''}`, 'tui-zip');
  const mat = PC_MATERIALS.find((m) => m.id === spec.material)!;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const sheetSvg = () => { const el = svgOf(sheetRef); if (!el) throw new Error('Chưa dựng xong file in, thử lại nhé.'); return el; };
  const pdfName = `${slug}-${sz.id}-file-in.pdf`;
  const makePdf = () => svgToSizedPdf(sheetSvg(), PC_FONT_CSS, sheet.W, sheet.H, 250);

  const toBlob = (c: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, 0.88));
  const downloadPng = () => run('png', async () => {
    if (view3d.current) { downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-anh-3d.png`); return; }
    const el = svgOf(texFront); if (el) downloadBlob(await svgToPng(el, PC_FONT_CSS, 1200), `${slug}-mat-truoc.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName));
  const downloadSvg = () => run('svg', async () => downloadBlob(await svgFileBlob(sheetSvg(), PC_FONT_CSS), `${slug}-${sz.id}-file-in.svg`));

  const makeFiles = async () => {
    const pv = svgOf(texFront);
    if (!pv) throw new Error('Chưa dựng xong túi, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg')).catch(() => svgToJpeg(pv, PC_FONT_CSS, 900))
      : svgToJpeg(pv, PC_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/pouch-3d').then((m) => m.pouchBuilder({ front: svgOf(texFront), back: svgOf(texBack), spec, data, fontCss: PC_FONT_CSS }));
  const orderTitle = `Túi zip đứng ${sz.name} · ${mat.name}${spec.window !== 'none' && spec.material !== 'clear' ? ' · cửa sổ' : ''}`;

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await loadPhoto(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const ratio = `${sz.wMm} / ${sz.hMm}`;
  const faceBg = (spec.material === 'clear' || spec.window !== 'none') ? CHECKER : undefined;
  const frontFields = PC_FIELDS.filter((f) => !f.back);
  const backFields = PC_FIELDS.filter((f) => f.back);
  const field = (f: (typeof PC_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[78px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pc-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pc-${f.key}`} />}
    </label>
  );
  const toggle = (key: 'euro' | 'notch' | 'valve', label: string) => (
    <button type="button" onClick={() => set({ [key]: !spec[key] } as Partial<PCSpec>)} className={chip(spec[key])} data-testid={`pc-${key}`}>
      {spec[key] ? '✓ ' : ''}{label}
    </button>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Túi zip · bao bì" sub="Túi zip đứng màng ghép cho cà phê, hạt, trà, bánh kẹo, mỹ phẩm, đồ thú cưng — chọn mẫu, điền nội dung 2 mặt, xem thành phẩm 3D, tải file in trải phẳng (lề xén, mép hàn, khoá zip, cửa sổ) hoặc đặt Mivy in." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PC_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {PC_TEMPLATES.map((t) => {
                  const s = { ...spec, ...t.spec };
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.industry === t.spec.industry;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: ratio, background: s.material === 'clear' || s.window !== 'none' ? CHECKER : undefined }}>
                        <PouchFaceSvg spec={s} data={dirty ? data : PC_SAMPLES[t.spec.industry]} photo={photo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung mặt trước & ảnh">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="pc-photo-btn">
                        <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh' : 'Thêm ảnh sản phẩm'}
                      </button>
                      {photo && <button type="button" onClick={() => setPhoto('')} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                    </div>
                    <p className="text-[11px] text-slate-500">Ảnh hiện ở ô hình khi túi <b>không có cửa sổ</b>. Không có ảnh thì mẫu tự vẽ hình theo ngành.</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="pc-photo" />
                </div>
                <div className="grid grid-cols-2 gap-3">{frontFields.map(field)}</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mặt sau (thông tin bắt buộc trên bao bì)">
              <div className="grid grid-cols-2 gap-3">{backFields.map(field)}</div>
              <p className="text-[11px] text-slate-500 mt-3">Ô NSX / HSD / Số lô để trống cho xưởng hoặc anh chị in phun date sau. Mã vạch tự tính số kiểm tra cuối.</p>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Quy cách túi, màu & font">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ (rộng × cao)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PC_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="pc-size">{s.name} · đáy {s.gMm / 10}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="pc-materials">
                    {PC_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`} title={m.note} data-testid={`pc-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] opacity-60 truncate">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Cửa sổ trong {spec.material === 'clear' && <span className="opacity-60">(màng trong: cả túi đã trong)</span>}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PC_WINDOWS.map((w) => <button key={w.id} type="button" disabled={spec.material === 'clear'} onClick={() => set({ window: w.id })} className={`${chip(spec.window === w.id)} disabled:opacity-40`} data-testid={`pc-win-${w.id}`}>{w.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Chi tiết</div>
                    <div className="flex flex-wrap gap-1.5">
                      {toggle('notch', 'Vết xé')}
                      {toggle('euro', 'Lỗ treo')}
                      {toggle('valve', 'Van 1 chiều (cà phê)')}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="pc-palettes">
                    {PC_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 55%, ${pl.accent} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên sản phẩm</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="pc-fonts">
                    {PC_FONTS.map((f) => (
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photo.length])} refitKey={`${spec.size}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} data-testid="pc-guides" />
                Hiện mép hàn · khoá zip · cửa sổ (vạch kỹ thuật, không in)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt trước</div>
                  <div ref={frontRef} className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio, background: faceBg }} data-testid="pc-front">
                    <PouchFaceSvg spec={spec} data={data} photo={photo} side="front" guides={guides} style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>
                  <div className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio, background: spec.material === 'clear' ? CHECKER : undefined }} data-testid="pc-back">
                    <PouchFaceSvg spec={spec} data={data} photo={photo} side="back" guides={guides} style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · đáy {sz.gMm / 10}cm · {mat.name} · file in trải phẳng {Math.round(sheet.W)}×{Math.round(sheet.H)}mm</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-png" title="Ảnh thành phẩm 3D đúng góc đang xem — đăng bán, gửi khách duyệt">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pc-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-svg" title="File vector trải phẳng, chữ đã outline — xưởng mở bằng AI/Corel">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="pouch" title={orderTitle} design={{ spec, data, hasPhoto: !!photo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in gồm mặt trước + mặt sau + đáy, lề xén 3mm, vạch mép hàn / khoá zip / cửa sổ / lỗ bế để xưởng canh. Chữ đã nằm gọn trong vùng an toàn, không lấn mép hàn.</p>
          </div>
        </div>
      )}

      {/* nguồn texture 3D (không vạch kỹ thuật) + tờ file in — ẩn */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={texFront}><PouchFaceSvg spec={spec} data={data} photo={photo} side="front" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBack}><PouchFaceSvg spec={spec} data={data} photo={photo} side="back" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef} data-testid="pc-sheet"><PouchSheetSvg spec={spec} data={data} photo={photo} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
