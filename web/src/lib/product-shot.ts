// Ảnh sản phẩm chuẩn sàn — dựng bằng canvas ngay trên trình duyệt (không server, không AI):
// nền (trắng studio / xám / kem / gradient / màu thương hiệu / bục trưng bày / cảnh thật) + bóng đổ + đặt sản phẩm
// đúng vùng an toàn từng khổ (Shopee/Lazada 1:1, Facebook/IG 4:5, TikTok 9:16).

export type ShotLayout = '1:1' | '4:5' | '9:16';
export const SHOT_PLATFORMS: { id: ShotLayout; name: string; folder: string; w: number; h: number }[] = [
  { id: '1:1', name: 'Shopee · Lazada · TikTok Shop', folder: 'shopee-lazada-1x1', w: 1080, h: 1080 },
  { id: '4:5', name: 'Facebook · Instagram', folder: 'facebook-instagram-4x5', w: 1080, h: 1350 },
  { id: '9:16', name: 'TikTok · Reels · Story', folder: 'tiktok-story-9x16', w: 1080, h: 1920 },
];

export type BgKind = 'white' | 'gray' | 'cream' | 'gradient' | 'brand' | 'podium' | 'scene' | 'spotlight' | 'reflect' | 'pop' | 'sunlight' | 'wood' | 'marble';
export const BG_KINDS: { id: BgKind; name: string }[] = [
  { id: 'white', name: 'Trắng studio' }, { id: 'gray', name: 'Xám nhạt' }, { id: 'cream', name: 'Kem' },
  { id: 'gradient', name: 'Gradient màu' }, { id: 'brand', name: 'Màu thương hiệu' }, { id: 'podium', name: 'Bục trưng bày' }, { id: 'scene', name: 'Cảnh thật' },
  { id: 'wood', name: 'Mặt gỗ' }, { id: 'marble', name: 'Đá cẩm thạch' }, { id: 'spotlight', name: 'Sân khấu' },
  { id: 'reflect', name: 'Phản chiếu' }, { id: 'pop', name: 'Khối màu' }, { id: 'sunlight', name: 'Nắng cửa sổ' },
];
export type ShadowKind = 'soft' | 'contact' | 'none';

export interface ShotBg { kind: BgKind; tint: string; soft: string; main: string; scene?: HTMLImageElement | null }
export interface ShotOpts { layout: ShotLayout; img: HTMLImageElement; cut: boolean; bg: ShotBg; size: number; shadow: ShadowKind; safeZone?: boolean; scale?: number }

const hex = (h: string) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const mix = (a: string, b: string, t: number) => { const [x, y] = [hex(a), hex(b)]; return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };

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

