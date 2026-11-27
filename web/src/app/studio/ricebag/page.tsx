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
import { useRBFonts, RB_FONT_CSS, RB_TEMPLATES as TEMPLATES, RB_FIELDS, RBFaceSvg, RBSheetSvg, rbSize, sizesOf, maxInks, RB_LAYOUTS, RB_PALETTES, RB_FONTS, RB_PRODUCTS, defaultRBData, type RBSpec, type RBData } from '@/lib/ricebag-engine';



const FONT_CSS = RB_FONT_CSS;
const templateSpec = (template: (typeof TEMPLATES)[number]): RBSpec => ({ handle: false, ...template.spec, window: template.spec.window ?? false });
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
  const fontsReady = useRBFonts();
  const [spec, setSpec] = useState(() => templateSpec(TEMPLATES[0]));
  const [data, setData] = useState<RBData>(() => defaultRBData(TEMPLATES[0].spec.product, rbSize(TEMPLATES[0].spec.size)));
  const [selected, setSelected] = useState(TEMPLATES[0].id);
  const [logo, setLogo] = useState<string>('');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const view = useRef<Mockup3DHandle>(null);
  const flatRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const texRef = useRef<HTMLDivElement>(null);
  const art = { spec, data, logo };
  const set = (next: Partial<RBSpec>) => setSpec((prev) => ({...prev, ...next}));
  const sheets: {name: string; art: ReactNode}[] = [{name:'to-in',art:<RBSheetSvg {...art} />}];
  const textures = [<RBFaceSvg {...art} key="front" mode="tex" />, <RBFaceSvg {...art} key="back" side="back" mode="tex" />];
  const build = async () => {
    const { buildMockup } = await import('@/lib/ricebag-3d');
    const svgs = Array.from(texRef.current?.querySelectorAll('svg') ?? []);
    return buildMockup(spec, svgs, FONT_CSS);
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as Window & {__rbSnap?: (w: number, h: number) => Promise<string>}).__rbSnap = async (w, h) => {
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
    if (assets.length === 1) return { file: new Blob([assets[0][1]], {type:'image/svg+xml'}), fileName: 'ricebag.svg' };
    const archive = zipSync(Object.fromEntries(assets));
    return { file: new Blob([Uint8Array.from(archive)], {type:'application/zip'}), fileName: 'ricebag.zip' };
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
        if (files.length === 1) downloadBlob(new Blob([files[0][1]], {type:'application/pdf'}), 'ricebag.pdf');
        else downloadBlob(new Blob([Uint8Array.from(zipSync(Object.fromEntries(files)))], {type:'application/zip'}), 'ricebag-pdf.zip');
      } else {
        const canvas = await view.current?.snapshot(1600, 1200, {watermark:true});
        if (!canvas) throw new Error('Xem trước 3D chưa sẵn sàng.');
        const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh 3D.'))));
        downloadBlob(image, 'ricebag-3d.png');
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
      <PageHeader title="Bao gạo và nông sản" sub="Chọn mẫu, nhập nội dung và xem thành phẩm trước khi tải file in." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="min-w-0 space-y-4">
          <CollapsibleSection title="Mẫu thiết kế">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => <button key={t.id} type="button" data-testid="rb-tpl" aria-pressed={selected === t.id}
                className={`rounded-lg border p-2 text-sm ${selected === t.id ? 'border-indigo-400 bg-indigo-500/15' : 'border-mv-hair'}`}
                onClick={() => {
                  setData((current) => {
                    const previous = TEMPLATES.find((template) => template.id === selected) ?? TEMPLATES[0];
                    const sampleFor = (t: (typeof TEMPLATES)[number]) => defaultRBData(t.spec.product, rbSize(t.spec.size));
                    const sample = sampleFor(previous);
                    return {...sampleFor(t), ...Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== (sample as Record<string,string>)[key]))};
                  });
                  setSpec(templateSpec(t));
                  setSelected(t.id);
                }}>
                  <span className="mb-1 grid h-20 place-items-center overflow-hidden rounded bg-stone-100 [&>svg]:h-full [&>svg]:w-full">
                    <RBFaceSvg spec={templateSpec(t)} data={defaultRBData(t.spec.product, rbSize(t.spec.size))} />
                  </span>
                  {t.name}
                </button>)}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Nội dung">
            <div className="grid gap-3 sm:grid-cols-2">
              {RB_FIELDS.filter((field) => !('mailer' in field && field.mailer && !('style' in spec && spec.style === 'mailer'))).map((field) => (
                <label key={field.key}>
                  <span className="mv-label mb-1 block">{field.label}</span>
                  <input className="mv-input" data-testid={`rb-field-${field.key}`} value={data[field.key] ?? ''} onChange={(e) => setData((prev) => ({...prev, [field.key]:e.target.value}))} />
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
            {choice('Khổ bao', spec.size, sizesOf(spec.kind), (size) => {set({size}); setData((d) => ({...d, net: rbSize(size).net}));})}
            {choice('Nông sản', spec.product, RB_PRODUCTS, (product) => {set({product}); setData(defaultRBData(product, rbSize(spec.size)));})}
            {choice('Bảng màu', spec.palette, RB_PALETTES, (palette) => set({palette}))}
            {choice('Bố cục', spec.layout, RB_LAYOUTS, (layout) => set({layout}))}
            {choice('Kiểu chữ', spec.font, RB_FONTS, (font) => set({font}))}
            {spec.kind !== 'vacuum' && choice('Số màu', spec.inks, [1,2,3].filter((n) => n <= maxInks(spec.kind)).map((n) => ({id:n as 1 | 2 | 3, name:String(n)})), (inks) => set({inks}))}
            {spec.kind === 'vacuum' && <label><input type="checkbox" checked={spec.window} onChange={(e) => set({window:e.target.checked})} /> Cửa sổ trong</label>}
            <label><input type="checkbox" checked={spec.handle} onChange={(e) => set({handle:e.target.checked})} /> Tay xách</label>
            </div>
          </CollapsibleSection>
        </div>
        <div className="glass-card space-y-3 rounded-2xl border border-indigo-500/40 p-4 lg:sticky lg:top-4">
          <div className="flex justify-between"><span className="font-bold">Xem trước</span><PreviewTabs value={tab} onChange={setTab} /></div>
          {tab === '3d' && <Mockup3DView ref={view} build={build} rebuildKey={JSON.stringify([spec,data,logo])} refitKey={spec.kind + spec.size} className="aspect-[4/3] rounded-lg" />}
          <div ref={flatRef} data-testid="rb-preview" className={tab === '3d' ? 'hidden' : 'rounded-lg bg-stone-100 p-4 [&>svg]:w-full'}>
            <RBFaceSvg {...art} side={side} guides />
            <div className="mt-2 text-slate-700">{choice('Mặt xem trước', side, [{id:'front',name:'Mặt trước'},{id:'back',name:'Mặt sau'}] as const, setSide)}</div>
            {sheets.map(({name, art}) => <details className="mt-3 text-slate-700" key={name}><summary>Bản in {name.replaceAll('-', ' ')}</summary><div className="[&>svg]:h-auto [&>svg]:w-full">{art}</div></details>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mv-btn mv-btn-ghost" disabled={busy || tab !== '3d'} onClick={() => void download('3d')}>Ảnh 3D</button>
            <button type="button" className="mv-btn mv-btn-ghost" disabled={busy} onClick={() => void download('pdf')}>PDF in</button>
            <button type="button" className="mv-btn mv-btn-primary" data-testid="rb-svg" disabled={busy} onClick={() => void download('svg')}>File in SVG{sheets.length > 1 ? ' (.zip)' : ''}</button>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <PrintRequest product="ricebag" title="Bao gạo và nông sản" design={{spec,data}} makeFiles={makeFiles} />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[800px]">
        <div ref={texRef}>{textures}</div>
        <div ref={printRef}>{sheets.map(({name,art}) => <div key={name}>{art}</div>)}</div>
      </div>
    </div>
  );
}

