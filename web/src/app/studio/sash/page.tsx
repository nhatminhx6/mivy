'use client';
// Băng đeo chéo sự kiện: chọn mẫu → sửa chữ → dán danh sách tên (mỗi người 1 băng) → xem 3D trên ma-nơ-canh →
// tải file in đúng khổ thật (lề xén, dấu gấp vai + đường may nối) hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, Image as ImageIcon, Loader2, Users } from 'lucide-react';
import {
  SH_BLEED_MM, SH_FIELDS, SH_FINISHES, SH_FONTS, SH_FONT_CSS, SH_INKS, SH_LAYOUTS, SH_SATINS, SH_SIZES, SH_TEMPLATES, SashSvg,
  defaultSHData, defaultSHSpec, lowContrast, parseNames, shInk, shSize, useSHFonts, type SHData, type SHSpec,
} from '@/lib/sash-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToJpeg, svgsToPrintPdf } from '@/lib/svg-export';
import { drawWatermark } from '@/lib/design-engine';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

export default function SashPage() {
  const ready = useSHFonts();
  const [spec, setSpec] = useState<SHSpec>(defaultSHSpec());
  const [data, setData] = useState<SHData>(defaultSHData());
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const curPrintRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = shSize(spec.size);
  const ink = shInk(spec.ink);
  const names = useMemo(() => parseNames(data.names || ''), [data.names]);
  const count = Math.max(1, names.length);
  const cur = Math.min(sel, count - 1);
  const curName = names.length ? names[cur] : undefined;
  const set = (p: Partial<SHSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { if (key !== 'names') setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof SH_TEMPLATES)[number]) => {
    setSpec((s) => ({ ...t.spec, size: s.size }));
    if (!dirty) setData((d) => ({ ...t.data, names: d.names || '' }));
  };
  const slug = slugify(`bang-deo-${data.title || ''}`, 'bang-deo');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const printPdf = async () => {
    const els = Array.from(printRef.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
    if (!els.length) throw new Error('Chưa dựng xong băng, thử lại nhé.');
    return svgsToPrintPdf(els, SH_FONT_CSS, { wMm: sz.L, hMm: sz.W }, SH_BLEED_MM, 150);
  };
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    const vb = el.viewBox.baseVal, w = 2400, h = Math.round((w * vb.height) / vb.width);
    const c = await svgToCanvas(await selfContainedSvg(el, SH_FONT_CSS, { outline: true }), w, h, '#FFFFFF');
    drawWatermark(c);
    downloadBlob(await toBlob(c), `${slug}${curName ? '-' + slugify(curName, 'ten') : ''}.png`);
  });
  const downloadPdf = () => run('pdf', async () => { downloadBlob(await printPdf(), `${slug}-${sz.id}-${count}bang-file-in.pdf`); });
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(curPrintRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, SH_FONT_CSS), `${slug}-${sz.id}-file-in.svg`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    const [file, preview] = await Promise.all([
      printPdf(),
      view3d.current && tab === '3d'
        ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86)).catch(() => svgToJpeg(pv!, SH_FONT_CSS, 1200))
        : svgToJpeg(pv!, SH_FONT_CSS, 1200),
    ]);
    return { file, fileName: `${slug}-${sz.id}-${count}bang-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/sash-3d').then((m) => m.sashBuilder({ tex: svgOf(texRef), mask: svgOf(maskRef), spec, fontCss: SH_FONT_CSS }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __shSnap?: (w: number, h: number, az?: number, el?: number) => Promise<string> }).__shSnap = async (w, h, az, el) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h, az === undefined ? {} : { view: { az, el: el ?? 0.12 } })).toDataURL('image/png'); }; // QC: chụp góc mặc định (hoặc góc chỉ định)

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const warn = lowContrast(spec.satin, spec.ink);
  const orderTitle = `Băng đeo chéo ${sz.name} · satin ${SH_SATINS.find((s) => s.id === spec.satin)?.name} · ${ink.name} · ${count} băng`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Băng đeo chéo" sub="Băng satin vắt vai cho đại sứ, tân sinh viên, cô dâu, sinh nhật, ban tổ chức… — chữ ép nhũ vàng/bạc, dán danh sách tên là ra mỗi người 1 băng. Tải file in đúng khổ hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-20 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${SH_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SH_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.satin === t.spec.satin && spec.font === t.spec.font && spec.ink === t.spec.ink;
                  const d = dirty ? data : { ...t.data };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="sh-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-colors ${on ? 'border-indigo-400 ring-1 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-md overflow-hidden bg-slate-100">
                        <SashSvg spec={{ ...t.spec, size: spec.size }} data={d} mode="front" style={{ width: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                {SH_FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs text-slate-400">{f.label}</span>
                    <input className="mv-input mt-1" value={data[f.key] || ''} placeholder={f.ph} maxLength={f.key === 'back' ? 30 : f.key === 'sub' ? 60 : 48}
                      onChange={(e) => setField(f.key, e.target.value)} data-testid={`sh-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`3 · Danh sách tên (${names.length ? names.length + ' băng' : 'không bắt buộc'})`}>
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Mỗi dòng 1 người — tên in vào dòng phụ, mỗi người 1 băng riêng. Để trống nếu cả nhóm dùng chung 1 mẫu.</p>
                <textarea className="mv-input min-h-[110px]" value={data.names || ''} placeholder={'Thu Hà\nQuốc Bảo\nGia Khánh'}
                  onChange={(e) => { setField('names', e.target.value); setSel(0); }} data-testid="sh-names" />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu satin, mực, font & khổ">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Màu satin</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sh-satins">
                    {SH_SATINS.map((s) => (
                      <button key={s.id} type="button" onClick={() => set({ satin: s.id })} className={`flex items-center gap-1.5 ${chip(spec.satin === s.id)}`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: s.bg }} />{s.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Mực chữ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sh-inks">
                    {SH_INKS.map((i) => (
                      <button key={i.id} type="button" onClick={() => set({ ink: i.id })} className={`flex items-center gap-1.5 ${chip(spec.ink === i.id)}`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: `linear-gradient(135deg, ${i.g[0]}, ${i.g[1]}, ${i.g[2]})` }} />{i.name}
                      </button>
                    ))}
                  </div>
                  {warn && <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1" data-testid="sh-warn"><AlertTriangle className="w-3 h-3" /> Mực gần màu satin — chữ sẽ khó đọc, nên đổi mực hoặc màu băng.</p>}
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sh-layouts">
                    {SH_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="sh-fonts">
                    {SH_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: f.script ? 16 : 12 }}>{f.script ? 'Bride to be' : 'ĐẠI SỨ'}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Khổ băng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sh-sizes">
                    {SH_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Chỗ nối ở hông</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sh-finishes">
                    {SH_FINISHES.map((f) => <button key={f.id} type="button" onClick={() => set({ finish: f.id })} className={chip(spec.finish === f.id)}>{f.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg truncate">Xem trước{curName ? ` · ${curName}` : ''}</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data.title, data.sub, data.back, curName])} refitKey={spec.size} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Đoạn trước (từ vai xuống hông)</div>
                <div ref={frontRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" data-testid="sh-front">
                  <SashSvg spec={spec} data={data} name={curName} mode="front" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Cả dải {sz.L / 10}cm (nét hồng: gấp vai giữa băng, may nối 2 đầu)</div>
                <div ref={curPrintRef} className="rounded overflow-hidden" data-testid="sh-print-cur">
                  <SashSvg spec={spec} data={data} name={curName} mode="print" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
            {names.length > 1 && (
              <div>
                <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> {names.length} băng — bấm để xem</div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto" data-testid="sh-people">
                  {names.map((n, i) => <button key={i} type="button" onClick={() => setSel(i)} className={chip(i === cur)}>{n}</button>)}
                </div>
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {ink.name} · {count} băng · lề xén {SH_BLEED_MM}mm</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sh-3d">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sh-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sh-pdf" title="Mỗi người 1 trang, đúng khổ thật + lề xén + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sh-svg">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="sash" title={orderTitle} defaultMaterial={ink.foil ? 'Satin in chữ nhũ' : 'Vải lụa in chuyển nhiệt'} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in là cả dải băng đúng khổ thật: giữa băng là nếp gấp vai, 2 đầu chồng {40}mm may nối ở hông. Chữ nằm ở đoạn trước (vai → hông). {ink.foil ? 'Phần chữ màu nhũ là khuôn ép nhũ.' : ''}</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D + khuôn nhũ + file in từng người */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1800, pointerEvents: 'none' }}>
          <div ref={texRef}><SashSvg spec={spec} data={data} name={curName} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={maskRef}><SashSvg spec={spec} data={data} name={curName} mode="mask" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="sh-print-all">
            {(names.length ? names : [undefined]).map((n, i) => <div key={i}><SashSvg spec={spec} data={data} name={n} mode="print" style={{ width: '100%', display: 'block' }} /></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
