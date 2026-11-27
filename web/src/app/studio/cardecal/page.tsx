'use client';

import { useRef, useState, type ReactNode } from 'react';
import { zipSync } from 'fflate';
import { PageHeader } from '@/components/PageHeader';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { PrintRequest } from '@/components/PrintRequest';
import { downloadBlob } from '@/lib/html-export';
import { scaleImage } from '@/lib/image-utils';
import { toDataUrl, selfContainedSvg, svgToJpeg, svgToSizedPdf } from '@/lib/svg-export';
import { useCDFonts, CD_FONT_CSS, CD_TEMPLATES as TEMPLATES, CD_FIELDS, CarDecalSvg, cdPanels, cdHasHood, CD_VEHICLES, CD_PALETTES, CD_PAINTS, CD_FONTS, CD_LAYOUTS, CD_INDUSTRIES, sampleData, type CDPanelId, type CDSpec, type CDData } from '@/lib/cardecal-engine';



const FONT_CSS = CD_FONT_CSS;
const templateSpec = (template: (typeof TEMPLATES)[number]): CDSpec => ({...template.spec});
const svgOf = (el: HTMLElement | null) => el?.querySelector('svg') ?? null;

function choice<T extends string | number>(label: string, value: T, options: readonly { id: T; name: string }[], onChange: (id: T) => void) {
  return (
    <label className="block">
      <span className="mv-label mb-1 block">{label}</span>
      <select className="mv-input" value={value} onChange={(e) => {
        const next = options.find(({id}) => String(id) === e.target.value);
        if (next) onChange(next.id);
      }}>
        {options.map(({id, name}) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}

export default function StudioPage() {
  const fontsReady = useCDFonts();
  const [spec, setSpec] = useState(() => templateSpec(TEMPLATES[0]));
  const [data, setData] = useState<CDData>(() => sampleData(TEMPLATES[0].spec.industry));
  const [selected, setSelected] = useState(TEMPLATES[0].id);
  const [logo, setLogo] = useState<string>('');
  const [panel, setPanel] = useState<CDPanelId>('left');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const view = useRef<Mockup3DHandle>(null);
  const flatRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const texRef = useRef<HTMLDivElement>(null);
  const panels = cdPanels(spec.vehicle, spec.hood);
  const selectedPanel = panels.find((item) => item.id === panel) ?? panels[0];
  const art = { spec, data, logo };
  const set = (next: Partial<CDSpec>) => setSpec((prev) => ({...prev, ...next}));
  const sheets: {name: string; art: ReactNode}[] = panels.map((panel) => ({name:panel.id, art:<CarDecalSvg {...art} panel={panel.id} mode="print" />}));
  const textures = panels.map((panel) => <CarDecalSvg {...art} key={panel.id} panel={panel.id} mode="tex" />);
  const build = async () => {
    const { buildMockup } = await import('@/lib/cardecal-3d');
    const svgs = Array.from(texRef.current?.querySelectorAll('svg') ?? []);
    return buildMockup(spec, svgs, FONT_CSS);
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as Window & {__cdSnap?: (w: number, h: number) => Promise<string>}).__cdSnap = async (w, h) => {
      const [{snapshot}, builder] = await Promise.all([import('@/lib/mockup3d'), build()]);
      return (await snapshot(builder, w, h)).toDataURL('image/png');
    };
  }

  const getSheets = () => {
    const nodes = Array.from(printRef.current?.children ?? []).map((el) => svgOf(el as HTMLElement));
    if (!nodes.length || nodes.some((svg) => svg === null)) throw new Error('Bản in chưa sẵn sàng.');
    return nodes as SVGSVGElement[];
  };

  async function productionFile() {
    const nodes = getSheets();
    const assets = await Promise.all(nodes.map(async (svg, i) => {
      const outlined = await selfContainedSvg(svg, undefined, {outline:true});
      if (outlined.querySelector('text')) throw new Error('Không thể chuyển toàn bộ chữ thành đường nét.');
      return [sheets[i].name + '.svg', new TextEncoder().encode(new XMLSerializer().serializeToString(outlined))] as const;
    }));
    if (assets.length === 1) return { file: new Blob([assets[0][1]], {type:'image/svg+xml'}), fileName: 'cardecal.svg' };
    const archive = zipSync(Object.fromEntries(assets));
    return { file: new Blob([Uint8Array.from(archive)], {type:'application/zip'}), fileName: 'cardecal.zip' };
  }

  async function makeFiles() {
    const svg = svgOf(flatRef.current);
    if (!svg) throw new Error('Chưa dựng xong bản xem trước.');
    const flat = () => svgToJpeg(svg, FONT_CSS, 1000);
    const preview = view.current
      ? await view.current.snapshot(1200, 900).then((canvas) => new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh 3D.')), 'image/jpeg', 0.86);
        })).catch(flat)
      : await flat();
    return { ...await productionFile(), preview };
  }

  async function download(kind: 'svg' | 'pdf' | '3d') {
    setBusy(true);
    setError('');
    try {
      if (kind === 'svg') {
        const { file, fileName } = await productionFile();
        downloadBlob(file, fileName);
      } else if (kind === 'pdf') {
        const nodes = getSheets();
        const files = await Promise.all(nodes.map(async (svg, i) => {
          const vb = svg.viewBox.baseVal;
          const w = parseFloat(svg.getAttribute('width') ?? '') || vb.width;
          const h = parseFloat(svg.getAttribute('height') ?? '') || vb.height;
          const dpi = Math.min(150, 25.4 * 4096 / Math.max(w, h));
          const pdf = await svgToSizedPdf(svg, FONT_CSS, w, h, dpi);
          return [sheets[i].name + '.pdf', new Uint8Array(await pdf.arrayBuffer())] as const;
        }));
        if (files.length === 1) downloadBlob(new Blob([files[0][1]], {type:'application/pdf'}), 'cardecal.pdf');
        else downloadBlob(new Blob([Uint8Array.from(zipSync(Object.fromEntries(files)))], {type:'application/zip'}), 'cardecal-pdf.zip');
      } else {
        const canvas = await view.current?.snapshot(1600, 1200, {watermark:true});
        if (!canvas) throw new Error('Xem trước 3D chưa sẵn sàng.');
        const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh 3D.'))));
        downloadBlob(image, 'cardecal-3d.png');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được file.');
    } finally {
      setBusy(false);
    }
  }

  if (!fontsReady) return <p className="p-6" role="status">Đang tải font…</p>;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Decal dán xe công ty" sub="Chọn mẫu, nhập nội dung và xem thành phẩm trước khi tải file in." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="min-w-0 space-y-4">
          <CollapsibleSection title="Mẫu thiết kế">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => <button key={t.id} type="button" data-testid="cd-tpl" aria-pressed={selected === t.id}
                className={`rounded-lg border p-2 text-sm ${selected === t.id ? 'border-indigo-400 bg-indigo-500/15' : 'border-mv-hair'}`}
                onClick={() => {
                  setData((current) => {
                    const previous = TEMPLATES.find((template) => template.id === selected) ?? TEMPLATES[0];
                    const sampleFor = (t: (typeof TEMPLATES)[number]) => sampleData(t.spec.industry);
                    const sample = sampleFor(previous);
                    return {...sampleFor(t), ...Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== (sample as Record<string,string>)[key]))};
                  });
                  setSpec(templateSpec(t));
                  setSelected(t.id);
                }}>
                  <span className="mb-1 grid h-20 place-items-center overflow-hidden rounded bg-stone-100 [&>svg]:h-full [&>svg]:w-full">
                    <CarDecalSvg spec={t.spec} data={sampleData(t.spec.industry)} panel="left" />
                  </span>
                  {t.name}
                </button>)}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Nội dung">
            <div className="grid gap-3 sm:grid-cols-2">
              {CD_FIELDS.filter((field) => !('mailer' in field && field.mailer && !('style' in spec && spec.style === 'mailer'))).map((field) => (
                <label key={field.key}>
                  <span className="mv-label mb-1 block">{field.label}</span>
                  <input className="mv-input" data-testid={`cd-field-${field.key}`} value={data[field.key] ?? ''} onChange={(e) => setData((prev) => ({...prev, [field.key]:e.target.value}))} />
                </label>
              ))}
              <label className="block"><span className="mv-label mb-1 block">Ảnh logo</span>
                <input type="file" accept="image/*" className="mv-input" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setError('');
                  try {
                    const url = await scaleImage(file);
                    const image = await toDataUrl(url).finally(() => URL.revokeObjectURL(url));
                    setLogo(image);
                  } catch { setError('Không đọc được ảnh logo.'); }
                }} />
              </label>
              {logo && <button type="button" className="mv-btn mv-btn-ghost" onClick={() => setLogo('')}>Bỏ logo</button>}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Quy cách in">
            <div className="grid gap-3 sm:grid-cols-2">
            {choice('Dòng xe', spec.vehicle, CD_VEHICLES, (vehicle) => set({vehicle, hood: spec.hood && cdHasHood(vehicle)}))}
            {choice('Bảng màu', spec.palette, CD_PALETTES, (palette) => set({palette}))}
            {choice('Màu xe', spec.paint, CD_PAINTS, (paint) => set({paint}))}
            {choice('Kiểu chữ', spec.font, CD_FONTS, (font) => set({font}))}
            {choice('Bố cục', spec.layout, CD_LAYOUTS, (layout) => set({layout}))}
            {choice('Ngành', spec.industry, CD_INDUSTRIES, (industry) => {set({industry}); setData(sampleData(industry));})}
            {choice('Loại decal', spec.kind, [{id:'print',name:'Decal in'},{id:'cut',name:'Decal cắt chữ'}] as const, (kind) => set({kind}))}
            {cdHasHood(spec.vehicle) && <label><input type="checkbox" checked={spec.hood} onChange={(e) => set({hood:e.target.checked})} /> In nắp capo</label>}
            </div>
          </CollapsibleSection>
        </div>
        <div className="glass-card space-y-3 rounded-2xl border border-indigo-500/40 p-4 lg:sticky lg:top-4">
          <div className="flex justify-between"><span className="font-bold">Xem trước</span><PreviewTabs value={tab} onChange={setTab} /></div>
          {tab === '3d' && <Mockup3DView ref={view} build={build} rebuildKey={JSON.stringify([spec,data,logo])} refitKey={spec.vehicle} className="aspect-[4/3] rounded-lg" />}
          <div ref={flatRef} data-testid="cd-preview" className={tab === '3d' ? 'hidden' : 'rounded-lg bg-stone-100 p-4 [&>svg]:w-full'}>
            <CarDecalSvg {...art} panel={selectedPanel.id} />
            <div className="mt-2 text-slate-700">{choice('Mặt xem trước', selectedPanel.id, panels, setPanel)}</div>
            {sheets.map(({name, art}) => <details className="mt-3 text-slate-700" key={name}><summary>Bản in {name.replaceAll('-', ' ')}</summary><div className="[&>svg]:h-auto [&>svg]:w-full">{art}</div></details>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mv-btn mv-btn-ghost" disabled={busy || tab !== '3d'} onClick={() => void download('3d')}>Ảnh 3D</button>
            <button type="button" className="mv-btn mv-btn-ghost" disabled={busy} onClick={() => void download('pdf')}>PDF in</button>
            <button type="button" className="mv-btn mv-btn-primary" data-testid="cd-svg" disabled={busy} onClick={() => void download('svg')}>File in SVG{sheets.length > 1 ? ' (.zip)' : ''}</button>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <PrintRequest product="cardecal" title="Decal dán xe công ty" design={{spec,data}} makeFiles={makeFiles} />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[800px]">
        <div ref={texRef}>{textures}</div>
        <div ref={printRef}>{sheets.map(({name,art}) => <div key={name}>{art}</div>)}</div>
      </div>
    </div>
  );
}

