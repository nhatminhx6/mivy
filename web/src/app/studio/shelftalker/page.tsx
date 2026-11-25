'use client';
// Tem kệ · wobbler · shelf strip · tem giá · bảng treo trần (POSM tạp hoá / siêu thị / nhà thuốc / mẹ bé / mỹ phẩm / điện máy).
// Chọn mẫu → điền chữ (hoặc dán danh sách sản phẩm cho tem giá) → xem 3D trên kệ hàng → tải PNG, PDF tờ in, SVG in–cắt
// (lớp In + CutContour, chữ đã outline) hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  DAN_SHAPES, ST_FIELDS, ST_FONTS, ST_FONT_CSS, ST_INDUSTRIES, ST_KINDS, ST_PALETTES, ST_SAMPLES, ST_TEMPLATES, STRIP_H, STRIP_W,
  StSheetSvg, StSvg, TAG_SIZES, WOB_SHAPES, danShape, defaultStSpec, fmtPrice, parseItems, sheetInfo, stPalette, tagSize, useStFonts, wobShape,
  type Deco, type Industry, type StData, type StKind, type StSpec, type StTemplate,
} from '@/lib/shelftalker-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const MM_PER_IN = 25.4;
const DECOS: { id: Deco; name: string }[] = [{ id: 'rays', name: 'Tia nắng' }, { id: 'dots', name: 'Chấm halftone' }, { id: 'stripes', name: 'Sọc chéo' }, { id: 'confetti', name: 'Hoa giấy' }];
const MATERIAL: Record<StKind, string> = {
  wobbler: 'Wobbler giấy C300 + chân nhựa', strip: 'Tem kệ (shelf strip) couche', price: 'Tem kệ (shelf strip) couche', dangler: 'Wobbler giấy C300 + chân nhựa',
};

