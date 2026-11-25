'use client';
// Thùng giao hàng sau xe máy: chọn mẫu theo ngành → điền tên quán, hotline, link QR → xem thùng 3D gắn trên đuôi xe
// → tải decal 4 mặt (sau · hông trái · hông phải · nắp) đúng khổ thật, lề xén + đường cắt bo góc, hoặc gửi yêu cầu in.
// Render code 100%, logo khách tải lên chỉ nằm trên máy.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  DB_BLEED_MM, DB_BOX_COLORS, DB_FACES, DB_FIELDS, DB_FONTS, DB_FONT_CSS, DB_INDUSTRIES, DB_LAYOUTS, DB_LID, DB_PALETTES, DB_SIZES, DB_TEMPLATES,
  DeliveryDecalSvg, dbPalette, dbSize, decalDims, sampleData, useDBFonts,
  type DBData, type DBFace, type DBIndustry, type DBSpec, type DBTemplate,
} from '@/lib/deliverybox-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { drawPrintPage, printPageDims } from '@/lib/print-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = DB_TEMPLATES[0].spec;
const FACE_FILE: Record<DBFace, string> = { back: 'mat-sau', left: 'hong-trai', right: 'hong-phai', top: 'nap' };

function fileToDataUrl(f: File, max = 900): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export default function DeliveryBoxPage() {
  const ready = useDBFonts();
  const [spec, setSpec] = useState<DBSpec>(FIRST);
  const [data, setData] = useState<DBData>(sampleData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const tex = useRef<Partial<Record<DBFace, HTMLDivElement | null>>>({});
  const cut = useRef<Partial<Record<DBFace, HTMLDivElement | null>>>({});
  const previewRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<DBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const sz = dbSize(spec.size);
  const pal = dbPalette(spec.palette);
  const boxColor = DB_BOX_COLORS.find((b) => b.id === spec.box)?.color ?? pal.box;
  const slug = slugify(`thung-giao-hang-${data.brand || 'quan'}`, 'thung-giao-hang');

  const pickTemplate = (t: DBTemplate) => {
    setSpec((s) => ({ ...t.spec, size: s.size, box: s.box, scooter: s.scooter }));
    if (!dirty) setData(sampleData(t.spec.industry));
  };
  const setIndustry = (ind: DBIndustry) => { set({ industry: ind }); if (!dirty) setData(sampleData(ind)); };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgIn = (el: HTMLDivElement | null | undefined) => (el?.querySelector('svg') as SVGSVGElement | null) ?? null;
  const svgOf = (r: RefObject<HTMLDivElement | null>) => svgIn(r.current);

  // PDF in: 4 trang (mỗi mặt đúng khổ decal, lề xén + vạch cắt), 200dpi — decal nhìn từ xa trên đường
  const printPdf = async () => {
    const { jsPDF } = await import('jspdf');
    let pdf: InstanceType<typeof jsPDF> | null = null;
    for (const f of DB_FACES) {
      const el = svgIn(cut.current[f.id]);
      if (!el) continue;
      const trim = { wMm: decalDims(sz, f.id).w, hMm: decalDims(sz, f.id).h };
      const { pageW, pageH } = printPageDims(trim, DB_BLEED_MM);
      const orientation = pageW >= pageH ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
      else pdf.addPage([pageW, pageH], orientation);
      const dpi = 200;
      const outW = Math.round(((trim.wMm + DB_BLEED_MM * 2) / 25.4) * dpi), outH = Math.round(((trim.hMm + DB_BLEED_MM * 2) / 25.4) * dpi);
      // bản in KHÔNG kèm nét cắt màu hồng (vạch cắt do trang PDF vẽ)
      const self = await selfContainedSvg(el, DB_FONT_CSS, { outline: true });
      self.querySelector('#CutContour')?.remove();
      const c = await svgToCanvas(self, outW, outH, '#ffffff');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      drawPrintPage(pdf as any, c.toDataURL('image/png'), outW, outH, trim, DB_BLEED_MM);
    }
    if (!pdf) throw new Error('Chưa dựng xong file in');
    return pdf.output('blob') as Blob;
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-decal-4-mat.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const files = [];
    for (const f of DB_FACES) {
      const el = svgIn(cut.current[f.id]); if (!el) continue;
      files.push({ name: `${slug}-${sz.id}-${FACE_FILE[f.id]}.svg`, data: new Uint8Array(await (await svgFileBlob(el, DB_FONT_CSS)).arrayBuffer()) });
    }
    downloadBlob(zipStore(files), `${slug}-${sz.id}-decal-in-cat.zip`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), type, q));
  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const download3d = () => run('3d', async () => downloadBlob(await toBlob(await shot(1600, 1200)), `${slug}-3d.png`));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, DB_FONT_CSS, 1600), `${slug}-mat-sau.png`);
  });
  const makeFiles = async () => {
    const file = await printPdf();
    let preview: Blob;
    try { preview = await toBlob(await shot(1200, 900), 'image/jpeg', 0.85); } catch {
      preview = await svgToPng(svgOf(previewRef)!, DB_FONT_CSS, 1000, { watermark: false });
    }
    return { file, fileName: `${slug}-${sz.id}-decal-4-mat.pdf`, preview };
  };

  const build3d = () => import('@/lib/deliverybox-3d').then((m) => m.deliveryBoxBuilder({
    W: sz.W, D: sz.D, H: sz.H, lid: DB_LID,
    faces: { back: svgIn(tex.current.back), left: svgIn(tex.current.left), right: svgIn(tex.current.right), top: svgIn(tex.current.top) },
    dims: { back: decalDims(sz, 'back'), side: decalDims(sz, 'left'), top: decalDims(sz, 'top') },
    boxColor, scooter: spec.scooter, fontCss: DB_FONT_CSS,
  }));
  // QC: chụp 3D đúng góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __dbSnap?: (w: number, h: number, view?: { az: number; el: number }) => Promise<string> }).__dbSnap = async (w, h, view) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h, { view })).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => {
    if (!f) return;
    try { setLogo(await fileToDataUrl(f)); } catch (e) { alert((e as Error).message); }
  };

  const orderTitle = `Thùng giao hàng ${sz.name} · decal 4 mặt · ${data.brand || ''}`.trim();
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const back = decalDims(sz, 'back');

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thùng giao hàng in logo" sub="Decal 4 mặt cho thùng giao hàng sau xe máy — tên quán, hotline chữ to đọc được giữa đường, QR đặt hàng. Xem thùng 3D gắn trên xe, tải file in đúng khổ hoặc đặt Mivy in + dán." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${DB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {DB_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.industry === t.spec.industry;
                  const td = dirty ? data : sampleData(t.spec.industry);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="db-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg flex items-center justify-center p-2" style={{ aspectRatio: '4 / 3', background: DB_BOX_COLORS.find((b) => b.id === spec.box)?.color ?? dbPalette(t.spec.palette).box }}>
                        <DeliveryDecalSvg spec={{ ...t.spec, size: spec.size }} data={td} face="back" logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="mv-label mb-1.5">Ngành (đổi biểu tượng)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="db-industries">
                    {DB_INDUSTRIES.map((i) => <button key={i.id} type="button" onClick={() => setIndustry(i.id)} className={chip(spec.industry === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                {DB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`db-in-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2 flex items-center gap-2 flex-wrap">
                  <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer" data-testid="db-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" data-testid="db-logo" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !flex !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Không có logo → dùng biểu tượng ngành vẽ sẵn. Ảnh chỉ nằm trên máy anh/chị.</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ thùng, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ thùng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="db-sizes">
                    {DB_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="db-size">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu thùng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="db-boxes">
                    {DB_BOX_COLORS.map((b) => (
                      <button key={b.id} type="button" onClick={() => set({ box: b.id })} className={`flex items-center gap-1.5 ${chip(spec.box === b.id)}`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-mv-hair" style={{ background: b.color ?? pal.box }} />{b.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="db-layouts">
                    {DB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu decal</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="db-palettes">
                    {DB_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.bg} 55%, ${p.acc} 55%)` }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="db-fonts">
                    {DB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {f.upper ? (data.brand || 'An Khang').toLocaleUpperCase('vi') : (data.brand || 'An Khang')}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={spec.scooter} onChange={(e) => set({ scooter: e.target.checked })} data-testid="db-scooter" />
                  Xem 3D gắn trên đuôi xe máy (bỏ chọn = thùng đặt dưới đất)
                </label>
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.size}|${spec.scooter}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg p-3 space-y-2'} style={{ background: boxColor }}>
              <div ref={previewRef} data-testid="db-preview">
                <DeliveryDecalSvg spec={spec} data={data} face="back" logo={logo} style={{ width: '100%', display: 'block' }} />
              </div>
              <div className="grid grid-cols-3 gap-2 items-start">
                {(['left', 'right', 'top'] as DBFace[]).map((f) => (
                  <div key={f}>
                    <DeliveryDecalSvg spec={spec} data={data} face={f} logo={logo} style={{ width: '100%', display: 'block' }} />
                    <div className="text-[10px] text-center mt-1" style={{ color: '#ffffffcc', textShadow: '0 1px 2px #0008' }}>{DB_FACES.find((x) => x.id === f)!.name}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Thùng {sz.name} · decal mặt sau {back.w / 10}×{back.h / 10}cm · hông {decalDims(sz, 'left').w / 10}×{decalDims(sz, 'left').h / 10}cm · nắp {decalDims(sz, 'top').w / 10}×{decalDims(sz, 'top').h / 10}cm</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="db-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="db-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="db-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in 4 mặt
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="db-svg" title="Vector, chữ đã outline — lớp In + CutContour (đường cắt bo góc)">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt (.zip)
              </button>
            </div>
            <PrintRequest product="deliverybox" title={orderTitle} defaultMaterial="Decal dán thùng giao hàng (bộ 4 mặt)" design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in đúng khổ decal từng mặt, lề xén {DB_BLEED_MM}mm, 200dpi. Lớp <b>CutContour</b> là đường cắt bo góc {14}mm — xưởng in decal PP
              cán màng chống nước/UV, bế theo đường cắt. Decal chừa mép 2,5cm và dải phản quang dưới đáy thùng.
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          {DB_FACES.map((f) => (
            <div key={f.id}>
              <div ref={(el) => { tex.current[f.id] = el; }} data-testid={`db-tex-${f.id}`}><DeliveryDecalSvg spec={spec} data={data} face={f.id} logo={logo} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
              <div ref={(el) => { cut.current[f.id] = el; }} data-testid={`db-cut-${f.id}`}><DeliveryDecalSvg spec={spec} data={data} face={f.id} logo={logo} mode="print" cut style={{ width: '100%', display: 'block' }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
