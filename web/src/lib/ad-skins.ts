// "Skin" = phong cách nghệ thuật (palette + font + trang trí) TÁCH khỏi bố cục nội dung.
// Một bố cục poster quảng cáo chuẩn (headline + mô tả + info + CTA + ảnh) được KHOÁC da theo skin.
// => Lấy vibe cổ điển/deco/thiên nhiên... áp lên poster ngành, KHÔNG bê nguyên template brand.

export interface AdContent {
  eyebrow?: string;   // dòng nhỏ trên cùng (ngành / ngày)
  headline?: string;  // tiêu đề lớn
  subhead?: string;   // mô tả 1 dòng
  points?: string[];  // 2-4 ý / info
  cta?: string;       // nút
  brand?: string;     // tên shop / thương hiệu
  image?: string;     // ảnh (data URL / URL)
}

export interface AdSkin {
  id: string;
  name: string;
  group: string;      // nhóm hiển thị trong băng chọn
  fontImport: string; // @import google fonts
  bg: string;
  ink: string;        // màu chữ chính
  muted: string;      // chữ phụ
  accent: string;     // màu nhấn / nút
  accentInk: string;  // chữ trên nút
  fontDisplay: string;
  fontBody: string;
  headlineUpper?: boolean;
  headlineItalic?: boolean;
  headlineWeight?: number;
  ctaOutline?: boolean;     // nút viền thay vì nền đặc
  // lớp trang trí vẽ đè (khung, hoa văn, texture...) — nhận màu ink/accent
  frame: (ink: string, accent: string, muted: string) => string;
}

const grain = (opacity = 0.07) =>
  `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:${opacity};mix-blend-mode:multiply;pointer-events:none" aria-hidden="true"><filter id="gn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#gn)"/></svg>`;

