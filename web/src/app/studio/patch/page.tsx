'use client';
// Patch thêu · huy hiệu vải: chọn mẫu (CLB, đồng phục, trường lớp, du lịch, icon cute, chữ ký) → điền chữ / logo →
// chọn loại (thêu ≤8 màu chỉ · in chuyển nhiệt · PVC dẻo), hình (tròn, khiên, chữ nhật, ô van, cắt theo dáng), viền
// (vắt sổ / cắt nóng), đế (ủi / dán gai / may) → xem 3D trên áo denim → tải phiếu sản xuất PDF (1:1 + bảng màu chỉ),
// SVG in–cắt (In + CutContour, chữ đã outline), PNG.

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  PT_BACKINGS, PT_BORDERS, PT_FIELDS, PT_FONTS, PT_FONT_CSS, PT_ICONS, PT_KINDS, PT_LAYOUTS, PT_PALETTES, PT_SAMPLES, PT_SHAPES, PT_TEMPLATES,
  PatchSpecSheet, PatchSvg, borderAllowed, defaultPtSpec, ptAnalyze, ptKind, ptPalette, ptShape, sampleOf, threadName, usePtFonts,
  type PtData, type PtLayout, type PtSpec, type PtTemplate,
} from '@/lib/patch-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

async function readImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 700 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
/** logo → chỉ dùng các màu chỉ cho phép (gần nhất); nền trắng/trong suốt bỏ */
async function quantize(src: string, colors: string[]): Promise<string> {
  const im = new Image(); im.src = src; await im.decode();
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const pal = colors.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  for (let i = 0; i < p.length; i += 4) {
    const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    if (p[i + 3] < 110 || l > 236) { p[i + 3] = 0; continue; }
    let best = 0, bd = Infinity;
    pal.forEach((q, j) => { const dd = (q[0] - p[i]) ** 2 + (q[1] - p[i + 1]) ** 2 + (q[2] - p[i + 2]) ** 2; if (dd < bd) { bd = dd; best = j; } });
    [p[i], p[i + 1], p[i + 2]] = pal[best]; p[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}

export default function PatchPage() {
  const ready = usePtFonts();
  const [spec, setSpec] = useState<PtSpec>(defaultPtSpec);
  const [data, setData] = useState<PtData>(() => sampleOf(PT_TEMPLATES[0]));
  const [logoRaw, setLogoRaw] = useState('');
  const [logoQ, setLogoQ] = useState('');
  const [qty, setQty] = useState(100);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [tplId, setTplId] = useState(PT_TEMPLATES[0].id);
  const refs = { art: useRef<HTMLDivElement | null>(null), tex: useRef<HTMLDivElement | null>(null), satin: useRef<HTMLDivElement | null>(null), fill: useRef<HTMLDivElement | null>(null), elem: useRef<HTMLDivElement | null>(null), print: useRef<HTMLDivElement | null>(null), sheet: useRef<HTMLDivElement | null>(null) };
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sh = ptShape(spec.shape), p = ptPalette(spec.palette), k = ptKind(spec.kind);
  const border = borderAllowed(sh, spec.border) ? spec.border : 'hotcut';
  const set = (q: Partial<PtSpec>) => setSpec((s) => ({ ...s, ...q }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));

  // logo: thêu/PVC → quy về màu chỉ của bảng màu; in → giữ nguyên
  useEffect(() => {
    let on = true;
    if (!logoRaw) { setLogoQ(''); return; }
    if (spec.kind === 'print') { setLogoQ(logoRaw); return; }
    quantize(logoRaw, [p.c1, p.c2, p.c3]).then((u) => { if (on) setLogoQ(u); }).catch(() => { if (on) setLogoQ(logoRaw); });
    return () => { on = false; };
  }, [logoRaw, spec.kind, p.c1, p.c2, p.c3]);
  const logo = logoQ || undefined;

  // đổi mẫu: ô còn nguyên chữ mẫu cũ → thay chữ mẫu mới; ô khách tự viết thì giữ
  const curTpl = PT_TEMPLATES.find((t) => t.id === tplId) || PT_TEMPLATES[0];
  const dataFor = (t: PtTemplate): PtData => {
    const oldS = sampleOf(curTpl), next = sampleOf(t);
    for (const [kk, v] of Object.entries(data)) if ((v || '').trim() && v !== oldS[kk]) next[kk] = v;
    return next;
  };
  const pickTpl = (t: PtTemplate) => {
    setData(dataFor(t)); setTplId(t.id);
    setSpec((s) => ({ ...s, ...t.spec }));
  };
  const setLayout = (l: PtLayout) => {
    const oldS = PT_SAMPLES[spec.layout], next = { ...PT_SAMPLES[l] };
    for (const [kk, v] of Object.entries(data)) if ((v || '').trim() && v !== oldS[kk] && v !== sampleOf(curTpl)[kk]) next[kk] = v;
    setData(next); set({ layout: l });
  };

  const an = useMemo(() => (ready ? ptAnalyze(spec, data, logo) : { colors: [], warns: [], minCap: 0, texts: [], border }), [ready, spec, data, logo, border]);
  const slug = slugify(`patch-${data.title || ''}`, 'patch');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const sheetPdf = async () => {
    const el = svgOf(refs.sheet); if (!el) throw new Error('Chưa dựng xong phiếu');
    return svgToSizedPdf(el, PT_FONT_CSS, 210, 297, 300);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await sheetPdf(), `${slug}-${sh.id}-phieu-san-xuat.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(refs.print); if (!el) return;
    const out = await selfContainedSvg(el, undefined, { outline: true });
    downloadBlob(new Blob([new XMLSerializer().serializeToString(out)], { type: 'image/svg+xml' }), `${slug}-${sh.id}-in-cat.svg`);
  });
  const downloadPng = () => run('png', async () => { const el = svgOf(refs.art); if (el) downloadBlob(await svgToPng(el, PT_FONT_CSS, 1600), `${slug}.png`); });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true }); if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const pv = svgOf(refs.art); if (!pv) throw new Error('Chưa dựng xong patch, thử lại nhé.');
    const file = await sheetPdf();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, PT_FONT_CSS, 900))
      : await svgToJpeg(pv, PT_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sh.id}-phieu-san-xuat.pdf`, preview };
  };
  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogoRaw(await readImage(f)); } catch { alert('Không đọc được ảnh logo'); }
  };

  const build3d = () => import('@/lib/patch-3d').then((m) => m.patchBuilder({
    tex: svgOf(refs.tex), satin: svgOf(refs.satin), fill: svgOf(refs.fill), elem: svgOf(refs.elem),
    d: sh.d, w: sh.w, h: sh.h, kind: spec.kind, border, borderColor: p.border, bg: p.bg, backing: spec.backing,
    twill: spec.kind === 'emb' && spec.coverage === 'twill', fontCss: PT_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __ptSnap?: (w: number, h: number) => Promise<string> }).__ptSnap = async (w, h) => {
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return (await core.snapshot(b, w, h)).toDataURL('image/png');
  };

  const matName = spec.kind === 'emb' ? 'Patch thêu viền vắt sổ' : spec.kind === 'print' ? 'Patch in chuyển nhiệt' : 'Patch PVC dẻo';
  const orderTitle = `${k.name} ${sh.name} · ${PT_BORDERS.find((b) => b.id === border)!.name} · ${PT_BACKINGS.find((b) => b.id === spec.backing)!.name}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const box = (w: number, h: number) => ({ width: w >= h ? '100%' : `${(w / h) * 100}%`, aspectRatio: `${w} / ${h}` });
  const fabricBg = 'linear-gradient(135deg,#46618E,#34507A)';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Patch thêu · huy hiệu vải" sub="Patch logo CLB, đồng phục, trường lớp, du lịch — thêu (≤8 màu chỉ), in chuyển nhiệt hoặc PVC dẻo; viền vắt sổ hoặc cắt nóng; đế ủi, dán gai hoặc may." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PT_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {PT_TEMPLATES.map((t) => {
                  const ts = ptShape(t.spec.shape);
                  const tspec = { ...spec, ...t.spec } as PtSpec;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="pt-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${tplId === t.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg grid place-items-center p-3 aspect-square" style={{ background: fabricBg }}>
                        <div style={box(ts.w, ts.h)}>
                          <PatchSvg spec={tspec} data={dataFor(t)} logo={logo} uid={`tp-${t.id}`} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.35))' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pt-layouts">
                    {PT_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => setLayout(l.id)} className={chip(spec.layout === l.id)} data-testid="pt-layout">{l.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {PT_FIELDS.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pt-field-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Hình minh hoạ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pt-icons">
                    {PT_ICONS.map((i) => <button key={i.id} type="button" onClick={() => set({ icon: i.id })} className={chip(spec.icon === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {logoRaw ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="pt-logo" />
                  </label>
                  {logoRaw && <button type="button" onClick={() => setLogoRaw('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Thêu/PVC: logo tự quy về màu chỉ của bảng màu · ảnh xử lý ngay trên máy</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Loại patch, hình, viền & đế">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Loại</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="pt-kinds">
                    {PT_KINDS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ kind: m.id })} className={`${chip(spec.kind === m.id)} !py-2 text-left`} data-testid={`pt-kind-${m.id}`}>
                        <span className="font-semibold">{m.name}</span><span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{m.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Hình / khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pt-shapes">
                    {PT_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)} data-testid="pt-shape">{s.name}</button>)}
                  </div>
                </div>
                {spec.kind !== 'pvc' && (
                  <div>
                    <div className="mv-label mb-1.5">Viền</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="pt-borders">
                      {PT_BORDERS.map((b) => {
                        const ok = borderAllowed(sh, b.id);
                        return (
                          <button key={b.id} type="button" disabled={!ok} onClick={() => set({ border: b.id })} className={`${chip(border === b.id)} !py-2 text-left disabled:opacity-40`} data-testid={`pt-border-${b.id}`}>
                            <span className="font-semibold">{b.name}</span><span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{ok ? b.note : 'Hình cắt theo dáng chỉ làm được viền cắt nóng'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Đế</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="pt-backings">
                    {PT_BACKINGS.map((b) => (
                      <button key={b.id} type="button" onClick={() => set({ backing: b.id })} className={`${chip(spec.backing === b.id)} !py-2 text-left`} data-testid={`pt-backing-${b.id}`}>
                        <span className="font-semibold">{b.name}</span><span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{b.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {spec.kind === 'emb' && (
                  <div>
                    <div className="mv-label mb-1.5">Phủ nền</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pt-coverage">
                      <button type="button" onClick={() => set({ coverage: 'twill' })} className={chip(spec.coverage === 'twill')}>Nền vải twill (~75%, mềm, rẻ)</button>
                      <button type="button" onClick={() => set({ coverage: 'full' })} className={chip(spec.coverage === 'full')}>Thêu kín 100% (dày, nổi)</button>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu chỉ & font">
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="pt-palettes">
                  {PT_PALETTES.map((pl) => (
                    <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                      <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `conic-gradient(${pl.bg} 0 50%, ${pl.c1} 0 75%, ${pl.c2} 0)` }} />
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="pt-fonts">
                  {PT_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>)}
                </div>
                <label className="block max-w-[200px]">
                  <span className="mv-label block mb-1.5">Số lượng (cái)</span>
                  <input type="number" min={10} step={10} className="mv-input" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} data-testid="pt-qty" />
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.length || 0])} refitKey={`${spec.shape}|${spec.kind}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg grid place-items-center p-6" style={{ background: fabricBg }}>
                <div data-testid="pt-preview" style={{ ...box(sh.w, sh.h), maxWidth: 320 }}>
                  <PatchSvg spec={spec} data={data} logo={logo} uid="pv" style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Phiếu sản xuất A4 (tỉ lệ 1:1)</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[220px]">
                  <PatchSpecSheet spec={spec} data={data} logo={logo} qty={qty} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-mv-hair p-2.5 space-y-2" data-testid="pt-colors" data-count={an.colors.length}>
              <div className="text-[11px] text-slate-300 font-semibold">
                {spec.kind === 'print' ? 'In đủ màu — không giới hạn màu' : `${spec.kind === 'emb' ? 'Màu chỉ' : 'Màu PVC'}: ${an.colors.length}/${k.maxColors}`}
              </div>
              {spec.kind !== 'print' && (
                <div className="flex flex-wrap gap-1.5">
                  {an.colors.map((h) => <span key={h} title={`${threadName(h)} ${h}`} className="flex items-center gap-1 text-[10.5px] text-slate-400"><span className="w-3.5 h-3.5 rounded-full border border-mv-hair" style={{ background: h }} />{threadName(h)}</span>)}
                </div>
              )}
              {an.warns.map((w, i) => <div key={i} className="flex gap-1.5 text-[11px] text-amber-300" data-testid="pt-warn"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</div>)}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sh.name} · {k.name} · {PT_BORDERS.find((b) => b.id === border)!.name} · {PT_BACKINGS.find((b) => b.id === spec.backing)!.name}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pt-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pt-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pt-svg" title="Đúng khổ mm: lớp In + CutContour, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pt-pdf" title="A4: patch tỉ lệ 1:1 + bảng màu chỉ + thông số viền/đế">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Phiếu sản xuất
              </button>
            </div>
            <PrintRequest product="patch" title={orderTitle} defaultMaterial={matName} design={{ spec, data, qty }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Phiếu sản xuất: patch đúng tỉ lệ 1:1, bảng màu chỉ (tên + mã màu), viền, đế, cảnh báo chữ nhỏ. Thêu: chữ nên cao ≥4mm, mảng lớn thêu fill, chữ + viền thêu satin. Vắt sổ chỉ làm được hình tròn/khiên/chữ nhật/ô van.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={refs.art}><PatchSvg spec={spec} data={data} logo={logo} uid="art" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.tex}><PatchSvg spec={spec} data={data} logo={logo} mode="tex" uid="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.satin}><PatchSvg spec={spec} data={data} logo={logo} mode="satin" uid="sat" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.fill}><PatchSvg spec={spec} data={data} logo={logo} mode="fill" uid="fil" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.elem}><PatchSvg spec={spec} data={data} logo={logo} mode="elem" uid="elm" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.print} data-testid="pt-print"><PatchSvg spec={spec} data={data} logo={logo} mode="print" uid="prn" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.sheet}><PatchSpecSheet spec={spec} data={data} logo={logo} qty={qty} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