function paintBg(ctx: CanvasRenderingContext2D, bg: ShotBg, W: number, H: number, S: number) {
  const lin = (stops: [number, string][]) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const glow = (cx: number, cy: number, r: number, stops: [number, string][]) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const k = bg.kind;
  if (k === 'white') lin([[0, '#ffffff'], [0.62, '#ffffff'], [1, '#eef0f3']]);
  else if (k === 'gray') lin([[0, '#f4f5f7'], [1, '#dfe3e8']]);
  else if (k === 'cream') lin([[0, '#faf6ef'], [1, '#ece2d2']]);
  else if (k === 'brand') lin([[0, bg.tint], [1, mix(bg.tint, bg.main, 0.28)]]);
  else if (k === 'scene' && bg.scene) {
    ctx.save();
    ctx.filter = `blur(${Math.round(10 * S)}px)`;
    cover(ctx, bg.scene, W, H, bg.scene.naturalWidth, bg.scene.naturalHeight);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, H);
  } else if (k === 'spotlight') {
    // nền tối, quầng sáng tụ vào sản phẩm (hợp nước hoa, đồng hồ, mỹ phẩm cao cấp)
    lin([[0, mix(bg.main, '#050608', 0.6)], [0.55, mix(bg.main, '#050608', 0.8)], [1, '#050608']]);
    glow(W / 2, H * 0.44, Math.max(W, H) * 0.5, [[0, 'rgba(255,255,255,0.32)'], [0.45, 'rgba(255,255,255,0.08)'], [1, 'rgba(255,255,255,0)']]);
  } else if (k === 'pop') {
    // khối màu rực + vòng tròn lớn + chấm bi (phong cách sale Shopee/TikTok)
    ctx.fillStyle = bg.main; ctx.fillRect(0, 0, W, H);
    const c = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.6);
    c.addColorStop(0, mix(bg.main, '#ffffff', 0.34)); c.addColorStop(1, bg.main);
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.42, W * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix(bg.main, '#ffffff', 0.55);
    for (const [px, py, r] of [[0.14, 0.17, 0.02], [0.87, 0.22, 0.015], [0.82, 0.8, 0.022], [0.13, 0.82, 0.016]] as [number, number, number][]) {
      ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(W * px, H * py, W * r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === 'sunlight') {
    // nắng xuyên cửa sổ: nền kem ấm + vệt sáng chéo
    lin([[0, '#fff8ee'], [1, '#f2e6d1']]);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.5); ctx.rotate(-0.38);
    const bw = W * 0.12;
    for (let i = -7; i < 7; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,241,210,0.55)' : 'rgba(150,110,60,0.05)';
      ctx.fillRect(i * bw * 1.7 - bw / 2, -H, bw, H * 2.4);
    }
    ctx.restore();
  } else if (k === 'wood') {
    // mặt bàn gỗ ấm + tường sáng phía trên (bục B "mặt phẳng đẹp")
    lin([[0, '#efe7db'], [0.57, '#e8dccb'], [0.57, '#b67f50'], [1, '#8a5630']]);
    ctx.save();
    const top = H * 0.57;
    ctx.strokeStyle = 'rgba(70,40,18,0.13)'; ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) { const y = top + (H - top) * ((i + 0.5) / 16); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    glow(W / 2, top, Math.max(W, H) * 0.5, [[0, 'rgba(255,245,230,0.3)'], [1, 'rgba(255,245,230,0)']]);
    ctx.restore();
  } else if (k === 'marble') {
    // đá cẩm thạch trắng + vân xám mảnh (sang, hợp mỹ phẩm, trang sức)
    lin([[0, '#fbfbfc'], [1, '#e8e9ee']]);
    ctx.save();
    ctx.strokeStyle = 'rgba(120,126,142,0.22)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const [x0, y0, cx, cy, x1, y1] of [[0.05, 0.2, 0.4, 0.1, 0.95, 0.32], [0.1, 0.75, 0.5, 0.9, 0.9, 0.7], [0.6, 0.05, 0.5, 0.45, 0.72, 0.95]] as [number, number, number, number, number, number][]) {
      ctx.beginPath(); ctx.moveTo(W * x0, H * y0); ctx.quadraticCurveTo(W * cx, H * cy, W * x1, H * y1); ctx.stroke();
    }
    ctx.restore();
  } else if (k === 'reflect') {
    // sàn bóng loáng để soi gương sản phẩm (phần soi vẽ trong drawProductShot)
    lin([[0, '#f3f4f7'], [0.6, '#e8eaef'], [1, '#d6d9e1']]);
  } else {
    // gradient / podium: nền màu dịu + quầng sáng phía sau sản phẩm
    lin([[0, bg.tint], [1, bg.soft]]);
    glow(W / 2, H * 0.42, Math.max(W, H) * 0.55, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  }
}

