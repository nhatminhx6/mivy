// Infographic "trend" engine — listicle / hot-take / so sánh.
// Render 100% bằng CODE (canvas), KHÔNG gọi AI realtime. Template gen sẵn, user chỉ chọn + điền.

export type InfographicStyleId = 'cyber' | 'violet' | 'sunset' | 'aurora' | 'midnight' | 'coral' | 'mono';

export interface InfographicRow {
  icon?: string;   // emoji, vd "🤖"
  left: string;    // vế trái (trắng)
  right?: string;  // vế phải (màu nhấn/đỏ) — có thì render kiểu so sánh "trái → phải"
}

export interface InfographicData {
  kicker?: string;      // nhãn nhỏ trên cùng, vd "CHIA SẺ THẬT"
  title: string;        // dòng tiêu đề 1 (gradient)
  title2?: string;      // dòng tiêu đề 2 (gradient)
  hook?: string;        // câu móc, vd "Nhìn thì dễ... tới lúc lên production 😅"
  rows: InfographicRow[];
  insight?: string;     // câu chốt ở hộp nổi bật cuối
  cta?: string;         // câu hỏi tương tác cuối, vd "Anh em thấy đúng không? 👇"
  brand?: string;       // watermark nhỏ
  layout?: 'list' | 'feature' | 'poster'; // 'feature' = grid card + terminal; 'poster' = poster minh hoạ 3D
  command?: string;     // dòng lệnh cho thanh terminal (layout feature)
  // --- poster ---
  note?: string;        // ghi chú viết tay góc phải
  tagline?: string;     // dòng viết tay dưới tiêu đề
  hero?: string[];      // tối đa 3: id minh hoạ 3D (/illustrations/fluent3d/<id>.png) HOẶC ảnh sản phẩm user (data:...)
  logo?: string;        // logo shop (dataURL, từ bộ nhận diện)
  cards?: PosterCard[]; // tối đa 2
  contacts?: string[];  // dòng liên hệ ở footer, vd "📞 0909 123 456"
  variant?: PosterVariant; // bố cục poster (cùng nội dung, đổi bố cục)
  bigText?: string;     // số/chữ cực to cho bố cục 'bigdeal', vd "12.12", "-50%"
  code?: string;        // mã voucher cho bố cục 'bigdeal'
}

export type PosterVariant = 'split' | 'stage' | 'bigdeal' | 'menu' | 'bento' | 'steps' | 'collage';
export const POSTER_VARIANTS: { id: PosterVariant; name: string }[] = [
  { id: 'split', name: 'Cổ điển' },
  { id: 'stage', name: 'Sân khấu' },
  { id: 'bigdeal', name: 'Số to' },
  { id: 'menu', name: 'Menu' },
  { id: 'bento', name: 'Bento' },
  { id: 'steps', name: 'Các bước' },
  { id: 'collage', name: 'Collage' },
];

export interface PosterCard {
  tag: string;          // pill nhỏ, vd "🎁 Ưu đãi"
  title: string;
  items: { icon?: string; text: string; sub?: string }[];
}

export type PosterThemeId = 'blue' | 'orange' | 'pink' | 'violet' | 'red';
export interface PosterColors { main: string; deep: string; tint: string; tint2: string; soft: string }
export const POSTER_THEMES: { id: PosterThemeId; name: string; main: string; deep: string; tint: string; tint2: string; soft: string }[] = [
  { id: 'blue', name: 'Xanh dương', main: '#2563eb', deep: '#0b1f4d', tint: '#eef4ff', tint2: '#dde9ff', soft: '#c7dbff' },
  { id: 'orange', name: 'Cam', main: '#ea580c', deep: '#3a1606', tint: '#fff5ec', tint2: '#ffe6d1', soft: '#ffd2ad' },
  { id: 'pink', name: 'Hồng', main: '#db2777', deep: '#4a0b2a', tint: '#fff0f7', tint2: '#ffdcec', soft: '#fbc4df' },
  { id: 'violet', name: 'Tím', main: '#7c3aed', deep: '#1f0e47', tint: '#f4f0ff', tint2: '#e6dcff', soft: '#d6c6ff' },
  { id: 'red', name: 'Đỏ', main: '#dc2626', deep: '#3b0a0a', tint: '#fff1f1', tint2: '#ffdede', soft: '#ffc4c4' },
];

