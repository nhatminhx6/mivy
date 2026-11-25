'use client';
// Bộ văn phòng: 1 nhận diện → tiêu đề thư A4 + kẹp file A4 (khuôn bế có túi + khe cài card).
// Chọn mẫu → điền thông tin công ty → (tuỳ chọn) tải logo → xem thành phẩm 3D → tải file in / gửi yêu cầu in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  FolderDielineSvg, FolderFaceSvg, LetterheadSvg, MiniCardSvg, SF_FIELDS, SF_FONTS, SF_FONT_CSS, SF_PALETTES, SF_TEMPLATES,
  ST_LH, ST_LH_BLEED_MM, ST_FD_BLEED_MM, defaultSFData, folderNet, sfPalette, stationeryOrderPdf, useSFFonts,
  type SFData, type SFSpec,
} from '@/lib/stationery-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgToSizedPdf, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: SFSpec = SF_TEMPLATES[0].spec;

// logo khách: thu nhỏ trên máy (giữ nền trong suốt), không gửi đi đâu
async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function StationeryPage() {
  const ready = useSFFonts();
  const [spec, setSpec] = useState<SFSpec>(FIRST);
  const [data, setData] = useState<SFData>(defaultSFData());
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [doc, setDoc] = useState<'letter' | 'folder'>('letter');
  const [sample, setSample] = useState(true);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const R = {
    lhBleed: useRef<HTMLDivElement | null>(null), lhPlain: useRef<HTMLDivElement | null>(null), lhHead: useRef<HTMLDivElement | null>(null),
    lhFoot: useRef<HTMLDivElement | null>(null), net: useRef<HTMLDivElement | null>(null), front: useRef<HTMLDivElement | null>(null),
    back: useRef<HTMLDivElement | null>(null), spine: useRef<HTMLDivElement | null>(null), pocket: useRef<HTMLDivElement | null>(null),
    inside: useRef<HTMLDivElement | null>(null), letter: useRef<HTMLDivElement | null>(null), cardF: useRef<HTMLDivElement | null>(null),
    cardB: useRef<HTMLDivElement | null>(null),
  };

  const set = (p: Partial<SFSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const pal = sfPalette(spec.palette);
  const net = folderNet();
  const slug = slugify(`bo-van-phong-${data.brand || data.company || ''}`, 'bo-van-phong');
  const lgo = logo || undefined;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const build3d = () => import('@/lib/stationery-3d').then((m) => m.stationeryBuilder({
    front: svgOf(R.front), back: svgOf(R.back), spine: svgOf(R.spine), pocket: svgOf(R.pocket), inside: svgOf(R.inside),
    letter: svgOf(R.letter), cardF: svgOf(R.cardF), cardB: svgOf(R.cardB), accent: pal.accent, fontCss: SF_FONT_CSS,
  }));
  const shot3d = async (w: number, h: number, watermark: boolean) => {
    if (view3d.current) return view3d.current.snapshot(w, h, { watermark });
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return core.snapshot(b, w, h, { watermark });
  };

  const dl = {
    lhPdf: () => run('lhPdf', async () => { const el = svgOf(R.lhBleed); if (!el) return; downloadBlob(await svgsToPrintPdf([el], SF_FONT_CSS, ST_LH, ST_LH_BLEED_MM), `${slug}-tieu-de-thu-file-in.pdf`); }),
    lhA4: () => run('lhA4', async () => { const el = svgOf(R.lhPlain); if (!el) return; downloadBlob(await svgToSizedPdf(el, SF_FONT_CSS, ST_LH.wMm, ST_LH.hMm, 200), `${slug}-tieu-de-thu-a4-van-phong.pdf`); }),
    word: () => run('word', async () => {
      const h = svgOf(R.lhHead), f = svgOf(R.lhFoot); if (!h || !f) return;
      downloadBlob(await svgToPng(h, SF_FONT_CSS, 2480, { watermark: false }), `${slug}-header-word.png`);
      downloadBlob(await svgToPng(f, SF_FONT_CSS, 2480, { watermark: false }), `${slug}-footer-word.png`);
    }),
    fdPdf: () => run('fdPdf', async () => { const el = svgOf(R.net); if (!el) return; downloadBlob(await svgToSizedPdf(el, SF_FONT_CSS, net.wMm, net.hMm, 200), `${slug}-kep-file-khuon-be.pdf`); }),
    fdSvg: () => run('fdSvg', async () => { const el = svgOf(R.net); if (!el) return; downloadBlob(await svgFileBlob(el, SF_FONT_CSS), `${slug}-kep-file-khuon-be.svg`); }),
    png3d: () => run('png3d', async () => downloadBlob(await toBlob(await shot3d(1600, 1100, true), 'image/png'), `${slug}-3d.png`)),
  };

  const makeFiles = async () => {
    const lh = svgOf(R.lhBleed), nt = svgOf(R.net);
    if (!lh || !nt) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const [file, preview] = await Promise.all([
      stationeryOrderPdf(lh, nt),
      shot3d(1100, 760, false).then((c) => toBlob(c, 'image/jpeg', 0.86)).catch(() => svgToJpeg(lh, SF_FONT_CSS, 900)),
    ]);
    return { file, fileName: `${slug}-tieu-de-thu-va-kep-file.pdf`, preview };
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh logo này, thử file PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tplName = SF_TEMPLATES.find((t) => t.spec.layout === spec.layout && t.spec.palette === spec.palette)?.name || 'Tuỳ chỉnh';
  const btn = (key: string, label: string, onClick: () => void, primary = false, testid = key, title?: string) => (
    <button type="button" onClick={onClick} title={title} data-testid={`sf-${testid}`}
      className={`mv-btn ${primary ? 'mv-btn-primary' : 'mv-btn-ghost'} !flex justify-center !py-2.5 !text-xs`}>
      {busy === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : primary ? <FileDown className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />} {label}
    </button>
  );
  const box = (k: keyof typeof R, node: React.ReactNode, w = 600) => <div ref={R[k]} style={{ width: w }}>{node}</div>;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bộ văn phòng" sub="Tiêu đề thư A4 + kẹp file A4 đồng bộ một nhận diện — chọn mẫu, điền thông tin công ty, tải file in chuẩn (lề xén, khuôn bế túi + khe cài card) hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${SF_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {SF_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="sf-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-md overflow-hidden bg-white shadow-sm" style={{ aspectRatio: '210 / 297' }}>
                        <LetterheadSvg spec={t.spec} data={data} logo={lgo} sample style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin công ty">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid="sf-logo-btn">
                  <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                </button>
                {logo && (
                  <>
                    <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded border border-mv-hair bg-white" />
                    <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid="sf-logo-clear"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>
                  </>
                )}
                <span className="text-[11px] text-slate-500">Không có logo → Mivy tự dựng logo chữ từ tên thương hiệu.</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="sf-logo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SF_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`sf-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="sf-palettes">
                    {SF_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 60%, ${pl.accent2} 60%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font thương hiệu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="sf-fonts">
                    {SF_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`}
                        style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {f.upper ? (data.brand || 'AN KHANG').toUpperCase() : data.brand || 'An Khang'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={spec.watermark} onChange={(e) => set({ watermark: e.target.checked })} data-testid="sf-watermark" />
                  Logo chìm giữa trang tiêu đề thư
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey="stationery" debounce={450} className="rounded-lg aspect-[16/11] w-full" />
            )}
            {tab === 'flat' && (
              <div className="space-y-2">
                <div className="mv-seg !p-0.5 text-xs w-full" role="tablist">
                  <button type="button" className="mv-seg-btn !py-1 flex-1" data-active={doc === 'letter'} onClick={() => setDoc('letter')} data-testid="sf-doc-letter">Tiêu đề thư</button>
                  <button type="button" className="mv-seg-btn !py-1 flex-1" data-active={doc === 'folder'} onClick={() => setDoc('folder')} data-testid="sf-doc-folder">Kẹp file (khuôn bế)</button>
                </div>
                {doc === 'letter' ? (
                  <>
                    <div className="rounded-md overflow-hidden bg-white shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] mx-auto max-w-[360px]" style={{ aspectRatio: '210 / 297' }} data-testid="sf-letter">
                      <LetterheadSvg spec={spec} data={data} logo={lgo} sample={sample} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                    <label className="flex items-center justify-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} data-testid="sf-sample" /> Hiện thư mẫu (chỉ để xem — file in để trống)
                    </label>
                  </>
                ) : (
                  <div className="rounded-md overflow-hidden bg-white border border-mv-hair" data-testid="sf-folder">
                    <FolderDielineSvg spec={spec} data={data} logo={lgo} labels uid="fdv" style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">Mẫu: {tplName} · thư A4 lề xén {ST_LH_BLEED_MM}mm · kẹp file {FD_TXT} · lề xén {ST_FD_BLEED_MM}mm</div>

            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-slate-400">Tiêu đề thư</div>
              <div className="grid grid-cols-3 gap-2">
                {btn('lhPdf', 'PDF in', dl.lhPdf, true, 'lh-pdf', 'A4 + lề xén 3mm + vạch cắt — gửi xưởng in offset')}
                {btn('lhA4', 'PDF A4', dl.lhA4, false, 'lh-a4', 'Đúng khổ A4, không lề xén — in máy văn phòng / làm mẫu soạn thư')}
                {btn('word', 'Word', dl.word, false, 'word', 'Ảnh header + footer chèn vào Word (Insert → Header)')}
              </div>
              <div className="text-[11px] font-semibold text-slate-400">Kẹp file · ảnh 3D</div>
              <div className="grid grid-cols-3 gap-2">
                {btn('fdPdf', 'PDF khuôn', dl.fdPdf, true, 'fd-pdf', 'Khuôn bế trải phẳng đúng khổ, có nét cắt + nét gấp')}
                {btn('fdSvg', 'SVG khuôn', dl.fdSvg, false, 'fd-svg', 'File vector, chữ đã outline — xưởng mở bằng AI/Corel')}
                {btn('png3d', 'Ảnh 3D', dl.png3d, false, 'png3d')}
              </div>
            </div>
            <PrintRequest product="stationery" title={`Bộ văn phòng · ${tplName}`} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Tự in: tải PDF gửi xưởng (thư in offset Ford 100, kẹp file couche 300 cán mờ, bế túi + khe cài card). Hoặc gửi yêu cầu, Mivy in + giao tận nơi (TP.HCM).</p>
          </div>
        </div>
      )}

      {/* bản ẩn: file in + texture 3D */}
      {ready && (
        <div aria-hidden data-testid="sf-hidden" style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          {box('lhBleed', <LetterheadSvg spec={spec} data={data} logo={lgo} bleed style={{ width: '100%', display: 'block' }} />)}
          {box('lhPlain', <LetterheadSvg spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />)}
          {box('lhHead', <LetterheadSvg spec={spec} data={data} logo={lgo} crop="header" style={{ width: '100%', display: 'block' }} />)}
          {box('lhFoot', <LetterheadSvg spec={spec} data={data} logo={lgo} crop="footer" style={{ width: '100%', display: 'block' }} />)}
          {box('net', <FolderDielineSvg spec={spec} data={data} logo={lgo} uid="fdp" style={{ width: '100%', display: 'block' }} />, 900)}
          {box('front', <FolderFaceSvg face="front" spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />)}
          {box('back', <FolderFaceSvg face="back" spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />)}
          {box('spine', <FolderFaceSvg face="spine" spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />, 20)}
          {box('pocket', <FolderFaceSvg face="pocket" spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />)}
          {box('inside', <FolderFaceSvg face="inside" spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />)}
          {box('letter', <LetterheadSvg spec={spec} data={data} logo={lgo} sample style={{ width: '100%', display: 'block' }} />)}
          {box('cardF', <MiniCardSvg spec={spec} data={data} logo={lgo} side="front" style={{ width: '100%', display: 'block' }} />)}
          {box('cardB', <MiniCardSvg spec={spec} data={data} logo={lgo} side="back" style={{ width: '100%', display: 'block' }} />)}
        </div>
      )}
    </div>
  );
}

const FD_TXT = '220×310mm (A4 đút vừa)';
