'use client';
// Bút bi in/khắc logo: chọn mẫu → loại bút (nhựa bấm, nắp đậy, kim loại, cảm ứng) → cách in (tampon / UV / laser) →
// điền tên công ty, website hoặc danh sách tên khắc riêng → xem 3 cây bút + hộp quà 3D → tải file in A4 tỉ lệ 1:1 / gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  PEN_FIELDS, PEN_FONTS, PEN_FONT_CSS, PEN_INKS, PEN_LAYOUTS, PEN_METHODS, PEN_MODELS, PEN_TEMPLATES,
  PenArtSvg, PenBoxLidSvg, PenFlatSvg, PenSheetSvg, bodiesFor, defaultPenData, lowContrast, parseNames, penBody,
  penInk, penModel, penSheetPages, usePenFonts, type PenData, type PenMethod, type PenModel, type PenSpec,
} from '@/lib/pen-engine';
import { logoToMask, type TPLogo } from '@/lib/tape-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PenSpec = PEN_TEMPLATES[0].spec;
const MM_PER_IN = 25.4;

// ảnh khách → dataURL thu nhỏ (giữ nguyên trên máy, không gửi đi)
async function fileToDataUrl(f: File, max = 900): Promise<string> {
  const src = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(fr.error); fr.readAsDataURL(f); });
  const im = new Image(); im.src = src; await im.decode();
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

