// Ảnh sản phẩm chuẩn sàn — dựng bằng canvas ngay trên trình duyệt (không server, không AI):
// nền (trắng studio / xám / kem / gradient / màu thương hiệu / bục trưng bày / cảnh thật) + bóng đổ + đặt sản phẩm
// đúng vùng an toàn từng khổ (Shopee/Lazada 1:1, Facebook/IG 4:5, TikTok 9:16).

export type ShotLayout = '1:1' | '4:5' | '9:16';
export const SHOT_PLATFORMS: { id: ShotLayout; name: string; folder: string; w: number; h: number }[] = [
  { id: '1:1', name: 'Shopee · Lazada · TikTok Shop', folder: 'shopee-lazada-1x1', w: 1080, h: 1080 },
  { id: '4:5', name: 'Facebook · Instagram', folder: 'facebook-instagram-4x5', w: 1080, h: 1350 },
  { id: '9:16', name: 'TikTok · Reels · Story', folder: 'tiktok-story-9x16', w: 1080, h: 1920 },
];

export type BgKind = 'white' | 'gray' | 'cream' | 'gradient' | 'brand' | 'podium' | 'scene';
export const BG_KINDS: { id: BgKind; name: string }[] = [
  { id: 'white', name: 'Trắng studio' }, { id: 'gray', name: 'Xám nhạt' }, { id: 'cream', name: 'Kem' },
  { id: 'gradient', name: 'Gradient màu' }, { id: 'brand', name: 'Màu thương hiệu' }, { id: 'podium', name: 'Bục trưng bày' }, { id: 'scene', name: 'Cảnh thật' },
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
  if (bg.kind === 'white') lin([[0, '#ffffff'], [0.62, '#ffffff'], [1, '#eef0f3']]);
  else if (bg.kind === 'gray') lin([[0, '#f4f5f7'], [1, '#dfe3e8']]);
  else if (bg.kind === 'cream') lin([[0, '#faf6ef'], [1, '#ece2d2']]);
  else if (bg.kind === 'brand') lin([[0, bg.tint], [1, mix(bg.tint, bg.main, 0.28)]]);
  else if (bg.kind === 'scene' && bg.scene) {
    ctx.save();
    ctx.filter = `blur(${Math.round(10 * S)}px)`;
    cover(ctx, bg.scene, W, H, bg.scene.naturalWidth, bg.scene.naturalHeight);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, H);
  } else {
    // gradient / podium: nền màu dịu + quầng sáng phía sau sản phẩm
    lin([[0, bg.tint], [1, bg.soft]]);
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