interface Preset {
  bg: [string, string, string];
  glows: { x: number; y: number; c: string; r: number }[]; // mesh — đốm MÀU ĐẶC fade, lấy từ kho marketing
  accent: string;
  accent2: string;
  contrast: string;
  titleGrad: [string, string];
  ink: string;
  muted: string;
  card: string;
  cardBorder: string;
  iconBg: string;
  pillBg: string;
  pillBorder: string;
}

export const INFOGRAPHIC_STYLES: { id: InfographicStyleId; name: string }[] = [
  { id: 'cyber', name: 'Xanh cyber' },
  { id: 'violet', name: 'Tím mộng' },
  { id: 'sunset', name: 'Hoàng hôn' },
  { id: 'aurora', name: 'Cực quang' },
  { id: 'midnight', name: 'Nửa đêm' },
  { id: 'coral', name: 'San hô' },
  { id: 'mono', name: 'Mono' },
];

// Mesh gradient JEWEL-TONE: nền TƯƠI bão hòa phủ kín (KHÔNG còn nền đen + đốm mờ) → mỗi style 1 tông cực khác.
// Chữ trắng đọc rõ nhờ card dark-frosted + text-shadow ở renderer.
const PRESETS: Record<InfographicStyleId, Preset> = {
  cyber: {
    bg: ['#2563eb', '#0ea5e9', '#1e3a8a'],
    glows: [
      { x: 0.12, y: 0.12, c: '#38bdf8', r: 0.9 },
      { x: 0.92, y: 0.15, c: '#6366f1', r: 0.9 },
      { x: 0.82, y: 0.95, c: '#22d3ee', r: 0.85 },
      { x: 0.1, y: 0.92, c: '#1d4ed8', r: 0.85 },
    ],
    accent: '#7dd3fc', accent2: '#a5b4fc', contrast: '#fda4af',
    titleGrad: ['#ffffff', '#bae6fd'], ink: '#ffffff', muted: '#dbeafe',
    card: 'rgba(8,12,28,0.42)', cardBorder: 'rgba(255,255,255,0.14)',
    iconBg: 'rgba(56,189,248,0.16)', pillBg: 'rgba(0,0,0,0.3)', pillBorder: 'rgba(255,255,255,0.22)',
  },
  violet: {
    bg: ['#7c3aed', '#a21caf', '#4c1d95'],
    glows: [
      { x: 0.12, y: 0.12, c: '#c084fc', r: 0.9 },
      { x: 0.92, y: 0.15, c: '#ec4899', r: 0.88 },
      { x: 0.85, y: 0.95, c: '#d946ef', r: 0.85 },
      { x: 0.1, y: 0.92, c: '#6d28d9', r: 0.85 },
    ],
    accent: '#e9d5ff', accent2: '#f0abfc', contrast: '#fda4af',
    titleGrad: ['#ffffff', '#f5d0fe'], ink: '#ffffff', muted: '#f3e8ff',
    card: 'rgba(20,8,34,0.42)', cardBorder: 'rgba(255,255,255,0.15)',
    iconBg: 'rgba(167,139,250,0.18)', pillBg: 'rgba(0,0,0,0.3)', pillBorder: 'rgba(255,255,255,0.22)',
  },
  sunset: {
    bg: ['#f97316', '#db2777', '#ea580c'],
    glows: [
      { x: 0.12, y: 0.12, c: '#fbbf24', r: 0.9 },
      { x: 0.92, y: 0.15, c: '#fb7185', r: 0.88 },
      { x: 0.85, y: 0.95, c: '#f472b6', r: 0.85 },
      { x: 0.1, y: 0.92, c: '#f97316', r: 0.85 },
    ],
    accent: '#fff7ed', accent2: '#fed7aa', contrast: '#fde047',
    titleGrad: ['#ffffff', '#fed7aa'], ink: '#ffffff', muted: '#ffedd5',
    card: 'rgba(40,10,12,0.44)', cardBorder: 'rgba(255,255,255,0.16)',
    iconBg: 'rgba(251,191,36,0.17)', pillBg: 'rgba(0,0,0,0.32)', pillBorder: 'rgba(255,255,255,0.24)',
  },
  aurora: {
    bg: ['#0891b2', '#6366f1', '#7c3aed'],
    glows: [
      { x: 0.12, y: 0.12, c: '#22d3ee', r: 0.9 },
      { x: 0.92, y: 0.15, c: '#818cf8', r: 0.88 },
      { x: 0.85, y: 0.95, c: '#a78bfa', r: 0.85 },
      { x: 0.1, y: 0.92, c: '#06b6d4', r: 0.85 },
    ],
    accent: '#a5f3fc', accent2: '#c4b5fd', contrast: '#fda4af',
    titleGrad: ['#ffffff', '#a5f3fc'], ink: '#ffffff', muted: '#cffafe',
    card: 'rgba(8,14,32,0.42)', cardBorder: 'rgba(255,255,255,0.14)',
    iconBg: 'rgba(34,211,238,0.15)', pillBg: 'rgba(0,0,0,0.3)', pillBorder: 'rgba(255,255,255,0.22)',
  },
  midnight: {
    bg: ['#334155', '#1e293b', '#0f172a'],
    glows: [
      { x: 0.14, y: 0.12, c: '#4f46e5', r: 0.82 },
      { x: 0.9, y: 0.16, c: '#7c3aed', r: 0.78 },
      { x: 0.85, y: 0.95, c: '#2563eb', r: 0.72 },
      { x: 0.1, y: 0.95, c: '#334155', r: 0.8 },
    ],
    accent: '#93c5fd', accent2: '#cbd5e1', contrast: '#fca5a5',
    titleGrad: ['#ffffff', '#cbd5e1'], ink: '#ffffff', muted: '#cbd5e1',
    card: 'rgba(6,10,20,0.46)', cardBorder: 'rgba(255,255,255,0.12)',
    iconBg: 'rgba(147,197,253,0.14)', pillBg: 'rgba(0,0,0,0.34)', pillBorder: 'rgba(255,255,255,0.18)',
  },
  coral: {
    bg: ['#fb7185', '#f472b6', '#f43f5e'],
    glows: [
      { x: 0.12, y: 0.12, c: '#fda4af', r: 0.9 },
      { x: 0.92, y: 0.15, c: '#fb923c', r: 0.88 },
      { x: 0.85, y: 0.95, c: '#ec4899', r: 0.85 },
      { x: 0.1, y: 0.92, c: '#f43f5e', r: 0.85 },
    ],
    accent: '#fff1f2', accent2: '#fecdd3', contrast: '#fde047',
    titleGrad: ['#ffffff', '#fecdd3'], ink: '#ffffff', muted: '#ffe4e6',
    card: 'rgba(40,8,20,0.44)', cardBorder: 'rgba(255,255,255,0.16)',
    iconBg: 'rgba(251,113,133,0.16)', pillBg: 'rgba(0,0,0,0.32)', pillBorder: 'rgba(255,255,255,0.24)',
  },
  mono: {
    bg: ['#52525b', '#3f3f46', '#18181b'],
    glows: [
      { x: 0.14, y: 0.12, c: '#71717a', r: 0.82 },
      { x: 0.9, y: 0.16, c: '#52525b', r: 0.78 },
      { x: 0.85, y: 0.95, c: '#3f3f46', r: 0.75 },
    ],
    accent: '#e5e7eb', accent2: '#d1d5db', contrast: '#f87171',
    titleGrad: ['#ffffff', '#d4d4d8'], ink: '#ffffff', muted: '#e4e4e7',
    card: 'rgba(0,0,0,0.42)', cardBorder: 'rgba(255,255,255,0.14)',
    iconBg: 'rgba(255,255,255,0.09)', pillBg: 'rgba(0,0,0,0.34)', pillBorder: 'rgba(255,255,255,0.22)',
  },
};

