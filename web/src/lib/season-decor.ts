// Trang trí theo DỊP cho poster skin (SVG overlay) — 6 kiểu dùng chung,
// hoạ tiết (motif) riêng từng dịp + tông màu dịp. Khớp với bản canvas (season-engine).
import { getSeason } from './season-engine';

export const SEASON_VARIANTS = [
  { id: 'corner', label: 'Góc đôi' },
  { id: 'hang', label: 'Treo' },
  { id: 'stamp', label: 'Tem' },
  { id: 'scatter', label: 'Rải' },
  { id: 'column', label: 'Hai mép' },
  { id: 'seal', label: 'Ấn tròn' },
  { id: 'tile', label: 'Lặp mờ' },
  { id: 'giant', label: 'Dấu ấn lớn' },
  { id: 'arc', label: 'Vòng cung' },
  { id: 'frame', label: 'Viền hoạ tiết' },
  { id: 'bunting', label: 'Dây cờ' },
  { id: 'ribbon', label: 'Băng chéo' },
  { id: 'rays', label: 'Tia sáng' },
  { id: 'confetti', label: 'Giấy vụn' },
  { id: 'falling', label: 'Hoa rơi' },
  { id: 'snow', label: 'Tuyết rơi' },
];

// hình hoạ tiết user chọn thay cho hình mặc định của dịp (id = id dịp có motif đó)
export const SEASON_MOTIFS = [
  { id: 'star', label: 'Sao' },
  { id: '8thang3', label: 'Tim' },
  { id: 'tet', label: 'Hoa mai' },
  { id: 'trungthu', label: 'Lồng đèn' },
  { id: 'noel', label: 'Cây thông' },
  { id: '1111', label: 'Tia sét' },
];
/** Tuỳ chỉnh trang trí: kiểu + màu chính/phụ + hình (bỏ trống = theo dịp). */
export interface SeasonDecorOpts { variant?: string; c1?: string; c2?: string; motif?: string }

// hoạ tiết riêng từng dịp — vẽ quanh gốc trong khung -50..50, tô màu `col`
function motifInner(seasonId: string, col: string): string {
  switch (seasonId) {
    case 'tet': { // mai 5 cánh tinh xảo (cánh khuyết + nhuỵ tua)
      const petal = `<path d="M0 -6 C-17 -21 -15 -47 -3 -50 Q0 -45 3 -50 C15 -47 17 -21 0 -6 Z" fill="${col}"/>`;
      return `<g>${[0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a})">${petal}</g>`).join('')}<circle r="8" fill="#b45309"/>${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="0" cy="-6" r="1.8" fill="#fde68a" transform="rotate(${a})"/>`).join('')}</g>`;
    }
    case 'trungthu': // lồng đèn tinh xảo
      return `<g fill="${col}"><rect x="-1.5" y="-50" width="3" height="10"/><rect x="-16" y="-41" width="32" height="7.5" rx="3"/><ellipse cx="0" cy="-1" rx="30" ry="33"/><rect x="-16" y="32" width="32" height="7.5" rx="3"/><g stroke="${col}" stroke-width="2.5" stroke-linecap="round"><line x1="-9" y1="39" x2="-9" y2="49"/><line x1="0" y1="39" x2="0" y2="49"/><line x1="9" y1="39" x2="9" y2="49"/></g></g><g fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2"><line x1="0" y1="-30" x2="0" y2="28"/><path d="M-17 -20 Q-26 -1 -17 20"/><path d="M17 -20 Q26 -1 17 20"/></g>`;
    case '8thang3': // trái tim + highlight
      return `<path d="M0 34 C-46 2 -38 -34 -14 -34 C-2 -34 0 -24 0 -18 C0 -24 2 -34 14 -34 C38 -34 46 2 0 34 Z" fill="${col}"/><ellipse cx="-16" cy="-14" rx="6.5" ry="11" transform="rotate(-28 -16 -14)" fill="#ffffff" fill-opacity="0.45"/>`;
    case 'noel': // cây thông 3 tầng + sao + bi
      return `<g fill="${col}"><polygon points="0,-50 15,-25 -15,-25"/><polygon points="0,-31 22.5,-4 -22.5,-4"/><polygon points="0,-11 30,25 -30,25"/><rect x="-5" y="25" width="10" height="15"/></g><g fill="#fde68a"><circle cx="0" cy="-50" r="6"/><circle cx="-8" cy="5" r="3"/><circle cx="10" cy="14" r="3"/><circle cx="-2.5" cy="-15" r="2.5"/></g>`;
    case 'blackfriday':
    case '1111':
    case '1212': // tia sét + viền sáng
      return `<polygon points="7,-46 -26,10 2,10 -7,46 30,-12 2,-12" fill="${col}"/><polygon points="7,-46 -26,10 2,10 -7,46 30,-12 2,-12" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2" stroke-linejoin="round"/>`;
    default: // sao
      return `<path d="M0 -46 L13 -14 L47 -14 L19 8 L30 42 L0 22 L-30 42 L-19 8 L-47 -14 L-13 -14 Z" fill="${col}"/>`;
  }
}
/** Hình mặc định của dịp (khớp các case trong motifInner). */
export const seasonMotifOf = (seasonId?: string) =>
  ['tet', 'trungthu', '8thang3', 'noel'].includes(seasonId || '') ? seasonId! : ['blackfriday', '1111', '1212'].includes(seasonId || '') ? '1111' : 'star';
