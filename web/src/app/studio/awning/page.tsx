'use client';
// Mái hiên · bạt che in logo: chọn loại mái → chọn mẫu → nhập bề ngang mặt tiền + vươn ra → tên quán/slogan/hotline (+ logo)
// → vải sọc / trơn / in KTS, mép diềm, bố cục chữ → xem mặt tiền 3D → tải file in trải phẳng (chia khổ vải) hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  AW_CANOPY, AW_EDGES, AW_FABRICS, AW_FIELDS, AW_FONTS, AW_FONT_CSS, AW_KINDS, AW_LAYOUTS, AW_PALETTES, AW_PROJ, AW_ROLLS, AW_SAMPLES, AW_TEMPLATES,
  AwningFront, AwningPiece, AwningSheet, awGeo, awPanels, awSheet, awTemplate, useAWFonts,
  type AWData, type AWKind, type AWSpec, type AWTemplate,
} from '@/lib/awning-engine';
import { svgFileBlob, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const first = awTemplate('cafe-classic');
const FIRST: AWSpec = { ...first.spec, widthMm: 4000, roll: 1500 };
const WIDTHS = [2000, 3000, 4000, 5000, 6000];

function readLogo(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export default function AwningPage() {
  const ready = useAWFonts();
  const [spec, setSpec] = useState<AWSpec>(FIRST);
  const [tplId, setTplId] = useState(first.id);
  const [data, setData] = useState<AWData>({ ...AW_SAMPLES[first.use] });
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [wInput, setWInput] = useState('4');
  const canopyRef = useRef<HTMLDivElement | null>(null);
  const valanceRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<AWSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickKind = (k: AWKind) => setSpec((s) => (s.kind === k ? s : { ...s, kind: k, proj: AW_PROJ[k].includes(s.proj) ? s.proj : AW_PROJ[k][Math.min(1, AW_PROJ[k].length - 1)] }));
  const pickTpl = (t: AWTemplate) => {
    setTplId(t.id);
    setSpec((s) => ({ ...s, ...t.spec }));
    if (!dirty) setData({ ...AW_SAMPLES[t.use] });
  };
  const setWidth = (m: number) => { const mm = Math.round(Math.max(2, Math.min(6, m)) * 100) * 10; set({ widthMm: mm }); setWInput(String(mm / 1000)); };

  const g = awGeo(spec);
  const pan = awPanels(spec);
  const sheet = awSheet(spec);
  const kindName = AW_KINDS.find((k) => k.id === spec.kind)?.name || '';
  const slug = slugify(`mai-hien-${data.brand || ''}`, 'mai-hien');
  const sizeTag = `${(g.W / 1000).toFixed(1)}x${(g.proj / 1000).toFixed(1)}m`;
  const tpls = useMemo(() => [...AW_TEMPLATES].sort((a, b) => Number(b.spec.kind === spec.kind) - Number(a.spec.kind === spec.kind)), [spec.kind]);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const build3d = () => import('@/lib/awning-3d').then((m) => m.awningBuilder({
    canopy: svgOf(canopyRef), valance: svgOf(valanceRef), side: svgOf(sideRef), fontCss: AW_FONT_CSS,
    kind: spec.kind, W: g.W, proj: g.proj, L: g.L, drop: g.drop, valH: g.valH, sideKind: g.side, frame: spec.palette === 'blackgold' ? '#3A3428' : '#2E3238',
  }));
  const shot3d = async (w: number, h: number, watermark: boolean) => {
    if (view3d.current && tab === '3d') return view3d.current.snapshot(w, h, { watermark });
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return core.snapshot(b, w, h, { watermark });
  };
  // hook QC (chỉ bản dev): chụp 3D ở góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __awSnap?: (w: number, h: number) => Promise<string> }).__awSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

  const downloadPng = () => run('png', async () => { const el = svgOf(frontRef); if (!el) return; downloadBlob(await svgToPng(el, AW_FONT_CSS, 2400), `${slug}-${sizeTag}.png`); });
  const download3d = () => run('3d', async () => { downloadBlob(await toBlob(await shot3d(1600, 1200, true), 'image/png'), `${slug}-${sizeTag}-3d.png`); });
  const downloadPdf = () => run('pdf', async () => { const el = svgOf(sheetRef); if (!el) return; downloadBlob(await svgToSizedPdf(el, AW_FONT_CSS, sheet.w, sheet.h, sheet.dpi), `${slug}-${sizeTag}-file-in.pdf`); });
  const downloadSvg = () => run('svg', async () => { const el = svgOf(sheetRef); if (!el) return; downloadBlob(await svgFileBlob(el, AW_FONT_CSS), `${slug}-${sizeTag}-file-in.svg`); });

  const makeFiles = async () => {
    const el = svgOf(sheetRef);
    if (!el) throw new Error('Chưa dựng xong mái hiên, thử lại nhé.');
    const [file, preview] = await Promise.all([
      svgToSizedPdf(el, AW_FONT_CSS, sheet.w, sheet.h, sheet.dpi),
      shot3d(1200, 900, false).then((c) => toBlob(c, 'image/jpeg', 0.86)),
    ]);
    return { file, fileName: `${slug}-${sizeTag}-file-in.pdf`, preview };
  };
  const orderTitle = `Mái hiên ${kindName.toLowerCase()} ${sizeTag} · ${AW_FABRICS.find((f) => f.id === spec.fabric)?.name}`;
  const material = spec.fabric === 'stripe' ? 'Bạt sọc may chữ' : 'Bạt mái hiên in kỹ thuật số';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const rebuild = JSON.stringify([spec, data, logo.length]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Mái hiên · bạt che in logo" sub="Mái hiên tay quay, mái vòm, mái kiểu Pháp — in tên quán lên diềm, sọc màu hoặc in KTS. Nhập bề ngang mặt tiền, xem mặt tiền 3D, tải file trải phẳng đã chia khổ vải hoặc đặt Mivy làm + lắp." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {AW_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => pickKind(k.id)} data-testid="aw-kind" title={k.sub}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${AW_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {tpls.map((t) => {
                  const on = tplId === t.id;
                  const ts: AWSpec = { ...spec, ...t.spec };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="aw-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04]">
                        <AwningFront spec={ts} data={dirty ? data : AW_SAMPLES[t.use]} logo={logo || undefined} style={{ width: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[10px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Mặt tiền & kích thước">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bề ngang mái (m) — đo theo mặt tiền</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {WIDTHS.map((w) => <button key={w} type="button" onClick={() => setWidth(w / 1000)} className={chip(spec.widthMm === w)} data-testid="aw-width">{w / 1000} m</button>)}
                    <input type="number" min={2} max={6} step={0.1} value={wInput} onChange={(e) => setWInput(e.target.value)}
                      onBlur={() => { const v = parseFloat(wInput); if (Number.isFinite(v)) setWidth(v); else setWInput(String(spec.widthMm / 1000)); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      className="mv-input !w-24 !py-1.5" data-testid="aw-width-input" />
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">{spec.kind === 'dome' ? 'Bán kính vòm (vươn ra)' : 'Vươn ra'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {AW_PROJ[spec.kind].map((p) => <button key={p} type="button" onClick={() => set({ proj: p })} className={chip(spec.proj === p)} data-testid="aw-proj">{p / 1000} m</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Diềm trước</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[250, 300].map((h) => <button key={h} type="button" onClick={() => set({ valH: h })} className={chip(spec.valH === h)} data-testid="aw-valh">Cao {h / 10} cm</button>)}
                      {AW_EDGES.map((e) => <button key={e.id} type="button" onClick={() => set({ edge: e.id })} className={chip(spec.edge === e.id)} data-testid="aw-edge">{e.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Khổ cuộn vải (chia mảnh may)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {AW_ROLLS.map((r) => <button key={r} type="button" onClick={() => set({ roll: r })} className={chip(spec.roll === r)} data-testid="aw-roll">{r / 1000} m</button>)}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400" data-testid="aw-info">
                  Mái {(g.W / 1000).toFixed(2)} × {(g.L / 1000).toFixed(2)} m (dài dốc) · diềm {g.valH / 10} cm · {pan.n} khổ vải × {spec.roll / 1000} m · cần ~{pan.fabricM} m bạt
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {AW_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.key === 'brand' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`aw-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn) — in trong huy hiệu tròn</span>
                  <div className="flex items-center gap-3">
                    <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="aw-logo"
                        onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setLogo(await readLogo(f)); } catch (err) { alert((err as Error).message); } } }} />
                    </label>
                    {logo && (
                      <>
                        <img src={logo} alt="" className="h-10 w-10 rounded-md object-contain border border-mv-hair bg-white" />
                        <button type="button" onClick={() => setLogo('')} className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Bỏ logo</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Vải, chữ & màu">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {AW_FABRICS.map((f) => <button key={f.id} type="button" onClick={() => set({ fabric: f.id })} className={chip(spec.fabric === f.id)} data-testid="aw-fabric">{f.name}</button>)}
                  {spec.fabric === 'stripe' && [120, 200, 250].map((w) => <button key={w} type="button" onClick={() => set({ stripeMm: w })} className={chip(spec.stripeMm === w)} data-testid="aw-stripe">Sọc {w / 10} cm</button>)}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chữ trên diềm</div>
                  <div className="flex flex-wrap gap-1.5">
                    {AW_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)} data-testid="aw-layout">{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Trên mái</div>
                  <div className="flex flex-wrap gap-1.5">
                    {AW_CANOPY.map((c) => <button key={c.id} type="button" onClick={() => set({ canopy: c.id })} className={chip(spec.canopy === c.id)} data-testid="aw-canopy">{c.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="aw-palettes">
                    {AW_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `repeating-linear-gradient(90deg, ${pl.a} 0 6px, ${pl.b} 6px 12px)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="aw-fonts">
                    {AW_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuild} refitKey={`${spec.kind}|${spec.widthMm}|${spec.proj}`} debounce={450} className="rounded-lg w-full aspect-[4/3]" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'space-y-2'}>
              <div ref={frontRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" data-testid="aw-front">
                <AwningFront spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', display: 'block' }} />
              </div>
              <div className="text-[11px] text-slate-400">File in trải phẳng (mái · diềm{g.side !== 'none' ? ' · 2 hông' : ''}):</div>
              <div className="rounded-lg overflow-hidden border border-mv-hair bg-white" data-testid="aw-sheet-preview">
                <AwningSheet spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kindName} · {sizeTag} · {pan.n} khổ vải · file in {sheet.dpi}dpi</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="aw-3dpng">{busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="aw-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="aw-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="aw-svg">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG</button>
            </div>
            <PrintRequest product="awning" title={orderTitle} defaultMaterial={material} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đúng mm thật: mái + diềm{g.side !== 'none' ? ' + hông' : ''}, lề may {40} mm, đường may nối khổ vải, mép diềm cắt sẵn. Hoặc gửi yêu cầu — Mivy may, in và lắp (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={canopyRef}><AwningPiece spec={spec} data={data} logo={logo || undefined} piece="canopy" style={{ width: 800, height: 'auto' }} /></div>
          <div ref={valanceRef}><AwningPiece spec={spec} data={data} logo={logo || undefined} piece="valance" style={{ width: 800, height: 'auto' }} /></div>
          {g.side !== 'none' && <div ref={sideRef}><AwningPiece spec={spec} data={data} logo={logo || undefined} piece="side" style={{ width: 400, height: 'auto' }} /></div>}
          <div ref={sheetRef}><AwningSheet spec={spec} data={data} logo={logo || undefined} style={{ width: 800, height: 'auto' }} /></div>
        </div>
      )}
    </div>
  );
}