// Nền CSS mesh jewel-tone: đốm màu LỚN (phủ kín, overlap) trên base tươi → như mesh gradient brandbird.
export function infographicBgCss(styleId: InfographicStyleId = 'cyber'): string {
  const p = PRESETS[styleId] || PRESETS.cyber;
  const layers = p.glows.map((g) => `radial-gradient(${Math.round(g.r * 95)}% ${Math.round(g.r * 85)}% at ${Math.round(g.x * 100)}% ${Math.round(g.y * 100)}%, ${g.c} 0%, transparent 62%)`);
  layers.push(`linear-gradient(145deg, ${p.bg[0]} 0%, ${p.bg[1]} 50%, ${p.bg[2]} 100%)`);
  return layers.join(', ');
}

// Ngoặc ĐƠN: FONT được nhét vào style="..." của HTML — ngoặc kép sẽ đóng attribute giữa chừng (mất padding/flex phía sau).
const FONT = "'Be Vietnam Pro', system-ui, sans-serif";

// ===== Nền = kho "Màu nền" marketing (anh đã duyệt). Token chữ/card suy theo nền sáng/tối. =====
import type { AdBackground } from './ad-skins';
export { AD_BACKGROUNDS, getBackground } from './ad-skins';
export type { AdBackground } from './ad-skins';