export default function PenPage() {
  const ready = usePenFonts();
  const [spec, setSpec] = useState<PenSpec>(FIRST);
  const [data, setData] = useState<PenData>(defaultPenData());
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [logo, setLogo] = useState<TPLogo | null>(null);
  const [nameIdx, setNameIdx] = useState(0);
  const [edited, setEdited] = useState(false); // khách đã sửa chữ → đổi mẫu không ghi đè
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hidRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const flatRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  // logo → mặt nạ 1 màu (tampon / laser); UV dùng ảnh gốc đủ màu
  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    logoToMask(logoSrc, 150, false).then((l) => { if (on) setLogo(l); }).catch(() => { if (on) setLogo(null); });
    return () => { on = false; };
  }, [logoSrc]);

  const md = penModel(spec.model);
  const body = penBody(spec.body);
  const names = parseNames(data.names || '');
  const isName = spec.layout === 'name';
  const curName = isName ? names[Math.min(nameIdx, Math.max(0, names.length - 1))] : undefined;
  const pages = penSheetPages(spec, data);
  const set = (p: Partial<PenSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setEdited(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof PEN_TEMPLATES)[number]) => {
    setSpec(t.spec);
    // chưa sửa chữ → nạp chữ mẫu đúng mẫu (mẫu hội nghị có tên sự kiện riêng); đã sửa → giữ nguyên chữ của khách
    if (!edited) setData({ ...defaultPenData(), ...(t.sample || {}) });
  };
  const setModel = (m: PenModel) => setSpec((s) => {
    const def = penModel(m);
    const method: PenMethod = def.methods.includes(s.method) ? s.method : def.methods[0];
    const bodies = bodiesFor(m);
    const bodyId = bodies.some((b) => b.id === s.body) ? s.body : bodies[def.metal ? 1 : 0].id;
    return { ...s, model: m, method, body: bodyId, box: def.metal ? s.box : false };
  });
  const setInkCount = (n: number) => setSpec((s) => {
    const inks = s.inks.slice(0, n);
    for (const i of PEN_INKS) { if (inks.length >= n) break; if (!inks.includes(i.id) && !lowContrast(i.hex, penBody(s.body).hex)) inks.push(i.id); }
    return { ...s, inks };
  });
  const setInk = (slot: number, id: string) => setSpec((s) => { const inks = [...s.inks]; inks[slot] = id; return { ...s, inks }; });
  const slug = slugify(`but-${data.brand || ''}`, 'but-in-logo');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgsIn = (r: RefObject<HTMLDivElement | null>, sel: string) => Array.from(r.current?.querySelectorAll(sel) || []) as SVGSVGElement[];

  // PDF: mỗi tờ A4 1 trang, 300dpi, chữ đã outline
  const printPdf = async () => {
    const els = svgsIn(sheetRef, 'svg[data-page]');
    if (!els.length) throw new Error('Chưa dựng xong file in');
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const outW = Math.round((210 / MM_PER_IN) * 300), outH = Math.round((297 / MM_PER_IN) * 300);
    for (let i = 0; i < els.length; i++) {
      if (i > 0) pdf.addPage('a4', 'portrait');
      const c = await svgToCanvas(await selfContainedSvg(els[i], PEN_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    return pdf.output('blob');
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = svgsIn(sheetRef, 'svg[data-page]');
    if (els.length === 1) { downloadBlob(await svgFileBlob(els[0], PEN_FONT_CSS), `${slug}-file-in.svg`); return; }
    const enc = new TextEncoder();
    const files = await Promise.all(els.map(async (el, i) => ({ name: `${slug}-trang-${String(i + 1).padStart(2, '0')}.svg`, data: enc.encode(await (await svgFileBlob(el, PEN_FONT_CSS)).text()) })));
    downloadBlob(zipStore(files), `${slug}-file-in-${els.length}trang.zip`);
  });
  const downloadPng = () => run('png', async () => {
    const el = flatRef.current?.querySelector('svg') as SVGSVGElement | null; if (!el) return;
    downloadBlob(await svgToPng(el, PEN_FONT_CSS, 2400), `${slug}-mau.png`);
  });
  const snapJpeg = async () => {
    const c = await view3d.current!.snapshot(1200, 900);
    return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  };
  const download3d = () => run('3d', async () => {
    const c = await view3d.current!.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('lỗi ảnh'))), 'image/png')), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const flat = flatRef.current?.querySelector('svg') as SVGSVGElement;
    const [file, preview] = await Promise.all([printPdf(), view3d.current ? snapJpeg() : svgToPng(flat, PEN_FONT_CSS, 1200)]);
    return { file, fileName: `${slug}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/pen-3d').then((m) => m.penBuilder({
    model: spec.model, method: spec.method, body: spec.body, fontCss: PEN_FONT_CSS,
    barrels: svgsIn(hidRef, '[data-role="barrel"] > svg'),
    clip: spec.clipOn ? (hidRef.current?.querySelector('[data-role="clip"] > svg') as SVGSVGElement | null) : null,
    lid: spec.box && md.metal ? (hidRef.current?.querySelector('[data-role="lid"] > svg') as SVGSVGElement | null) : null,
  }));
  // hook cho QC (Playwright chụp ảnh 3D lớn ở góc mặc định) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __penSnap?: (w: number, h: number) => Promise<string> }).__penSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setLogoSrc(await fileToDataUrl(f));
  };

  const inkWarn = spec.method === 'pad' ? spec.inks.filter((i) => lowContrast(penInk(i).hex, body.hex)) : [];
  const method = PEN_METHODS.find((m) => m.id === spec.method)!;
  const orderTitle = `${md.name} · ${method.name.toLowerCase()} · thân ${body.name.toLowerCase()}${isName && names.length ? ` · khắc ${names.length} tên` : ''}`;
  const defaultMaterial = md.metal ? (spec.method === 'laser' ? 'Bút kim loại khắc laser' : 'Bút bi nhựa in UV đủ màu') : spec.method === 'uv' ? 'Bút bi nhựa in UV đủ màu' : 'Bút bi nhựa in logo 1 màu';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const texNames = isName ? [0, 1, 2, 3].map((i) => names[i] || names[i % Math.max(1, names.length)] || undefined) : [undefined];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bút bi in logo" sub="Bút nhựa bấm, bút hội nghị, bút kim loại, bút cảm ứng — in tampon, in UV hoặc khắc laser logo, website, tên riêng từng người. Xem 3D, tải file in tỉ lệ 1:1 chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PEN_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {PEN_TEMPLATES.map((t) => {
                  const on = JSON.stringify(t.spec) === JSON.stringify(spec);
                  const d = !edited && t.sample ? { ...defaultPenData(), ...t.sample } : data;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pen-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg px-2 py-3" style={{ background: 'linear-gradient(180deg,#F7F5F1,#E5E0D7)' }}>
                        <PenFlatSvg spec={t.spec} data={d} logo={logo} logoSrc={logoSrc} style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Loại bút & cách in">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Loại bút</div>
                  <div className="grid sm:grid-cols-2 gap-1.5" data-testid="pen-models">
                    {PEN_MODELS.map((m) => (
                      <button key={m.id} type="button" onClick={() => setModel(m.id)} className={`text-left ${chip(spec.model === m.id)}`}>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[10.5px] text-slate-400 font-normal">{m.blurb} · thân {m.barrel.w}×{m.barrel.h}mm</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Cách in</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pen-methods">
                    {md.methods.map((id) => { const m = PEN_METHODS.find((x) => x.id === id)!; return <button key={id} type="button" onClick={() => set({ method: id })} className={chip(spec.method === id)} title={m.note}>{m.name}</button>; })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{method.note}</div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu thân bút</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pen-bodies">
                    {bodiesFor(spec.model).map((b) => (
                      <button key={b.id} type="button" onClick={() => set({ body: b.id })} className={`flex items-center gap-2 ${chip(spec.body === b.id)}`}>
                        <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: b.finish === 'plastic' ? b.hex : `linear-gradient(135deg, ${b.hex}, #fff 55%, ${b.hex})` }} />{b.name}
                      </button>
                    ))}
                  </div>
                </div>
                {spec.method !== 'laser' && (
                  <div>
                    <div className="mv-label mb-1.5">{spec.method === 'pad' ? 'Số màu mực tampon (càng ít càng rẻ)' : 'Màu chữ chính & phụ'}</div>
                    {spec.method === 'pad' && (
                      <div className="flex flex-wrap gap-1.5 mb-2" data-testid="pen-inkcount">
                        {[1, 2].map((n) => <button key={n} type="button" onClick={() => setInkCount(n)} className={chip(spec.inks.length === n)}>{n} màu</button>)}
                      </div>
                    )}
                    <div className="space-y-2" data-testid="pen-inks">
                      {(spec.method === 'uv' ? [0, 1] : spec.inks.map((_, i) => i)).map((slot) => (
                        <div key={slot} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 w-14">{slot === 0 ? 'Màu 1' : 'Màu 2'}</span>
                          {PEN_INKS.map((i) => (
                            <button key={i.id} type="button" title={i.name} onClick={() => setInk(slot, i.id)}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${(spec.inks[slot] || spec.inks[0]) === i.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: i.hex }} />
                          ))}
                        </div>
                      ))}
                    </div>
                    {inkWarn.length > 0 && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500" data-testid="pen-ink-warn"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> Mực {inkWarn.map((i) => penInk(i).name.toLowerCase()).join(', ')} gần màu thân {body.name.toLowerCase()} — in ra sẽ khó đọc.</div>
                    )}
                  </div>
                )}
                {spec.method === 'laser' && <div className="text-[11px] text-slate-400">Khắc laser bóc lớp sơn lộ kim loại bên dưới — chữ hiện màu {spec.body === 'm-chrome' || spec.body === 'm-champ' ? 'xám đậm' : 'bạc sáng'}, không phai, không cần chọn màu mực.</div>}
                <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={spec.clipOn} onChange={(e) => set({ clipOn: e.target.checked })} data-testid="pen-clipon" /> In thêm trên kẹp bút ({md.clip.w}×{md.clip.h}mm)</label>
                  {md.metal && <label className="flex items-center gap-2"><input type="checkbox" checked={spec.box} onChange={(e) => set({ box: e.target.checked })} data-testid="pen-box" /> Kèm hộp quà (nắp in tên công ty)</label>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung in">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục thân bút</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pen-layouts">
                    {PEN_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {PEN_FIELDS.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} maxLength={f.key === 'hotline' ? 24 : 52} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pen-${f.key}`} />
                    </label>
                  ))}
                  {isName && (
                    <label className="block col-span-2">
                      <span className="mv-label block mb-1.5">Danh sách tên khắc riêng (mỗi dòng 1 cây) — {names.length} tên</span>
                      <textarea className="mv-input min-h-[110px]" value={data.names || ''} onChange={(e) => setField('names', e.target.value)} placeholder={'Quốc Bảo\nThu Hà\nGia Khánh'} data-testid="pen-names" />
                    </label>
                  )}
                  <div className="col-span-2">
                    <span className="mv-label block mb-1.5">Logo (tuỳ chọn) — {spec.method === 'uv' ? 'in UV giữ nguyên màu logo' : 'tự chuyển thành hình 1 màu để in tampon/khắc'}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg border border-mv-hair grid place-items-center overflow-hidden bg-white">
                        {logoSrc ? <img src={logoSrc} alt="" className="max-w-full max-h-full" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                      </div>
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logoSrc ? 'Đổi logo' : 'Tải logo lên'}</button>
                      {logoSrc && <button type="button" onClick={() => setLogoSrc('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ</button>}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="pen-logo" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Chưa có logo thì Mivy vẽ huy hiệu chữ cái đầu tên công ty.</div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pen-fonts">
                    {PEN_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length, logoSrc.length])} refitKey={`${spec.model}|${spec.box}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="pen-flat">
              <div ref={flatRef} className="rounded-lg px-3 py-4" style={{ background: 'linear-gradient(180deg,#F7F5F1,#E5E0D7)' }}>
                <PenFlatSvg spec={spec} data={data} name={curName} logo={logo} logoSrc={logoSrc} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Vùng in thân · {md.barrel.w}×{md.barrel.h}mm (phóng to)</div>
                <div className="rounded-lg bg-white p-2" data-testid="pen-barrel-preview">
                  <PenArtSvg spec={spec} data={data} area="barrel" name={curName} logo={logo} logoSrc={logoSrc} mode="view" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
              {spec.clipOn && (
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Vùng in kẹp · {md.clip.w}×{md.clip.h}mm</div>
                  <div className="rounded-lg bg-white p-2 w-2/3">
                    <PenArtSvg spec={{ ...spec, body: md.metal ? 'm-chrome' : spec.body }} data={data} area="clip" logo={logo} logoSrc={logoSrc} mode="view" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                </div>
              )}
              {isName && names.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  Xem tên:
                  {names.slice(0, 8).map((n, i) => <button key={i} type="button" onClick={() => setNameIdx(i)} className={chip(i === nameIdx)}>{n}</button>)}
                  {names.length > 8 && <span>+{names.length - 8}</span>}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="pen-summary" data-pages={pages.length}>
              {md.short} · {method.name.toLowerCase()} · thân {body.name.toLowerCase()}{isName ? ` · ${names.length} tên khắc riêng` : ''} · file in {pages.length} trang A4
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="pen-3d" title="Ảnh 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pen-png" title="Ảnh mẫu bút">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pen-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pen-svg" title="File vector tỉ lệ 1:1, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="pen" title={orderTitle} defaultMaterial={defaultMaterial} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in A4 tỉ lệ 1:1: vùng in thân + kẹp đúng kích thước thật, chữ đã outline{isName ? ', mỗi tên 1 dòng đánh số' : ''}. Bút nhựa in logo thường đặt từ 100 cây; bút kim loại khắc tên từ 10 cây.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: ảnh texture 3D + tờ file in A4 */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1600, pointerEvents: 'none' }}>
          <div ref={hidRef}>
            {texNames.map((n, i) => (
              <div key={i} data-role="barrel"><PenArtSvg spec={spec} data={data} area="barrel" name={n} logo={logo} logoSrc={logoSrc} mode="ink" style={{ width: 1600, display: 'block' }} /></div>
            ))}
            {spec.clipOn && <div data-role="clip"><PenArtSvg spec={spec} data={data} area="clip" logo={logo} logoSrc={logoSrc} mode="ink" style={{ width: 1200, display: 'block' }} /></div>}
            {spec.box && md.metal && <div data-role="lid"><PenBoxLidSvg data={data} logo={logo} /></div>}
          </div>
          <div ref={sheetRef} data-testid="pen-sheets">
            {pages.map((items, i) => (
              <PenSheetSvg key={i} spec={spec} data={data} items={items} page={i + 1} pages={pages.length} logo={logo} logoSrc={logoSrc} style={{ width: 800, display: 'block' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
