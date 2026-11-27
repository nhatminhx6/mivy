'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { zipSync } from 'fflate';
import { PageHeader } from '@/components/PageHeader';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { PrintRequest } from '@/components/PrintRequest';
import { downloadBlob } from '@/lib/html-export';
import { scaleImage } from '@/lib/image-utils';
import { selfContainedSvg, svgToJpeg, svgToSizedPdf } from '@/lib/svg-export';
import {
  AS_FONT_CSS as FONT_CSS, AS_TEMPLATES as TEMPLATES, AS_HEIGHTS, AS_BASES, AS_FONTS, AS_PALETTES, AS_CHARS,
  buildStand, charDataUrl, useAsFonts, StandSheetSvg, StandFrontSvg, BaseTopSvg,
  type AsSpec, type AsData, type StandResult,
} from '@/lib/acrylicstand-engine';

const templateSpec = (template: (typeof TEMPLATES)[number]): AsSpec => ({ ...template.spec, tpl: template.id });
const FIELDS: {key: keyof AsData; label: string}[] = [
  { key: 'name', label: 'Tên trên đế' },
  { key: 'sub', label: 'Dòng phụ' },
  { key: 'topText', label: 'Chữ cắt nổi' },
  { key: 'sign', label: 'Chữ trên hình' },
];
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
  const [spec, setSpec] = useState(() => templateSpec(TEMPLATES[0]));
  const [data, setData] = useState<AsData>(() => ({...TEMPLATES[0].data}));
  const [selected, setSelected] = useState(TEMPLATES[0].id);
  const [uploads, setUploads] = useState<(HTMLImageElement | null)[]>([null, null]);
  const [tolerance, setTolerance] = useState(0);
  const [geometry, setGeometry] = useState<{key: string; model: StandResult} | null>(null);
  const [geometryError, setGeometryError] = useState('');
  const ready = useAsFonts();
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const view = useRef<Mockup3DHandle>(null);
  const flatRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const texRef = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([spec, data, uploads.map((image) => image?.src), tolerance]);
  const model = geometry?.key === key ? geometry.model : null;
  const set = (next: Partial<AsSpec>) => setSpec((prev) => ({...prev, ...next}));

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setGeometryError('');
    const timer = setTimeout(() => {
      buildStand(spec, data, uploads, tolerance).then((model) => {
        if (active) setGeometry({key, model});
      }).catch(() => {
        if (active) setGeometryError('Không tạo được đường cắt từ hình này. Anh thử ảnh khác hoặc giảm mức xóa nền.');
      });
    }, 120);
    return () => { active = false; clearTimeout(timer); };
  }, [ready, key, spec, data, uploads, tolerance]);

  const art = model && {r:model, spec, data};
  const sheets: {name: string; art: ReactNode}[] = art ? [
    { name: 'mat-truoc-va-duong-cat', art: <StandSheetSvg {...art} mode="file" /> },
    ...(spec.white ? [{name:'lot-trang', art:<StandSheetSvg {...art} mode="white" />}] : []),
    ...(spec.sides === 2 ? [{name:'mat-sau', art:<StandSheetSvg {...art} mode="back" />}] : []),
  ] : [];
  const build = async () => {
    const { standBuilder } = await import('@/lib/acrylicstand-3d');
    return standBuilder({r:model, spec, baseTop:svgOf(texRef.current), fontCss:FONT_CSS});
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as Window & {__asSnap?: (w: number, h: number) => Promise<string>}).__asSnap = async (w, h) => {
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
    if (assets.length === 1) return { file: new Blob([assets[0][1]], {type:'image/svg+xml'}), fileName: 'acrylicstand.svg' };
    const archive = zipSync(Object.fromEntries(assets));
    return { file: new Blob([Uint8Array.from(archive)], {type:'application/zip'}), fileName: 'acrylicstand.zip' };
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
        if (files.length === 1) downloadBlob(new Blob([files[0][1]], {type:'application/pdf'}), 'acrylicstand.pdf');
        else downloadBlob(new Blob([Uint8Array.from(zipSync(Object.fromEntries(files)))], {type:'application/zip'}), 'acrylicstand-pdf.zip');
      } else {
        const canvas = await view.current?.snapshot(1600, 1200, {watermark:true});
        if (!canvas) throw new Error('Xem trước 3D chưa sẵn sàng.');
        const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh 3D.'))));
        downloadBlob(image, 'acrylicstand-3d.png');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Standee mica mini" sub="Chọn mẫu, nhập nội dung và xem thành phẩm trước khi tải file in." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="min-w-0 space-y-4">
          <CollapsibleSection title="Mẫu thiết kế">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => <button key={t.id} type="button" data-testid="as-tpl" aria-pressed={selected === t.id}
                className={`rounded-lg border p-2 text-sm ${selected === t.id ? 'border-indigo-400 bg-indigo-500/15' : 'border-mv-hair'}`}
                onClick={() => {
                  setData((current) => {
                    const previous = TEMPLATES.find((template) => template.id === selected) ?? TEMPLATES[0];
                    const sampleFor = (t: (typeof TEMPLATES)[number]) => t.data;
                    const sample = sampleFor(previous);
                    return {...sampleFor(t), ...Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== sample[key as keyof AsData]))};
                  });
                  setSpec(templateSpec(t));
                  setUploads([null,null]);
                  setSelected(t.id);
                }}>{t.spec.kind !== 'text' && <img className="mx-auto h-20 w-20 object-contain" src={charDataUrl(t.spec.chars[0])} alt="" />}{t.name}</button>)}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Nội dung">
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.filter(({key}) => key !== 'topText' || spec.kind === 'text').map((field) => (
                <label key={field.key}>
                  <span className="mv-label mb-1 block">{field.label}</span>
                  <input className="mv-input" data-testid={`as-field-${field.key}`} value={data[field.key]} onChange={(e) => setData((prev) => ({...prev, [field.key]:e.target.value}))} />
                </label>
              ))}
              {spec.kind !== 'text' && uploads.slice(0, spec.kind === 'couple' ? 2 : 1).map((image, index) => (
                <div className="space-y-2" key={index}>
                  <label className="block"><span className="mv-label mb-1 block">Ảnh nhân vật {index + 1}</span>
                    <input type="file" accept="image/*" className="mv-input" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setError('');
                      try {
                        const next = new Image();
                        const url = await scaleImage(file);
                        try {
                          next.src = url;
                          await next.decode();
                        } finally {
                          URL.revokeObjectURL(url);
                        }
                        setUploads((current) => current.map((item, i) => i === index ? next : item));
                      } catch { setError('Không đọc được ảnh.'); }
                    }} />
                  </label>
                  {image ? <button type="button" className="mv-btn mv-btn-ghost" onClick={() => setUploads((current) => current.map((item, i) => i === index ? null : item))}>Bỏ ảnh</button>
                    : choice('Nhân vật', spec.chars[index] ?? spec.chars[0], AS_CHARS, (character) => {
                        const chars = [...spec.chars];
                        chars[index] = character;
                        set({chars});
                      })}
                </div>
              ))}
              {uploads.some(Boolean) && <label><span className="mv-label mb-1 block">Xóa nền đồng màu · {tolerance}</span><input type="range" min={0} max={120} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} /></label>}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Quy cách in">
            <div className="grid gap-3 sm:grid-cols-2">
            {choice('Chiều cao', spec.height, AS_HEIGHTS.map((id) => ({id,name:id + ' mm'})), (height) => set({height}))}
              {choice('Dáng đế', spec.base, AS_BASES, (base) => set({base}))}
              {choice('Màu đế', spec.baseTint, [{id:'clear',name:'Trong'},{id:'white',name:'Trắng'}] as const, (baseTint) => set({baseTint}))}
              {choice('Kiểu chữ', spec.font, AS_FONTS, (font) => set({font}))}
              {choice('Màu chữ', spec.palette, AS_PALETTES, (palette) => set({palette}))}
              {choice('Số mặt in', spec.sides, [{id:1,name:'Một mặt'},{id:2,name:'Hai mặt'}] as const, (sides) => set({sides}))}
              <label><input type="checkbox" checked={spec.white} onChange={(e) => set({white:e.target.checked})} /> Mực trắng lót</label>
            </div>
          </CollapsibleSection>
        </div>
        <div className="glass-card space-y-3 rounded-2xl border border-indigo-500/40 p-4 lg:sticky lg:top-4">
          <div className="flex justify-between"><span className="font-bold">Xem trước</span><PreviewTabs value={tab} onChange={setTab} /></div>
          {!model && !geometryError && <p role="status">Đang dựng đường cắt mica…</p>}
          {geometryError && <p role="alert">{geometryError}</p>}
          {tab === '3d' && model && <Mockup3DView ref={view} build={build} rebuildKey={key} refitKey={`${spec.tpl}-${spec.height}-${spec.base}`} className="aspect-[4/3] rounded-lg" />}
          <div ref={flatRef} data-testid="as-preview" className={tab === '3d' ? 'hidden' : 'rounded-lg bg-stone-100 p-4 [&>svg]:w-full'}>
            {art && <StandFrontSvg {...art} />}
            {sheets.map(({name, art}) => <details className="mt-3 text-slate-700" key={name}><summary>Bản in {name.replaceAll('-', ' ')}</summary><div className="[&>svg]:h-auto [&>svg]:w-full">{art}</div></details>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mv-btn mv-btn-ghost" disabled={!model || busy || tab !== '3d'} onClick={() => void download('3d')}>Ảnh 3D</button>
            <button type="button" className="mv-btn mv-btn-ghost" disabled={!model || busy} onClick={() => void download('pdf')}>PDF in</button>
            <button type="button" className="mv-btn mv-btn-primary" data-testid="as-svg" disabled={!model || busy} onClick={() => void download('svg')}>File in SVG{sheets.length > 1 ? ' (.zip)' : ''}</button>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {model && <PrintRequest product="acrylicstand" title="Standee mica mini" design={{spec,data}} makeFiles={makeFiles} />}
        </div>
      </div>
      <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[800px]">
        <div ref={texRef}>{art && <BaseTopSvg {...art} />}</div>
        <div ref={printRef}>{sheets.map(({name,art}) => <div key={name}>{art}</div>)}</div>
      </div>
    </div>
  );
}

