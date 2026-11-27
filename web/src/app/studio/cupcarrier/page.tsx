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
import { useCCFonts, CC_FONT_CSS, CC_TEMPLATES as TEMPLATES, CC_FIELDS, defaultCCData, CupCarrierSvg, ccSizesOf, ccMediaOf, CC_HANDLES, CC_INKS, ccLowContrast, CC_FONTS, CC_LAYOUTS, CC_DRINKS, type CCSpec, type CCData, type CCLogo } from '@/lib/cupcarrier-engine';
import { logoToMask } from '@/lib/tape-engine';

const SIDES = [{id: '1', name:'Một mặt'}, {id: '2', name:'Hai mặt'}];
const FONT_CSS = CC_FONT_CSS;
const templateSpec = (template: (typeof TEMPLATES)[number]): CCSpec => ({ ...template.spec, size: ccSizesOf(template.spec.kind)[0].id, handle: CC_HANDLES[0].id, faces: 1 });
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
  const fontsReady = useCCFonts();
  const [spec, setSpec] = useState(() => templateSpec(TEMPLATES[0]));
  const [data, setData] = useState<CCData>(() => defaultCCData());
  const [selected, setSelected] = useState(TEMPLATES[0].id);
  const [logo, setLogo] = useState<CCLogo | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const view = useRef<Mockup3DHandle>(null);
  const flatRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const texRef = useRef<HTMLDivElement>(null);
  const art = { spec, data, logo };
  const set = (next: Partial<CCSpec>) => setSpec((prev) => ({...prev, ...next}));
  const sheets: {name: string; art: ReactNode}[] = [{name:'mat-truoc', art:<CupCarrierSvg {...art} mode="print" />}, ...(spec.faces === 2 ? [{name:'mat-sau', art:<CupCarrierSvg {...art} side="back" mode="print" />}] : [])];
  const textures = [
    <CupCarrierSvg {...art} key="front" mode="tex" />,
    <CupCarrierSvg {...art} key="back" side="back" mode="tex" blank={spec.faces === 1} />,
  ];
  const build = async () => {
    const { buildMockup } = await import('@/lib/cupcarrier-3d');
    const svgs = Array.from(texRef.current?.querySelectorAll('svg') ?? []);
    return buildMockup(spec, svgs, FONT_CSS);
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as Window & {__ccSnap?: (w: number, h: number) => Promise<string>}).__ccSnap = async (w, h) => {
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
    if (assets.length === 1) return { file: new Blob([assets[0][1]], {type:'image/svg+xml'}), fileName: 'cupcarrier.svg' };
    const archive = zipSync(Object.fromEntries(assets));
    return { file: new Blob([Uint8Array.from(archive)], {type:'application/zip'}), fileName: 'cupcarrier.zip' };
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
          const pdf = await svgToSizedPdf(svg, FONT_CSS, w, h);
          return [sheets[i].name + '.pdf', new Uint8Array(await pdf.arrayBuffer())] as const;
        }));
        if (files.length === 1) downloadBlob(new Blob([files[0][1]], {type:'application/pdf'}), 'cupcarrier.pdf');
        else downloadBlob(new Blob([Uint8Array.from(zipSync(Object.fromEntries(files)))], {type:'application/zip'}), 'cupcarrier-pdf.zip');
      } else {
        const canvas = await view.current?.snapshot(1600, 1200, {watermark:true});
        if (!canvas) throw new Error('Xem trước 3D chưa sẵn sàng.');
        const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh 3D.'))));
        downloadBlob(image, 'cupcarrier-3d.png');
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
      <PageHeader title="Túi đựng ly trà sữa" sub="Chọn mẫu, nhập nội dung và xem thành phẩm trước khi tải file in." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="min-w-0 space-y-4">
          <CollapsibleSection title="Mẫu thiết kế">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => <button key={t.id} type="button" data-testid="cc-tpl" aria-pressed={selected === t.id}
                className={`rounded-lg border p-2 text-sm ${selected === t.id ? 'border-indigo-400 bg-indigo-500/15' : 'border-mv-hair'}`}
                onClick={() => {
                  setData((current) => {
                    const previous = TEMPLATES.find((template) => template.id === selected) ?? TEMPLATES[0];
                    const sampleFor = (t: (typeof TEMPLATES)[number]) => ({ ...defaultCCData(), ...t.data });
                    const sample = sampleFor(previous);
                    return {...sampleFor(t), ...Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== (sample as Record<string,string>)[key]))};
                  });
                  setSpec(templateSpec(t));
                  setSelected(t.id);
                }}>
                  <span className="mb-1 grid h-20 place-items-center overflow-hidden rounded bg-stone-100 [&>svg]:h-full [&>svg]:w-full">
                    <CupCarrierSvg spec={templateSpec(t)} data={{...defaultCCData(), ...t.data}} />
                  </span>
                  {t.name}
                </button>)}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Nội dung">
            <div className="grid gap-3 sm:grid-cols-2">
              {CC_FIELDS.filter((field) => !('mailer' in field && field.mailer && !('style' in spec && spec.style === 'mailer'))).map((field) => (
                <label key={field.key}>
                  <span className="mv-label mb-1 block">{field.label}</span>
                  <input className="mv-input" data-testid={`cc-field-${field.key}`} value={data[field.key] ?? ''} onChange={(e) => setData((prev) => ({...prev, [field.key]:e.target.value}))} />
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
                    setLogo(await logoToMask(image));
                  } catch { setError('Không đọc được ảnh logo.'); }
                }} />
              </label>
              {logo && <button type="button" className="mv-btn mv-btn-ghost" onClick={() => setLogo(null)}>Bỏ logo</button>}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Quy cách in">
            <div className="grid gap-3 sm:grid-cols-2">
            {choice('Khổ túi', spec.size, ccSizesOf(spec.kind), (size) => set({size}))}
            {choice('Chất liệu', spec.media, ccMediaOf(spec.kind), (media) => set({media}))}
            {choice('Quai', spec.handle, CC_HANDLES, (handle) => set({handle}))}
            {choice('Kiểu chữ', spec.font, CC_FONTS, (font) => set({font}))}
            {choice('Bố cục', spec.layout, CC_LAYOUTS, (layout) => set({layout}))}
            {choice('Minh họa', spec.drink, CC_DRINKS, (drink) => set({drink}))}
            {choice('Mực chính', spec.inks[0], CC_INKS, (ink) => set({inks: [ink, ...spec.inks.slice(1)]}))}
            {choice('Mực phụ', spec.inks[1] ?? '', [{id:'', name:'Không dùng'}, ...CC_INKS], (ink) => set({inks: ink ? [spec.inks[0], ink] : [spec.inks[0]]}))}
            {spec.inks.some((ink) => ccLowContrast(ink, spec.media)) && <p className="text-sm text-amber-400 sm:col-span-2">Mực và nền có độ tương phản thấp.</p>}
            {choice('Số mặt in', String(spec.faces), SIDES, (value) => set({faces: value === '2' ? 2 : 1}))}
            </div>
          </CollapsibleSection>
        </div>
        <div className="glass-card space-y-3 rounded-2xl border border-indigo-500/40 p-4 lg:sticky lg:top-4">
          <div className="flex justify-between"><span className="font-bold">Xem trước</span><PreviewTabs value={tab} onChange={setTab} /></div>
          {tab === '3d' && <Mockup3DView ref={view} build={build} rebuildKey={JSON.stringify([spec,data,logo])} refitKey={spec.size + spec.handle + spec.media} className="aspect-[4/3] rounded-lg" />}
          <div ref={flatRef} data-testid="cc-preview" className={tab === '3d' ? 'hidden' : 'rounded-lg bg-stone-100 p-4 [&>svg]:w-full'}>
            <CupCarrierSvg {...art} side={spec.faces === 2 ? side : 'front'} />
            {spec.faces === 2 && <div className="mt-2 text-slate-700">{choice('Mặt xem trước', side, [{id:'front',name:'Mặt trước'},{id:'back',name:'Mặt sau'}] as const, setSide)}</div>}
            {sheets.map(({name, art}) => <details className="mt-3 text-slate-700" key={name}><summary>Bản in {name.replaceAll('-', ' ')}</summary><div className="[&>svg]:h-auto [&>svg]:w-full">{art}</div></details>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mv-btn mv-btn-ghost" disabled={busy || tab !== '3d'} onClick={() => void download('3d')}>Ảnh 3D</button>
            <button type="button" className="mv-btn mv-btn-ghost" disabled={busy} onClick={() => void download('pdf')}>PDF in</button>
            <button type="button" className="mv-btn mv-btn-primary" data-testid="cc-svg" disabled={busy} onClick={() => void download('svg')}>File in SVG{sheets.length > 1 ? ' (.zip)' : ''}</button>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <PrintRequest product="cupcarrier" title="Túi đựng ly trà sữa" design={{spec,data}} makeFiles={makeFiles} />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[800px]">
        <div ref={texRef}>{textures}</div>
        <div ref={printRef}>{sheets.map(({name,art}) => <div key={name}>{art}</div>)}</div>
      </div>
    </div>
  );
}

