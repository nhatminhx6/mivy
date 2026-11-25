'use client';
// Giấy gói quà in logo: chọn mẫu → điền tên shop / logo → chọn loại giấy (couche màu, kraft 1 màu, pelure lụa)
// → chỉnh hoạ tiết (cỡ ô lặp, độ dày, góc xoay, số màu) → xem hộp quà gói 3D → tải ô lặp (PNG/SVG) + PDF cả tờ.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  GW_DENSITY, GW_FIELDS, GW_FONTS, GW_FONT_CSS, GW_INKS, GW_KINDS, GW_PALETTES, GW_STYLES, GW_TEMPLATES,
  GiftwrapSvg, colorLogo, defaultGWData, gwInk, gwKind, gwLook, gwPalette, gwPaper, gwStyle, initialsOf, inkTooClose, papersFor, tintMask, useGWFonts,
  type GWData, type GWKind, type GWLogo, type GWSpec,
} from '@/lib/giftwrap-engine';
import { logoToMask } from '@/lib/tape-engine';
import { svgFileBlob, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: GWSpec = GW_TEMPLATES[0].spec;
const MATERIAL: Record<GWKind, string> = { couche: 'Giấy couche 80 in logo lặp', kraft: 'Giấy kraft in 1 màu', pelure: 'Giấy pelure (lụa) gói đồ' };
const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function GiftwrapPage() {
  const ready = useGWFonts();
  const [spec, setSpec] = useState<GWSpec>(FIRST);
  const [data, setData] = useState<GWData>(defaultGWData());
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [thr, setThr] = useState(150);
  const [logo, setLogo] = useState<GWLogo | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const tileRef = useRef<HTMLDivElement | null>(null);
  const printTileRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const look = gwLook(spec);
  const kind = gwKind(spec.kind);
  const oneInk = spec.kind !== 'couche';

  // logo: couche giữ màu; kraft / pelure → bóng 1 màu theo màu mực
  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    (async () => {
      if (!oneInk) return colorLogo(logoSrc);
      const m = await logoToMask(logoSrc, thr, false);
      return m ? tintMask(m.href, gwInk(spec.ink).hex) : null;
    })().then((l) => { if (on) setLogo(l ?? null); }).catch(() => { if (on) setLogo(null); });
    return () => { on = false; };
  }, [logoSrc, thr, oneInk, spec.ink]);

  const set = (p: Partial<GWSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setKind = (k: GWKind) => setSpec((s) => {
    if (k === s.kind) return s;
    const papers = papersFor(k);
    const paper = papers.some((p) => p.id === s.paper) ? s.paper : papers[0]?.id ?? s.paper;
    return { ...s, kind: k, paper, colors: k === 'couche' ? Math.max(2, s.colors) : 1 };
  });
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const slug = slugify(`giay-goi-${data.brand || ''}`, 'giay-goi-qua');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const sheetPdf = async () => {
    const el = svgOf(sheetRef); if (!el) throw new Error('Chưa dựng xong tờ giấy');
    return svgToPrintPdf(el, GW_FONT_CSS, { wMm: kind.sheet[0], hMm: kind.sheet[1] }, 3, 150);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await sheetPdf(), `${slug}-${kind.sheet[0]}x${kind.sheet[1]}mm.pdf`));
  const downloadTilePng = () => run('png', async () => {
    const el = svgOf(printTileRef); if (!el) return;
    // 300dpi theo cỡ ô thật
    const px = Math.max(600, Math.round((spec.tileMm / 25.4) * 300));
    downloadBlob(await svgToPng(el, GW_FONT_CSS, px, { watermark: false }), `${slug}-o-lap-${spec.tileMm}mm.png`);
  });
  const downloadTileSvg = () => run('svg', async () => {
    const el = svgOf(printTileRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, GW_FONT_CSS), `${slug}-o-lap-${spec.tileMm}mm.svg`);
  });
  const download3d = () => run('3d', async () => {
    downloadBlob(await toBlob(await view3d.current!.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([
      sheetPdf(),
      view3d.current ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86)) : svgToPng(svgOf(tileRef)!, GW_FONT_CSS, 900),
    ]);
    return { file, fileName: `${slug}-${kind.sheet[0]}x${kind.sheet[1]}mm.pdf`, preview };
  };

  const ribbonHex = spec.kind === 'couche' ? (look.colors[look.colors.length > 2 ? 2 : 0]) : '#B3202A';
  const build3d = () => import('@/lib/giftwrap-3d').then((m) => m.giftwrapBuilder({
    tile: svgOf(tileRef), tileMm: spec.tileMm, kind: spec.kind, paperHex: look.paper, ribbonHex,
    inkHex: look.colors[0], initials: initialsOf(data), fontCss: GW_FONT_CSS,
  }));
  // hook cho QC (Playwright chụp 3D góc mặc định) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __gwSnap?: (w: number, h: number) => Promise<string> }).__gwSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); };

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader(); fr.onload = () => setLogoSrc(String(fr.result)); fr.readAsDataURL(f);
  };

  const st = gwStyle(spec.style);
  const warn = oneInk && inkTooClose(spec.ink, spec.paper);
  const orderTitle = `Giấy gói quà ${kind.sheet[0] / 10}×${kind.sheet[1] / 10}cm · ${kind.name.toLowerCase()} · ${st.name.toLowerCase()}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Giấy gói quà in logo" sub="Giấy gói quà, giấy kraft, giấy pelure (lụa) in logo lặp liền mạch — gói hàng sang hơn, nhận diện thương hiệu. Xem hộp quà gói thử 3D, tải ô lặp + PDF cả tờ chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${GW_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {GW_TEMPLATES.map((t) => {
                  const s = t.spec;
                  const on = spec.style === s.style && spec.kind === s.kind && spec.palette === s.palette && spec.paper === s.paper && spec.ink === s.ink && spec.font === s.font;
                  return (
                    <button key={t.id} type="button" onClick={() => setSpec(s)} data-testid="gw-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden aspect-square">
                        <GiftwrapSvg spec={s} data={data} logo={s.kind === spec.kind ? logo : null} mode="swatch" box={[s.tileMm * 2, s.tileMm * 2]} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung in">
              <div className="grid grid-cols-2 gap-3">
                {GW_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`gw-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn){oneInk ? ' — tự chuyển thành hình 1 màu mực' : ''}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-mv-hair grid place-items-center overflow-hidden" style={{ background: look.paper }}>
                      {logo ? <img src={logo.href} alt="" className="max-w-full max-h-full" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logoSrc ? 'Đổi logo' : 'Tải logo lên'}</button>
                      {logoSrc && <button type="button" onClick={() => setLogoSrc('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="gw-logo" />
                  </div>
                  {logoSrc && oneInk && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">Độ đậm <input type="range" min={40} max={235} value={thr} onChange={(e) => setThr(+e.target.value)} /></label>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1.5">Không có logo → dùng huy hiệu chữ viết tắt “{initialsOf(data)}”. Ảnh chỉ xử lý trên máy anh/chị, không gửi đi đâu.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Loại giấy & màu in">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5" data-testid="gw-kinds">
                  {GW_KINDS.map((k) => <button key={k.id} type="button" onClick={() => setKind(k.id)} className={chip(spec.kind === k.id)} data-testid={`gw-kind-${k.id}`}>{k.name}</button>)}
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">{kind.note} · khổ {kind.sheet[0] / 10}×{kind.sheet[1] / 10}cm</p>
                {spec.kind === 'couche' ? (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Bảng màu</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="gw-palettes">
                        {GW_PALETTES.map((p) => (
                          <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`} title={p.name}>
                            <span className="flex -space-x-1">{[p.bg, ...p.c].map((c, i) => <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />)}</span>{p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Số màu hoạ tiết (không kể màu nền)</div>
                      <div className="flex gap-1.5" data-testid="gw-colors">
                        {[1, 2, 3].map((n) => <button key={n} type="button" onClick={() => set({ colors: n })} className={chip(spec.colors === n)}>{n} màu</button>)}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Màu giấy (không in — màu sẵn của giấy)</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="gw-papers">
                        {papersFor(spec.kind).map((p) => (
                          <button key={p.id} type="button" onClick={() => set({ paper: p.id })} className={`flex items-center gap-2 ${chip(spec.paper === p.id)}`}>
                            <span className="w-4 h-4 rounded-full border border-black/15" style={{ background: p.hex }} />{p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Màu mực (in 1 màu)</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="gw-inks">
                        {GW_INKS.map((i) => (
                          <button key={i.id} type="button" title={i.name} onClick={() => set({ ink: i.id })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${spec.ink === i.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: i.hex }} />
                        ))}
                      </div>
                      {warn && <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> Mực {gwInk(spec.ink).name.toLowerCase()} gần màu giấy {gwPaper(spec.paper).name.toLowerCase()} — in ra sẽ khó thấy.</div>}
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Hoạ tiết">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kiểu hoạ tiết</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="gw-styles">
                    {GW_STYLES.map((s) => <button key={s.id} type="button" onClick={() => set({ style: s.id })} className={chip(spec.style === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mv-label block mb-1.5">Cỡ ô lặp: {spec.tileMm / 10}cm</span>
                    <input type="range" min={40} max={160} step={10} value={spec.tileMm} onChange={(e) => set({ tileMm: +e.target.value })} className="w-full" data-testid="gw-tile" />
                  </label>
                  <label className={`block ${st.rot ? '' : 'opacity-40'}`}>
                    <span className="mv-label block mb-1.5">Góc xoay hoạ tiết: {spec.rot}°</span>
                    <input type="range" min={-45} max={45} step={5} value={spec.rot} disabled={!st.rot} onChange={(e) => set({ rot: +e.target.value })} className="w-full" data-testid="gw-rot" />
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Mật độ</div>
                    <div className="flex gap-1.5" data-testid="gw-density">
                      {GW_DENSITY.map((d) => <button key={d.n} type="button" onClick={() => set({ n: d.n })} className={chip(spec.n === d.n)}>{d.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tên shop</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="gw-fonts">
                      {GW_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length])} refitKey={spec.kind === 'pelure' ? 'p' : 'b'} debounce={350} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="gw-flat">
              <div className="rounded-lg overflow-hidden aspect-[4/3] shadow-inner">
                <GiftwrapSvg spec={spec} data={data} logo={logo} mode="swatch" box={[spec.tileMm * 3.2, spec.tileMm * 2.4]} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 shrink-0 rounded-md overflow-hidden outline outline-2 outline-dashed outline-indigo-400/70" data-testid="gw-tile-preview">
                  <GiftwrapSvg spec={spec} data={data} logo={logo} mode="tile" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">1 ô lặp {spec.tileMm / 10}×{spec.tileMm / 10}cm — ghép liền mạch mọi phía. Tờ {kind.sheet[0] / 10}×{kind.sheet[1] / 10}cm chứa ≈ {Math.ceil(kind.sheet[0] / spec.tileMm) * Math.ceil(kind.sheet[1] / spec.tileMm)} ô.</p>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kind.name} · {st.name} · {oneInk ? `mực ${gwInk(spec.ink).name.toLowerCase()} trên giấy ${gwPaper(spec.paper).name.toLowerCase()}` : `${gwPalette(spec.palette).name} · ${look.colors.length} màu + nền`}</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="gw-3d" title="Ảnh hộp quà 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadTilePng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="gw-png" title="Ô lặp PNG 300dpi">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ô lặp
              </button>
              <button type="button" onClick={downloadTileSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="gw-svg" title="Ô lặp vector, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="gw-pdf" title="Cả tờ đúng khổ + lề xén 3mm">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF tờ
              </button>
            </div>
            <PrintRequest product="giftwrap" title={orderTitle} defaultMaterial={MATERIAL[spec.kind]} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Ô lặp đúng kích thước thật, ghép liền mạch — xưởng dùng để lát kín cuộn/tờ. {oneInk ? 'Kraft & pelure in 1 màu mực, nền giấy không in.' : 'Couche in kín nền + màu hoạ tiết.'} Giấy gói in logo thường đặt từ 100–200 tờ.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: ô lặp (texture 3D), ô lặp file in, cả tờ (PDF) */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1000, pointerEvents: 'none' }}>
          <div ref={tileRef} data-testid="gw-tile-src"><GiftwrapSvg spec={spec} data={data} logo={logo} mode="tile" style={{ width: 600, height: 600, display: 'block' }} /></div>
          <div ref={printTileRef} data-testid="gw-print-tile"><GiftwrapSvg spec={spec} data={data} logo={logo} mode="print-tile" style={{ width: 600, height: 600, display: 'block' }} /></div>
          <div ref={sheetRef} data-testid="gw-sheet"><GiftwrapSvg spec={spec} data={data} logo={logo} mode="sheet" style={{ width: 500, height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
