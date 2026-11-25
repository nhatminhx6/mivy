'use client';
// Biển công ty / biển phòng ban / biển số: chọn loại → mẫu → điền thông tin → vật liệu (mica chữ nổi, alu xước,
// inox ăn mòn, gỗ khắc) → xem thành phẩm 3D gắn tường → tải file in–cắt đúng khổ (lớp In, ChuNoi, CutContour, Khoan)
// hoặc gửi yêu cầu in. Render code 100%, logo khách tải lên chỉ nằm trên máy.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  PL_BLEED_MM, PL_FIELDS, PL_FONTS, PL_FONT_CSS, PL_KINDS, PL_LAYOUTS, PL_LETTERS, PL_MATERIALS, PL_PALETTES,
  PlaqueSvg, ROOM_EN_DEFAULT, defaultPLData, plGeom, plMaterial, plPalette, plSize, sizesOf, templatesOf, usePLFonts,
  type PLData, type PLKind, type PLSpec,
} from '@/lib/plaque-engine';
import { svgFileBlob, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = templatesOf('company')[0].spec;

// ảnh khách → dataURL thu nhỏ (chỉ trên máy, không gửi đi đâu)
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

export default function PlaquePage() {
  const ready = usePLFonts();
  const [spec, setSpec] = useState<PLSpec>(FIRST);
  const [data, setData] = useState<PLData>(defaultPLData());
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<PLSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const sz = plSize(spec.size);
  const geom = plGeom(spec.kind, spec.size);
  const mat = plMaterial(spec.material);
  const pal = plPalette(spec.palette);
  const slug = slugify(`bien-${data.brand || data.room || data.number || 'cong-ty'}`, 'bien');

  const setKind = (k: PLKind) => {
    if (k === spec.kind) return;
    setSpec(templatesOf(k)[0].spec);
    if (k === 'room' && (data.en || '') === defaultPLData().en) setField('en', ROOM_EN_DEFAULT);
    if (k === 'company' && data.en === ROOM_EN_DEFAULT) setField('en', defaultPLData().en);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const W2 = sz.wMm + PL_BLEED_MM * 2, H2 = sz.hMm + PL_BLEED_MM * 2;
  const dpi = Math.max(100, Math.min(300, Math.floor(9000 / (Math.max(W2, H2) / 25.4))));

  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const download3d = () => run('3d', async () => {
    const c = await shot(1600, 1200);
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, PL_FONT_CSS, 1600), `${slug}-xem-truoc.png`);
  });
  const printPdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    return svgToSizedPdf(el, PL_FONT_CSS, W2, H2, dpi);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, PL_FONT_CSS), `${slug}-${sz.id}-file-in-cat.svg`);
  });
  const makeFiles = async () => {
    const file = await printPdf();
    let preview: Blob;
    try {
      const c = await shot(1200, 900);
      preview = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/jpeg', 0.85));
    } catch {
      const el = svgOf(previewRef)!; preview = await svgToPng(el, PL_FONT_CSS, 1000, { watermark: false });
    }
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/plaque-3d').then((m) => m.plaqueBuilder({
    tex: svgOf(texRef), kind: spec.kind, material: spec.material, letter: spec.letter,
    inkColor: spec.material === 'mica' ? pal.fg : pal.inkM, geom, fontCss: PL_FONT_CSS,
  }));
  // QC: chụp 3D đúng góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __plSnap?: (w: number, h: number) => Promise<string> }).__plSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => {
    if (!f) return;
    try { setLogo(await fileToDataUrl(f)); } catch (e) { alert((e as Error).message); }
  };

  const tpls = templatesOf(spec.kind);
  const fields = PL_FIELDS.filter((f) => f.kinds.includes(spec.kind));
  const layouts = PL_LAYOUTS.filter((l) => l.kind === spec.kind);
  const kindName = PL_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `${kindName} ${sz.name} · ${mat.name}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const thumbW = 'calc(100% - 12px)';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Biển công ty · văn phòng" sub="Biển tên công ty, biển phòng ban, biển số — mica chữ nổi, alu xước, inox ăn mòn, gỗ khắc. Xem thành phẩm 3D gắn tường, tải file in–cắt đúng khổ (có lỗ ốc pát) hoặc đặt Mivy làm." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {PL_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`pl-kind-${k.id}`}>{k.name}</button>
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
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.material === t.spec.material;
                  const ts = plSize(t.spec.size);
                  return (
                    <button key={t.id} type="button" onClick={() => setSpec(t.spec)} data-testid="pl-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#ECE7DE] flex items-center justify-center p-1.5" style={{ aspectRatio: '4 / 3' }}>
                        <div style={{ width: thumbW, aspectRatio: `${ts.wMm} / ${ts.hMm}`, maxHeight: '100%', filter: 'drop-shadow(0 4px 6px rgba(40,30,20,0.25))' }}>
                          <PlaqueSvg spec={t.spec} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin">
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pl-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2 flex items-center gap-2 flex-wrap">
                  <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer" data-testid="pl-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" data-testid="pl-logo" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !flex !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Không có logo → tự vẽ logo chữ từ tên viết tắt. Ảnh chỉ nằm trên máy anh/chị.</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Vật liệu, bố cục, màu & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Vật liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="pl-materials">
                    {PL_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`} data-testid={`pl-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {spec.material === 'mica' && (
                  <div>
                    <div className="mv-label mb-1.5">Chữ nổi</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pl-letters">
                      {PL_LETTERS.map((l) => <button key={l.id} type="button" onClick={() => set({ letter: l.id })} className={chip(spec.letter === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pl-layouts">
                    {layouts.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu {spec.material !== 'mica' && <span className="font-normal text-slate-500">(màu mực / sơn trên {spec.material === 'wood' ? 'gỗ — khắc laser luôn nâu cháy' : 'kim loại'})</span>}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="pl-palettes">
                    {PL_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: spec.material === 'mica' ? p.bg : p.inkM }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="pl-fonts">
                    {PL_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {(data.brand || 'AN KHANG').toLocaleUpperCase('vi')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pl-sizes">
                    {sizesOf(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="pl-size">{s.name}</button>)}
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
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg bg-[#ECE7DE] p-4 flex items-center justify-center'} style={{ aspectRatio: '4 / 3' }}>
              <div ref={previewRef} style={{ width: '100%', aspectRatio: `${sz.wMm} / ${sz.hMm}`, maxHeight: '100%', filter: 'drop-shadow(0 8px 14px rgba(40,30,20,0.28))' }} data-testid="pl-preview">
                <PlaqueSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {mat.name} · {geom.holes.length} ốc pát Ø{geom.capD}mm · file in lề xén {PL_BLEED_MM}mm</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pl-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pl-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG xem trước
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pl-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pl-svg" title="Vector, chữ đã outline — lớp In, ChuNoi (chữ mica cắt rời), CutContour, Khoan">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt
              </button>
            </div>
            <PrintRequest product="plaque" title={orderTitle} defaultMaterial={spec.material === 'mica' ? 'Mica + chữ nổi, đinh treo inox' : spec.material === 'alu' ? 'Alu xước in UV' : spec.material === 'wood' ? 'Chưa biết — tư vấn giúp' : 'Inox ăn mòn'} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in đúng khổ thật: lớp <b>In</b>{spec.material === 'mica' ? ' (nền in mặt sau mica)' : ' (chỉ phần mực — nền là vật liệu)'}
              {spec.material === 'mica' && <>, <b>ChuNoi</b> (chữ mica cắt rời dán nổi)</>}, <b>CutContour</b> (đường cắt tấm), <b>Khoan</b> (lỗ ốc pát Ø{geom.drill}mm). Mivy gửi xưởng gia công + lắp đặt (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="pl-print"><PlaqueSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          <div ref={texRef}><PlaqueSvg spec={spec} data={data} logo={logo} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
