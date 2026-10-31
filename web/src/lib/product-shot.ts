// Ảnh sản phẩm chuẩn sàn — dựng bằng canvas ngay trên trình duyệt (không server, không AI):
// nền (trắng studio / xám / kem / gradient / màu thương hiệu / bục trưng bày / cảnh thật) + bóng đổ + đặt sản phẩm
// đúng vùng an toàn từng khổ (Shopee/Lazada 1:1, Facebook/IG 4:5, TikTok 9:16).

export type ShotLayout = '1:1' | '4:5' | '9:16';
export const SHOT_PLATFORMS: { id: ShotLayout; name: string; folder: string; w: number; h: number }[] = [
  { id: '1:1', name: 'Shopee · Lazada · TikTok Shop', folder: 'shopee-lazada-1x1', w: 1080, h: 1080 },
  { id: '4:5', name: 'Facebook · Instagram', folder: 'facebook-instagram-4x5', w: 1080, h: 1350 },
  { id: '9:16', name: 'TikTok · Reels · Story', folder: 'tiktok-story-9x16', w: 1080, h: 1920 },
];

export type BgKind = 'white' | 'gray' | 'cream' | 'gradient' | 'brand' | 'podium' | 'scene' | 'spotlight' | 'reflect' | 'pop' | 'sunlight' | 'wood' | 'marble' | 'aurora' | 'burst' | 'neon' | 'shapes' | 'shelf' | 'leaf';
export const BG_KINDS: { id: BgKind; name: string }[] = [
  { id: 'white', name: 'Trắng studio' }, { id: 'gray', name: 'Xám nhạt' }, { id: 'cream', name: 'Kem' },
  { id: 'gradient', name: 'Gradient màu' }, { id: 'brand', name: 'Màu thương hiệu' }, { id: 'podium', name: 'Bục trưng bày' }, { id: 'scene', name: 'Cảnh thật' },
  { id: 'wood', name: 'Mặt gỗ' }, { id: 'marble', name: 'Đá cẩm thạch' }, { id: 'spotlight', name: 'Sân khấu' },
  { id: 'reflect', name: 'Phản chiếu' }, { id: 'pop', name: 'Khối màu' }, { id: 'sunlight', name: 'Nắng cửa sổ' },
  { id: 'aurora', name: 'Gradient mây' }, { id: 'burst', name: 'Tia nắng' }, { id: 'neon', name: 'Viền neon' },
  { id: 'shapes', name: 'Khối hình học' }, { id: 'shelf', name: 'Kệ nổi' }, { id: 'leaf', name: 'Bóng lá' },
];
export type ShadowKind = 'soft' | 'contact' | 'none';

export interface ShotBg { kind: BgKind; tint: string; soft: string; main: string; scene?: HTMLImageElement | null }
export type MarkPos = 'br' | 'bl' | 'tr' | 'tl' | 'tile';
/** Logo shop đóng lên ảnh (chống lấy ảnh). tile = lặp chéo mờ khắp ảnh. */
export interface ShotMark { img: HTMLImageElement; pos: MarkPos; opacity: number }
export interface ShotOpts { layout: ShotLayout; img: HTMLImageElement; cut: boolean; bg: ShotBg; size: number; shadow: ShadowKind; safeZone?: boolean; scale?: number; mark?: ShotMark }

export function drawMark(ctx: CanvasRenderingContext2D, W: number, H: number, layout: ShotLayout, m: ShotMark) {
  const iw = m.img.naturalWidth || m.img.width, ih = m.img.naturalHeight || m.img.height;
  if (!iw || !ih) return;
  ctx.save(); ctx.globalAlpha = m.opacity;
  if (m.pos === 'tile') {
    const h = H * 0.06, w = Math.min((iw / ih) * h, W * 0.3), hh = (w / iw) * ih;
    ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 7);
    const R = Math.hypot(W, H) / 2, sx = w * 2.2, sy = hh * 3.2;
    for (let y = -R, row = 0; y < R; y += sy, row++) for (let x = -R + (row % 2) * sx / 2; x < R; x += sx) ctx.drawImage(m.img, x - w / 2, y - hh / 2, w, hh);
  } else {
    const h = H * (layout === '9:16' ? 0.06 : 0.085), w = Math.min((iw / ih) * h, W * 0.24), hh = (w / iw) * ih, pad = W * 0.04;
    const x = m.pos.endsWith('l') ? pad : W - pad - w;
    // 9:16: góc dưới bị nút/chú thích TikTok che → nâng lên trên vùng đó
    const bottom = layout === '9:16' ? H * 0.74 : H - pad;
    const y = m.pos.startsWith('t') ? pad : bottom - hh;
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = h * 0.15;
    ctx.drawImage(m.img, x, y, w, hh);
  }
  ctx.restore();
}

