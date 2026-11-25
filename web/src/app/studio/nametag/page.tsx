'use client';
// Bảng tên cài áo: chọn mẫu → ngành, tên công ty, danh sách "Tên | Chức vụ | Chức vụ EN" → chất liệu (kim loại khắc laser,
// in UV, mica, gỗ), mặt sau (kim cài / nam châm), hình dáng, khổ → xem 3D → tải tờ sản xuất A4 (mọi người, tỉ lệ 1:1)
// hoặc gửi yêu cầu làm. Render code 100%, logo khách chỉ nằm trên máy.

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  NT_BACKS, NT_FONTS, NT_FONT_CSS, NT_INDUSTRIES, NT_LAYOUTS, NT_MATERIALS, NT_PALETTES, NT_SAMPLES, NT_SHAPES, NT_SIZES, NT_TEMPLATES,
  NametagSheetSvg, NametagSvg, SHEET, defaultNTData, isLaser, ntMaterial, ntSize, parsePeople, sheetFit, sheetPages, useNTFonts,
  type NTData, type NTIndustry, type NTLogo, type NTSpec,
} from '@/lib/nametag-engine';
import { logoToMask } from '@/lib/tape-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = NT_TEMPLATES[0].spec;

function fileToDataUrl(f: File, max = 900): Promise<{ src: string; w: number; h: number }> {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res({ src: c.toDataURL('image/png'), w: c.width, h: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export default function NametagPage() {
  const ready = useNTFonts();
  const [spec, setSpec] = useState<NTSpec>(FIRST);
  const [data, setData] = useState<NTData>(defaultNTData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [raw, setRaw] = useState<{ src: string; w: number; h: number } | null>(null);
  const [mask, setMask] = useState<NTLogo | null>(null);
  const [thr, setThr] = useState(150);
  const [inv, setInv] = useState(false);
  const [who, setWho] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const tex2Ref = useRef<HTMLDivElement | null>(null);
  const sheetsRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const laser = isLaser(spec.material);
  const sz = ntSize(spec.size);
  const mat = ntMaterial(spec.material);
  const people = useMemo(() => {
    const p = parsePeople(data.people || '');
    return p.length ? p : [{ name: 'Họ và tên', title: 'Chức vụ', en: '' }];
  }, [data.people]);
  const cur = people[Math.min(who, people.length - 1)];
  const second = people[people.length > 1 ? (Math.min(who, people.length - 1) + 1) % people.length : 0];
  const pages = sheetPages(spec, people.length);
  const fit = sheetFit(spec);
  const slug = slugify(`bang-ten-${data.brand || ''}`, 'bang-ten');

  // logo: khắc laser → bóng 1 màu (mask); in UV/mica → giữ màu gốc
  useEffect(() => {
    let on = true;
    if (!raw || !laser) { setMask(null); return; }
    logoToMask(raw.src, thr, inv).then((m) => { if (on) setMask(m ? { ...m, mask: true } : null); }).catch(() => on && setMask(null));
    return () => { on = false; };
  }, [raw, laser, thr, inv]);
  const logo: NTLogo | null = raw ? (laser ? mask : { href: raw.src, w: raw.w, h: raw.h, mask: false }) : null;

  const set = (p: Partial<NTSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTemplate = (t: (typeof NT_TEMPLATES)[number]) => {
    setSpec(t.spec);
    if (!dirty) setData(defaultNTData(t.spec.industry));
    setWho(0);
  };
  const pickIndustry = (ind: NTIndustry) => {
    set({ industry: ind });
    if (!dirty) setData(defaultNTData(ind));
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const sheetEls = () => Array.from(sheetsRef.current?.querySelectorAll('svg[data-nt-sheet]') || []) as SVGSVGElement[];

  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => downloadBlob(await toBlob(await shot(1600, 1200)), `${slug}-3d.png`));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, NT_FONT_CSS, 1600, { watermark: false }), `${slug}-${slugify(cur.name, 'ten')}.png`);
  });
  // PDF sản xuất: mỗi tờ A4 1 trang, 300dpi, chữ outline
  const sheetPdf = async () => {
    const els = sheetEls(); if (!els.length) throw new Error('Chưa dựng xong tờ sản xuất');
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const outW = 2480, outH = 3508;
    for (let i = 0; i < els.length; i++) {
      if (i) pdf.addPage('a4', 'portrait');
      const c = await svgToCanvas(await selfContainedSvg(els[i], NT_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, SHEET.W, SHEET.H, undefined, 'FAST');
    }
    return pdf.output('blob');
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await sheetPdf(), `${slug}-${sz.id}-${people.length}cai-to-san-xuat.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = sheetEls(); if (!els.length) return;
    if (els.length === 1) { downloadBlob(await svgFileBlob(els[0], NT_FONT_CSS), `${slug}-${sz.id}-to-san-xuat.svg`); return; }
    const files = [];
    for (let i = 0; i < els.length; i++) {
      const b = await svgFileBlob(els[i], NT_FONT_CSS);
      files.push({ name: `${slug}-to-${i + 1}.svg`, data: new Uint8Array(await b.arrayBuffer()) });
    }
    downloadBlob(zipStore(files), `${slug}-${sz.id}-${els.length}to-san-xuat.zip`);
  });
  const makeFiles = async () => {
    const file = await sheetPdf();
    let preview: Blob;
    try { preview = await toBlob(await shot(1200, 900), 'image/jpeg', 0.85); } catch {
      preview = await svgToPng(svgOf(previewRef)!, NT_FONT_CSS, 1000, { watermark: false });
    }
    return { file, fileName: `${slug}-${sz.id}-${people.length}cai-to-san-xuat.pdf`, preview };
  };

  const build3d = () => import('@/lib/nametag-3d').then((m) => m.nametagBuilder({
    front: svgOf(texRef), front2: svgOf(tex2Ref), material: spec.material, shape: spec.shape, back: spec.back,
    wMm: sz.wMm, hMm: sz.hMm, fontCss: NT_FONT_CSS,
  }));
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __ntSnap?: (w: number, h: number) => Promise<string> }).__ntSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => {
    if (!f) return;
    try { setRaw(await fileToDataUrl(f)); } catch (e) { alert((e as Error).message); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `Bảng tên ${sz.name} · ${mat.name} · ${spec.back === 'pin' ? 'kim cài' : 'nam châm'} · ${people.length} cái`;
  const defaultMaterial = spec.material === 'micaWhite' || spec.material === 'micaBlack' ? 'Bảng tên mica in UV, nam châm' : spec.material === 'wood' ? 'Chưa biết — tư vấn giúp' : 'Bảng tên kim loại khắc, kim cài';
  const rebuildKey = JSON.stringify([spec, data.brand, cur, second, logo?.href.length, logo?.mask]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bảng tên cài áo" sub="Bảng tên nhân viên kim loại khắc laser, in UV, mica, gỗ — kim cài hoặc nam châm. Dán danh sách là ra đủ bảng tên cho cả team, tải tờ sản xuất tỉ lệ 1:1 hoặc đặt Mivy làm." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${NT_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {NT_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.material === t.spec.material && spec.palette === t.spec.palette && spec.shape === t.spec.shape;
                  const ts = ntSize(t.spec.size);
                  const tdata = dirty ? data : NT_SAMPLES[t.spec.industry];
                  const tp = parsePeople(tdata.people || '')[0] || cur;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="nt-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#2A3550] flex items-center justify-center p-2" style={{ aspectRatio: '16 / 9' }}>
                        <div style={{ width: '92%', aspectRatio: `${ts.wMm} / ${ts.hMm}`, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.45))' }}>
                          <NametagSvg spec={t.spec} data={tdata} person={tp} logo={logo && (isLaser(t.spec.material) === laser) ? logo : null} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Công ty & danh sách nhân viên">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Ngành (icon khi chưa có logo + nội dung mẫu)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="nt-industries">
                    {NT_INDUSTRIES.map((i) => <button key={i.id} type="button" onClick={() => pickIndustry(i.id)} className={chip(spec.industry === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                <label className="block">
                  <span className="mv-label block mb-1.5">Tên công ty / thương hiệu</span>
                  <input className="mv-input" value={data.brand || ''} onChange={(e) => setField('brand', e.target.value)} data-testid="nt-brand" />
                </label>
                <label className="block">
                  <span className="mv-label block mb-1.5">Danh sách — mỗi dòng: Họ tên | Chức vụ | Chức vụ tiếng Anh (tuỳ chọn)</span>
                  <textarea className="mv-input min-h-[120px] font-mono !text-xs" value={data.people || ''} onChange={(e) => setField('people', e.target.value)} data-testid="nt-people" placeholder={'Trần Quốc Bảo | Giao dịch viên | Teller'} />
                  <span className="text-[11px] text-slate-500 mt-1 block">{people.length} người → {people.length} bảng tên · {fit.per} bảng/tờ A4 · {pages} tờ sản xuất</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={spec.bilingual} onChange={(e) => set({ bilingual: e.target.checked })} data-testid="nt-bilingual" /> Song ngữ (hiện chức vụ tiếng Anh)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {raw ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" data-testid="nt-logo" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {raw && <button type="button" onClick={() => setRaw(null)} className="mv-btn mv-btn-ghost !flex !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Chưa có logo → dùng icon ngành. Ảnh chỉ nằm trên máy anh/chị.</span>
                </div>
                {raw && laser && (
                  <div className="rounded-lg border border-mv-hair p-2.5 space-y-2">
                    <div className="text-[11px] text-slate-400">Khắc laser chỉ 1 màu → logo được chuyển thành hình đặc. Chỉnh ngưỡng cho rõ nét:</div>
                    <input type="range" min={60} max={230} value={thr} onChange={(e) => setThr(+e.target.value)} className="w-full" />
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={inv} onChange={(e) => setInv(e.target.checked)} /> Logo màu sáng trên nền tối</label>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Chất liệu, mặt sau, hình dáng & màu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="nt-materials">
                    {NT_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`} data-testid={`nt-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Mặt sau</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="nt-backs">
                    {NT_BACKS.map((b) => <button key={b.id} type="button" onClick={() => set({ back: b.id })} className={chip(spec.back === b.id)} title={b.note}>{b.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Hình dáng</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="nt-shapes">
                      {NT_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="nt-sizes">
                      {NT_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="nt-size">{s.name}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="nt-layouts">
                    {NT_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu {laser && <span className="font-normal text-slate-500">(khắc laser luôn 1 màu theo chất liệu)</span>}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="nt-palettes">
                    {NT_PALETTES.map((p) => (
                      <button key={p.id} type="button" disabled={laser} onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)} disabled:opacity-40`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.acc} 50%)` }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font họ tên</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="nt-fonts">
                    {NT_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {f.upper ? cur.name.toLocaleUpperCase('vi') : cur.name}
                      </button>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.size}|${spec.shape}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg bg-[#2A3550] p-5 flex items-center justify-center'} style={{ aspectRatio: '4 / 3' }}>
              <div ref={previewRef} style={{ width: '100%', aspectRatio: `${sz.wMm} / ${sz.hMm}`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' }} data-testid="nt-preview">
                <NametagSvg spec={spec} data={data} person={cur} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            {people.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <span className="shrink-0">Xem bảng của:</span>
                <select className="mv-input !py-1.5 !text-xs" value={Math.min(who, people.length - 1)} onChange={(e) => setWho(+e.target.value)} data-testid="nt-who">
                  {people.map((p, i) => <option key={i} value={i}>{i + 1}. {p.name}</option>)}
                </select>
              </label>
            )}
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {mat.name} · {spec.back === 'pin' ? 'kim cài' : 'nam châm'} · {people.length} cái</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nt-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nt-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG bảng tên
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="nt-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF tờ sản xuất
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nt-svg" title="Vector, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG {pages > 1 ? '(.zip)' : ''}
              </button>
            </div>
            <PrintRequest product="nametag" title={orderTitle} defaultMaterial={defaultMaterial} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Tờ sản xuất A4 tỉ lệ 1:1, mỗi người 1 bảng có đánh số. {laser ? <>Khắc laser: màu <b>đen = vùng khắc</b>, viền xanh là khung phôi.</> : spec.material === 'metalUV' ? <>In UV lên phôi kim loại có sẵn — viền xanh là khung phôi.</> : <>In UV rồi cắt laser theo đường <b>CutContour</b> (hồng).</>}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1200, pointerEvents: 'none' }}>
          <div ref={texRef}><NametagSvg spec={spec} data={data} person={cur} logo={logo} mode="tex" style={{ width: 900, display: 'block' }} /></div>
          <div ref={tex2Ref}><NametagSvg spec={spec} data={data} person={second} logo={logo} mode="tex" style={{ width: 900, display: 'block' }} /></div>
          <div ref={sheetsRef} data-testid="nt-sheets">
            {Array.from({ length: pages }, (_, i) => <NametagSheetSvg key={i} spec={spec} data={data} people={people} logo={logo} page={i} style={{ width: 1000, display: 'block' }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

