'use client';
// Hộp quà cứng cao cấp (rigid box): chọn kiểu (nắp rời / nam châm / ngăn kéo) + khổ → chọn mẫu → điền thương hiệu
// → xem thành phẩm 3D (ép kim ánh thật) → tải khuôn giấy bồi từng phần + khuôn ép kim + bảng cắt bìa, hoặc đặt in.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  RB_FIELDS, RB_FOILS, RB_FONTS, RB_FONT_CSS, RB_KINDS, RB_PALETTES, RB_SIZES, RB_TEMPLATES, RB_TRAYS, RB_TI, RB_BLEED,
  RBBoardSheet, RBFaceSvg, RBPartSvg, defaultRBData, rbBoards, rbFaces, rbFoil, rbGeom, rbPalette, rbParts, rbSize, trayColor,
  useRBFonts, type RBData, type RBKind, type RBSpec,
} from '@/lib/rigidbox-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: RBSpec = { kind: 'lid', size: 'tet', palette: 'red', layout: 'tet', font: 'playfair', foil: 'gold', tray: 'auto', ribbon: true, logoFoil: true };
const MATERIAL: Record<RBKind, string> = { lid: 'Hộp cứng nắp rời bồi giấy mỹ thuật', magnet: 'Hộp nam châm (nắp gập)', drawer: 'Hộp ngăn kéo (trượt)' };

async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