// Bục trụ tròn: thân đổ bóng ngang + mặt trên sáng.
function podium(ctx: CanvasRenderingContext2D, cx: number, topY: number, rx: number, h: number, color: string) {
  const ry = rx * 0.2;
  const body = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  body.addColorStop(0, mix(color, '#000000', 0.25)); body.addColorStop(0.45, mix(color, '#ffffff', 0.12)); body.addColorStop(1, mix(color, '#000000', 0.32));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(cx - rx, topY); ctx.lineTo(cx - rx, topY + h); ctx.ellipse(cx, topY + h, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, topY); ctx.closePath(); ctx.fill();
  const top = ctx.createLinearGradient(0, topY - ry, 0, topY + ry);
  top.addColorStop(0, mix(color, '#ffffff', 0.45)); top.addColorStop(1, mix(color, '#ffffff', 0.18));
  ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawProductShot(canvas: HTMLCanvasElement, o: ShotOpts) {
  const P = SHOT_PLATFORMS.find((p) => p.id === o.layout)!;
  const W = P.w, H = P.h, S = o.scale ?? 1;
  canvas.width = Math.round(W * S); canvas.height = Math.round(H * S);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  const iw = o.img.naturalWidth, ih = o.img.naturalHeight;
  const z = zone(o.layout, W, H);

  if (!o.cut) {
    // Ảnh CHƯA tách nền: chuẩn hoá khổ — nền mờ từ chính ảnh, ảnh gốc đặt trọn khung, bo góc + bóng
    ctx.save(); ctx.filter = `blur(${Math.round(36 * S)}px)`; cover(ctx, o.img, W, H, iw, ih); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(0, 0, W, H);
    const k = Math.min((z.maxW * 1.06) / iw, (z.maxH * 1.06) / ih) * Math.min(1, o.size + 0.12);
    const dw = iw * k, dh = ih * k, x = z.cx - dw / 2, y = z.cy - dh / 2, r = 28;
    ctx.save();
    // shadow* tính theo pixel thật (không theo transform) → nhân S
    ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 40 * S; ctx.shadowOffsetY = 18 * S;
    ctx.beginPath(); ctx.roundRect(x, y, dw, dh, r); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, dw, dh, r); ctx.clip(); ctx.drawImage(o.img, x, y, dw, dh); ctx.restore();
  } else {
    paintBg(ctx, o.bg, W, H, S);
    const k = Math.min((z.maxW * o.size) / iw, (z.maxH * o.size) / ih);
    const dw = iw * k, dh = ih * k;
    const x = z.cx - dw / 2;
    let y = z.cy - dh / 2;
    if (o.bg.kind === 'podium') {
      const rx = Math.max(dw * 0.62, W * 0.2);
      y = z.cy - dh / 2 - rx * 0.12;
      podium(ctx, z.cx, y + dh - rx * 0.05, rx, H * (o.layout === '9:16' ? 0.12 : 0.16), o.bg.main);
    }
    const bottom = y + dh;
    if (o.shadow !== 'none') {
      // bóng tiếp xúc: elip mờ dưới chân sản phẩm
      const rx = dw * 0.46, ry = Math.max(8, dw * 0.06);
      ctx.save(); ctx.translate(z.cx, bottom - ry * 0.25); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(0,0,0,${o.bg.kind === 'scene' ? 0.38 : 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (o.bg.kind === 'reflect') {
      // soi gương: lật sản phẩm xuống dưới + mờ dần hoà vào sàn
      const floor = y + dh;
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.translate(0, floor * 2); ctx.scale(1, -1);
      ctx.drawImage(o.img, x, y, dw, dh);
      ctx.restore();
      const fade = ctx.createLinearGradient(0, floor, 0, floor + dh * 0.85);
      fade.addColorStop(0, 'rgba(226,229,236,0)'); fade.addColorStop(1, 'rgba(214,217,225,1)');
      ctx.fillStyle = fade; ctx.fillRect(x - 24, floor, dw + 48, dh * 0.9);
    }
    ctx.save();
    if (o.shadow === 'soft') { ctx.shadowColor = 'rgba(15,23,42,0.22)'; ctx.shadowBlur = 46 * S; ctx.shadowOffsetY = 22 * S; }
    ctx.drawImage(o.img, x, y, dw, dh);
    ctx.restore();
  }

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