interface InfoTheme { ink: string; muted: string; contrast: string; accent: string; card: string; cardBorder: string; pillBg: string; pillBorder: string; pillInk: string; term: string; termInk: string; tShadow: string; }
function infoTheme(light: boolean): InfoTheme {
  return light ? {
    ink: '#0f172a', muted: '#475569', contrast: '#dc2626', accent: '#4f46e5',
    card: 'rgba(255,255,255,0.78)', cardBorder: 'rgba(15,23,42,0.08)',
    pillBg: 'rgba(15,23,42,0.06)', pillBorder: 'rgba(15,23,42,0.14)', pillInk: '#0f172a',
    term: 'rgba(15,23,42,0.9)', termInk: '#f8fafc', tShadow: '',
  } : {
    ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', contrast: '#fb7185', accent: '#a5b4fc',
    card: 'rgba(8,10,20,0.42)', cardBorder: 'rgba(255,255,255,0.14)',
    pillBg: 'rgba(0,0,0,0.3)', pillBorder: 'rgba(255,255,255,0.22)', pillInk: '#ffffff',
    term: 'rgba(0,0,0,0.5)', termInk: '#ffffff', tShadow: 'text-shadow:0 3px 26px rgba(0,0,0,0.38);',
  };
}
const DEFAULT_BG: AdBackground = { id: 'd_navy', name: 'Navy', group: 'Tối sang', css: 'linear-gradient(145deg,#1e293b 0%,#0f172a 100%)', light: false };
const ICON_COLS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#fb7185', '#10b981'];

const FEAT_FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');";
function escH(s = ''): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export function renderFeatureInfographic(data: InfographicData, background: AdBackground = DEFAULT_BG, aspect: '1:1' | '4:5' | '9:16' = '4:5'): { w: number; h: number; css: string; html: string } {
  const W = 1080;
  const H = aspect === '1:1' ? 1080 : aspect === '9:16' ? 1920 : 1350;
  const bg = background.css;
  const t = infoTheme(background.light);
  const pad = 72;
  const feats = (data.rows || []).filter((r) => r.left).slice(0, 4);

  const cards = feats.map((r, i) => {
    const col = ICON_COLS[i % ICON_COLS.length];
    return `<div style="position:relative;display:flex;align-items:flex-start;gap:22px;background:${t.card};border:1px solid ${t.cardBorder};border-radius:28px;padding:30px 30px;backdrop-filter:blur(10px);box-shadow:0 20px 50px rgba(0,0,0,0.22);">
      <div style="width:84px;height:84px;flex:none;border-radius:22px;background:linear-gradient(145deg,${col},${col}bb);display:flex;align-items:center;justify-content:center;font-size:42px;box-shadow:0 10px 24px ${col}55;">${escH(r.icon || '✦')}</div>
      <div style="flex:1 1 auto;min-width:0;">
        <div style="font-family:${FONT};font-weight:700;font-size:34px;color:${t.ink};line-height:1.12;">${escH(r.left)}</div>
        ${r.right ? `<div style="font-family:${FONT};font-weight:500;font-size:26px;color:${t.muted};line-height:1.3;margin-top:6px;">${escH(r.right)}</div>` : ''}
      </div>
      <div style="flex:none;color:${t.muted};font-size:30px;line-height:1;">↗</div>
    </div>`;
  }).join('');

  const html = `<div style="width:${W}px;height:${H}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bg};color:${t.ink};font-family:${FONT};padding:${pad}px;display:flex;flex-direction:column;">
    ${data.kicker ? `<div style="display:flex;align-items:center;gap:16px;font-weight:800;font-size:24px;letter-spacing:0.32em;text-transform:uppercase;color:${t.ink};${t.tShadow}"><span>${escH(data.kicker)}</span><span style="flex:1;height:2px;max-width:120px;background:${t.ink};opacity:.5;border-radius:2px;"></span></div>` : ''}
    <h1 style="margin:22px 0 0;font-weight:900;font-size:108px;line-height:0.96;letter-spacing:-0.02em;color:${t.ink};${t.tShadow}">${escH(data.title)}${data.title2 ? `<br/><span style="color:${t.accent};">${escH(data.title2)}</span>` : ''}</h1>
    ${data.hook ? `<p style="margin:22px 0 0;font-weight:600;font-size:30px;line-height:1.4;color:${t.muted};max-width:900px;${t.tShadow}">${escH(data.hook)}</p>` : ''}
    <div style="flex:1 1 auto;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;">${cards}</div>
    ${data.command ? `<div style="margin-top:24px;display:flex;align-items:center;gap:16px;background:${t.term};border:1px solid ${t.cardBorder};border-radius:18px;padding:24px 28px;backdrop-filter:blur(8px);">
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:30px;color:#4ade80;">$</span>
      <span style="flex:1;font-family:'JetBrains Mono',monospace;font-weight:500;font-size:30px;color:${t.termInk};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escH(data.command)}</span>
      <span style="color:${t.termInk};opacity:.6;font-size:28px;">⧉</span>
    </div>` : ''}
    ${data.brand ? `<div style="margin-top:22px;text-align:center;font-weight:600;font-size:22px;letter-spacing:0.08em;color:${t.muted};">${escH(data.brand)}</div>` : ''}
  </div>`;

  return { w: W, h: H, css: FEAT_FONT_IMPORT, html };
}