/** Icon SVG của 1 hình hoạ tiết (cho nút chọn). */
export const motifIconSvg = (motif: string, col: string) =>
  `<svg viewBox="-54 -54 108 108" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${motifInner(motif, col)}</svg>`;
function motifG(id: string, x: number, y: number, r: number, col: string): string {
  return `<g transform="translate(${x},${y}) scale(${(r / 50).toFixed(3)})">${motifInner(id, col)}</g>`;
}

function snowflakeSvg(col: string): string {
  const arm = `<g stroke="${col}" stroke-width="4.5" stroke-linecap="round" fill="none"><line x1="0" y1="0" x2="0" y2="-50"/><line x1="0" y1="-29" x2="12" y2="-39"/><line x1="0" y1="-29" x2="-12" y2="-39"/><line x1="0" y1="-42" x2="8" y2="-50"/><line x1="0" y1="-42" x2="-8" y2="-50"/></g>`;
  return `<g>${[0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a})">${arm}</g>`).join('')}</g>`;
}
const fr = (n: number) => n - Math.floor(n);

const sparkleSvg = (col: string) => `<path d="M0 -6 Q1.2 -1.2 6 0 Q1.2 1.2 0 6 Q-1.2 1.2 -6 0 Q-1.2 -1.2 0 -6 Z" fill="${col}"/>`;
const sparkleG = (x: number, y: number, r: number, col: string) => `<g transform="translate(${x},${y}) scale(${(r / 6).toFixed(2)})">${sparkleSvg(col)}</g>`;
// hoa văn góc toả vào trong từ gốc (0,0), kích thước A
const flourish = (cx: number, cy: number, sx: number, sy: number, A: number, col: string, lw: number) =>
  `<g transform="translate(${cx},${cy}) scale(${sx},${sy})" fill="none" stroke="${col}" stroke-width="${lw}" stroke-linecap="round"><path d="M0 ${A} C0 ${A * 0.42} ${A * 0.42} 0 ${A} 0"/><path d="M${A} 0 Q${A - A * 0.32} 0 ${A - A * 0.32} ${A * 0.32}"/><circle cx="${A * 0.6}" cy="${A * 0.27}" r="${lw * 1.3}" fill="${col}" stroke="none"/></g>`;

export function renderSeasonDecor(seasonId: string | undefined, opts: string | SeasonDecorOpts | undefined): string {
  const s = getSeason(seasonId);
  if (!s || s.id === 'none') return '';
  const o: SeasonDecorOpts = typeof opts === 'object' ? opts : { variant: opts };
  const v = o.variant || 'corner';
  const c1 = o.c1 || s.c1, c2 = o.c2 || s.c2, id = o.motif || s.id;
  let body = '';

  if (v === 'hang') {
    const br = 30, y = 76;
    body = [324, 756].map((x) =>
      `<line x1="${x}" y1="0" x2="${x}" y2="${y - br}" stroke="${c2}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${br}" fill="${c1}"/><rect x="${x - br * 0.28}" y="${y - br - 7}" width="${br * 0.56}" height="9" fill="${c2}"/>`).join('') + sparkleG(540, 94, 34, c2);
  } else if (v === 'column') {
    const m = 48, r = 24, y0 = m + 40, y1 = 1350 - m - 40;
    const rail = (bx: number) => `<line x1="${bx}" y1="${y0}" x2="${bx}" y2="${y1}" stroke="${c1}" stroke-width="4" stroke-linecap="round"/>` +
      Array.from({ length: 7 }, (_, i) => motifG(id, bx, Math.round(y0 + i * (y1 - y0) / 6), r, c2)).join('');
    body = rail(m) + rail(1080 - m);
  } else if (v === 'stamp') {
    const R = 76, cx = 1080 - R - 40, cy = R + 40;
    body = `<g transform="translate(${cx},${cy}) rotate(-7)"><circle r="${R}" fill="${c1}"/><circle r="${R * 0.82}" fill="none" stroke="${c2}" stroke-width="4"/>${motifG(id, 0, 0, R * 0.5, c2)}</g>`;
  } else if (v === 'scatter') {
    // Rải thành cụm ở 2 góc chéo
    body = motifG(id, 940, 60, 43, c1) + motifG(id, 842, 108, 28, c2) + motifG(id, 1004, 120, 22, c1)
      + motifG(id, 140, 1290, 43, c1) + motifG(id, 238, 1242, 28, c2) + motifG(id, 86, 1230, 22, c1);
  } else if (v === 'seal') {
    const cx = 540, cy = 405;
    body = `<g opacity="0.16">${[216, 162, 108].map((rr) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${c1}" stroke-width="10"/>`).join('')}${motifG(id, cx, cy, 118, c1)}</g>`;
  } else if (v === 'tile') {
    const step = 184, r = 46; let cells = '';
    for (let gy = 0, row = 0; gy < 1350 + step; gy += step, row++)
      for (let gx = (row % 2 ? step / 2 : 0); gx < 1080 + step; gx += step) cells += motifG(id, gx, gy, r, c1);
    body = `<g opacity="0.07">${cells}</g>`;
  } else if (v === 'giant') {
    body = `<g opacity="0.10">${motifG(id, 910, 1160, 540, c1)}</g>`;
  } else if (v === 'arc') {
    const cx = 540, cy = 1380;
    body = `<g opacity="0.13" fill="none" stroke="${c1}" stroke-width="13">${[600, 460, 320].map((rr) => `<path d="M${cx - rr} ${cy} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}"/>`).join('')}</g><g opacity="0.16">${motifG(id, 540, 170, 54, c1)}</g>`;
  } else if (v === 'falling') {
    const pts: [number, number, number][] = [[0.1, 0.14, 1], [0.3, 0.07, 0.6], [0.52, 0.2, 0.85], [0.72, 0.1, 0.55], [0.9, 0.17, 0.95], [0.16, 0.4, 0.7], [0.42, 0.46, 1.1], [0.66, 0.37, 0.6], [0.86, 0.52, 0.85], [0.2, 0.66, 0.9], [0.5, 0.73, 0.6], [0.78, 0.64, 1], [0.12, 0.88, 0.7], [0.37, 0.9, 0.5], [0.62, 0.92, 0.85], [0.9, 0.84, 0.6]];
    body = pts.map(([px, py, sc]) => {
      const x = Math.round(px * 1080), y = Math.round(py * 1350), op = (0.06 + 0.1 * (sc - 0.5)).toFixed(2);
      return `<g opacity="${op}" transform="rotate(${Math.round((px * 6 + py * 11) * 57) % 360} ${x} ${y})">${motifG(id, x, y, 59 * sc, c1)}</g>`;
    }).join('');
  } else if (v === 'snow') {
    let flakes = '';
    for (let i = 0; i < 11; i++) {
      const rx = fr(Math.sin(i * 91.3) * 33219.1), ry = fr(Math.sin(i * 57.7) * 71523.9), rs = fr(Math.sin(i * 41.1) * 9271.3);
      const r = 1080 * (0.03 + 0.035 * rs);
      flakes += `<g opacity="${(0.07 + 0.06 * rs).toFixed(2)}" transform="translate(${Math.round(rx * 1080)},${Math.round(ry * 1350)}) scale(${(r / 50).toFixed(3)}) rotate(${Math.round(rs * 120)})">${snowflakeSvg('#ffffff')}</g>`;
    }
    let dots = '';
    for (let i = 0; i < 42; i++) {
      const rx = fr(Math.sin(i * 127.1) * 43758.5), ry = fr(Math.sin(i * 311.7) * 52713.1), rs = fr(Math.sin(i * 74.7) * 19349.3);
      dots += `<circle cx="${Math.round(rx * 1080)}" cy="${Math.round(ry * 1350)}" r="${(4 + 10 * rs).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + 0.5 * rs).toFixed(2)}"/>`;
    }
    body = flakes + dots;
  } else if (v === 'frame') {
    const pad = 45, lw = 4.3;
    const rr = (x: number, y: number, w: number, h: number, r: number, st: string, sw: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${st}" stroke-width="${sw}"/>`;
    body = rr(pad, pad, 1080 - 2 * pad, 1350 - 2 * pad, 22, c1, lw) + rr(pad + 10, pad + 10, 1080 - 2 * pad - 20, 1350 - 2 * pad - 20, 18, c2, 2.2)
      + motifG(id, pad + 42, pad + 42, 35, c1) + motifG(id, 1080 - pad - 42, pad + 42, 35, c1);
  } else if (v === 'bunting') {
    const n = 11, fw = 1080 / n, y = 14, fh = 52;
    let line = `M0 ${y}`;
    for (let i = 0; i < n; i++) line += ` Q${(i + 0.5) * fw} ${y + fh * 0.42} ${(i + 1) * fw} ${y}`;
    let flags = '';
    for (let i = 0; i < n; i++) { const x = i * fw, col = i % 2 ? c1 : c2; flags += `<polygon points="${x + fw * 0.12},${y + fh * 0.08} ${x + fw * 0.88},${y + fh * 0.08} ${x + fw * 0.5},${y + fh}" fill="${col}"/>`; }
    body = `<path d="${line}" fill="none" stroke="${c1}" stroke-width="3.2"/>` + flags;
  } else if (v === 'ribbon') {
    const label = (s.suggest || '').toUpperCase();
    body = `<g transform="translate(1080,0) rotate(45)"><rect x="-258" y="150" width="560" height="60" fill="${c1}"/><rect x="-258" y="150" width="560" height="8" fill="${c2}"/><rect x="-258" y="202" width="560" height="8" fill="${c2}"/>${label ? `<text x="22" y="190" fill="#fff" font-size="33" font-weight="800" text-anchor="middle" font-family="'Be Vietnam Pro',sans-serif">${label}</text>` : ''}</g>`;
  } else if (v === 'rays') {
    let r = '';
    for (let i = 0; i < 24; i += 2) r += `<g transform="translate(540,-108) rotate(${Math.round((i / 24) * 360)})"><polygon points="0,0 -59,2160 59,2160" fill="${c1}"/></g>`;
    body = `<g opacity="0.08">${r}</g>`;
  } else if (v === 'confetti') {
    let c = '';
    for (let i = 0; i < 46; i++) {
      const rx = fr(Math.sin(i * 12.9) * 43758.5), ry = fr(Math.sin(i * 78.2) * 12543.1), rrr = fr(Math.sin(i * 33.3) * 9999.9);
      const col = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : '#ffffff', sz = 10 + 12 * rrr, x = Math.round(rx * 1080), y = Math.round(ry * 1350), rot = Math.round(rrr * 340), op = (0.45 + 0.4 * rrr).toFixed(2);
      c += i % 2 ? `<rect x="${(-sz / 2).toFixed(1)}" y="${(-sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${(sz * 0.62).toFixed(1)}" fill="${col}" opacity="${op}" transform="translate(${x},${y}) rotate(${rot})"/>` : `<circle cx="${x}" cy="${y}" r="${(sz * 0.52).toFixed(1)}" fill="${col}" opacity="${op}"/>`;
    }
    body = c;
  } else {
    // corner — hoa văn góc cổ điển (không nhét motif dịp)
    const off = 46, A = 66, lw = 3.4;
    body = flourish(off, off, 1, 1, A, c2, lw) + flourish(1080 - off, off, -1, 1, A, c2, lw)
      + flourish(off, 1350 - off, 1, -1, A, c2, lw) + flourish(1080 - off, 1350 - off, -1, -1, A, c2, lw);
  }

  return `<div style="position:absolute;inset:0;z-index:6;pointer-events:none;"><svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">${body}</svg></div>`;
}