/** nhiều trang khác khổ → 1 PDF (khuôn giấy bồi đúng khổ thật, chữ outline) */
async function sheetsPdf(pages: { el: SVGSVGElement; wMm: number; hMm: number; dpi: number; png?: boolean }[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any = null;
  for (const pg of pages) {
    const o = pg.wMm >= pg.hMm ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pg.wMm, pg.hMm], orientation: o, compress: true });
    else pdf.addPage([pg.wMm, pg.hMm], o);
    const outW = Math.round((pg.wMm / 25.4) * pg.dpi), outH = Math.round((pg.hMm / 25.4) * pg.dpi);
    const c = await svgToCanvas(await selfContainedSvg(pg.el, RB_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    if (pg.png) pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, pg.wMm, pg.hMm, undefined, 'FAST');
    else pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pg.wMm, pg.hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function RigidBoxPage() {
  const ready = useRBFonts();
  const [spec, setSpec] = useState<RBSpec>(FIRST);
  const [data, setData] = useState<RBData>(defaultRBData());
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [partSel, setPartSel] = useState(0);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const facesRef = useRef<HTMLDivElement | null>(null);
  const partsRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<RBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const sz = rbSize(spec.size);
  const g = rbGeom(spec);
  const parts = useMemo(() => rbParts(spec), [spec]);
  const faces = useMemo(() => rbFaces(spec), [spec]);
  const boards = rbBoards(spec);
  const foil = rbFoil(spec.foil);
  const hasFoil = foil.id !== 'none';
  const kind = RB_KINDS.find((k) => k.id === spec.kind)!;
  const slug = slugify(`hop-qua-${data.brand || ''}`, 'hop-qua');
  useEffect(() => { if (partSel >= parts.length) setPartSel(0); }, [parts.length, partSel]);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const q = (root: HTMLElement | null, sel: string) => root?.querySelector(sel) as SVGSVGElement | null;
  const faceSvg = (key: string, mode: 'color' | 'mask') => q(facesRef.current, `[data-face="${key}"][data-mode="${mode}"] svg`);
  const partSvg = (id: string, mode: 'color' | 'print-mask') => q(partsRef.current, `[data-pid="${id}"][data-mode="${mode}"] svg`);

  const build3d = () => import('@/lib/rigidbox-3d').then((m) => {
    const fs: Record<string, { color: SVGSVGElement | null; mask: SVGSVGElement | null }> = {};
    for (const f of rbFaces(spec)) fs[f.key] = { color: faceSvg(f.key, 'color'), mask: hasFoil ? faceSvg(f.key, 'mask') : null };
    const p = rbPalette(spec.palette);
    return m.rigidBoxBuilder({
      kind: spec.kind, W: g.W, D: g.D, H: g.H, T: g.T, lidH: g.lidH, base: g.base, tray: g.tray,
      paper: p.paper, trayColor: trayColor(spec), foilColor: hasFoil ? foil.color : null,
      ribbonColor: hasFoil ? foil.lo : p.band, shimmer: !!p.shimmer, product: sz.product, ribbon: spec.ribbon || spec.kind === 'drawer',
      fontCss: RB_FONT_CSS, faces: fs,
    });
  });

  // trang PDF: từng khuôn giấy bồi + khuôn ép kim + bảng cắt bìa
  const pdfPages = () => {
    const pages: { el: SVGSVGElement; wMm: number; hMm: number; dpi: number; png?: boolean }[] = [];
    for (const p of parts) {
      const el = partSvg(p.id, 'color'); if (!el) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
      const dpi = Math.max(120, Math.min(200, Math.floor(9000 / (Math.max(p.W, p.H) / 25.4))));
      pages.push({ el, wMm: p.W, hMm: p.H, dpi });
      if (hasFoil && p.foil) { const mk = partSvg(p.id, 'print-mask'); if (mk) pages.push({ el: mk, wMm: p.W, hMm: p.H, dpi, png: true }); }
    }
    const bs = q(boardRef.current, 'svg'); if (bs) pages.push({ el: bs, wMm: 210, hMm: 297, dpi: 200 });
    return pages;
  };
  const pageCount = parts.length + (hasFoil ? parts.filter((p) => p.foil).length : 0) + 1;
  const makePdf = () => sheetsPdf(pdfPages());

  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${spec.kind}-${sz.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const enc = new TextEncoder();
    const files: { name: string; data: Uint8Array }[] = [];
    for (const p of parts) {
      const el = partSvg(p.id, 'color'); if (!el) continue;
      files.push({ name: `${slug}-${p.id}-giay-boi.svg`, data: enc.encode(await (await svgFileBlob(el, RB_FONT_CSS)).text()) });
      if (hasFoil && p.foil) { const mk = partSvg(p.id, 'print-mask'); if (mk) files.push({ name: `${slug}-${p.id}-khuon-ep-kim.svg`, data: enc.encode(await (await svgFileBlob(mk, RB_FONT_CSS)).text()) }); }
    }
    downloadBlob(zipStore(files), `${slug}-${spec.kind}-${sz.id}-khuon.zip`);
  });
  const downloadTop = () => run('png', async () => {
    const el = q(topRef.current, 'svg'); if (!el) return;
    downloadBlob(await svgToPng(el, RB_FONT_CSS, 2000), `${slug}-mat-nap.png`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png')), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await makePdf();
    let preview: Blob;
    try {
      if (!view3d.current) throw new Error('no 3d');
      const c = await view3d.current.snapshot(1200, 900);
      preview = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('x'))), 'image/jpeg', 0.86));
    } catch {
      const el = q(topRef.current, 'svg'); if (!el) throw new Error('Chưa dựng xong mẫu');
      preview = await svgToJpeg(el, RB_FONT_CSS, 900);
    }
    return { file, fileName: `${slug}-${spec.kind}-${sz.id}-file-in.pdf`, preview };
  };

  // hook QC (dev): chụp 3D ở góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __rbSnap?: (w: number, h: number) => Promise<string> }).__rbSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo'); } };
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `${kind.name} ${sz.name} · ${rbPalette(spec.palette).name} · ${foil.name}`;
  const curPart = parts[Math.min(partSel, parts.length - 1)];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp quà cứng cao cấp" sub="Hộp nắp rời, hộp nam châm, hộp ngăn kéo — bìa cứng 2mm bồi giấy in, ép kim. Xem thành phẩm 3D, tải khuôn giấy bồi + khuôn ép kim + bảng cắt bìa gửi xưởng." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {RB_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => set({ kind: k.id })} data-testid={`rb-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${RB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {RB_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.foil === t.spec.foil;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="rb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: `${g.W} / ${g.D}` }}>
                        <RBFaceSvg role="top" w={g.W} h={g.D} spec={{ ...spec, ...t.spec }} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thương hiệu & lời chúc">
              <div className="grid grid-cols-2 gap-3">
                {RB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`rb-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn — ảnh nằm trên máy anh, không gửi đi)</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} data-testid="rb-logo" />
                    </label>
                    {logo && (
                      <>
                        <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded bg-white border border-mv-hair" />
                        <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ</button>
                        <label className="flex items-center gap-1.5 text-xs text-slate-300">
                          <input type="checkbox" checked={spec.logoFoil} onChange={(e) => set({ logoFoil: e.target.checked })} /> Ép kim logo (phần tối của logo)
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, màu & ép kim">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ hộp (dài × rộng × cao, cm)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-sizes">
                    {RB_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Giấy bồi</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="rb-palettes">
                    {RB_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: p.paper }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Ép kim</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-foils">
                    {RB_FOILS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ foil: f.id })} className={`flex items-center gap-2 ${chip(spec.foil === f.id)}`}>
                        {f.color && <span className="w-4 h-4 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${f.lo}, ${f.hi}, ${f.color})` }} />}
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font thương hiệu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="rb-fonts">
                    {RB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {data.brand || 'An Khang'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Lót khay trong</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-trays">
                    {RB_TRAYS.map((t) => (
                      <button key={t.id} type="button" onClick={() => set({ tray: t.id })} className={`flex items-center gap-2 ${chip(spec.tray === t.id)}`}>
                        <span className="w-4 h-4 rounded-full shrink-0 border border-mv-hair" style={{ background: t.color || rbPalette(spec.palette).tray }} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={spec.ribbon || spec.kind === 'drawer'} disabled={spec.kind === 'drawer'} onChange={(e) => set({ ribbon: e.target.checked })} data-testid="rb-ribbon" />
                  Dây ruy băng kéo {spec.kind === 'drawer' ? '(ngăn kéo luôn có)' : '(nhấc khay lót)'}
                </label>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Bảng cắt bìa xám 2mm">
              <table className="w-full text-xs text-slate-300" data-testid="rb-boards">
                <thead><tr className="text-left text-slate-400"><th className="py-1">Bộ phận</th><th>Tấm</th><th>Kích thước (mm)</th><th className="text-right">SL</th></tr></thead>
                <tbody>
                  {boards.map((b, i) => <tr key={i} className="border-t border-mv-hair"><td className="py-1">{b.part}</td><td>{b.name}</td><td>{b.w} × {b.h}</td><td className="text-right">{b.n}</td></tr>)}
                </tbody>
              </table>
              <p className="text-[11px] text-slate-500 mt-2">Giấy bồi gấp vào trong {RB_TI}mm qua mép bìa, lề xén {RB_BLEED}mm. File PDF có đủ khuôn từng phần{hasFoil ? ' + khuôn ép kim' : ''} + trang bảng cắt này.</p>
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
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="text-[11px] text-slate-400">Mặt nắp</div>
              <div ref={topRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${g.W} / ${g.D}` }} data-testid="rb-top">
                <RBFaceSvg role="top" w={g.W} h={g.D} spec={spec} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parts.map((p, i) => <button key={p.id} type="button" onClick={() => setPartSel(i)} className={chip(i === partSel)} data-testid="rb-part-btn">{p.name}</button>)}
              </div>
              {curPart && (
                <div className="rounded-lg overflow-hidden bg-white border border-mv-hair" data-testid="rb-dieline">
                  <RBPartSvg part={curPart} spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              )}
              <div className="text-[10px] text-slate-500">Nét hồng = cắt · nét xanh đứt = gấp · {curPart?.note}</div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kind.name} · {sz.name} · {foil.name}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-3d">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadTop} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt nắp
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="rb-pdf" data-pages={pageCount}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({pageCount} trang)
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-svg" title="Khuôn vector, chữ đã outline — xưởng mở bằng AI/Corel">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG khuôn (.zip)
              </button>
            </div>
            <PrintRequest product="rigidbox" title={orderTitle} defaultMaterial={MATERIAL[spec.kind]} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Xưởng bế bìa xám 2mm theo bảng cắt, in giấy bồi theo khuôn (gấp vào trong {RB_TI}mm), ép kim theo khuôn ép. Mivy tìm xưởng, báo giá qua Zalo, in mẫu duyệt trước khi chạy số lượng.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: mặt hộp cho 3D + khuôn giấy bồi đúng khổ + bảng cắt */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={facesRef}>
            {faces.map((f) => (
              <div key={f.key}>
                <div data-face={f.key} data-mode="color"><RBFaceSvg role={f.role} w={f.w} h={f.h} spec={spec} data={data} logo={logo} style={{ width: 400, display: 'block' }} /></div>
                {hasFoil && <div data-face={f.key} data-mode="mask"><RBFaceSvg role={f.role} w={f.w} h={f.h} spec={spec} data={data} logo={logo} mode="mask" style={{ width: 400, display: 'block' }} /></div>}
              </div>
            ))}
          </div>
          <div ref={partsRef}>
            {parts.map((p) => (
              <div key={p.id}>
                <div data-pid={p.id} data-mode="color"><RBPartSvg part={p} spec={spec} data={data} logo={logo} style={{ width: 800, display: 'block' }} /></div>
                {hasFoil && p.foil && <div data-pid={p.id} data-mode="print-mask"><RBPartSvg part={p} spec={spec} data={data} logo={logo} mode="print-mask" style={{ width: 800, display: 'block' }} /></div>}
              </div>
            ))}
          </div>
          <div ref={boardRef}><RBBoardSheet spec={spec} data={data} style={{ width: 600, display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
