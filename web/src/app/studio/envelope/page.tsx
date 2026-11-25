'use client';
// Lì xì Tết & phong bì công ty: chọn loại + mẫu → điền thương hiệu/lời chúc → đổi màu, font, khổ, kiểu nắp →
// xem thành phẩm 3D (ép kim, nắp hé) → tải khuôn bế trải phẳng (PDF có lề xén + vạch cắt) gửi xưởng, hoặc đặt in.

import { useRef, useState, type ReactNode } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  ENV_FIELDS, ENV_FONTS, ENV_FONT_CSS, ENV_KINDS, ENV_BLEED_MM, FLAP_SHAPES,
  EnvelopeDieline, EnvelopeFace, defaultEnvData, defaultEnvSpec, envGeom, envNetMm, envPalettes, envSize, envSizesFor,
  envTemplates, swatch2Of, swatchOf, useEnvFonts, type EnvData, type EnvKind, type EnvSpec,
} from '@/lib/envelope-engine';
import { svgFileBlob, svgToPrintPdf } from '@/lib/svg-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const HIDDEN = ['front', 'frontFoil', 'backBody', 'backBodyFoil', 'backArt', 'backArtFoil', 'dieline'] as const;
type HiddenKey = typeof HIDDEN[number];

export default function EnvelopePage() {
  const ready = useEnvFonts();
  const [kind, setKind] = useState<EnvKind>('lixi');
  const [spec, setSpec] = useState<EnvSpec>(defaultEnvSpec('lixi'));
  const [data, setData] = useState<EnvData>(defaultEnvData());
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidden = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<EnvSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const pickKind = (k: EnvKind) => { if (k === kind) return; setKind(k); setSpec(defaultEnvSpec(k)); };
  const lixi = kind === 'lixi';
  const sz = envSize(spec.size);
  const g = envGeom(spec);
  const net = envNetMm(g);
  const templates = envTemplates(kind);
  const base = lixi ? 'li-xi' : 'phong-bi';
  const slug = slugify(`${base}-${data.brand || ''}`, base);

  const el = (k: HiddenKey) => hidden.current?.querySelector(`[data-k="${k}"] svg`) as SVGSVGElement | null;
  const build3d = () => import('@/lib/envelope-3d').then((m) => m.envelopeBuilder({
    spec, fontCss: ENV_FONT_CSS,
    els: { front: el('front'), frontFoil: el('frontFoil'), backBody: el('backBody'), backBodyFoil: el('backBodyFoil'), backArt: el('backArt'), backArtFoil: el('backArtFoil') },
  }));

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const shot = async (px: number, watermark = false) => {
    if (!view3d.current) throw new Error('Đang ở bản thiết kế — bấm "Thành phẩm 3D" rồi thử lại nhé.');
    return view3d.current.snapshot(px, px, { watermark });
  };
  const diePdf = async () => {
    const d = el('dieline'); if (!d) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
    return svgToPrintPdf(d, ENV_FONT_CSS, net, ENV_BLEED_MM, 300);
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await diePdf(), `${slug}-khuon-be.pdf`));
  const downloadSvg = () => run('svg', async () => { const d = el('dieline'); if (!d) return; downloadBlob(await svgFileBlob(d, ENV_FONT_CSS), `${slug}-khuon-be.svg`); });

  const makeFiles = async () => {
    const preview = view3d.current
      ? await shot(900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await (async () => { const { svgToJpeg } = await import('@/lib/svg-export'); return svgToJpeg(el('front')!, ENV_FONT_CSS, 900); })();
    return { file: await diePdf(), fileName: `${slug}-khuon-be.pdf`, preview };
  };
  const orderTitle = `${lixi ? 'Bao lì xì' : 'Phong bì'} ${sz.w}×${sz.h}mm${spec.window ? ' (cửa sổ)' : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fill = { width: '100%', height: '100%', display: 'block' } as const;
  const faceBox = (child: ReactNode, label: string, testid: string) => (
    <div className="min-w-0">
      <div className="rounded-md overflow-hidden shadow-md mx-auto" style={{ aspectRatio: `${sz.w} / ${sz.h}`, maxHeight: lixi ? '52vh' : undefined }} data-testid={testid}>{child}</div>
      <div className="text-[11px] text-slate-400 text-center mt-1.5">{label}</div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Lì xì & phong bì" sub="Bao lì xì Tết in thương hiệu, phong bì công ty — xem thành phẩm 3D, tải khuôn bế trải phẳng có lề xén gửi xưởng, hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-sm" role="tablist">
        {ENV_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={kind === k.id} className="mv-seg-btn flex-1" data-testid="env-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${templates.length})`}>
              <div className={`grid gap-2.5 ${lixi ? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {templates.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="env-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-md overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.w} / ${sz.h}` }}>
                        <EnvelopeFace spec={{ ...spec, ...t.spec }} data={data} side="front" style={fill} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={lixi ? '2 · Thương hiệu & lời chúc' : '2 · Thông tin công ty'}>
              <div className="grid grid-cols-2 gap-3">
                {ENV_FIELDS[kind].map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`env-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font, khổ & nắp">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="env-palettes">
                    {envPalettes(kind).map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair grid place-items-center" style={{ background: swatchOf(kind, pl.id) }}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: swatch2Of(kind, pl.id) }} />
                        </span>
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="env-fonts">
                    {ENV_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="env-sizes">
                      {envSizesFor(kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Kiểu nắp</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="env-flaps">
                      {FLAP_SHAPES.map((f) => <button key={f.id} type="button" onClick={() => set({ flap: f.id })} className={chip(spec.flap === f.id)}>{f.name}</button>)}
                    </div>
                  </div>
                </div>
                {!lixi && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={spec.window} onChange={(e) => set({ window: e.target.checked })} data-testid="env-window" />
                    Có cửa sổ kính (90×45mm, góc dưới trái) — thấy địa chỉ người nhận trên thư bên trong
                  </label>
                )}
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Thành phẩm</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' ? (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={`${spec.size}|${spec.flap}`} debounce={400} className="rounded-lg aspect-square w-full" />
            ) : (
              <div className={lixi ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                {faceBox(<EnvelopeFace spec={spec} data={data} side="front" style={fill} />, 'Mặt trước', 'env-front')}
                {faceBox(<EnvelopeFace spec={spec} data={data} side="back" style={fill} />, 'Mặt sau (nắp)', 'env-back')}
              </div>
            )}
            <div className="pt-1">
              <div className="text-[11px] text-slate-400 mb-1">Khuôn bế trải phẳng · file gửi xưởng</div>
              <div className="mx-auto rounded-lg overflow-hidden bg-white border border-mv-hair" style={{ maxWidth: lixi ? 220 : '100%' }} data-testid="env-dieline">
                <EnvelopeDieline spec={spec} data={data} legend style={{ width: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Tấm khuôn {Math.round(net.wMm)}×{Math.round(net.hMm)}mm + lề xén {ENV_BLEED_MM}mm · nét cắt liền, nét gấp đứt</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="env-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="env-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF khuôn</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="env-svg" title="File vector, chữ đã outline">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG</button>
            </div>
            <PrintRequest product="envelope" title={orderTitle} design={{ kind, spec, data }} makeFiles={makeFiles}
              defaultMaterial={lixi ? 'Lì xì giấy mỹ thuật ép kim' : 'Phong bì Fort 100 (văn phòng)'} />
            <p className="text-[11px] leading-relaxed text-slate-500">{lixi ? 'Ép kim: phần màu vàng trên mẫu sẽ ép nhũ vàng thật (xưởng tách lớp kim từ file). ' : ''}Bản khuôn để báo giá + duyệt bố cục — Mivy chốt khuôn bế cuối với xưởng rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={hidden} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div data-k="front"><EnvelopeFace spec={spec} data={data} side="front" style={fill} /></div>
          <div data-k="frontFoil"><EnvelopeFace spec={spec} data={data} side="front" foil style={fill} /></div>
          <div data-k="backBody"><EnvelopeFace spec={spec} data={data} side="back-body" style={fill} /></div>
          <div data-k="backBodyFoil"><EnvelopeFace spec={spec} data={data} side="back-body" foil style={fill} /></div>
          <div data-k="backArt"><EnvelopeFace spec={spec} data={data} side="back-art" style={fill} /></div>
          <div data-k="backArtFoil"><EnvelopeFace spec={spec} data={data} side="back-art" foil style={fill} /></div>
          <div data-k="dieline"><EnvelopeDieline spec={spec} data={data} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
