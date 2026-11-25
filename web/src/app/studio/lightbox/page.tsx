'use client';
// Hộp đèn quảng cáo: chọn loại (vẫy tròn 2 mặt · chữ nhật gắn tường · đứng vỉa hè 2 mặt) → mẫu theo ngành → điền tên quán,
// ngành, hotline → xem thành phẩm 3D ĐANG SÁNG buổi tối → tải file in đúng khổ (lề xén 5mm, đường cắt) hoặc gửi yêu cầu in.
// Render code 100%, logo khách tải lên chỉ nằm trên máy.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  LB_BLEED_MM, LB_FIELDS, LB_FONTS, LB_FONT_CSS, LB_INDUSTRIES, LB_KINDS, LB_LAYOUTS, LB_LIGHTS, LB_PALETTES,
  LightboxSvg, lbKind, lbMaterial, lbPalette, lbSize, materialsOf, sampleData, sizesOf, templatesOf, useLBFonts,
  type LBData, type LBIndustry, type LBKind, type LBSpec, type LBTemplate,
} from '@/lib/lightbox-engine';
import { svgFileBlob, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = templatesOf('round')[0].spec;

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

// màu quầng sáng: mặt sáng màu → chính màu nền; mặt tối → màu nhấn (phần phát sáng nhiều nhất)
const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };
function mix(a: string, b: string, t: number) {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(1 + i, 3 + i), 16)), pb = [0, 2, 4].map((i) => parseInt(b.slice(1 + i, 3 + i), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export default function LightboxPage() {
  const ready = useLBFonts();
  const [spec, setSpec] = useState<LBSpec>(FIRST);
  const [data, setData] = useState<LBData>(sampleData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printF = useRef<HTMLDivElement | null>(null), printB = useRef<HTMLDivElement | null>(null);
  const cutF = useRef<HTMLDivElement | null>(null), cutB = useRef<HTMLDivElement | null>(null);
  const texF = useRef<HTMLDivElement | null>(null), texB = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<LBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const sz = lbSize(spec.size);
  const pal = lbPalette(spec.palette);
  const kind = lbKind(spec.kind);
  const twoFaces = kind.faces === 2;
  const mat = lbMaterial(spec.material);
  const light = LB_LIGHTS.find((l) => l.id === spec.light)!;
  const slug = slugify(`hop-den-${data.brand || data.category || 'quan'}`, 'hop-den');

  const pickTemplate = (t: LBTemplate) => {
    setSpec((s) => ({ ...t.spec, size: s.kind === t.spec.kind ? s.size : t.spec.size, light: s.light, back: s.back,
      material: s.kind === t.spec.kind && materialsOf(t.spec.kind).some((m) => m.id === s.material) ? s.material : t.spec.material }));
    if (!dirty) setData(sampleData(t.spec.industry));
  };
  const setKind = (k: LBKind) => { if (k !== spec.kind) pickTemplate(templatesOf(k)[0]); };
  const setIndustry = (ind: LBIndustry) => { set({ industry: ind }); if (!dirty) setData(sampleData(ind)); };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const maxMm = Math.max(sz.wMm, sz.hMm) + LB_BLEED_MM * 2;
  const dpi = Math.max(72, Math.min(150, Math.floor(9000 / (maxMm / 25.4))));

  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => downloadBlob(await toBlob(await shot(1600, 1200)), `${slug}-3d.png`));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, LB_FONT_CSS, 1600), `${slug}-mat-truoc.png`);
  });
  const printPdf = async () => {
    const els = [svgOf(printF), twoFaces ? svgOf(printB) : null].filter(Boolean) as SVGSVGElement[];
    if (!els.length) throw new Error('Chưa dựng xong file in');
    return svgsToPrintPdf(els, LB_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, LB_BLEED_MM, dpi);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const f = svgOf(cutF); if (!f) return;
    if (!twoFaces) { downloadBlob(await svgFileBlob(f, LB_FONT_CSS), `${slug}-${sz.id}-file-in-cat.svg`); return; }
    const files = [];
    for (const [name, el] of [['mat-truoc', f], ['mat-sau', svgOf(cutB)]] as const) {
      if (!el) continue;
      files.push({ name: `${slug}-${sz.id}-${name}.svg`, data: new Uint8Array(await (await svgFileBlob(el, LB_FONT_CSS)).arrayBuffer()) });
    }
    downloadBlob(zipStore(files), `${slug}-${sz.id}-file-in-cat.zip`);
  });
  const makeFiles = async () => {
    const file = await printPdf();
    let preview: Blob;
    try { preview = await toBlob(await shot(1200, 900), 'image/jpeg', 0.85); } catch {
      preview = await svgToPng(svgOf(previewRef)!, LB_FONT_CSS, 1000, { watermark: false });
    }
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const glow = mix(lum(pal.bg) < 110 ? pal.acc : pal.bg, light.color, 0.35);
  const build3d = () => import('@/lib/lightbox-3d').then((m) => m.lightboxBuilder({
    kind: spec.kind, front: svgOf(texF), back: twoFaces ? svgOf(texB) : null, wMm: sz.wMm, hMm: sz.hMm, dMm: sz.dMm,
    frame: pal.frame, glow, light: light.color, gloss: mat.gloss, relief: spec.material === 'mica-hut', fontCss: LB_FONT_CSS,
  }));
  // QC: chụp 3D đúng góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __lbxSnap?: (w: number, h: number) => Promise<string> }).__lbxSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => {
    if (!f) return;
    try { setLogo(await fileToDataUrl(f)); } catch (e) { alert((e as Error).message); }
  };

  const tpls = templatesOf(spec.kind);
  const layouts = LB_LAYOUTS.filter((l) => l.kind === spec.kind);
  const fields = LB_FIELDS.filter((f) => f.key !== 'extra' || twoFaces || spec.kind === 'stand');
  const orderTitle = `${kind.name} ${sz.name} · ${mat.name} · ${light.name}`;
  const orderMat = spec.kind === 'round' ? 'Hộp đèn tròn treo vẫy' : mat.order;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const faceBox = (aspect: string) => ({ width: '100%', aspectRatio: aspect, maxHeight: '100%', filter: 'drop-shadow(0 8px 14px rgba(20,15,10,0.35))' });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp đèn quảng cáo" sub="Hộp đèn vẫy tròn, hộp đèn chữ nhật gắn tường, hộp đèn đứng vỉa hè — chữ to đọc từ xa. Xem thành phẩm 3D đang sáng buổi tối, tải file in đúng khổ hoặc đặt Mivy làm trọn gói." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {LB_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`lx-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {tpls.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.industry === t.spec.industry && spec.deco === t.spec.deco;
                  const ts = lbSize(t.spec.size);
                  const td = dirty ? data : sampleData(t.spec.industry);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="lx-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#3A332D] flex items-center justify-center p-2" style={{ aspectRatio: '4 / 3' }}>
                        <div style={{ height: '100%', aspectRatio: `${ts.wMm} / ${ts.hMm}`, maxWidth: '100%', filter: 'drop-shadow(0 0 10px rgba(255,236,200,0.35))' }}>
                          <LightboxSvg spec={{ ...t.spec, size: t.spec.size }} data={td} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
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
                  <div className="flex flex-wrap gap-1.5" data-testid="lx-industries">
                    {LB_INDUSTRIES.map((i) => <button key={i.id} type="button" onClick={() => setIndustry(i.id)} className={chip(spec.industry === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                {fields.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`lx-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`lx-${f.key}`} />}
                  </label>
                ))}
                <div className="col-span-2 flex items-center gap-2 flex-wrap">
                  <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer" data-testid="lx-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" data-testid="lx-logo" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !flex !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Không có logo → dùng biểu tượng ngành vẽ sẵn. Ảnh chỉ nằm trên máy anh/chị.</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, chất liệu, đèn, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="lx-sizes">
                    {sizesOf(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="lx-size">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Mặt đèn</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="lx-materials">
                    {materialsOf(spec.kind).map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`} data-testid={`lx-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Đèn LED</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="lx-lights">
                      {LB_LIGHTS.map((l) => <button key={l.id} type="button" onClick={() => set({ light: l.id })} className={chip(spec.light === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                  {twoFaces && (
                    <div>
                      <div className="mv-label mb-1.5">Mặt sau</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="lx-backs">
                        <button type="button" onClick={() => set({ back: 'same' })} className={chip(spec.back === 'same')} data-testid="lx-back-same">Giống mặt trước</button>
                        <button type="button" onClick={() => set({ back: 'info' })} className={chip(spec.back === 'info')} data-testid="lx-back-info">Dịch vụ + hotline</button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="lx-layouts">
                    {layouts.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="lx-palettes">
                    {LB_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.bg} 55%, ${p.acc} 55%)` }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="lx-fonts">
                    {LB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {f.upper ? (data.brand || 'An Khang').toLocaleUpperCase('vi') : (data.brand || 'An Khang')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg bg-[#2E2924] p-4 flex items-center justify-center gap-3'} style={{ aspectRatio: '4 / 3' }}>
              <div ref={previewRef} style={faceBox(`${sz.wMm} / ${sz.hMm}`)} data-testid="lx-preview">
                <LightboxSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
              {twoFaces && spec.back === 'info' && (
                <div style={faceBox(`${sz.wMm} / ${sz.hMm}`)} data-testid="lx-preview-back">
                  <LightboxSvg spec={spec} data={data} logo={logo} face="back" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kind.name} {sz.name} · sâu {sz.dMm / 10}cm · {mat.name} · {light.name} · {twoFaces ? '2 mặt' : '1 mặt'}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lx-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lx-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="lx-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in{twoFaces ? ' 2 mặt' : ''}
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lx-svg" title="Vector, chữ đã outline — lớp In + CutContour (đường cắt)">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt{twoFaces ? ' (.zip)' : ''}
              </button>
            </div>
            <PrintRequest product="lightbox" title={orderTitle} defaultMaterial={orderMat} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in đúng khổ thật {sz.name}, lề xén {LB_BLEED_MM}mm, {dpi}dpi (hộp đèn nhìn xa — đủ nét). Lớp <b>CutContour</b> là đường cắt
              {spec.kind === 'round' ? ' tròn' : ' chữ nhật'} của mặt {mat.name.toLowerCase()}. Xưởng lắp {light.name.toLowerCase()} bên trong, khung
              {spec.kind === 'stand' ? ' sắt sơn tĩnh điện + đế bánh xe' : ' nhôm/inox'}; Mivy lo thi công + lắp đặt (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printF} data-testid="lx-print"><LightboxSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={cutF} data-testid="lx-cut"><LightboxSvg spec={spec} data={data} logo={logo} mode="print" cut style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texF}><LightboxSvg spec={spec} data={data} logo={logo} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          {twoFaces && <>
            <div ref={printB} data-testid="lx-print-back"><LightboxSvg spec={spec} data={data} logo={logo} face="back" mode="print" style={{ width: '100%', display: 'block' }} /></div>
            <div ref={cutB}><LightboxSvg spec={spec} data={data} logo={logo} face="back" mode="print" cut style={{ width: '100%', display: 'block' }} /></div>
            <div ref={texB}><LightboxSvg spec={spec} data={data} logo={logo} face="back" mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          </>}
        </div>
      )}
    </div>
  );
}
