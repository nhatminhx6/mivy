'use client';
// Biển báo · biển chỉ dẫn nội bộ: chọn mẫu (phong cách) → chọn biển đang sửa + tick các biển trong BỘ → sửa chữ,
// khổ, vật liệu (mica / alu / decal dạ quang / treo cờ 2 mặt) → xem 3D trên tường hành lang → tải file in–cắt
// (PDF nhiều trang cho cả bộ, SVG có CutContour + Khoan) hoặc gửi yêu cầu in. Pictogram + chữ render code 100%.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  SB_BLEED_MM, SB_FONT_CSS, SB_MATERIALS, SB_SIGNS, SB_SIZES, SB_STYLES, SB_TEMPLATES,
  SignboardSvg, defaultSBSpec, sbGeom, sbMaterial, sbSign, sbSize, sbStyle, signData, useSBFonts,
  type SBArrow, type SBData, type SBEdit, type SBMaterial, type SBSpec,
} from '@/lib/signboard-engine';
import { svgFileBlob, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const ARROWS: SBArrow[] = ['trái', 'phải', 'lên', 'xuống'];
const enc = new TextEncoder();

export default function SignboardPage() {
  const ready = useSBFonts();
  const [spec, setSpec] = useState<SBSpec>(defaultSBSpec());
  const [data, setData] = useState<SBData>({});
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const auxRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<SBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const sz = sbSize(spec.size);
  const st = sbStyle(spec.style);
  const mat = sbMaterial(spec.material);
  const sg = signData(spec.sign, data);
  const geom = sbGeom(spec.size, spec.material, spec.style);
  const setList = spec.set.includes(spec.sign) ? spec.set : [spec.sign, ...spec.set];
  const edit = (k: keyof SBEdit, v: string) => setData((d) => ({ ...d, [spec.sign]: { ...(d[spec.sign] || {}), [k]: v } }));
  const pick = (id: string) => set({ sign: id, set: spec.set.includes(id) ? spec.set : [...spec.set, id] });
  const toggleSet = (id: string) => setSpec((s) => {
    const has = s.set.includes(id);
    if (has && s.set.length <= 1) return s;
    const next = has ? s.set.filter((x) => x !== id) : [...s.set, id];
    return { ...s, set: next, sign: has && s.sign === id ? next[0] : s.sign };
  });
  const slug = slugify(`bien-bao-${st.name}`, 'bien-bao');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const svgsOf = (r: RefObject<HTMLDivElement | null>) => Array.from(r.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];

  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const download3d = () => run('3d', async () => {
    const c = await shot(1600, 1200);
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, SB_FONT_CSS, 1600), `${slug}-${spec.sign}.png`);
  });
  // PDF in: mỗi biển trong bộ 1 trang (treo cờ: 2 trang/biển — mặt trước + mặt sau)
  const printPdf = async () => {
    const els = svgsOf(pdfRef);
    if (!els.length) throw new Error('Chưa dựng xong file in');
    const pages = spec.material === 'flag' ? els.flatMap((e) => [e, e]) : els;
    return svgsToPrintPdf(pages, SB_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, SB_BLEED_MM, 300);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-${setList.length}bien.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = svgsOf(printRef);
    if (els.length === 1) { downloadBlob(await svgFileBlob(els[0], SB_FONT_CSS), `${slug}-${setList[0]}-file-in-cat.svg`); return; }
    const files: { name: string; data: Uint8Array }[] = [];
    for (let i = 0; i < els.length; i++) {
      const b = await svgFileBlob(els[i], SB_FONT_CSS);
      files.push({ name: `${String(i + 1).padStart(2, '0')}-${setList[i]}-file-in-cat.svg`, data: new Uint8Array(await b.arrayBuffer()) });
    }
    files.push({ name: 'doc-truoc.txt', data: enc.encode(`Bộ ${els.length} biển · ${sz.name} · ${mat.name}\nLớp In: phần in UV · CutContour (hồng): đường cắt tấm · Khoan (xanh): lỗ ốc pát / lỗ treo.\n${spec.material === 'flag' ? 'Biển treo cờ: in 2 mặt giống nhau.\n' : ''}${spec.material === 'glow' ? 'Decal dạ quang: vùng trắng = để trơn decal (phát sáng).\n' : ''}`) });
    downloadBlob(zipStore(files), `${slug}-${sz.id}-${els.length}bien-file-in-cat.zip`);
  });
  const makeFiles = async () => {
    const file = await printPdf();
    let preview: Blob;
    try {
      const c = await shot(1200, 900);
      preview = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/jpeg', 0.85));
    } catch {
      preview = await svgToPng(svgOf(previewRef)!, SB_FONT_CSS, 1000, { watermark: false });
    }
    return { file, fileName: `${slug}-${sz.id}-${setList.length}bien.pdf`, preview };
  };

  // biển phụ cho cảnh 3D: thoát hiểm dạ quang + 1 biển treo cờ (lấy từ bộ nếu có)
  const auxExit = spec.sign === 'exit' ? 'fire' : 'exit';
  const flagId = spec.material === 'flag'
    ? (setList.find((x) => x !== spec.sign && x !== 'exit') || (spec.sign === 'wc' ? 'nosmoke' : 'wc'))
    : (setList.find((x) => x !== spec.sign && x !== 'exit' && x !== 'direction' && x !== 'hours' && x !== 'wifi') || (spec.sign === 'wc' ? 'staff' : 'wc'));
  const auxSpecExit: SBSpec = { ...spec, size: '30x15', material: 'glow', sign: auxExit };
  const auxSpecFlag: SBSpec = { ...spec, size: '15x15', material: spec.material === 'flag' ? 'mica' : 'flag', sign: flagId };
  const item = (s: SBSpec, el: SVGSVGElement | null) => { const g = sbGeom(s.size, s.material, s.style); return { el, W: g.W, H: g.H, r: g.r, material: s.material, holes: g.holes, capD: g.capD }; };
  const build3d = () => import('@/lib/signboard-3d').then((m) => {
    const aux = Array.from(auxRef.current?.querySelectorAll('svg') || []) as SVGSVGElement[];
    const isFlag = spec.material === 'flag';
    return m.signboardBuilder({
      main: item(spec, svgOf(texRef)),
      exit: item(auxSpecExit, aux[0] || null),
      flag: isFlag ? null : item(auxSpecFlag, aux[1] || null),
      side: isFlag ? item(auxSpecFlag, aux[1] || null) : null,
      fontCss: SB_FONT_CSS,
    });
  });
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __sbSnap?: (w: number, h: number) => Promise<string> }).__sbSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `Bộ ${setList.length} biển báo ${sz.name} · ${mat.name}`;
  const thumbSpec = (t: (typeof SB_TEMPLATES)[number]): SBSpec => ({ ...spec, ...t.spec });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Biển báo · biển chỉ dẫn" sub="WC, lối thoát hiểm, cấm hút thuốc, wifi, chỉ hướng, giờ mở cửa… pictogram vẽ sẵn, song ngữ Việt–Anh. Làm cả bộ đồng bộ một phong cách, xem 3D trên tường, tải file in–cắt hoặc đặt Mivy làm." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${SB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SB_TEMPLATES.map((t) => {
                  const on = spec.style === t.spec.style && spec.sign === t.spec.sign && spec.size === t.spec.size && spec.material === t.spec.material;
                  const ts = sbSize(t.spec.size);
                  return (
                    <button key={t.id} type="button" onClick={() => setSpec((s) => ({ ...s, ...t.spec, set: s.set.includes(t.spec.sign) ? s.set : [...s.set, t.spec.sign] }))} data-testid="sb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E6E2DA] flex items-center justify-center p-2" style={{ aspectRatio: '4 / 3' }}>
                        <div style={{ height: ts.wMm / ts.hMm > 1.4 ? undefined : '100%', width: ts.wMm / ts.hMm > 1.4 ? '100%' : undefined, aspectRatio: `${ts.wMm} / ${ts.hMm}`, maxHeight: '100%', filter: 'drop-shadow(0 4px 6px rgba(40,30,20,0.25))' }}>
                          <SignboardSvg spec={thumbSpec(t)} data={data} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`2 · Bộ biển (${setList.length}) & nội dung`}>
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Tick các biển cần làm — bấm tên để sửa biển đó</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="sb-signs">
                    {SB_SIGNS.map((s) => {
                      const inSet = setList.includes(s.id);
                      return (
                        <div key={s.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${spec.sign === s.id ? 'border-indigo-400 bg-indigo-500/15' : 'border-mv-hair'}`}>
                          <input type="checkbox" checked={inSet} onChange={() => toggleSet(s.id)} data-testid={`sb-set-${s.id}`} className="accent-indigo-500" />
                          <button type="button" onClick={() => pick(s.id)} className="text-xs text-left text-slate-200 truncate flex-1" data-testid={`sb-sign-${s.id}`}>{s.name}</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {sg.id !== 'direction' && (
                    <label className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">Tiêu đề</span>
                      <input className="mv-input" value={sg.title} onChange={(e) => edit('title', e.target.value)} data-testid="sb-title" />
                    </label>
                  )}
                  {sg.id !== 'direction' && (
                    <label className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">Tiếng Anh</span>
                      <input className="mv-input" value={sg.en} onChange={(e) => edit('en', e.target.value)} disabled={!spec.bilingual} data-testid="sb-en" />
                    </label>
                  )}
                  {sg.id === 'room' && (
                    <label className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">Số phòng / tầng</span>
                      <input className="mv-input" value={sg.number || ''} onChange={(e) => edit('number', e.target.value)} data-testid="sb-number" />
                    </label>
                  )}
                  {sg.id === 'wifi' && (
                    <>
                      <label className="block col-span-2 sm:col-span-1"><span className="mv-label block mb-1.5">Tên wifi</span>
                        <input className="mv-input" value={sg.ssid || ''} onChange={(e) => edit('ssid', e.target.value)} data-testid="sb-ssid" /></label>
                      <label className="block col-span-2 sm:col-span-1"><span className="mv-label block mb-1.5">Mật khẩu (tạo mã QR)</span>
                        <input className="mv-input" value={sg.pass || ''} onChange={(e) => edit('pass', e.target.value)} data-testid="sb-pass" /></label>
                    </>
                  )}
                  {sg.id === 'exit' && (
                    <div className="col-span-2">
                      <span className="mv-label block mb-1.5">Mũi tên</span>
                      <div className="flex gap-1.5">{ARROWS.map((a) => <button key={a} type="button" onClick={() => edit('arrow', a)} className={chip((sg.arrow || 'phải') === a)}>{a}</button>)}</div>
                    </div>
                  )}
                  {(sg.id === 'direction' || sg.id === 'hours') && (
                    <label className="block col-span-2">
                      <span className="mv-label block mb-1.5">{sg.id === 'direction' ? 'Mỗi dòng: Tên | hướng (trái/phải/lên/xuống) | Tiếng Anh — tối đa 4 dòng' : 'Mỗi dòng: Ngày | Giờ — tối đa 4 dòng'}</span>
                      <textarea className="mv-input min-h-[92px]" value={sg.sub || ''} onChange={(e) => edit('sub', e.target.value)} data-testid="sb-sub" />
                    </label>
                  )}
                  <label className="col-span-2 flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={spec.bilingual} onChange={(e) => set({ bilingual: e.target.checked })} data-testid="sb-bilingual" className="accent-indigo-500" />
                    Song ngữ Việt – Anh (khách sạn, văn phòng có khách nước ngoài)
                  </label>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Phong cách, vật liệu & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Phong cách (cả bộ đồng bộ)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="sb-styles">
                    {SB_STYLES.map((s) => (
                      <button key={s.id} type="button" onClick={() => set({ style: s.id })} className={`flex items-center gap-2 ${chip(spec.style === s.id)}`}>
                        <span className="w-5 h-5 rounded-md shrink-0 border border-mv-hair" style={{ background: s.bg, boxShadow: `inset 0 0 0 4px ${s.tile || s.accent}` }} />
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Vật liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="sb-materials">
                    {SB_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id as SBMaterial })} className={`${chip(spec.material === m.id)} text-left`} data-testid={`sb-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sb-sizes">
                    {SB_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="sb-size">{s.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={`${spec.size}|${spec.material}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg bg-[#E6E2DA] p-4 flex items-center justify-center'} style={{ aspectRatio: '4 / 3' }}>
              <div ref={previewRef} style={{ height: sz.wMm / sz.hMm > 1.4 ? undefined : '100%', width: sz.wMm / sz.hMm > 1.4 ? '100%' : undefined, aspectRatio: `${sz.wMm} / ${sz.hMm}`, maxHeight: '100%', filter: 'drop-shadow(0 8px 14px rgba(40,30,20,0.28))' }} data-testid="sb-preview">
                <SignboardSvg spec={spec} data={data} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sbSign(spec.sign).name} · {sz.name} · {mat.name} · bộ {setList.length} biển{geom.holes.length ? ` · ${geom.holes.length} lỗ ${spec.material === 'flag' ? 'treo' : 'ốc pát'}` : ''}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sb-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sb-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG biển này
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sb-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in cả bộ
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sb-svg" title="Vector, chữ đã outline — lớp In, CutContour, Khoan">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt{setList.length > 1 ? ' (.zip)' : ''}
              </button>
            </div>
            <PrintRequest product="signboard" title={orderTitle}
              defaultMaterial={spec.material === 'glow' ? 'Decal dạ quang (lối thoát hiểm)' : spec.material === 'alu' ? 'Alu in UV' : spec.material === 'mica' ? 'Mica 3mm in UV + băng keo 2 mặt' : 'Chưa biết — tư vấn giúp'}
              design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in đúng khổ, lề xén {SB_BLEED_MM}mm: lớp <b>In</b>, <b>CutContour</b> (đường cắt tấm){geom.holes.length ? <>, <b>Khoan</b> (lỗ {spec.material === 'flag' ? 'treo' : 'ốc pát'})</> : null}.
              {spec.material === 'flag' && ' Biển treo cờ in 2 mặt giống nhau.'}
              {spec.material === 'glow' && ' Decal dạ quang: phần trắng để trơn để phát sáng khi mất điện.'}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="sb-print">{setList.map((id) => <div key={id}><SignboardSvg spec={spec} data={data} signId={id} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>)}</div>
          <div ref={pdfRef}>{setList.map((id) => <div key={id}><SignboardSvg spec={spec} data={data} signId={id} mode="pdf" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>)}</div>
          <div ref={texRef}><SignboardSvg spec={spec} data={data} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={auxRef}>
            <SignboardSvg spec={auxSpecExit} data={data} mode="tex" style={{ width: '100%', display: 'block' }} />
            <SignboardSvg spec={auxSpecFlag} data={data} mode="tex" style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  );
}
