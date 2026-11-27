'use client';

import { useEffect, useState, type CSSProperties } from 'react';

export const MC_FONT_CSS = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600&family=Playfair+Display:wght@800&display=swap');";
export function useMCFonts() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const families = [
      ['Be Vietnam Pro', 'BeVietnamPro-600', '600'],
      ['Playfair Display', 'PlayfairDisplay-800', '800'],
    ];
    Promise.allSettled(families.map(async ([family, file, weight]) => {
      const face = await new FontFace(family, `url(/fonts/${file}.ttf)`, {weight}).load();
      if (active) document.fonts.add(face);
      return face;
    })).then(() => {
      if (!active) return;
      setReady(true);
    });
    return () => { active = false; };
  }, []);
  return ready;
}
export const MC_FOILS = [
  { id: 'none', name: 'Không ép kim', color: '' },
  { id: 'gold', name: 'Nhũ vàng', color: '#e8c77b' },
  { id: 'silver', name: 'Nhũ bạc', color: '#e3e9ee' },
] as const;

export const MC_PALETTES = [
  { id: 'ruby', name: 'Đỏ son', paper: '#782b38', ink: '#fff0cf', accent: '#e1ae6a', tray: '#451820' },
  { id: 'navy', name: 'Xanh đêm', paper: '#1e324c', ink: '#edf2f4', accent: '#e1be7b', tray: '#142133' },
  { id: 'jade', name: 'Xanh ngọc', paper: '#214d44', ink: '#f0e8cf', accent: '#d4b681', tray: '#163129' },
] as const;

export const MC_THEMES = [
  { id: 'moon', name: 'Trăng rằm' },
  { id: 'lantern', name: 'Đèn lồng' },
  { id: 'rabbit', name: 'Thỏ ngọc' },
] as const;

export interface MCSpec {
  count: 4 | 6;
  theme: typeof MC_THEMES[number]['id'];
  palette: typeof MC_PALETTES[number]['id'];
  foil: typeof MC_FOILS[number]['id'];
}
export type MCData = Record<'title' | 'sub' | 'brand', string>;
export const MC_FIELDS = [
  {key:'title', label:'Tiêu đề'}, {key:'sub', label:'Lời chúc'}, {key:'brand', label:'Tên thương hiệu'},
] as const;
export const MC_TEMPLATES: {id: string; name: string; spec: MCSpec; data: MCData}[] = [
  {id:'trang-ram', name:'Trăng rằm', spec:{count:4,theme:'moon',palette:'navy',foil:'gold'}, data:{title:'Trung Thu Đoàn Viên',sub:'Gửi nhau một mùa trăng ấm áp',brand:'QUỐC BẢO'}},
  {id:'hoi-den', name:'Hội đèn', spec:{count:6,theme:'lantern',palette:'ruby',foil:'gold'}, data:{title:'Hội Trăng Rằm',sub:'Thắp đèn đón mùa sum họp',brand:'THU HÀ'}},
  {id:'tho-ngoc', name:'Thỏ ngọc', spec:{count:4,theme:'rabbit',palette:'jade',foil:'silver'}, data:{title:'Ánh Trăng Ngọc',sub:'Mùa trăng tròn, lòng an vui',brand:'BẢO NGỌC'}},
];

export const mcPalette = (spec: MCSpec) => MC_PALETTES.find((item) => item.id === spec.palette) ?? MC_PALETTES[0];
export const mcSize = (spec: MCSpec) => ({ w: spec.count === 6 ? 290 : 205, d: 205, h: 65, lid: 28, cols: spec.count === 6 ? 3 : 2 });
const BLEED = 3;
const TURN = 14;
const DISPLAY = "'Playfair Display'";
const BODY = "'Be Vietnam Pro'";

let measureContext: CanvasRenderingContext2D | null = null;
function fit(text: string, max: number, size: number, weight: number, font: string) {
  if (!measureContext && typeof document !== 'undefined') measureContext = document.createElement('canvas').getContext('2d');
  const ctx = measureContext;
  if (ctx) ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx?.measureText(text).width ?? Array.from(text).length * size * .62;
  return Math.min(size, size * max / Math.max(1, width));
}

function Ornament({theme, color}: {theme: MCSpec['theme']; color: string}) {
  if (theme === 'lantern') return (
    <g stroke={color} fill="none" strokeWidth="1.45">
      {[-28,0,28].map((x, index) => <g key={x} transform={`translate(${x} ${index === 1 ? 0 : 8})`}>
        <path d="M0 -25V-14 M-6 -14H6 M-6 14H6 M0 14V23 M-3 20V25 M3 20V25" />
        <ellipse rx="12" ry="14" /><ellipse rx="6" ry="14" />
      </g>)}
    </g>
  );
  if (theme === 'rabbit') return (
    <g fill={color}>
      <circle cx="3" cy="-3" r="25" fill="none" stroke={color} strokeWidth="1.5" />
      <ellipse cx="1" cy="13" rx="13" ry="8" /><circle cx="10" cy="5" r="8" />
      <ellipse cx="7" cy="-8" rx="3" ry="10" transform="rotate(-23 7 -8)" />
      <ellipse cx="14" cy="-8" rx="3" ry="10" transform="rotate(12 14 -8)" />
      <circle cx="-13" cy="11" r="4" />
      <path d="M-33 21H-22 M26 -14H36 M32 -19V-9" fill="none" stroke={color} />
    </g>
  );
  return <g fill={color}>
    <circle r="23" fill="none" stroke={color} strokeWidth=".55" /><circle r="19" fill="none" stroke={color} strokeWidth="1.45" />
    <path d="M-42 12Q-35 5-26 12T-7 12 M8 17Q15 9 23 17T42 17 M-38-14H-26 M-32-20V-8 M28-14H38 M33-19V-9" fill="none" stroke={color} strokeWidth="1.4" />
  </g>;
}