export const AD_SKINS: AdSkin[] = [
  {
    id: 'vintage',
    name: 'Cổ điển / Vintage',
    group: 'Nghệ thuật',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');",
    bg: '#f0e6cf', ink: '#2c1d0d', muted: '#6b4e2a', accent: '#2c1d0d', accentInk: '#f0e6cf',
    fontDisplay: "'Playfair Display', serif", fontBody: "'EB Garamond', serif",
    frame: (ink, _a, muted) => `
      ${grain(0.08)}
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${ink}">
        <rect x="46" y="46" width="988" height="1258" stroke-width="5"/>
        <rect x="64" y="64" width="952" height="1222" stroke-width="1.5"/>
        <g stroke-width="2.4" stroke-linecap="round">
          <path d="M64 150 q86 0 86 -86 M64 120 q56 0 56 -56"/>
          <path d="M1016 150 q-86 0 -86 -86 M1016 120 q-56 0 -56 -56"/>
          <path d="M64 1200 q86 0 86 86 M64 1230 q56 0 56 56"/>
          <path d="M1016 1200 q-86 0 -86 86 M1016 1230 q-56 0 -56 56"/>
        </g>
      </svg>`,
  },
  {
    id: 'deco',
    name: 'Art Deco',
    group: 'Nghệ thuật',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Poiret+One&family=Jost:wght@300;500;700&display=swap');",
    bg: '#0f1b1a', ink: '#f3ead3', muted: '#b9a978', accent: '#c9a84a', accentInk: '#0f1b1a',
    fontDisplay: "'Poiret One', 'Jost', sans-serif", fontBody: "'Jost', sans-serif",
    headlineUpper: true,
    frame: (_i, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${accent}">
        <rect x="54" y="54" width="972" height="1242" stroke-width="2"/>
        <g stroke-width="2.4">
          <path d="M54 230 L170 54 M54 170 L116 54"/>
          <path d="M1026 230 L910 54 M1026 170 L964 54"/>
          <path d="M54 1120 L170 1296 M54 1180 L116 1296"/>
          <path d="M1026 1120 L910 1296 M1026 1180 L964 1296"/>
        </g>
        <g fill="${accent}" stroke="none">
          <circle cx="540" cy="92" r="5"/><circle cx="540" cy="1258" r="5"/>
        </g>
      </svg>`,
  },
  {
    id: 'botanical',
    name: 'Thiên nhiên / Botanical',
    group: 'Nghệ thuật',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,400&family=Jost:wght@300;500&display=swap');",
    bg: '#eef1e6', ink: '#24341f', muted: '#5e7049', accent: '#3f5b2e', accentInk: '#eef1e6',
    fontDisplay: "'Fraunces', serif", fontBody: "'Jost', sans-serif",
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${muted}" stroke-width="2.2" stroke-linecap="round">
        <g transform="translate(120,150)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40 M44 158 q-40 -6 -58 -40"/>
        </g>
        <g transform="translate(960,150) scale(-1,1)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40 M44 158 q-40 -6 -58 -40"/>
        </g>
        <g transform="translate(120,1200) scale(1,-1)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40"/>
        </g>
        <g transform="translate(960,1200) scale(-1,-1)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40"/>
        </g>
      </svg>`,
  },
  {
    id: 'noir',
    name: 'Tối giản / Noir',
    group: 'Hiện đại',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600;800&display=swap');",
    bg: '#0b0b0c', ink: '#f5f5f3', muted: '#8a8a86', accent: '#e4ff32', accentInk: '#0b0b0c',
    fontDisplay: "'Anton', sans-serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (ink) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" stroke="${ink}" stroke-width="1" opacity="0.35">
        <line x1="72" y1="120" x2="1008" y2="120"/>
        <line x1="72" y1="1230" x2="1008" y2="1230"/>
      </svg>`,
  },
  {
    id: 'pop',
    name: 'Pop / Rực rỡ',
    group: 'Hiện đại',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;700&display=swap');",
    bg: '#ff4d2e', ink: '#fff7ed', muted: '#ffd9c9', accent: '#111111', accentInk: '#ffe14d',
    fontDisplay: "'Archivo Black', sans-serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (ink) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${ink}" stroke-width="3" opacity="0.9">
        <rect x="44" y="44" width="992" height="1262" rx="26"/>
      </svg>`,
  },
  {
    id: 'nouveau',
    name: 'Art Nouveau',
    group: 'Nghệ thuật',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=EB+Garamond&display=swap');",
    bg: '#ebe7d8', ink: '#2f3b2a', muted: '#7b7a4e', accent: '#9c6b3f', accentInk: '#ebe7d8',
    fontDisplay: "'Cormorant Garamond', serif", fontBody: "'EB Garamond', serif",
    headlineItalic: true, headlineWeight: 600,
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${muted}" stroke-width="2.4" stroke-linecap="round">
        <rect x="52" y="52" width="976" height="1246" stroke="${accent}" stroke-width="1.4"/>
        <path d="M52 220 C52 120 130 70 230 62 C150 90 108 150 110 240"/>
        <path d="M1028 220 C1028 120 950 70 850 62 C930 90 972 150 970 240"/>
        <path d="M52 1130 C52 1230 130 1280 230 1288 C150 1260 108 1200 110 1110"/>
        <path d="M1028 1130 C1028 1230 950 1280 850 1288 C930 1260 972 1200 970 1110"/>
      </svg>`,
  },
  {
    id: 'oriental',
    name: 'Á Đông',
    group: 'Á Đông',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Noto+Serif:wght@400;600&display=swap');",
    bg: '#f3e9d6', ink: '#7a1f1a', muted: '#9c6b2f', accent: '#b8862c', accentInk: '#fbf3e0',
    fontDisplay: "'Playfair Display', serif", fontBody: "'Noto Serif', serif",
    frame: (ink, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${ink}">
        <rect x="56" y="56" width="968" height="1238" stroke-width="3"/>
        <rect x="74" y="74" width="932" height="1202" stroke="${accent}" stroke-width="1"/>
        <g stroke="${accent}" stroke-width="3">
          <path d="M92 92 h70 M92 92 v70 M988 92 h-70 M988 92 v70 M92 1258 h70 M92 1258 v-70 M988 1258 h-70 M988 1258 v-70"/>
        </g>
        <circle cx="540" cy="150" r="26" stroke="${accent}" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'retro70',
    name: 'Retro 70s',
    group: 'Nghệ thuật',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Archivo:wght@500;700&display=swap');",
    bg: '#f0d9a8', ink: '#5a2a16', muted: '#b5732e', accent: '#d9541f', accentInk: '#f0d9a8',
    fontDisplay: "'Alfa Slab One', serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none">
        <g stroke-width="10" fill="none">
          <path d="M-40 1310 a300 300 0 0 1 600 0" stroke="${accent}"/>
          <path d="M-40 1310 a360 360 0 0 1 720 0" stroke="${muted}"/>
          <path d="M520 1310 a300 300 0 0 1 600 0" stroke="${accent}"/>
        </g>
      </svg>`,
  },
  {
    id: 'genz',
    name: 'GenZ / Sticker',
    group: 'Hiện đại',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;700&display=swap');",
    bg: '#6c4cf0', ink: '#fdfcff', muted: '#d7ccff', accent: '#d6ff3d', accentInk: '#1a1030',
    fontDisplay: "'Archivo Black', sans-serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (ink, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none">
        <rect x="40" y="48" width="1000" height="1254" rx="34" stroke="${ink}" stroke-width="3"/>
        <g fill="${accent}">
          <path d="M150 140 l14 34 l36 4 l-28 24 l9 36 l-31 -20 l-31 20 l9 -36 l-28 -24 l36 -4 z"/>
          <circle cx="930" cy="150" r="20"/>
        </g>
      </svg>`,
  },
  {
    id: 'celestial',
    name: 'Thiên văn',
    group: 'Nghệ thuật',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&family=EB+Garamond&display=swap');",
    bg: '#121633', ink: '#f4ecd8', muted: '#8a8fc0', accent: '#e7c25c', accentInk: '#121633',
    fontDisplay: "'Playfair Display', serif", fontBody: "'EB Garamond', serif",
    frame: (_i, accent, muted) => {
      const star = (x: number, y: number, r: number) => `<path d="M${x} ${y - r} l${r * 0.28} ${r * 0.72} l${r * 0.72} ${r * 0.28} l-${r * 0.72} ${r * 0.28} l-${r * 0.28} ${r * 0.72} l-${r * 0.28} -${r * 0.72} l-${r * 0.72} -${r * 0.28} l${r * 0.72} -${r * 0.28} z" fill="${accent}"/>`;
      return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none">
        <rect x="54" y="54" width="972" height="1242" stroke="${muted}" stroke-width="1.2" opacity="0.6"/>
        <path d="M200 190 a360 360 0 0 1 680 0" stroke="${accent}" stroke-width="1.2" stroke-dasharray="3 10"/>
        ${star(540, 140, 20)}${star(170, 300, 10)}${star(920, 320, 12)}${star(210, 1120, 9)}${star(880, 1100, 11)}
      </svg>`;
    },
  },
  {
    id: 'candlenight',
    name: 'Đêm nến',
    group: 'Lãng mạn',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=EB+Garamond:ital@0;1&display=swap');",
    bg: '#15100e', ink: '#f2e7d6', muted: '#b89a84', accent: '#c6564d', accentInk: '#15100e',
    fontDisplay: "'Cormorant Garamond', serif", fontBody: "'EB Garamond', serif",
    headlineItalic: true, headlineWeight: 600,
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${muted}" stroke-width="1.2">
        <rect x="56" y="56" width="968" height="1238"/>
        <g fill="${accent}" stroke="none"><path d="M540 118 c-20 -17 -16 -34 -5 -34 c6 0 5 6 5 8 c0 -2 -1 -8 5 -8 c11 0 15 17 -5 34 Z"/></g>
      </svg>`,
  },
  {
    id: 'blush',
    name: 'Hồng phấn',
    group: 'Lãng mạn',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500;1,600&family=EB+Garamond:ital@0;1&display=swap');",
    bg: '#f7e8e6', ink: '#6e2f38', muted: '#b67e88', accent: '#cf6f7c', accentInk: '#ffffff',
    fontDisplay: "'Playfair Display', serif", fontBody: "'EB Garamond', serif",
    headlineItalic: true,
    frame: (_i, accent, muted) => {
      const heart = (x: number, y: number, s: number) => `<path transform="translate(${x},${y}) scale(${s})" d="M0 12 C-16 -2 -12 -16 -4 -16 C-1 -16 0 -11 0 -9 C0 -11 1 -16 4 -16 C12 -16 16 -2 0 12 Z" fill="${accent}"/>`;
      return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${muted}" stroke-width="1.3">
        <rect x="54" y="54" width="972" height="1242"/>
        ${heart(110, 110, 1.6)}${heart(970, 110, 1.6)}${heart(110, 1240, 1.6)}${heart(970, 1240, 1.6)}
      </svg>`;
    },
  },
  {
    id: 'burgundy',
    name: 'Rượu vang',
    group: 'Lãng mạn',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=EB+Garamond&display=swap');",
    bg: '#3a0f17', ink: '#f4e0ca', muted: '#c98f86', accent: '#e4b45a', accentInk: '#3a0f17',
    fontDisplay: "'Cormorant Garamond', serif", fontBody: "'EB Garamond', serif",
    frame: (_i, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${accent}" stroke-width="1.4">
        <rect x="52" y="52" width="976" height="1246"/>
        <rect x="66" y="66" width="948" height="1218" stroke-width="0.8"/>
        <g stroke-width="2"><path d="M86 160 q74 0 74 -74 M994 160 q-74 0 -74 -74 M86 1190 q74 0 74 74 M994 1190 q-74 0 -74 74"/></g>
      </svg>`,
  },
  {
    id: 'editorial',
    name: 'Tạp chí',
    group: 'Hiện đại',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=EB+Garamond:ital@0;1&display=swap');",
    bg: '#f7f6f2', ink: '#161616', muted: '#8a8a86', accent: '#c4342b', accentInk: '#f7f6f2',
    fontDisplay: "'Oswald', sans-serif", fontBody: "'EB Garamond', serif",
    headlineUpper: true,
    frame: (ink) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" stroke="${ink}" stroke-width="1" opacity="0.5">
        <line x1="72" y1="118" x2="1008" y2="118"/>
        <line x1="72" y1="128" x2="1008" y2="128"/>
        <line x1="72" y1="1232" x2="1008" y2="1232"/>
      </svg>`,
  },
];

export function getSkin(id: string): AdSkin | undefined {
  return AD_SKINS.find((s) => s.id === id);
}
