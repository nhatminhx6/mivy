'use client';
// Mác áo dệt · nhãn may: chọn loại (mác cổ / size / nhãn giặt / mác da) → mẫu → khổ, kiểu gấp, chất liệu → nội dung, logo
// → kiểm tra màu chỉ + cỡ chữ tối thiểu → xem 3D (mác may trong cổ áo, nhãn giặt ở sườn, mác da trên lưng quần jean)
// → tải file sản xuất 1:1 (đường gấp, đường may, CutContour, bảng màu chỉ) hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  SHEET_H, SHEET_W, WL_FIELDS, WL_FINISHES, WL_FOLDS, WL_FONTS, WL_FONT_CSS, WL_ICONS, WL_KINDS, WL_LAYOUTS, WL_MATERIALS,
  WL_PALETTES, WL_PATCH_LAYOUTS, WL_SIZES, WL_TEMPLATES, WovenFaceSvg, WovenFlatSvg, WovenSheetSvg, defaultWLData, flatGeom,
  sizeList, useWLFonts, wlCheck, wlMaterial, wlSize, type WLData, type WLKind, type WLLogo, type WLSpec,
} from '@/lib/wovenlabel-engine';
import { logoToMask } from '@/lib/tape-engine';
import { svgFileBlob, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const firstOf = (k: WLKind): WLSpec => ({ ...WL_TEMPLATES.find((t) => t.spec.kind === k)!.spec });
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

// ảnh logo khách: đọc trên máy, không gửi đi đâu
async function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
}