const hex = (h: string) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
// trả về hex để lồng mix(mix(...)) được
const mix = (a: string, b: string, t: number) => { const [x, y] = [hex(a), hex(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgbaA = (h: string) => `rgba(${hex(h).join(',')},A)`;

function cover(ctx: CanvasRenderingContext2D, im: CanvasImageSource & { width: number; height: number }, W: number, H: number, iw: number, ih: number) {
  const s = Math.max(W / iw, H / ih);
  ctx.drawImage(im, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
}

// Vùng đặt sản phẩm từng khổ. 9:16 né thanh nút bên phải + khối giỏ hàng/chú thích bên dưới (TikTok).
function zone(layout: ShotLayout, W: number, H: number) {
  if (layout === '9:16') return { cx: W * 0.46, cy: H * 0.44, maxW: W * 0.74, maxH: H * 0.48 };
  if (layout === '4:5') return { cx: W / 2, cy: H * 0.52, maxW: W * 0.84, maxH: H * 0.68 };
  return { cx: W / 2, cy: H * 0.51, maxW: W * 0.84, maxH: H * 0.8 };
}

// ===================== Dựng studio (kiểu ảnh chụp thật) =====================
// Mọi nền đều theo 1 hệ: tường + sàn liền (seamless sweep) gặp nhau ở "chân trời" ngay dưới đáy sản phẩm,
// đèn chính từ trên-trái → vũng sáng trên tường + sàn, góc tối nhẹ (vignette), hạt nhiễu như ảnh chụp.

// PRNG cố định → xem trước và file xuất giống hệt nhau
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let _grain: HTMLCanvasElement | null = null;
function grain(ctx: CanvasRenderingContext2D, W: number, H: number, amt: number) {
  if (!_grain) {
    _grain = document.createElement('canvas'); _grain.width = _grain.height = 256;
    const g = _grain.getContext('2d')!; const d = g.createImageData(256, 256); const r = rng(11);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(_grain, 'repeat')!; ctx.fillRect(0, 0, W, H); ctx.restore();
}

interface Stage { W: number; H: number; S: number; hz: number; cx: number; pw: number; ph: number; top: number }

function sweep(ctx: CanvasRenderingContext2D, st: Stage, wallTop: string, wallBot: string, floorNear: string, floorFar: string) {
  const { W, H, hz } = st;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const h = hz / H;
  g.addColorStop(0, wallTop); g.addColorStop(Math.max(0, h - 0.12), wallBot);
  g.addColorStop(Math.min(1, h + 0.015), floorFar); g.addColorStop(1, floorNear);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function pool(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, a: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color.replace('A', String(a))); g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, a: number) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.35, W / 2, H * 0.46, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// ánh sáng chung: vũng sáng trên tường sau sản phẩm + trên sàn trước sản phẩm
function keyLight(ctx: CanvasRenderingContext2D, st: Stage, a = 0.55) {
  pool(ctx, st.cx - st.pw * 0.15, st.top + st.ph * 0.3, Math.max(st.W, st.H) * 0.5, Math.max(st.W, st.H) * 0.42, 'rgba(255,255,255,A)', a);
  pool(ctx, st.cx, st.hz + (st.H - st.hz) * 0.25, st.pw * 1.2, (st.H - st.hz) * 0.5, 'rgba(255,255,255,A)', a * 0.6);
}

function woodTop(ctx: CanvasRenderingContext2D, st: Stage, base: string) {
  const { W, H, hz } = st; const r = rng(5);
  const g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, mix(base, '#000000', 0.12)); g.addColorStop(1, mix(base, '#ffffff', 0.06));
  ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
  ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
  // vân gỗ: đường lượn, giãn dần về phía trước (phối cảnh)
  for (let i = 0; i < 70; i++) {
    const t = Math.pow(r(), 1.5); const y = hz + (H - hz) * t; const amp = 2 + 10 * t; const ph = r() * 6;
    ctx.strokeStyle = r() > 0.5 ? `rgba(60,30,10,${0.05 + r() * 0.12})` : `rgba(255,225,190,${0.04 + r() * 0.08})`;
    ctx.lineWidth = 0.6 + t * 3.5 * r();
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 24) ctx.lineTo(x, y + Math.sin(x / (120 + 200 * r()) + ph) * amp);
    ctx.stroke();
  }
  // mép ván hội tụ về điểm tụ phía sau
  const vx = W / 2, vy = hz - H * 1.2;
  ctx.strokeStyle = 'rgba(40,20,5,0.22)'; ctx.lineWidth = 1.5;
  for (let i = -6; i <= 6; i++) { const bx = W / 2 + i * W * 0.24; const tt = (hz - vy) / (H - vy); ctx.beginPath(); ctx.moveTo(vx + (bx - vx) * tt, hz); ctx.lineTo(bx, H); ctx.stroke(); }
  ctx.restore();
  // mép bàn sáng
  ctx.fillStyle = 'rgba(255,240,220,0.35)'; ctx.fillRect(0, hz - 1, W, 2.5);
}

function marbleVeins(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, seed: number, S: number) {
  const r = rng(seed);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  // mảng mây xám rất nhẹ
  ctx.save(); ctx.filter = `blur(${Math.round(30 * S)}px)`;
  for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(150,155,168,${0.05 + r() * 0.05})`; ctx.beginPath(); ctx.ellipse(x0 + r() * w, y0 + r() * h, w * (0.15 + r() * 0.2), h * (0.1 + r() * 0.2), r() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // vài đường vân dài, mềm, chạy chéo cùng hướng (đá thật có hướng vân)
  for (let v = 0; v < 4; v++) {
    let x = x0 - w * 0.1, y = y0 + r() * h, ang = -0.25 + (r() - 0.5) * 0.3;
    const pts: [number, number][] = [];
    while (x < x0 + w * 1.1) { pts.push([x, y]); ang += (r() - 0.5) * 0.35; ang = Math.max(-0.7, Math.min(0.5, ang)); x += Math.cos(ang) * w * 0.03; y += Math.sin(ang) * w * 0.03; }
    const path = () => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.save(); ctx.filter = `blur(${Math.round(9 * S)}px)`; ctx.strokeStyle = 'rgba(120,126,140,0.12)'; ctx.lineWidth = 26; path(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.filter = `blur(${Math.max(1, Math.round(1.2 * S))}px)`; ctx.strokeStyle = `rgba(105,110,124,${0.22 + r() * 0.12})`; ctx.lineWidth = 1.6 + r() * 1.6; path(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}

// tán lá cọ (bóng lá xuyên nắng)
function frond(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.lineWidth = len * 0.012; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.08, len, len * 0.05); ctx.stroke();
  for (let i = 2; i < 18; i++) {
    const t = i / 18; const px = len * t, py = -len * 0.08 * Math.sin(Math.PI * t); const L = len * 0.32 * Math.sin(Math.PI * (0.15 + t * 0.85));
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(px, py); ctx.rotate(side * (0.9 - t * 0.4));
      ctx.beginPath(); ctx.ellipse(L / 2, 0, L / 2, len * 0.018, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}

function paintStage(ctx: CanvasRenderingContext2D, bg: ShotBg, st: Stage) {
  const { W, H, S, hz, cx } = st; const k = bg.kind;
  const main = bg.main, tint = bg.tint;
  if (k === 'white') { sweep(ctx, st, '#ffffff', '#f6f6f7', '#f3f3f5', '#e9eaed'); keyLight(ctx, st, 0.7); vignette(ctx, W, H, 0.06); }
  else if (k === 'gray') { sweep(ctx, st, '#e3e6ea', '#eceef1', '#e1e4e8', '#d3d7dd'); keyLight(ctx, st, 0.55); vignette(ctx, W, H, 0.12); }
  else if (k === 'cream') { sweep(ctx, st, '#f1e7d8', '#f8f1e6', '#efe3d0', '#e3d3bb'); keyLight(ctx, st, 0.5); vignette(ctx, W, H, 0.1); }
  else if (k === 'brand' || k === 'gradient' || k === 'podium') {
    const wall = k === 'brand' ? tint : mix(tint, '#ffffff', 0.15);
    sweep(ctx, st, mix(wall, main, 0.18), wall, mix(wall, main, 0.12), mix(wall, main, 0.22));
    keyLight(ctx, st, 0.5); vignette(ctx, W, H, 0.14);
  } else if (k === 'scene' && bg.scene) {
    // chiều sâu trường ảnh: cảnh thật mờ mạnh + sàn tối dần
    ctx.save(); ctx.filter = `blur(${Math.round(18 * S)}px) saturate(0.9)`;
    cover(ctx, bg.scene, W, H, bg.scene.naturalWidth, bg.scene.naturalHeight); ctx.restore();
    const g = ctx.createLinearGradient(0, hz - H * 0.1, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    pool(ctx, cx, st.top + st.ph * 0.4, st.pw * 1.1, st.ph * 0.8, 'rgba(255,255,255,A)', 0.22);
    vignette(ctx, W, H, 0.22);
  } else if (k === 'spotlight') {
    sweep(ctx, st, '#07080b', mix(main, '#0b0c10', 0.85), mix(main, '#0b0c10', 0.9), '#121318');
    // nón sáng từ trên xuống
    ctx.save(); ctx.filter = `blur(${Math.round(40 * S)}px)`;
    const cg = ctx.createLinearGradient(0, 0, 0, hz); cg.addColorStop(0, 'rgba(255,248,235,0.0)'); cg.addColorStop(1, 'rgba(255,248,235,0.20)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx - W * 0.08, -10); ctx.lineTo(cx + W * 0.08, -10); ctx.lineTo(cx + st.pw * 0.9, hz); ctx.lineTo(cx - st.pw * 0.9, hz); ctx.closePath(); ctx.fill(); ctx.restore();
    pool(ctx, cx, hz + (H - hz) * 0.08, st.pw * 1.1, (H - hz) * 0.3, 'rgba(255,245,228,A)', 0.42);
    vignette(ctx, W, H, 0.5);
  } else if (k === 'reflect') {
    sweep(ctx, st, '#e7e9ee', '#f4f5f8', '#cfd3db', '#dfe2e8'); keyLight(ctx, st, 0.6); vignette(ctx, W, H, 0.12);
  } else if (k === 'pop') {
    sweep(ctx, st, mix(main, '#000000', 0.08), main, mix(main, '#000000', 0.06), mix(main, '#000000', 0.16));
    const R = Math.min(W * 0.46, st.ph * 0.75);
    const c = ctx.createRadialGradient(cx - R * 0.3, st.top + st.ph * 0.35 - R * 0.3, 0, cx, st.top + st.ph * 0.45, R);
    c.addColorStop(0, mix(main, '#ffffff', 0.45)); c.addColorStop(1, mix(main, '#ffffff', 0.12));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 50 * S; ctx.shadowOffsetY = 20 * S;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, Math.min(hz - R * 0.6, st.top + st.ph * 0.45), R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    keyLight(ctx, st, 0.25); vignette(ctx, W, H, 0.18);
  } else if (k === 'sunlight') {
    sweep(ctx, st, '#efe2cc', '#f7ecda', '#ecdcc2', '#dfcaa9');
    // nắng qua khung cửa sổ 2×2 đổ chéo lên tường + sàn
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = `blur(${Math.round(14 * S)}px)`; ctx.fillStyle = 'rgba(255,226,170,0.55)';
    const px = W * 0.08, py = H * 0.06, pw = W * 0.24, ph = H * 0.3, gap = W * 0.025, sk = W * 0.22;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x0 = px + i * (pw + gap) + j * sk * 0.5, y0 = py + j * (ph + gap);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + pw, y0); ctx.lineTo(x0 + pw + sk * 0.5, y0 + ph); ctx.lineTo(x0 + sk * 0.5, y0 + ph); ctx.closePath(); ctx.fill();
    }
    ctx.restore(); vignette(ctx, W, H, 0.12);
  } else if (k === 'wood') {
    sweep(ctx, st, '#e9e1d4', '#f3ede3', '#a8754a', '#a8754a');
    pool(ctx, cx - st.pw * 0.2, st.top + st.ph * 0.2, Math.max(W, H) * 0.5, Math.max(W, H) * 0.4, 'rgba(255,255,255,A)', 0.5);
    woodTop(ctx, st, '#a8754a');
    pool(ctx, cx, hz + (H - hz) * 0.2, st.pw * 1.3, (H - hz) * 0.5, 'rgba(255,236,210,A)', 0.25);
    vignette(ctx, W, H, 0.2);
  } else if (k === 'marble') {
    sweep(ctx, st, '#e4e2de', '#efedea', '#f4f4f6', '#e9eaee');
    marbleVeins(ctx, 0, hz, W, H - hz, 3, S);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, hz - 1, W, 2);
    keyLight(ctx, st, 0.45); vignette(ctx, W, H, 0.12);
  } else if (k === 'aurora') {
    ctx.fillStyle = mix(tint, '#ffffff', 0.3); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.filter = `blur(${Math.round(70 * S)}px)`;
    const blobs: [number, number, number, string][] = [[0.2, 0.25, 0.32, mix(main, '#ffffff', 0.2)], [0.85, 0.2, 0.3, mix(bg.soft, '#ffffff', 0.05)], [0.7, 0.85, 0.36, mix(main, '#000000', 0.05)], [0.08, 0.8, 0.28, tint]];
    for (const [bx, by, r, col] of blobs) { ctx.globalAlpha = 0.75; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(W * bx, H * by, Math.max(W, H) * r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    const fg = ctx.createLinearGradient(0, hz, 0, H); fg.addColorStop(0, 'rgba(0,0,0,0.03)'); fg.addColorStop(1, 'rgba(0,0,0,0.1)'); ctx.fillStyle = fg; ctx.fillRect(0, hz, W, H - hz);
    keyLight(ctx, st, 0.35);
  } else if (k === 'burst') {
    sweep(ctx, st, mix(tint, main, 0.35), mix(tint, main, 0.15), mix(tint, main, 0.2), mix(tint, main, 0.3));
    ctx.save(); ctx.filter = `blur(${Math.round(10 * S)}px)`; ctx.translate(cx, st.top + st.ph * 0.4);
    const R = Math.max(W, H);
    for (let i = 0; i < 20; i++) {
      ctx.rotate((Math.PI * 2) / 20); if (i % 2) continue;
      const g = ctx.createLinearGradient(0, 0, R, 0); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * 0.09); ctx.lineTo(R, R * 0.09); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    pool(ctx, cx, st.top + st.ph * 0.4, st.pw * 1.1, st.pw * 1.1, 'rgba(255,255,255,A)', 0.55);
    vignette(ctx, W, H, 0.15);
  } else if (k === 'neon') {
    sweep(ctx, st, '#05060b', '#0b0e18', '#0a0c14', '#080a11');
    const neon = mix(main, '#ffffff', 0.3); const R = Math.min(W * 0.4, st.ph * 0.62); const ry = Math.min(hz - R - H * 0.02, st.top + st.ph * 0.42);
    const ring = (y: number, a: number) => { ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = neon; ctx.shadowBlur = 60 * S; ctx.strokeStyle = neon; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(cx, y, R, 0, Math.PI * 2); ctx.stroke(); ctx.stroke(); ctx.restore(); };
    ring(ry, 1);
    // phản chiếu trên sàn bóng
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip(); ctx.filter = `blur(${Math.round(6 * S)}px)`; ring(2 * hz - ry, 0.25); ctx.restore();
    pool(ctx, cx, hz + (H - hz) * 0.1, st.pw, (H - hz) * 0.25, rgbaA(mix(main, '#ffffff', 0.3)), 0.35);
    vignette(ctx, W, H, 0.45);
  } else if (k === 'shapes') {
    // đạo cụ 3D: vòm cong phía sau + quả cầu + trụ nhỏ (kiểu ảnh catalogue)
    const wall = mix(tint, '#ffffff', 0.25);
    sweep(ctx, st, mix(wall, main, 0.12), wall, mix(wall, main, 0.1), mix(wall, main, 0.2));
    const aw = Math.min(W * 0.62, st.pw * 1.7), ah = hz - Math.max(H * 0.08, st.top - st.ph * 0.15);
    const ag = ctx.createLinearGradient(cx - aw / 2, 0, cx + aw / 2, 0); ag.addColorStop(0, mix(main, '#ffffff', 0.35)); ag.addColorStop(1, mix(main, '#ffffff', 0.15));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 40 * S; ctx.shadowOffsetX = 16 * S;
    ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(cx - aw / 2, hz); ctx.lineTo(cx - aw / 2, hz - ah + aw / 2); ctx.arc(cx, hz - ah + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(cx + aw / 2, hz); ctx.closePath(); ctx.fill(); ctx.restore();
    const sr = W * 0.075, sx = cx - Math.min(W * 0.36, st.pw * 0.9), sy = hz + (H - hz) * 0.25 - sr;
    pool(ctx, sx + sr * 0.3, sy + sr * 0.95, sr * 1.2, sr * 0.25, 'rgba(0,0,0,A)', 0.3);
    const sg = ctx.createRadialGradient(sx - sr * 0.35, sy - sr * 0.4, sr * 0.1, sx, sy, sr); sg.addColorStop(0, mix(bg.soft, '#ffffff', 0.6)); sg.addColorStop(1, mix(main, '#000000', 0.1));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    const tw = W * 0.12, th = W * 0.14, tx = cx + Math.min(W * 0.3, st.pw * 0.8), ty = hz + (H - hz) * 0.18;
    pool(ctx, tx + tw * 0.2, ty, tw * 0.8, tw * 0.18, 'rgba(0,0,0,A)', 0.28);
    const tg = ctx.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0); tg.addColorStop(0, mix(tint, '#ffffff', 0.5)); tg.addColorStop(1, mix(tint, main, 0.35));
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(tx - tw / 2, ty - th); ctx.lineTo(tx - tw / 2, ty); ctx.ellipse(tx, ty, tw / 2, tw * 0.14, 0, Math.PI, 0, true); ctx.lineTo(tx + tw / 2, ty - th); ctx.closePath(); ctx.fill();
    ctx.fillStyle = mix(tint, '#ffffff', 0.65); ctx.beginPath(); ctx.ellipse(tx, ty - th, tw / 2, tw * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    keyLight(ctx, st, 0.3); vignette(ctx, W, H, 0.14);
  } else if (k === 'shelf') {
    const wall = mix(tint, '#ffffff', 0.4);
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
    pool(ctx, cx - st.pw * 0.2, st.top + st.ph * 0.3, Math.max(W, H) * 0.55, Math.max(W, H) * 0.45, 'rgba(255,255,255,A)', 0.6);
    vignette(ctx, W, H, 0.14);
  } else if (k === 'leaf') {
    sweep(ctx, st, '#ece3d1', '#f5efe3', '#ebe1cd', '#ddd0b6');
    keyLight(ctx, st, 0.5);
    ctx.save(); ctx.filter = `blur(${Math.round(9 * S)}px)`; ctx.fillStyle = 'rgba(52,62,36,0.16)'; ctx.strokeStyle = 'rgba(52,62,36,0.16)';
    frond(ctx, -W * 0.05, H * 0.05, W * 0.7, 0.35); frond(ctx, W * 1.05, H * 0.12, W * 0.62, Math.PI - 0.45); frond(ctx, W * 1.02, H * 0.7, W * 0.5, Math.PI + 0.3);
    ctx.restore(); vignette(ctx, W, H, 0.12);
  } else { sweep(ctx, st, '#ffffff', '#f6f6f7', '#f3f3f5', '#e9eaed'); keyLight(ctx, st, 0.7); }
}

// Bục trụ tròn: thân đổ bóng ngang + mặt trên sáng + viền sáng mép.
function podium(ctx: CanvasRenderingContext2D, cx: number, topY: number, rx: number, h: number, color: string) {
  const ry = rx * 0.2;
  const body = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  body.addColorStop(0, mix(color, '#000000', 0.22)); body.addColorStop(0.35, mix(color, '#ffffff', 0.18)); body.addColorStop(1, mix(color, '#000000', 0.35));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(cx - rx, topY); ctx.lineTo(cx - rx, topY + h); ctx.ellipse(cx, topY + h, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, topY); ctx.closePath(); ctx.fill();
  const top = ctx.createLinearGradient(0, topY - ry, 0, topY + ry);
  top.addColorStop(0, mix(color, '#ffffff', 0.5)); top.addColorStop(1, mix(color, '#ffffff', 0.25));
  ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, topY, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
}

// Bóng theo đúng dáng sản phẩm: bóng tiếp xúc sát chân + bóng đổ ngả ra sau-phải trên sàn.
function productShadows(ctx: CanvasRenderingContext2D, src: CanvasImageSource, x: number, y: number, dw: number, dh: number, kind: ShadowKind, dark: boolean, S: number) {
  if (kind === 'none') return;
  const base = y + dh;
  // bóng tiếp xúc (ambient occlusion) — thứ làm sản phẩm "đứng" trên sàn
  pool(ctx, x + dw / 2, base - 2, dw * 0.5, Math.max(6, dw * 0.05), 'rgba(0,0,0,A)', dark ? 0.6 : 0.42);
  pool(ctx, x + dw / 2, base, dw * 0.38, Math.max(4, dw * 0.025), 'rgba(0,0,0,A)', dark ? 0.7 : 0.55);
  if (kind !== 'soft') return;
  // bóng đổ: silhouette sản phẩm ép dẹt + nghiêng, mờ dần
  const sil = document.createElement('canvas'); sil.width = Math.max(1, Math.round(dw)); sil.height = Math.max(1, Math.round(dh));
  const sc = sil.getContext('2d')!; sc.drawImage(src, 0, 0, sil.width, sil.height); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = '#000'; sc.fillRect(0, 0, sil.width, sil.height);
  for (const [blur, a] of [[6, 0.16], [22, 0.14]] as [number, number][]) {
    ctx.save(); ctx.globalAlpha = dark ? a * 1.4 : a; ctx.filter = `blur(${Math.round(blur * S)}px)`;
    ctx.translate(x + dw * 0.04, base); ctx.transform(1, 0, -0.75, -0.2, 0, 0);
    ctx.drawImage(sil, 0, -dh, dw, dh); ctx.restore();
  }
}

// Ánh sáng phủ lên sản phẩm cho hợp cảnh (sáng trên-trái, tối dưới-phải) — rất nhẹ.
function litProduct(src: CanvasImageSource, w: number, h: number, dark: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(0, 0, c.width, c.height);
  lg.addColorStop(0, 'rgba(255,255,255,0.07)'); lg.addColorStop(0.55, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(0,0,0,${dark ? 0.16 : 0.08})`);
  g.fillStyle = lg; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Bbox pixel thật (bỏ phần trong suốt thừa) — để đáy sản phẩm chạm đúng sàn/bóng.
const _trim = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function trimmed(img: HTMLImageElement): HTMLCanvasElement {
  const hit = _trim.get(img); if (hit) return hit;
  const iw = img.naturalWidth, ih = img.naturalHeight; const k = Math.min(1, 400 / Math.max(iw, ih));
  const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(iw * k)); t.height = Math.max(1, Math.round(ih * k));
  const tc = t.getContext('2d', { willReadFrequently: true })!; tc.drawImage(img, 0, 0, t.width, t.height);
  const d = tc.getImageData(0, 0, t.width, t.height).data; let x0 = t.width, y0 = t.height, x1 = -1, y1 = -1;
  for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) if (d[(y * t.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = document.createElement('canvas');
  if (x1 < 0) { out.width = iw; out.height = ih; out.getContext('2d')!.drawImage(img, 0, 0); }
  else {
    const sx = Math.max(0, Math.floor(x0 / k) - 1), sy = Math.max(0, Math.floor(y0 / k) - 1);
    const sw = Math.min(iw - sx, Math.ceil((x1 - x0 + 1) / k) + 2), sh = Math.min(ih - sy, Math.ceil((y1 - y0 + 1) / k) + 2);
    out.width = sw; out.height = sh; out.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  _trim.set(img, out); return out;
}

export function drawProductShot(canvas: HTMLCanvasElement, o: ShotOpts) {
  const P = SHOT_PLATFORMS.find((p) => p.id === o.layout)!;
  const W = P.w, H = P.h, S = o.scale ?? 1;
  canvas.width = Math.round(W * S); canvas.height = Math.round(H * S);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  const z = zone(o.layout, W, H);
  const cutImg = o.cut ? trimmed(o.img) : null;
  const iw = cutImg ? cutImg.width : o.img.naturalWidth, ih = cutImg ? cutImg.height : o.img.naturalHeight;

  // Ảnh CHƯA tách nền: biến thành khung ảnh bo góc viền trắng rồi đặt lên nền như ảnh đã tách
  let src: CanvasImageSource = cutImg || o.img;
  if (!o.cut) {
    const bw = Math.round(Math.min(iw, ih) * 0.035);
    const card = document.createElement('canvas'); card.width = iw + bw * 2; card.height = ih + bw * 2;
    const cc = card.getContext('2d')!; const r = Math.min(iw, ih) * 0.04;
    cc.fillStyle = '#ffffff'; cc.beginPath(); cc.roundRect(0, 0, card.width, card.height, r + bw); cc.fill();
    cc.save(); cc.beginPath(); cc.roundRect(bw, bw, iw, ih, r); cc.clip(); cc.drawImage(o.img, bw, bw, iw, ih); cc.restore();
    src = card;
  }
  const sw = !o.cut ? iw * 1.07 : iw, sh = !o.cut ? ih * 1.07 : ih;
  const k = Math.min((z.maxW * o.size) / sw, (z.maxH * o.size) / sh);
  const dw = sw * k, dh = sh * k;
  const x = z.cx - dw / 2;
  let y = z.cy - dh / 2;
  const dark = o.bg.kind === 'spotlight' || o.bg.kind === 'neon';

  // vị trí bục/kệ quyết định chân trời
  let podiumRx = 0, slab = { x: 0, y: 0, w: 0, h: 0 };
  if (o.bg.kind === 'podium') { podiumRx = Math.max(dw * 0.62, W * 0.2); y = z.cy - dh / 2 - podiumRx * 0.12; }
  const base = y + dh;
  const hz = o.bg.kind === 'podium' ? base + H * (o.layout === '9:16' ? 0.1 : 0.14) : o.bg.kind === 'shelf' ? H + 10 : Math.min(H * 0.82, base - Math.min(dh * 0.14, H * 0.07));
  const st: Stage = { W, H, S, hz, cx: z.cx, pw: dw, ph: dh, top: y };
  paintStage(ctx, o.bg, st);

  if (o.bg.kind === 'podium') {
    pool(ctx, z.cx + podiumRx * 0.15, hz + H * 0.01, podiumRx * 1.25, podiumRx * 0.22, 'rgba(0,0,0,A)', 0.25);
    podium(ctx, z.cx, base - podiumRx * 0.05, podiumRx, H * (o.layout === '9:16' ? 0.12 : 0.16), o.bg.main);
  }
  if (o.bg.kind === 'shelf') {
    // kệ gỗ sáng nổi trên tường: mặt trên + cạnh trước + bóng dưới kệ
    const slabW = Math.min(dw * 1.6, z.maxW * 1.05), slabH = Math.max(H * 0.03, dw * 0.07);
    slab = { x: z.cx - slabW / 2, y: base - slabH * 0.35, w: slabW, h: slabH };
    pool(ctx, z.cx + slabW * 0.04, slab.y + slabH * 2.2, slabW * 0.55, slabH * 1.6, 'rgba(0,0,0,A)', 0.22);
    ctx.fillStyle = mix(o.bg.tint, '#c9a27a', 0.6); ctx.fillRect(slab.x, slab.y, slab.w, slab.h * 0.45);
    const fg = ctx.createLinearGradient(0, slab.y + slab.h * 0.45, 0, slab.y + slab.h); fg.addColorStop(0, mix(o.bg.tint, '#a77d55', 0.7)); fg.addColorStop(1, mix(o.bg.tint, '#7f5a38', 0.7));
    ctx.fillStyle = fg; ctx.fillRect(slab.x, slab.y + slab.h * 0.45, slab.w, slab.h * 0.55);
  }

  const lit = litProduct(src, dw, dh, dark);
  productShadows(ctx, src, x, y, dw, dh, o.shadow, dark, S);
  if (o.bg.kind === 'reflect' || o.bg.kind === 'neon') {
    // sàn bóng: soi ngược sản phẩm, mờ dần
    const r = document.createElement('canvas'); r.width = lit.width; r.height = lit.height;
    const rc = r.getContext('2d')!; rc.translate(0, r.height); rc.scale(1, -1); rc.drawImage(lit, 0, 0);
    rc.setTransform(1, 0, 0, 1, 0, 0); rc.globalCompositeOperation = 'destination-in';
    const fg = rc.createLinearGradient(0, 0, 0, r.height * 0.6); fg.addColorStop(0, 'rgba(0,0,0,0.35)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    rc.fillStyle = fg; rc.fillRect(0, 0, r.width, r.height);
    ctx.save(); ctx.filter = `blur(${Math.round(1.5 * S)}px)`; ctx.drawImage(r, x, base, dw, dh); ctx.restore();
  }
  ctx.drawImage(lit, x, y, dw, dh);
  grain(ctx, W, H, dark ? 0.06 : 0.045);
  if (o.mark) drawMark(ctx, W, H, o.layout, o.mark);

  if (o.safeZone && o.layout === '9:16') {
    // chỉ để XEM (không xuất): thanh nút bên phải + vùng chú thích/giỏ hàng bên dưới
    ctx.save(); ctx.fillStyle = 'rgba(239,68,68,0.18)'; ctx.strokeStyle = 'rgba(239,68,68,0.7)'; ctx.setLineDash([14, 10]); ctx.lineWidth = 4;
    ctx.fillRect(W * 0.84, H * 0.36, W * 0.16, H * 0.46); ctx.strokeRect(W * 0.84, H * 0.36, W * 0.16, H * 0.46);
    ctx.fillRect(0, H * 0.76, W, H * 0.24); ctx.strokeRect(0, H * 0.76, W, H * 0.24);
    ctx.restore();
  }
}

// Ảnh nền cảnh thật theo ngành (Pixabay, đã lọc không mặt người) — /backgrounds/<ngành>/a..j.jpg
export const SCENE_CATS: { id: string; name: string }[] = [
  { id: 'retail', name: 'Bán lẻ' }, { id: 'beauty', name: 'Làm đẹp' }, { id: 'food', name: 'Ăn uống' }, { id: 'technology', name: 'Công nghệ' },
  { id: 'property', name: 'Nội thất' }, { id: 'fitness', name: 'Thể thao' }, { id: 'travel', name: 'Du lịch' }, { id: 'event', name: 'Sự kiện' },
];
export const sceneUrl = (cat: string, i: number) => `/backgrounds/${cat}/${'abcdefghij'[i]}.jpg`;

// Dùng lại nền studio cho video: vẽ nền (tường + sàn + ánh sáng + hạt) quanh 1 khung sản phẩm.
export function paintStudioBg(ctx: CanvasRenderingContext2D, bg: ShotBg, W: number, H: number, box: { cx: number; top: number; w: number; h: number }) {
  const base = box.top + box.h;
  const hz = bg.kind === 'podium' ? base + H * 0.1 : Math.min(H * 0.82, base - Math.min(box.h * 0.14, H * 0.07));
  paintStage(ctx, bg, { W, H, S: 1, hz, cx: box.cx, pw: box.w, ph: box.h, top: box.top });
  if (bg.kind === 'podium') {
    const rx = Math.max(box.w * 0.62, W * 0.2);
    pool(ctx, box.cx + rx * 0.15, hz + H * 0.01, rx * 1.25, rx * 0.22, 'rgba(0,0,0,A)', 0.25);
    podium(ctx, box.cx, base - rx * 0.05, rx, H * 0.12, bg.main);
  }
  grain(ctx, W, H, bg.kind === 'spotlight' || bg.kind === 'neon' ? 0.06 : 0.045);
}