function LidArt({spec,data,logo,w,h,mode}: {spec:MCSpec; data:MCData; logo?:string; w:number; h:number; mode:'preview'|'print'|'foil'}) {
  const palette = mcPalette(spec);
  const foil = MC_FOILS.find((item) => item.id === spec.foil);
  const metal = spec.foil !== 'none';
  const accent = mode === 'foil' ? '#000000' : foil?.color || palette.accent;
  return <>
    {mode !== 'foil' && <rect width={w} height={h} fill={palette.paper} />}
    {(mode === 'preview' || (mode === 'foil' ? metal : !metal)) && <g fill={accent}>
      <rect x="8" y="8" width={w-16} height={h-16} rx="4" stroke={accent} strokeWidth=".7" fill="none" />
      <rect x="12" y="12" width={w-24} height={h-24} rx="3" stroke={accent} strokeWidth=".45" fill="none" />
      <g transform={`translate(${w/2} ${h*.38})`}><Ornament theme={spec.theme} color={accent} /></g>
      <text x={w/2} y={h*.64} textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize={fit(data.title,w*.78,19,800,DISPLAY)}>{data.title}</text>
    </g>}
    {mode !== 'foil' && <g fill={palette.ink} textAnchor="middle" fontFamily={BODY} fontWeight="600">
      <text x={w/2} y={h*.74} fontSize={fit(data.sub,w*.78,5,600,BODY)}>{data.sub}</text>
      <text x={w/2} y={h*.86} fontSize={fit(data.brand,w*.78,5,600,BODY)}>{data.brand}</text>
      {logo && <image href={logo} x={w/2-12} y={17} width={24} height={24} />}
    </g>}
  </>;
}

type SheetProps = {spec:MCSpec; data:MCData; logo?:string; style?:CSSProperties};
export function MooncakeLid({spec,data,logo,style}:SheetProps) {
  const {w,d} = mcSize(spec);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${d}`} style={style}>
    <LidArt spec={spec} data={data} logo={logo} w={w} h={d} mode="preview" />
  </svg>;
}

export function MooncakeWrap({spec,data,logo,part='lid',style}:SheetProps & {part?:'lid'|'base'|'foil'|'tray'}) {
  const {w,d,h,lid,cols} = mcSize(spec);
  const palette = mcPalette(spec);
  const opening = 74;
  const trayH = d - 12, trayW = w - 12;
  if (part === 'tray') return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${d}`} width={`${w}mm`} height={`${d}mm`} style={style}>
    <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth=".35">
      <rect x="6" y="6" width={trayW} height={trayH} rx="3" />
      {Array.from({length:spec.count}, (_, i) => <rect key={i} x={6+(i%cols+.5)*trayW/cols-opening/2} y={6+(Math.floor(i/cols)+.5)*trayH/2-opening/2} width={opening} height={opening} rx="8" />)}
    </g>
  </svg>;
  const wall = part === 'base' ? h : lid;
  const inset = wall + TURN;
  const x = inset + BLEED, y = x, X = x+w, Y = y+d;
  const cut = `M${x} ${BLEED}H${X}V${y}H${X+inset}V${Y}H${X}V${Y+inset}H${x}V${Y}H${BLEED}V${y}H${x}Z`;
  const W = X+x, H = Y+y;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`} style={style}>
    <g id={part === 'foil' ? 'Foil' : 'In'}>
      {part !== 'foil' && <path d={cut} fill={part === 'base' ? palette.tray : palette.paper} stroke={part === 'base' ? palette.tray : palette.paper} strokeWidth={2*BLEED} strokeLinejoin="round" />}
      {part !== 'base' && <g transform={`translate(${x} ${y})`}><LidArt spec={spec} data={data} logo={logo} w={w} h={d} mode={part === 'foil' ? 'foil' : 'print'} /></g>}
    </g>
    {part !== 'foil' && <>
      <g id="CutContour"><path d={cut} fill="none" stroke="#EC008C" strokeWidth=".35" /></g>
      <g id="Fold" stroke="#00A0E3" strokeWidth=".35" strokeDasharray="2 1.2" fill="none">
        <rect x={x} y={y} width={w} height={d} />
        <path d={`M${x} ${y-wall}H${X} M${x} ${Y+wall}H${X} M${x-wall} ${y}V${Y} M${X+wall} ${y}V${Y}`} />
      </g>
    </>}
  </svg>;
}