// đổi ngành: ô còn nguyên chữ mẫu ngành cũ → chữ mẫu ngành mới; ô khách tự viết thì giữ
function switchData(d: StData, from: Industry, to: Industry): StData {
  const oldS = ST_SAMPLES[from], next: StData = { ...ST_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

// nhiều tờ in (SVG đúng khổ) → 1 PDF nhiều trang, chữ outline
async function sheetsPdf(els: SVGSVGElement[], wMm: number, hMm: number, dpi: number): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const orientation = wMm >= hMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation, compress: true });
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  for (let i = 0; i < els.length; i++) {
    if (i) pdf.addPage([wMm, hMm], orientation);
    const c = await svgToCanvas(await selfContainedSvg(els[i], ST_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function ShelfTalkerPage() {
  const ready = useStFonts();
  const [spec, setSpec] = useState<StSpec>(defaultStSpec);
  const [data, setData] = useState<StData>({ ...ST_SAMPLES.grocery });
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [tagIdx, setTagIdx] = useState(0);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const oneRef = useRef<HTMLDivElement | null>(null);
  const sheetsRef = useRef<HTMLDivElement | null>(null);
  const r3d = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => parseItems(data.items), [data.items]);
  const si = sheetInfo(spec, data);
  const pal = stPalette(spec.palette);
  const slug = slugify(`posm-${data.brand || ''}`, 'tem-ke');
  const set = (p: Partial<StSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setIndustry = (ind: Industry) => { if (ind === spec.industry) return; setData((d) => switchData(d, spec.industry, ind)); set({ industry: ind }); };
  const pickTpl = (t: StTemplate) => {
    if (t.spec.industry !== spec.industry) setData((d) => switchData(d, spec.industry, t.spec.industry));
    setSpec((s) => ({ ...s, ...t.spec }));
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>, sel = 'svg') => r.current?.querySelector(sel) as SVGSVGElement | null;
  const sheetEls = () => Array.from(sheetsRef.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const pdfFile = async () => {
    const els = sheetEls(); if (!els.length) throw new Error('Chưa dựng xong tờ in');
    const dpi = spec.kind === 'price' ? 300 : spec.kind === 'strip' ? 200 : 220;
    return sheetsPdf(els, si.sw, si.sh, dpi);
  };
  const cutFile = async (): Promise<{ blob: Blob; name: string }> => {
    const els = sheetEls(); if (!els.length) throw new Error('Chưa dựng xong tờ in');
    const ser = async (el: SVGSVGElement) => {
      const c = await selfContainedSvg(el, ST_FONT_CSS, { outline: true });
      c.setAttribute('width', `${si.sw}mm`); c.setAttribute('height', `${si.sh}mm`);
      return new XMLSerializer().serializeToString(c);
    };
    if (els.length === 1) return { blob: new Blob([await ser(els[0])], { type: 'image/svg+xml' }), name: `${slug}-${spec.kind}-in-cat.svg` };
    const enc = new TextEncoder(), files: { name: string; data: Uint8Array }[] = [];
    for (let i = 0; i < els.length; i++) files.push({ name: `${slug}-${spec.kind}-${spec.kind === 'dangler' ? (i ? 'mat-sau' : 'mat-truoc') : `to-${i + 1}`}.svg`, data: enc.encode(await ser(els[i])) });
    return { blob: zipStore(files), name: `${slug}-${spec.kind}-${els.length}to-in-cat.zip` };
  };

  const downloadPng = () => run('png', async () => {
    const el = svgOf(oneRef); if (!el) return;
    downloadBlob(await svgToPng(el, ST_FONT_CSS, spec.kind === 'strip' ? 4000 : 1600), `${slug}-${spec.kind}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfFile(), `${slug}-${spec.kind}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => { const f = await cutFile(); downloadBlob(f.blob, f.name); });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(oneRef);
    if (!pv) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const file = await pdfFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, ST_FONT_CSS, 900))
      : await svgToJpeg(pv, ST_FONT_CSS, 900);
    return { file, fileName: `${slug}-${spec.kind}-file-in.pdf`, preview };
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __stSnap?: (w: number, h: number) => Promise<string> }).__stSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');

  const cutOf = (key: string, d: string, W: number, H: number, holes: { cx: number; cy: number; r: number }[] = []) => ({ el: r3d.current?.querySelector(`[data-r3d="${key}"] svg`) as SVGSVGElement | null, d, W, H, holes });
  const build3d = () => import('@/lib/shelftalker-3d').then((m) => {
    const ws = wobShape(spec.wob), ds = danShape(spec.dan), t = tagSize(spec.tag);
    return m.shelfBuilder({
      kind: spec.kind,
      wob: cutOf('wob', ws.d, ws.W, ws.H), danFront: cutOf('danF', ds.d, ds.W, ds.H, ds.holes), danBack: cutOf('danB', ds.d, ds.W, ds.H, ds.holes),
      strip: r3d.current?.querySelector('[data-r3d="strip"] svg') as SVGSVGElement | null, stripW: STRIP_W, stripH: STRIP_H,
      tags: Array.from(r3d.current?.querySelectorAll('[data-r3d="tag"] svg') || []) as SVGSVGElement[], tagW: t.w, tagH: t.h,
      fontCss: ST_FONT_CSS, industry: spec.industry, accent: pal.accent,
    });
  });

  const kindName = ST_KINDS.find((k) => k.id === spec.kind)?.name || '';
  const shapeName = spec.kind === 'wobbler' ? WOB_SHAPES.find((s) => s.id === spec.wob)?.name : spec.kind === 'dangler' ? DAN_SHAPES.find((s) => s.id === spec.dan)?.name : spec.kind === 'price' ? tagSize(spec.tag).name : `${STRIP_W / 10} × ${STRIP_H / 10}cm`;
  const orderTitle = `${kindName} · ${shapeName}${spec.kind === 'price' ? ` · ${items.length} tem` : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = ST_FIELDS.filter((f) => f.kinds.includes(spec.kind));
  const tplSorted = [...ST_TEMPLATES].sort((a, b) => Number(b.spec.kind === spec.kind) - Number(a.spec.kind === spec.kind));
  const curItem = items[Math.min(tagIdx, Math.max(0, items.length - 1))];
  const sheetPages = spec.kind === 'dangler' ? 2 : si.pages;

  const thumb = (t: StTemplate) => {
    const ts: StSpec = { ...spec, ...t.spec };
    const td = t.spec.industry === spec.industry ? data : switchData(data, spec.industry, t.spec.industry);
    if (ts.kind === 'strip') return <StSvg spec={ts} data={td} viewBox="0 0 250 39" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.22))' }} />;
    const s = ts.kind === 'price' ? { W: tagSize(ts.tag).w, H: tagSize(ts.tag).h } : ts.kind === 'dangler' ? danShape(ts.dan) : wobShape(ts.wob);
    return (
      <div style={{ width: s.W >= s.H ? '100%' : `${(s.W / s.H) * 100}%`, aspectRatio: `${s.W} / ${s.H}` }}>
        <StSvg spec={ts} data={td} transparent style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' }} />
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tem kệ · wobbler · tem giá" sub="POSM cho tạp hoá, minimart, nhà thuốc, mẹ & bé, mỹ phẩm, điện máy: wobbler lắc lư, dải shelf strip, tem giá hàng loạt (tự tính % giảm), bảng treo trần 2 mặt — file in–cắt chuẩn xưởng." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {ST_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => set({ kind: k.id })} data-testid={`st-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${ST_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {tplSorted.map((t) => {
                  const on = spec.kind === t.spec.kind && spec.palette === t.spec.palette && spec.industry === t.spec.industry
                    && (t.spec.kind !== 'wobbler' || spec.wob === t.spec.wob) && (t.spec.kind !== 'dangler' || spec.dan === t.spec.dan);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="st-tpl" data-kind={t.spec.kind} data-tpl={t.id}
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-3 aspect-square">{thumb(t)}</div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Ngành hàng (đổi chữ mẫu + hàng trên kệ 3D)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="st-industries">
                    {ST_INDUSTRIES.map((p) => <button key={p.id} type="button" onClick={() => setIndustry(p.id)} className={chip(spec.industry === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[150px] font-mono !text-[12px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`st-field-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`st-field-${f.key}`} />}
                    </label>
                  ))}
                </div>
                {spec.kind === 'price' && (
                  <div className="text-[11px] text-slate-400 leading-relaxed" data-testid="st-items-info">
                    {items.length} sản phẩm → {items.length} tem · {si.per} tem/tờ A4 → {si.pages} tờ. Giá cũ để trống = không gạch giá; % giảm tự tính
                    {items.some((x) => x.pct) ? ` (vd ${items.find((x) => x.pct)?.name}: ${fmtPrice(items.find((x) => x.pct)!.old)} → ${fmtPrice(items.find((x) => x.pct)!.now)}, -${items.find((x) => x.pct)?.pct}%)` : ''}.
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Hình, khổ, màu & font">
              <div className="space-y-4">
                {spec.kind === 'wobbler' && (
                  <div>
                    <div className="mv-label mb-1.5">Hình bế wobbler</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="st-wob-shapes">
                      {WOB_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ wob: s.id })} className={chip(spec.wob === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                )}
                {spec.kind === 'dangler' && (
                  <div>
                    <div className="mv-label mb-1.5">Hình bảng treo</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="st-dan-shapes">
                      {DAN_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ dan: s.id })} className={chip(spec.dan === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                )}
                {spec.kind === 'price' && (
                  <div>
                    <div className="mv-label mb-1.5">Khổ tem giá (cao 3,8cm vừa rãnh kệ)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="st-tag-sizes">
                      {TAG_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ tag: s.id })} className={chip(spec.tag === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                )}
                {(spec.kind === 'wobbler' || spec.kind === 'dangler') && (
                  <div>
                    <div className="mv-label mb-1.5">Nhấn mạnh</div>
                    <div className="flex gap-1.5" data-testid="st-focus">
                      <button type="button" onClick={() => set({ focus: 'value' })} className={chip(spec.focus === 'value')}>Con số (-30%)</button>
                      <button type="button" onClick={() => set({ focus: 'word' })} className={chip(spec.focus === 'word')}>Chữ chính (HOT, MỚI…)</button>
                    </div>
                  </div>
                )}
                {spec.kind !== 'price' && (
                  <div>
                    <div className="mv-label mb-1.5">Hoạ tiết nền</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="st-decos">
                      {DECOS.map((d) => <button key={d.id} type="button" onClick={() => set({ deco: d.id })} className={chip(spec.deco === d.id)}>{d.name}</button>)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="st-palettes">
                    {ST_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="st-fonts">
                    {ST_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={spec.kind} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-5 min-h-[220px]" data-testid="st-preview">
                {spec.kind === 'strip' ? (
                  <div className="w-full space-y-2">
                    <StSvg spec={spec} data={data} cut viewBox={`0 0 ${STRIP_W / 2} ${STRIP_H}`} style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 4px 10px rgba(15,23,42,0.25))' }} />
                    <div className="text-[10.5px] text-slate-500 text-center">Phóng to nửa dải · cả dải 100cm bên dưới</div>
                    <StSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} />
                  </div>
                ) : spec.kind === 'dangler' ? (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {(['front', 'back'] as const).map((side) => (
                      <div key={side}>
                        <StSvg spec={spec} data={data} side={side} cut style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 4px 10px rgba(15,23,42,0.25))' }} />
                        <div className="text-[10.5px] text-slate-500 text-center mt-1">Mặt {side === 'front' ? 'trước' : 'sau'}</div>
                      </div>
                    ))}
                  </div>
                ) : spec.kind === 'price' ? (
                  <div className="w-full space-y-2">
                    <div className="mx-auto" style={{ maxWidth: spec.tag === 't90' ? 340 : 260 }}>
                      {curItem && <StSvg spec={spec} data={data} item={curItem} cut style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 4px 10px rgba(15,23,42,0.25))' }} />}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                      <button type="button" className="mv-btn mv-btn-ghost !py-1 !px-2 !text-[11px]" onClick={() => setTagIdx((i) => Math.max(0, i - 1))}>‹</button>
                      Tem {Math.min(tagIdx, items.length - 1) + 1}/{items.length}
                      <button type="button" className="mv-btn mv-btn-ghost !py-1 !px-2 !text-[11px]" onClick={() => setTagIdx((i) => Math.min(items.length - 1, i + 1))}>›</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '70%' }}>
                    <StSvg spec={spec} data={data} cut style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.28))' }} />
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Tờ in {spec.kind === 'price' ? `A4 · ${si.pages} tờ` : spec.kind === 'strip' ? 'dải' : si.name} · nét hồng = đường bế (CutContour)</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto" style={{ maxWidth: spec.kind === 'strip' ? '100%' : 230 }} data-testid="st-sheet">
                  <StSheetSvg spec={spec} data={data} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kindName} · {shapeName} · {spec.kind === 'price' ? `${items.length} tem · ${si.per} tem/tờ A4` : spec.kind === 'strip' ? 'cài rãnh giá kệ' : `${si.per} con/tờ ${si.name}`}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="st-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="st-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG thiết kế
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="st-pdf" title="Tờ in xếp sẵn, chữ đã outline">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF tờ in ({sheetPages} trang)
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="st-svg" title="Lớp In + CutContour, chữ outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt
              </button>
            </div>
            <PrintRequest product="shelftalker" title={orderTitle} defaultMaterial={MATERIAL[spec.kind]} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in–cắt: lớp <b>In</b> (tràn lề) + <b>CutContour</b> (spot Magenta) — chữ đã outline, xưởng nạp thẳng máy in–cắt.
              {spec.kind === 'wobbler' && ' Wobbler in C300 cán màng, bế hình, gắn cần nhựa PVC trong dài ~12cm kẹp vào rãnh giá.'}
              {spec.kind === 'strip' && ' Dải 100×3,9cm cài vừa rãnh giá kệ tiêu chuẩn; mẫu lặp mỗi 25cm nên cắt ngắn vẫn đủ ý.'}
              {spec.kind === 'price' && ' Tem giá cao 3,8cm cài rãnh kệ; mỗi sản phẩm 1 tem, giá cũ gạch ngang, % giảm tự tính.'}
              {spec.kind === 'dangler' && ' Bảng treo in 2 mặt (tờ mặt sau đã đảo cột để khớp đường bế), đục lỗ Ø5mm treo dây cước.'}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={oneRef}>
            {spec.kind === 'price'
              ? (curItem && <StSvg spec={spec} data={data} item={curItem} style={{ width: '100%', display: 'block' }} />)
              : <StSvg spec={spec} data={data} transparent style={{ width: '100%', display: 'block' }} />}
          </div>
          <div ref={sheetsRef}>
            {spec.kind === 'dangler'
              ? (['front', 'back'] as const).map((side) => <div key={side}><StSheetSvg spec={spec} data={data} side={side} style={{ width: '100%', display: 'block' }} /></div>)
              : Array.from({ length: si.pages }, (_, i) => <div key={i}><StSheetSvg spec={spec} data={data} page={i} style={{ width: '100%', display: 'block' }} /></div>)}
          </div>
          {/* đủ bộ POSM cho cảnh 3D (cùng màu + chữ) */}
          <div ref={r3d}>
            <div data-r3d="wob"><StSvg spec={{ ...spec, kind: 'wobbler' }} data={data} transparent style={{ width: 600, display: 'block' }} /></div>
            <div data-r3d="danF"><StSvg spec={{ ...spec, kind: 'dangler' }} data={data} side="front" transparent style={{ width: 600, display: 'block' }} /></div>
            <div data-r3d="danB"><StSvg spec={{ ...spec, kind: 'dangler' }} data={data} side="back" transparent style={{ width: 600, display: 'block' }} /></div>
            <div data-r3d="strip"><StSvg spec={{ ...spec, kind: 'strip' }} data={data} style={{ width: 900, display: 'block' }} /></div>
            {items.slice(0, 4).map((it, i) => <div key={i} data-r3d="tag"><StSvg spec={{ ...spec, kind: 'price' }} data={data} item={it} style={{ width: 400, display: 'block' }} /></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
