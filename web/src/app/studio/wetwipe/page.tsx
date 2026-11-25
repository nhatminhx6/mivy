'use client';
// Khăn lạnh / khăn ướt in logo: chọn mẫu theo loại quán → điền tên quán, hotline → chọn khổ gói, giấy bạc/trắng,
// số màu in (flexo 1–2 màu hoặc in đủ màu), hương → xem gói khăn 3D trên bàn → tải file in khổ màng hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  WW_FIELDS, WW_FONTS, WW_FONT_CSS, WW_ICONS, WW_LAYOUTS, WW_MODES, WW_PALETTES, WW_PAPERS, WW_SCENTS, WW_SIZES, WW_TEMPLATES,
  WW_BLEED, WW_FIN, WW_LEGEND, WWFaceSvg, WWPrintSvg, sampleWWData, useWWFonts, wwMatName, wwPalette, wwPaper, wwSize,
  type WWData, type WWLogo, type WWMode, type WWSpec,
} from '@/lib/wetwipe-engine';
import { logoToMask } from '@/lib/tape-engine';
import { svgFileBlob, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: WWSpec = { ...WW_TEMPLATES[2].spec, size: 'c70', scent: 'lemon' };
const FIRST_USE = WW_TEMPLATES[2].use;

export default function WetwipePage() {
  const ready = useWWFonts();
  const [spec, setSpec] = useState<WWSpec>(FIRST);
  const [data, setData] = useState<WWData>(sampleWWData(FIRST_USE));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [logo, setLogo] = useState<WWLogo | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = wwSize(spec.size);
  const pal = wwPalette(spec.palette);
  // logo: in đủ màu giữ ảnh gốc; flexo → bóng 1 màu (mask) để in bằng 1 màu mực
  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    if (spec.mode === 0) {
      const im = new Image(); im.onload = () => { if (on) setLogo({ href: logoSrc, w: im.naturalWidth, h: im.naturalHeight, mask: false }); }; im.src = logoSrc;
    } else {
      logoToMask(logoSrc, 150, false).then((l) => { if (on) setLogo(l ? { ...l, mask: true } : null); }).catch(() => { if (on) setLogo(null); });
    }
    return () => { on = false; };
  }, [logoSrc, spec.mode]);

  const set = (p: Partial<WWSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof WW_TEMPLATES)[number]) => {
    set(t.spec);
    if (!dirty) setData(sampleWWData(t.use, sz.kind));
  };
  const pickSize = (id: string) => {
    const nk = wwSize(id).kind;
    set({ size: id });
    // đổi khăn lạnh ↔ khăn ướt: dòng ghi chú mặc định đổi theo
    setData((d) => {
      const def = sampleWWData('lau', nk === 'wet' ? 'cold' : 'wet').label;
      return d.label === def ? { ...d, label: sampleWWData('lau', nk).label } : d;
    });
  };
  const slug = slugify(`khan-lanh-${data.brand || ''}`, 'khan-lanh');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const webH = WW_FIN * 2 + sz.W * 2;
  const printW = sz.L + WW_BLEED * 2, printH = webH + WW_BLEED * 2 + WW_LEGEND;

  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    downloadBlob(await svgToPng(el, WW_FONT_CSS, 2000), `${slug}-mat-truoc.png`);
  });
  const printPdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    return svgToSizedPdf(el, WW_FONT_CSS, printW, printH, 300);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, WW_FONT_CSS), `${slug}-${sz.id}-file-in.svg`);
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
    const [file, preview] = await Promise.all([printPdf(), view3d.current ? snapJpeg() : svgToPng(svgOf(frontRef)!, WW_FONT_CSS, 1200)]);
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/wetwipe-3d').then((m) => m.wetwipeBuilder({
    front: svgOf(frontRef), back: svgOf(backRef), fontCss: WW_FONT_CSS, L: sz.L, W: sz.W, E: sz.E, paper: spec.paper, accent: pal.c1, bgHex: spec.mode === 0 ? pal.bg : null,
  }));
  // hook cho QC (Playwright chụp ảnh 3D lớn ở góc mặc định để soi) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __wwSnap?: (w: number, h: number) => Promise<string> }).__wwSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setLogoSrc(String(fr.result));
    fr.readAsDataURL(f);
  };

  const modeName = spec.mode === 0 ? 'in đủ màu' : `in ${spec.mode} màu`;
  const orderTitle = `${sz.kind === 'wet' ? 'Khăn ướt' : 'Khăn lạnh'} in logo ${sz.name.replace(/^Khăn (lạnh|ướt gói nhỏ) /, '')} · ${wwPaper(spec.paper).name.toLowerCase()} · ${modeName}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tableBg = 'linear-gradient(135deg,#6B4426 0%,#5A3820 55%,#4C2F1A 100%)';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Khăn lạnh in logo" sub="Khăn lạnh, khăn ướt gói nhỏ in tên quán — giấy bạc hoặc giấy trắng, in 1–2 màu hay đủ màu. Xem gói khăn 3D trên bàn, tải file in khổ màng chuẩn xưởng (hàn lưng, hàn răng cưa, vết xé)." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${WW_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {WW_TEMPLATES.map((t) => {
                  const on = (Object.keys(t.spec) as (keyof WWSpec)[]).every((k) => spec[k] === t.spec[k as keyof typeof t.spec]);
                  const ts: WWSpec = { ...spec, ...t.spec };
                  const td = dirty ? data : sampleWWData(t.use, sz.kind);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="ww-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden px-2 py-3" style={{ background: tableBg }}>
                        <div className="shadow-[0_3px_8px_rgba(0,0,0,0.4)]" style={{ aspectRatio: `${sz.L} / ${sz.W}` }}>
                          <WWFaceSvg spec={ts} data={td} logo={logo} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung in">
              <div className="grid grid-cols-2 gap-3">
                {WW_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`ww-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn){spec.mode !== 0 ? ' — in 1–2 màu nên logo tự chuyển thành hình 1 màu' : ''}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-mv-hair grid place-items-center overflow-hidden bg-white">
                      {logo ? <img src={logo.href} alt="" className="max-w-full max-h-full" style={logo.mask ? { filter: 'invert(1)' } : undefined} /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logoSrc ? 'Đổi logo' : 'Tải logo lên'}</button>
                      {logoSrc && <button type="button" onClick={() => setLogoSrc('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="ww-logo" />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ gói, giấy & màu in">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ gói</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ww-sizes">
                    {WW_SIZES.map((s) => <button key={s.id} type="button" onClick={() => pickSize(s.id)} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Giấy gói</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="ww-papers">
                      {WW_PAPERS.map((p) => (
                        <button key={p.id} type="button" onClick={() => set({ paper: p.id })} className={`flex items-center gap-2 ${chip(spec.paper === p.id)}`}>
                          <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: p.id === 'silver' ? 'linear-gradient(135deg,#EEF0F2,#B9BEC4 50%,#E3E6E9)' : p.hex }} />{p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Kiểu in</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="ww-modes">
                      {WW_MODES.map((m) => <button key={m.id} type="button" onClick={() => set({ mode: m.id as WWMode })} className={chip(spec.mode === m.id)}>{m.name}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ww-palettes">
                    {WW_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="flex"><span className="w-4 h-4 rounded-full" style={{ background: p.c1 }} /><span className="w-4 h-4 rounded-full -ml-1.5 border border-white/40" style={{ background: p.c2 }} /></span>{p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Bố cục</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="ww-layouts">
                      {WW_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Hình minh hoạ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="ww-icons">
                      {WW_ICONS.map((i) => <button key={i.id} type="button" onClick={() => set({ icon: i.id })} className={chip(spec.icon === i.id)}>{i.name}</button>)}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Hương khăn</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="ww-scents">
                      {WW_SCENTS.map((s) => <button key={s.id} type="button" onClick={() => set({ scent: s.id })} className={chip(spec.scent === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tên quán</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="ww-fonts">
                      {WW_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={spec.repeat || spec.layout === 'pattern'} disabled={spec.layout === 'pattern'} onChange={(e) => set({ repeat: e.target.checked })} data-testid="ww-repeat" />
                  Hoạ tiết tên quán lặp mờ trên nền
                </label>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length])} refitKey={spec.size} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="ww-flat">
              <div className="rounded-lg p-3 space-y-2.5" style={{ background: tableBg }}>
                <div className="text-[10px] uppercase tracking-wider text-white/60">Mặt trước</div>
                <div className="shadow-[0_3px_8px_rgba(0,0,0,0.4)]" style={{ aspectRatio: `${sz.L} / ${sz.W}` }} data-testid="ww-front">
                  <WWFaceSvg spec={spec} data={data} logo={logo} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">Mặt sau (đường giữa = mép hàn lưng)</div>
                <div className="shadow-[0_3px_8px_rgba(0,0,0,0.4)]" style={{ aspectRatio: `${sz.L} / ${sz.W}` }} data-testid="ww-back">
                  <WWFaceSvg spec={spec} data={data} logo={logo} side="back" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">File in · khổ màng trải phẳng {sz.L}×{webH} mm (đã gồm hàn lưng & lề xén)</div>
                <div className="rounded-lg bg-white p-1 overflow-hidden" data-testid="ww-print-preview">
                  <WWPrintSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {wwPaper(spec.paper).name.toLowerCase()} · {modeName}</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="ww-3d" title="Ảnh gói khăn 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ww-png" title="Ảnh mặt trước">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ww-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ww-svg" title="File vector, chữ đã outline — xưởng làm bản in">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="wetwipe" title={orderTitle} defaultMaterial={wwMatName(spec)} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in là khổ màng trải phẳng đúng kích thước, chữ đã outline, có vạch hàn lưng, hàn răng cưa 2 đầu và vết xé. Khăn lạnh in logo thường đặt từ 1.000–2.000 gói.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: mặt trước/sau phẳng (texture 3D, ảnh PNG) và file in */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1200, pointerEvents: 'none' }}>
          <div ref={frontRef} data-testid="ww-front-hidden"><WWFaceSvg spec={spec} data={data} logo={logo} side="front" flatPaper style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backRef} data-testid="ww-back-hidden"><WWFaceSvg spec={spec} data={data} logo={logo} side="back" flatPaper style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="ww-print"><WWPrintSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