// ===== LAYOUT "LIST / SO SÁNH / CHECKLIST" — render HTML (cùng gu feature: icon box màu, card đậm, nền mesh) =====
export function renderListInfographic(data: InfographicData, background: AdBackground = DEFAULT_BG, aspect: '1:1' | '4:5' | '9:16' = '4:5'): { w: number; h: number; css: string; html: string } {
  const W = 1080;
  const H = aspect === '1:1' ? 1080 : aspect === '9:16' ? 1920 : 1350;
  const bg = background.css;
  const t = infoTheme(background.light);
  const pad = 72;
  const rows = (data.rows || []).filter((r) => r.left).slice(0, 6);

  const rowsHtml = rows.map((r, i) => {
    const col = ICON_COLS[i % ICON_COLS.length];
    const iconBox = `<div style="width:72px;height:72px;flex:none;border-radius:20px;background:linear-gradient(145deg,${col},${col}bb);display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 10px 22px ${col}55;">${escH(r.icon || '✦')}</div>`;
    const body = r.right
      ? `<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px;">
           <div style="font-family:${FONT};font-weight:700;font-size:34px;color:${t.ink};line-height:1.12;">${escH(r.left)}</div>
           <div style="font-family:${FONT};font-weight:700;font-size:30px;color:${t.contrast};line-height:1.15;display:flex;align-items:center;gap:10px;"><span style="opacity:.75;">→</span>${escH(r.right)}</div>
         </div>`
      : `<div style="flex:1 1 auto;min-width:0;font-family:${FONT};font-weight:600;font-size:34px;color:${t.ink};line-height:1.22;">${escH(r.left)}</div>`;
    return `<div style="display:flex;align-items:center;gap:24px;background:${t.card};border:1px solid ${t.cardBorder};border-radius:24px;padding:24px 28px;backdrop-filter:blur(10px);box-shadow:0 18px 44px rgba(0,0,0,0.2);">${iconBox}${body}</div>`;
  }).join('');

  const html = `<div style="width:${W}px;height:${H}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bg};color:${t.ink};font-family:${FONT};padding:${pad}px;display:flex;flex-direction:column;">
    ${data.kicker ? `<div style="align-self:flex-start;font-weight:800;font-size:24px;letter-spacing:0.22em;text-transform:uppercase;color:${t.pillInk};background:${t.pillBg};border:1px solid ${t.pillBorder};border-radius:999px;padding:12px 24px;backdrop-filter:blur(8px);">${escH(data.kicker)}</div>` : ''}
    <h1 style="margin:26px 0 0;font-weight:900;font-size:92px;line-height:0.98;letter-spacing:-0.02em;color:${t.ink};${t.tShadow}">${escH(data.title)}${data.title2 ? `<br/><span style="color:${t.accent};">${escH(data.title2)}</span>` : ''}</h1>
    ${data.hook ? `<p style="margin:20px 0 0;font-weight:600;font-size:30px;line-height:1.4;color:${t.muted};max-width:900px;${t.tShadow}">${escH(data.hook)}</p>` : ''}
    <div style="margin-top:40px;display:flex;flex-direction:column;gap:18px;">${rowsHtml}</div>
    <div style="flex:1 1 auto;min-height:40px;"></div>
    ${data.insight ? `<div style="display:flex;align-items:flex-start;gap:16px;background:${t.card};border:1px solid ${t.cardBorder};border-left:4px solid ${t.accent};border-radius:22px;padding:26px 30px;backdrop-filter:blur(10px);">
      <span style="font-size:34px;line-height:1;">💡</span>
      <span style="font-family:${FONT};font-weight:700;font-size:32px;line-height:1.3;color:${t.ink};">${escH(data.insight)}</span>
    </div>` : ''}
    ${data.cta ? `<div style="margin-top:22px;align-self:center;font-family:${FONT};font-weight:800;font-size:32px;color:${t.pillInk};background:${t.pillBg};border:1px solid ${t.pillBorder};border-radius:999px;padding:18px 40px;backdrop-filter:blur(8px);">${escH(data.cta)}</div>` : ''}
    ${data.brand ? `<div style="margin-top:20px;text-align:right;font-weight:600;font-size:22px;letter-spacing:0.08em;color:${t.muted};">${escH(data.brand)}</div>` : ''}
  </div>`;

  return { w: W, h: H, css: FEAT_FONT_IMPORT, html };
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, startPx: number, weight: string, minPx = 16): number {
  let fs = startPx;
  ctx.font = `${weight} ${fs}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && fs > minPx) { fs -= 1; ctx.font = `${weight} ${fs}px ${FONT}`; }
  return fs;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, px: number, weight: string): string[] {
  ctx.font = `${weight} ${px}px ${FONT}`;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawInfographic(
  canvas: HTMLCanvasElement,
  data: InfographicData,
  styleId: InfographicStyleId = 'cyber',
  aspect: '1:1' | '4:5' | '9:16' = '4:5',
  scale = 1,
  opaqueBg = false, // true = tự vẽ nền lên canvas (khi không có div CSS phía sau)
) {
  const W = 1080;
  const H = aspect === '1:1' ? 1080 : aspect === '9:16' ? 1920 : 1350;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const p = PRESETS[styleId] || PRESETS.cyber;

  // ===== Nền do CSS (div phía sau) render — canvas TRONG SUỐT, chỉ vẽ nội dung =====
  ctx.clearRect(0, 0, W, H);
  // Nếu cần bg đục (vd export riêng canvas), fill bg CSS fallback:
  if (opaqueBg) {
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, p.bg[0]); base.addColorStop(0.6, p.bg[1]); base.addColorStop(1, p.bg[2]);
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    for (const g of p.glows) {
      const rad = ctx.createRadialGradient(g.x * W, g.y * H, 0, g.x * W, g.y * H, g.r * W);
      rad.addColorStop(0, g.c); rad.addColorStop(1, 'transparent');
      ctx.fillStyle = rad; ctx.fillRect(0, 0, W, H);
    }
  }

  const m = 76;
  const cw = W - m * 2;
  let y = aspect === '9:16' ? 150 : 96;

  ctx.textBaseline = 'alphabetic';

  // ===== Kicker =====
  if (data.kicker) {
    const kt = data.kicker.toUpperCase();
    ctx.font = `800 20px ${FONT}`;
    const kw = ctx.measureText(kt).width + 36;
    ctx.fillStyle = p.pillBg;
    ctx.beginPath(); ctx.roundRect(m, y, kw, 40, 20); ctx.fill();
    ctx.strokeStyle = p.pillBorder; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = p.accent; ctx.textAlign = 'left';
    ctx.fillText(kt, m + 18, y + 27);
    y += 64;
  }

  // ===== Tiêu đề (gradient, đậm) =====
  const titleLines = [data.title, data.title2].filter(Boolean) as string[];
  for (const line of titleLines) {
    const fs = fitFont(ctx, line, cw, 104, '900', 44);
    ctx.font = `900 ${fs}px ${FONT}`;
    const grad = ctx.createLinearGradient(m, 0, m + cw, 0);
    grad.addColorStop(0, p.titleGrad[0]); grad.addColorStop(1, p.titleGrad[1]);
    ctx.fillStyle = grad; ctx.textAlign = 'left';
    y += Math.round(fs * 0.98);
    ctx.fillText(line, m, y);
    y += 8;
  }

  // ===== Hook =====
  if (data.hook) {
    y += 22;
    const hookLines = wrap(ctx, data.hook, cw, 34, '700');
    ctx.font = `700 34px ${FONT}`; ctx.fillStyle = p.accent2; ctx.textAlign = 'left';
    for (const hl of hookLines) { y += 42; ctx.fillText(hl, m, y); }
  }

  // ===== Rows =====
  y += 48;
  const rows = data.rows.slice(0, aspect === '9:16' ? 7 : 5);
  // vùng còn lại dành cho rows + insight + cta
  const reserveBottom = (data.insight ? 150 : 0) + (data.cta ? 92 : 0) + 60;
  const avail = H - y - reserveBottom;
  const rowGap = 16;
  const rowH = Math.max(88, Math.min(132, (avail - rowGap * (rows.length - 1)) / Math.max(rows.length, 1)));

  for (const row of rows) {
    // card
    ctx.fillStyle = p.card;
    ctx.beginPath(); ctx.roundRect(m, y, cw, rowH, 20); ctx.fill();
    ctx.strokeStyle = p.cardBorder; ctx.lineWidth = 1.5; ctx.stroke();

    // icon box
    const pad = 20, iconSz = rowH - pad * 2;
    ctx.fillStyle = p.iconBg;
    ctx.beginPath(); ctx.roundRect(m + pad, y + pad, iconSz, iconSz, 14); ctx.fill();
    if (row.icon) {
      ctx.font = `${Math.round(iconSz * 0.56)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(row.icon, m + pad + iconSz / 2, y + pad + iconSz / 2 + 2);
      ctx.textBaseline = 'alphabetic';
    }

    const tx = m + pad + iconSz + 24;
    const tw = cw - (pad + iconSz + 24) - pad;
    ctx.textAlign = 'left';
    if (row.right) {
      // kiểu so sánh: trái (trắng) → phải (màu contrast)
      const lf = fitFont(ctx, row.left, tw, 32, '800', 20);
      ctx.font = `800 ${lf}px ${FONT}`; ctx.fillStyle = p.ink;
      ctx.fillText(row.left, tx, y + rowH / 2 - 6);
      const rt = '→  ' + row.right;
      const rf = fitFont(ctx, rt, tw, 29, '700', 18);
      ctx.font = `700 ${rf}px ${FONT}`; ctx.fillStyle = p.contrast;
      ctx.fillText(rt, tx, y + rowH / 2 + 28);
    } else {
      const lines = wrap(ctx, row.left, tw, 30, '700').slice(0, 2);
      const lh = 36;
      let ly = y + rowH / 2 - ((lines.length - 1) * lh) / 2 + 10;
      ctx.font = `700 30px ${FONT}`; ctx.fillStyle = p.ink;
      for (const l of lines) { ctx.fillText(l, tx, ly); ly += lh; }
    }
    y += rowH + rowGap;
  }

  // ===== Insight box (chốt) =====
  if (data.insight) {
    y += 8;
    const boxH = 118;
    const ig = ctx.createLinearGradient(m, y, m + cw, y);
    ig.addColorStop(0, p.accent); ig.addColorStop(1, p.accent2);
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.roundRect(m, y, cw, boxH, 22); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    const insLines = wrap(ctx, '💡  ' + data.insight, cw - 56, 34, '800').slice(0, 2);
    ctx.font = `800 34px ${FONT}`; ctx.textAlign = 'left';
    let iy = y + boxH / 2 - ((insLines.length - 1) * 42) / 2 + 12;
    for (const l of insLines) { ctx.fillText(l, m + 28, iy); iy += 42; }
    y += boxH + 24;
  }

  // ===== CTA (pill) =====
  if (data.cta) {
    ctx.font = `800 28px ${FONT}`;
    const ct = data.cta;
    const cwid = Math.min(cw, ctx.measureText(ct).width + 72);
    const cx = (W - cwid) / 2;
    const ch = 72;
    ctx.fillStyle = p.pillBg;
    ctx.beginPath(); ctx.roundRect(cx, y, cwid, ch, 36); ctx.fill();
    ctx.strokeStyle = p.pillBorder; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = p.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ct, W / 2, y + ch / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    y += ch + 16;
  }

  // ===== Watermark brand =====
  ctx.font = `700 20px ${FONT}`; ctx.fillStyle = p.muted; ctx.textAlign = 'right';
  ctx.fillText((data.brand || '✸ mivy').toString(), W - m, H - 36);
  ctx.textAlign = 'left';
}
