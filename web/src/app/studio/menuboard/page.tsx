'use client';
// Bảng menu treo tường (sau quầy): 1–4 tấm ghép, dán thực đơn → tự chia nhóm sang các tấm, tự co chữ vừa khít.
// Xem thành phẩm 3D treo trên tường quán phía trên quầy → tải file in từng tấm đúng khổ (lề xén 3mm) hoặc gửi yêu cầu in.
// Render code 100%; ảnh món + logo khách chỉ nằm trên máy.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  BoardSvg, MBD_BLEED_MM, MBD_FIELDS, MBD_FIRST, MBD_FONTS, MBD_FONT_CSS, MBD_GAP_MM, MBD_INDUSTRIES, MBD_MATERIALS, MBD_PALETTES,
  MBD_SIZES, MBD_TEMPLATES, PanelSvg, buildBoard, defaultMBDData, heroItems, mbdMaterial, mbdPalette, mbdSize, useMBDFonts,
  type MBDData, type MBDIndustry, type MBDSpec, type MBDTemplate,
} from '@/lib/menuboard-engine';
import { MB_PRICES } from '@/lib/menubook-engine';
import { svgFileBlob, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

function fileToDataUrl(f: File, max = 1400): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export default function MenuboardPage() {
  const ready = useMBDFonts();
  const [spec, setSpec] = useState<MBDSpec>(MBD_FIRST);
  const [data, setData] = useState<MBDData>(defaultMBDData(MBD_FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const boardRef = useRef<HTMLDivElement | null>(null);
  const printRefs = useRef<(HTMLDivElement | null)[]>([]);
  const texRefs = useRef<(HTMLDivElement | null)[]>([]);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<MBDSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const sz = mbdSize(spec.size);
  const pal = mbdPalette(spec.palette);
  const mat = mbdMaterial(spec.material);
  const model = useMemo(() => (ready ? buildBoard(spec, data) : null), [ready, spec, data]);
  const heroes = useMemo(() => heroItems(data.menu || ''), [data.menu]);
  const slug = slugify(`bang-menu-${data.brand || 'quan'}`, 'bang-menu');

  const pickTemplate = (t: MBDTemplate) => {
    set(t.spec);
    if (!dirty) setData(defaultMBDData(t.spec.industry));
  };
  const setIndustry = (ind: MBDIndustry) => { set({ industry: ind }); if (!dirty) setData(defaultMBDData(ind)); };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const printEls = () => printRefs.current.slice(0, model?.n || 0).map((d) => d?.querySelector('svg') as SVGSVGElement | null).filter(Boolean) as SVGSVGElement[];
  const maxMm = Math.max(sz.wMm, sz.hMm) + MBD_BLEED_MM * 2;
  const dpi = Math.max(72, Math.min(150, Math.floor(9000 / (maxMm / 25.4))));

  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), type, q));
  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const boardEl = () => boardRef.current?.querySelector('svg') as SVGSVGElement | null;
  const download3d = () => run('3d', async () => downloadBlob(await toBlob(await shot(1600, 1200)), `${slug}-3d.png`));
  const downloadPng = () => run('png', async () => { const el = boardEl(); if (el) downloadBlob(await svgToPng(el, MBD_FONT_CSS, 2400), `${slug}-toan-bang.png`); });
  const printPdf = async () => {
    const els = printEls();
    if (!els.length) throw new Error('Chưa dựng xong file in');
    return svgsToPrintPdf(els, MBD_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, MBD_BLEED_MM, dpi);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-${model?.n}tam-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = printEls();
    if (els.length === 1) { downloadBlob(await svgFileBlob(els[0], MBD_FONT_CSS), `${slug}-${sz.id}-tam1.svg`); return; }
    const files = [];
    for (let i = 0; i < els.length; i++) files.push({ name: `${slug}-${sz.id}-tam${i + 1}.svg`, data: new Uint8Array(await (await svgFileBlob(els[i], MBD_FONT_CSS)).arrayBuffer()) });
    downloadBlob(zipStore(files), `${slug}-${sz.id}-${els.length}tam.zip`);
  });
  const makeFiles = async () => {
    const file = await printPdf();
    let preview: Blob;
    try { preview = await toBlob(await shot(1200, 900), 'image/jpeg', 0.85); } catch {
      preview = await svgToPng(boardEl()!, MBD_FONT_CSS, 1200, { watermark: false });
    }
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/menuboard-3d').then((m) => m.menuboardBuilder({
    panels: texRefs.current.slice(0, model?.n || 0).map((d) => d?.querySelector('svg') as SVGSVGElement | null),
    wMm: sz.wMm, hMm: sz.hMm, gapMm: MBD_GAP_MM, material: spec.material,
    dark: pal.kind === 'chalk' || pal.kind === 'neon', glow: pal.kind === 'neon' ? pal.acc : '#FFE2B0', fontCss: MBD_FONT_CSS,
  }));
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __mbdSnap?: (w: number, h: number) => Promise<string> }).__mbdSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await fileToDataUrl(f, 900)); } catch (e) { alert((e as Error).message); } };
  const onPhoto = async (name: string, f?: File | null) => { if (!f) return; try { const u = await fileToDataUrl(f); setPhotos((p) => ({ ...p, [name]: u })); } catch (e) { alert((e as Error).message); } };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const props = model ? { model, spec, data, photos, logo } : null;
  const boardAspect = model ? `${model.n * model.W + (model.n - 1) * MBD_GAP_MM} / ${model.H}` : '4 / 3';
  const orderTitle = `Bảng menu ${model?.n || spec.panels} tấm ${sz.name} · ${mat.name}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bảng menu treo tường" sub="Menu board sau quầy cà phê, trà sữa, bánh mì, cơm — 1 đến 4 tấm ghép. Dán thực đơn là tự chia nhóm, tự co chữ vừa khít; xem 3D treo trên tường quán, tải file in từng tấm đúng khổ." />

      {!ready || !props || !model ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${MBD_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MBD_TEMPLATES.map((t) => {
                  const on = spec.palette === t.spec.palette && spec.font === t.spec.font && spec.industry === t.spec.industry;
                  const ts: MBDSpec = { ...spec, ...t.spec, panels: Math.min(spec.panels, 2) };
                  const td = dirty ? data : defaultMBDData(t.spec.industry);
                  const tm = buildBoard(ts, td);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="mbd-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9E3DA] flex items-center justify-center p-2" style={{ aspectRatio: '4 / 3' }}>
                        <BoardSvg model={tm} spec={ts} data={td} photos={photos} logo={logo} idp={`t${t.id}`} style={{ width: '100%', maxHeight: '100%', display: 'block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thực đơn & nội dung">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="mv-label mb-1.5">Loại quán (nạp thực đơn mẫu khi chưa sửa)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mbd-industries">
                    {MBD_INDUSTRIES.map((i) => <button key={i.id} type="button" onClick={() => setIndustry(i.id)} className={chip(spec.industry === i.id)}>{i.name}</button>)}
                  </div>
                </div>
                {MBD_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input font-mono !text-xs" rows={f.rows || 3} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`mbd-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`mbd-${f.key}`} />}
                  </label>
                ))}
                <div className="col-span-2 flex items-center gap-2 flex-wrap">
                  <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer" data-testid="mbd-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" data-testid="mbd-logo" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !flex !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                </div>
                {heroes.length > 0 && (
                  <div className="col-span-2 space-y-1.5" data-testid="mbd-heroes">
                    <div className="mv-label">Ảnh món nổi bật (món có dấu + đầu tên) — không có ảnh thì dùng hình vẽ sẵn</div>
                    {heroes.map((h) => (
                      <div key={h.name} className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                        <span className="min-w-[140px] font-medium">{h.name}</span>
                        <label className="mv-btn mv-btn-ghost !flex !py-1.5 !text-xs cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5" /> {photos[h.name] ? 'Đổi ảnh' : 'Tải ảnh'}
                          <input type="file" accept="image/*" className="hidden" data-testid="mbd-photo" onChange={(e) => { void onPhoto(h.name, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                        {photos[h.name] && <button type="button" className="mv-btn mv-btn-ghost !flex !py-1.5 !text-xs" onClick={() => setPhotos((p) => { const q = { ...p }; delete q[h.name]; return q; })}><Trash2 className="w-3.5 h-3.5" /> Bỏ</button>}
                      </div>
                    ))}
                  </div>
                )}
                <p className="col-span-2 text-[11px] text-slate-500">Ảnh & logo chỉ nằm trên máy anh/chị, không gửi lên đâu cả.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Số tấm, khổ, chất liệu, màu & chữ">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Số tấm ghép</div>
                    <div className="flex gap-1.5" data-testid="mbd-panels">
                      {[1, 2, 3, 4].map((n) => <button key={n} type="button" onClick={() => set({ panels: n })} className={chip(spec.panels === n)} data-testid={`mbd-panels-${n}`}>{n} tấm</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Khổ mỗi tấm</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="mbd-sizes">
                      {MBD_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="mbd-size">{s.name}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="mbd-materials">
                    {MBD_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`} data-testid={`mbd-mat-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="mbd-palettes">
                    {MBD_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.bg} 55%, ${p.acc} 55%)` }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="mbd-fonts">
                    {MBD_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {f.upper ? 'CÀ PHÊ SỮA' : 'Cà phê sữa'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Cách ghi giá</div>
                    <div className="flex gap-1.5" data-testid="mbd-prices">
                      {MB_PRICES.map((p) => <button key={p.id} type="button" onClick={() => set({ price: p.id })} className={chip(spec.price === p.id)}>{p.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Chấm dẫn tới giá</div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => set({ leader: true })} className={chip(spec.leader)}>Có</button>
                      <button type="button" onClick={() => set({ leader: false })} className={chip(!spec.leader)}>Không</button>
                    </div>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, Object.entries(photos).map(([k, v]) => k + v.length)])} refitKey={`${spec.size}|${spec.panels}|${spec.material}`} debounce={500} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg bg-[#E4DED4] p-3 flex items-center justify-center'} style={{ aspectRatio: '4 / 3' }}>
              <div ref={boardRef} style={{ width: '100%', aspectRatio: boardAspect, maxHeight: '100%', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))' }} data-testid="mbd-board" data-ready={model ? '1' : '0'}>
                <BoardSvg {...props} idp="pv" style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            {model.overflow && (
              <div className="flex gap-2 items-start rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-200" data-testid="mbd-overflow">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Thực đơn dài quá cho {model.n} tấm {sz.name} — {model.dropped > 0 ? `đang ẩn ${model.dropped} mục cuối. ` : ''}Thêm tấm, chọn khổ lớn hơn hoặc bớt món.</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">{model.n} tấm × {sz.name} · {mat.name} · {model.sections.length} nhóm, {model.sections.reduce((a, s) => a + s.items.length, 0)} món</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mbd-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mbd-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG toàn bảng
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="mbd-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({model.n} trang)
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mbd-svg" title="Vector, chữ đã outline — mỗi tấm 1 file">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG{model.n > 1 ? ' (.zip)' : ''}
              </button>
            </div>
            <PrintRequest product="menuboard" title={orderTitle} defaultMaterial={mat.order} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Mỗi tấm 1 trang PDF đúng khổ thật {sz.name}, lề xén {MBD_BLEED_MM}mm, {dpi}dpi (bảng treo nhìn xa 2–4m — đủ nét). Thứ tự tấm từ trái sang phải;
              Mivy lo in + {spec.material === 'lightbox' ? 'đóng hộp đèn, đi dây' : spec.material === 'wood' ? 'đóng khung gỗ' : 'bắt ốc pát'} + lắp đặt tại quán (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {ready && props && model && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          {Array.from({ length: model.n }, (_, k) => (
            <div key={k}>
              <div ref={(el) => { printRefs.current[k] = el; }} data-testid={`mbd-print-${k}`}><PanelSvg {...props} k={k} bleed={MBD_BLEED_MM} idp="pr" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
              <div ref={(el) => { texRefs.current[k] = el; }}><PanelSvg {...props} k={k} idp="tx" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