export default function WovenLabelPage() {
  const ready = useWLFonts();
  const [specs, setSpecs] = useState<Record<WLKind, WLSpec>>({ main: firstOf('main'), size: firstOf('size'), care: firstOf('care'), patch: firstOf('patch') });
  const [kind, setKind] = useState<WLKind>('main');
  const [data, setData] = useState<WLData>(defaultWLData());
  const [logoSrc, setLogoSrc] = useState('');
  const [thr, setThr] = useState(150);
  const [logo, setLogo] = useState<WLLogo | undefined>(undefined);
  const [sizePick, setSizePick] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const tex = { main: useRef<HTMLDivElement | null>(null), size: useRef<HTMLDivElement | null>(null), care: useRef<HTMLDivElement | null>(null), patch: useRef<HTMLDivElement | null>(null), mask: useRef<HTMLDivElement | null>(null) };
  const view3d = useRef<Mockup3DHandle | null>(null);

  const spec = specs[kind];
  const sz = wlSize(spec.size);
  const mat = wlMaterial(spec.material);
  const sizes = sizeList(data);
  const curSize = kind === 'size' ? (sizes[Math.min(sizePick, Math.max(0, sizes.length - 1))] || 'M') : undefined;
  const set = (p: Partial<WLSpec>) => setSpecs((s) => ({ ...s, [kind]: { ...s[kind], ...p } }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const chk = useMemo(() => (ready ? wlCheck(spec, data, logo) : { minFont: 0, colors: [], warnings: [] }), [ready, spec, data, logo]);
  const slug = slugify(`mac-ao-${kind}-${data.brand || ''}`, 'mac-ao');
  const kindName = WL_KINDS.find((k) => k.id === kind)!.name;
  const g = flatGeom(spec);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const applyLogo = async (src: string, t: number) => {
    if (!src) { setLogo(undefined); return; }
    try { setLogo((await logoToMask(src, t)) || undefined); } catch { alert('Không đọc được ảnh logo này, thử file PNG/JPG khác nhé.'); }
  };
  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    const src = await readFile(f); setLogoSrc(src); await applyLogo(src, thr);
  };

  const downloadPng = () => run('png', async () => {
    const el = svgOf(faceRef); if (!el) return;
    downloadBlob(await svgToPng(el, WL_FONT_CSS, 1600, { watermark: false }), `${slug}-${sz.wMm}x${sz.hMm}${curSize ? `-size-${curSize}` : ''}.png`);
  });
  const makePdf = async () => {
    const el = svgOf(sheetRef); if (!el) throw new Error('Chưa dựng xong file sản xuất, thử lại nhé.');
    return svgToSizedPdf(el, WL_FONT_CSS, SHEET_W, SHEET_H, 300);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-file-san-xuat-a4.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(sheetRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, WL_FONT_CSS), `${slug}-file-san-xuat.svg`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true }), 'image/png'), `${slug}-3d.png`);
  });

  const build3d = () => import('@/lib/wovenlabel-3d').then((m) => m.wovenLabelBuilder({
    focus: kind,
    main: { el: svgOf(tex.main), spec: specs.main },
    size: { el: svgOf(tex.size), spec: specs.size },
    care: { el: svgOf(tex.care), spec: specs.care },
    patch: { el: svgOf(tex.patch), mask: svgOf(tex.mask), spec: specs.patch },
    fontCss: WL_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __wlSnap?: (w: number, h: number) => Promise<string> }).__wlSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const makeFiles = async () => {
    const file = await makePdf();
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await svgToPng(svgOf(faceRef)!, WL_FONT_CSS, 900);
    return { file, fileName: `${slug}-file-san-xuat-a4.pdf`, preview };
  };
  const orderTitle = `${kindName} ${sz.name} · ${mat.name} · ${WL_FOLDS.find((f) => f.id === spec.fold)?.name}${kind === 'size' ? ` · bộ ${sizes.join('/')}` : ''}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = WL_TEMPLATES.filter((t) => t.spec.kind === kind);
  const fields = WL_FIELDS.filter((f) => f.kinds.includes(kind));
  const sv = { width: '100%', height: '100%', display: 'block' } as const;
  const faceAspect = `${sz.wMm} / ${sz.hMm}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Mác áo dệt · nhãn may" sub="Mác cổ dệt, nhãn size, nhãn hướng dẫn giặt, mác da cho shop thời trang — kiểm tra màu chỉ & cỡ chữ máy dệt, file sản xuất 1:1 có đường gấp, đường may." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {WL_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={kind === k.id} onClick={() => { setKind(k.id); setSizePick(0); }} data-testid={`wl-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {tpls.map((t) => {
                  const on = spec.palette === t.spec.palette && spec.font === t.spec.font && spec.layout === t.spec.layout;
                  const ts = wlSize(t.spec.size);
                  return (
                    <button key={t.id} type="button" onClick={() => setSpecs((s) => ({ ...s, [kind]: { ...t.spec } }))} data-testid="wl-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-ink/[0.05] p-3 grid place-items-center" style={{ aspectRatio: kind === 'care' ? '3 / 4' : '16 / 10' }}>
                        <div style={{ aspectRatio: `${ts.wMm} / ${ts.hMm}`, width: kind === 'care' ? undefined : '100%', height: kind === 'care' ? '100%' : undefined, filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.22))' }}>
                          <WovenFaceSvg spec={t.spec} data={data} logo={logo} sizeLabel={kind === 'size' ? sizes[0] : undefined} uid={`wlt-${t.id}`} style={sv} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Khổ, kiểu gấp & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ thành phẩm</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="wl-sizes">
                    {WL_SIZES.filter((s) => s.kind === kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kiểu gấp / may</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="wl-folds">
                    {WL_FOLDS.filter((f) => f.kinds.includes(kind)).map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ fold: f.id })} className={`${chip(spec.fold === f.id)} text-left`}>
                        <div>{f.name}</div><div className="text-[10px] font-normal text-slate-500">{f.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="wl-materials">
                    {WL_MATERIALS.filter((m) => m.kinds.includes(kind)).map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {kind === 'patch' && (
                  <div>
                    <div className="mv-label mb-1.5">Gia công logo</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="wl-finishes">
                      {WL_FINISHES.map((f) => (
                        <button key={f.id} type="button" onClick={() => set({ finish: f.id })} className={`${chip(spec.finish === f.id)} text-left`}>
                          <div>{f.name}</div><div className="text-[10px] font-normal text-slate-500">{f.note}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-4">
                {(kind === 'main' || kind === 'patch') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} data-testid="wl-logo-input" />
                    <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid="wl-logo-btn">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    </button>
                    {logo && (
                      <>
                        <label className="flex items-center gap-2 text-[11px] text-slate-400">Độ đậm
                          <input type="range" min={60} max={230} value={thr} onChange={(e) => { const v = +e.target.value; setThr(v); applyLogo(logoSrc, v); }} />
                        </label>
                        <button type="button" onClick={() => { setLogo(undefined); setLogoSrc(''); }} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>
                      </>
                    )}
                    <span className="text-[11px] text-slate-500">Logo tự chuyển 1 màu chỉ (mác dệt không dệt được ảnh nhiều màu).</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[110px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`wl-in-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`wl-in-${f.key}`} />}
                    </label>
                  ))}
                </div>
                {kind === 'care' && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={data.bilingual !== '0'} onChange={(e) => setField('bilingual', e.target.checked ? '1' : '0')} data-testid="wl-bilingual" />
                    Song ngữ Việt – Anh (hàng xuất khẩu, bán sàn quốc tế)
                  </label>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu chỉ, font & bố cục">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">{mat.woven ? 'Bảng màu chỉ' : kind === 'patch' ? 'Màu da' : 'Màu nền · mực'}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="wl-palettes">
                    {WL_PALETTES.filter((p) => p.kinds.includes(kind)).map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.ink} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font thương hiệu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="wl-fonts">
                    {WL_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {(data.brand || 'An Khang').slice(0, 12)}
                      </button>
                    ))}
                  </div>
                </div>
                {(kind === 'main' || kind === 'patch') && (
                  <div>
                    <div className="mv-label mb-1.5">Bố cục</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="wl-layouts">
                      {(kind === 'main' ? WL_LAYOUTS : WL_PATCH_LAYOUTS).map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                )}
                {(kind === 'main' || kind === 'patch') && (
                  <div>
                    <div className="mv-label mb-1.5">Biểu tượng (khi không có logo)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="wl-icons">
                      {WL_ICONS.map((ic) => <button key={ic.id} type="button" onClick={() => set({ icon: ic.id })} className={chip(spec.icon === ic.id)}>{ic.name}</button>)}
                    </div>
                  </div>
                )}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([kind, specs, data, logo?.href.length || 0, thr])} refitKey={`${kind}|${spec.size}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 rounded-lg bg-ink/[0.04] p-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="wl-flat">
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt mác · {sz.name}</div>
                <div className="mx-auto" ref={faceRef} style={{ aspectRatio: faceAspect, maxHeight: kind === 'care' ? 360 : undefined, width: kind === 'care' ? 'auto' : '100%', height: kind === 'care' ? 360 : undefined, filter: 'drop-shadow(0 6px 12px rgba(15,23,42,0.22))' }} data-testid="wl-face">
                  <WovenFaceSvg spec={spec} data={data} logo={logo} sizeLabel={curSize} uid="wlv" style={sv} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Trải phẳng {g.W}×{g.H}mm — nét xanh: gấp · gạch xám: phần gấp/kẹp may · hồng: cắt</div>
                <div className="mx-auto" style={{ aspectRatio: `${g.W + 4} / ${g.H + 4}`, maxHeight: 300, width: g.H > g.W * 1.2 ? 'auto' : '100%', height: g.H > g.W * 1.2 ? 300 : undefined }} data-testid="wl-flatgeom">
                  <WovenFlatSvg spec={spec} data={data} logo={logo} sizeLabel={curSize} uid="wlfg" style={sv} />
                </div>
              </div>
            </div>
            {kind === 'size' && sizes.length > 1 && (
              <div className="flex flex-wrap justify-center gap-1.5" data-testid="wl-size-pick">
                {sizes.map((s, i) => <button key={`${s}-${i}`} type="button" onClick={() => setSizePick(i)} className={chip(i === sizePick)}>{s}</button>)}
              </div>
            )}
            <div className="rounded-lg border border-mv-hair p-2.5 space-y-1.5" data-testid="wl-colors" data-count={chk.colors.length}>
              <div className="text-[11px] font-semibold text-slate-300">{mat.woven ? `Màu chỉ: ${chk.colors.length}/${mat.maxColors}` : kind === 'patch' ? 'Gia công' : `Màu in: ${chk.colors.length}`} · chữ nhỏ nhất {chk.minFont.toFixed(2)}mm (≥ {mat.minText}mm)</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {chk.colors.map((c) => (
                  <span key={c.hex} className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-3.5 h-3.5 rounded-sm border border-mv-hair" style={{ background: c.hex }} />{c.name} <span className="text-slate-500">{c.hex}</span></span>
                ))}
              </div>
              {chk.warnings.map((w, i) => (
                <div key={i} className="flex gap-1.5 text-[11px] text-amber-300" data-testid="wl-warning"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wl-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt mác
              </button>
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wl-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="wl-pdf" title="A4 tỉ lệ 1:1: thông số, bảng màu chỉ, mác trải phẳng có đường gấp/may/cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF sản xuất
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wl-svg" title="Vector, chữ đã outline — xưởng mở bằng AI/Corel">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG sản xuất
              </button>
            </div>
            <PrintRequest product="wovenlabel" title={orderTitle} defaultMaterial={mat.order || undefined} design={{ kind, spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File sản xuất tỉ lệ 1:1 gồm thông số, bảng màu chỉ, mác trải phẳng (phần gấp {kind === 'patch' ? 'không có — mác bế theo khuôn' : '5mm / mép may 3mm'}) và bản phóng to để xưởng dò lại. Mác dệt: xưởng làm mẫu dệt thử trước khi chạy số lượng.
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D (mỗi loại mác), khuôn ép mác da, tờ sản xuất */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={tex.main}><WovenFaceSvg spec={specs.main} data={data} logo={logo} uid="wlx-m" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={tex.size}><WovenFaceSvg spec={specs.size} data={data} sizeLabel={kind === 'size' ? curSize : (sizes[1] || sizes[0] || 'M')} uid="wlx-s" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={tex.care}><WovenFaceSvg spec={specs.care} data={data} uid="wlx-c" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={tex.patch}><WovenFaceSvg spec={specs.patch} data={data} logo={logo} uid="wlx-p" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={tex.mask}><WovenFaceSvg spec={specs.patch} data={data} logo={logo} mode="mask" uid="wlx-k" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef} data-testid="wl-sheet"><WovenSheetSvg spec={spec} data={data} logo={logo} uid="wlsh" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
