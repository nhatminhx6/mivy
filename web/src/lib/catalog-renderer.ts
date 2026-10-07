import { AssetInfo, CopyItem, MarketingState, PosterKind } from '@/types';
import { TEMPLATES } from './template-catalog';
import { posterText } from './design-engine';

const FONT = '"Be Vietnam Pro", sans-serif';

// Độ sáng 0..1 của màu hex để chọn chữ tương phản (trắng/đen) đặt lên màu đó.
function luminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// A single renderer powers both gallery previews and downloadable posters.
export function drawCatalogPoster(canvas: HTMLCanvasElement, state: MarketingState, kind: PosterKind, copy: CopyItem, asset: AssetInfo | null, bgImg: CanvasImageSource | null = null) {
  const t = TEMPLATES.find(t => t.id === (state.templateId || (state.backgroundImage !== undefined ? "editorial" : undefined)));
  if (!t) return false;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height, m = w * .065, gap = w * .025;
  const onAccent = luminance(t.accent) > 0.6 ? '#141414' : '#ffffff';

  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);

  if (bgImg) {
    const im = bgImg as HTMLImageElement;
    const sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
    if (sw && sh) {
      const blur = state.backgroundBlur ?? 0, bleed = blur * 3;
      const scale = Math.max((w + bleed * 2) / sw, (h + bleed * 2) / sh);
      ctx.save(); ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(im, (w - sw * scale) * (state.backgroundX ?? 50) / 100, (h - sh * scale) * (state.backgroundY ?? 50) / 100, sw * scale, sh * scale); ctx.restore();
      // Làm tối nhẹ theo ý người dùng
      ctx.fillStyle = `rgba(0,0,0,${(state.backgroundDim ?? 35) / 100})`; ctx.fillRect(0, 0, w, h);
      // Scrim gradient: tối ở trên (brand+title) và dưới (points+CTA) để chữ LUÔN đọc được
      const sc = ctx.createLinearGradient(0, 0, 0, h);
      sc.addColorStop(0, 'rgba(0,0,0,0.60)');
      sc.addColorStop(0.32, 'rgba(0,0,0,0.12)');
      sc.addColorStop(0.60, 'rgba(0,0,0,0.30)');
      sc.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = sc; ctx.fillRect(0, 0, w, h);
    }
  }

  const ink = bgImg ? '#ffffff' : t.ink;
  const sub = bgImg ? 'rgba(255,255,255,0.88)' : t.ink;

  const text = (s: string, x: number, y: number, ww: number, hh: number, size: number, color: string = ink, weight = '700') => {
    if (!s) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
    if (bgImg) { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 1; }
    posterText(ctx, s, x, y, ww, hh, size, color, weight, FONT);
    ctx.restore();
  };

  const photo = (x: number, y: number, ww: number, hh: number, contain = false) => {
    if (!asset) return;
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, ww, hh, Math.min(w * .024, ww / 2, hh / 2)); ctx.clip();
    const sw = asset.im.naturalWidth || asset.im.width, sh = asset.im.naturalHeight || asset.im.height;
    const fitContain = state.mainImageFit ? state.mainImageFit === "contain" : contain;
    const scale = (fitContain ? Math.min(ww / sw, hh / sh) : Math.max(ww / sw, hh / sh)) * (state.mainImageZoom ?? 100) / 100;
    const dx = x + (ww - sw * scale) * (state.mainImageX ?? 50) / 100;
    const dy = y + (hh - sh * scale) * (state.mainImageY ?? 50) / 100;
    const left = Math.max(x, dx), top = Math.max(y, dy);
    const visibleW = Math.min(x + ww, dx + sw * scale) - left;
    const visibleH = Math.min(y + hh, dy + sh * scale) - top;
    ctx.beginPath();
    ctx.roundRect(left, top, visibleW, visibleH, Math.min(w * .024, visibleW / 2, visibleH / 2));
    ctx.clip();
    ctx.drawImage(asset.im, dx, dy, sw * scale, sh * scale);
    ctx.restore();
  };

  // Brand chip
  text((state.brand || '').toUpperCase(), m, m, w - m * 2, 44, 24, bgImg ? 'rgba(255,255,255,0.95)' : t.accent);

  const title = copy.headline || state.name;

  // Tính points trước để bỏ subline trùng lặp
  const selected = state.facts?.filter(f => f.selected).map(f => f.text) || [];
  const allPts = copy.points?.length ? copy.points : selected.length ? selected : state.details.split('\n').filter(Boolean);
  const points = kind === 'story'
    ? allPts.slice((state.storyPage || 0) * (state.storyPerPage || 3), ((state.storyPage || 0) + 1) * (state.storyPerPage || 3))
    : allPts.slice(0, 3);
  // Bỏ subline nếu gần trùng tiêu đề hoặc ý đầu
  const subline = (copy.subline && norm(copy.subline) !== norm(title) && norm(copy.subline) !== norm(points[0])) ? copy.subline : '';

  let bodyX = m, bodyY = h * .48, bodyW = w - m * 2, bodyH = h * .34;
  if (t.id === 'editorial') {
    text(title, m, h * .13, w * .53, h * .24, 76);
    text(subline, m, h * .39, w * .49, h * .13, 28, sub, '400');
    photo(w * .64, h * .13, w * .295, h * .66);
    bodyW = w * .51; bodyY = h * .55; bodyH = h * .27;
  } else if (t.id === 'spotlight') {
    text(title, m, h * .12, w - m * 2, h * .17, 76);
    photo(m, h * .31, w * .52, h * .46, true);
    bodyX = w * .62; bodyW = w - bodyX - m; bodyY = h * .34; bodyH = h * .43;
    text(subline, m, h * .79, w - m * 2, h * .07, 26, sub, '400');
  } else if (t.id === 'billboard') {
    ctx.fillStyle = t.ink; ctx.fillRect(m, h * .13, w - m * 2, h * .33);
    text(title, m + gap, h * .15, w - m * 2 - gap * 2, h * .29, 105, t.bg);
    text(subline, m, h * .49, w - m * 2, h * .10, 30, sub, '400');
    bodyY = h * .62; bodyH = h * .23;
    if (asset) { photo(w * .67, h * .49, w * .265, h * .36); bodyW = w * .56; }
  } else if (t.id === 'magazine') {
    text(title, m, h * .12, w - m * 2, h * .16, 72);
    photo(m, h * .30, w - m * 2, h * .32);
    text(subline, m, h * .65, w - m * 2, h * .08, 26, sub, '400');
    bodyY = h * .75; bodyH = h * .12;
  } else if (t.id === 'agenda') {
    text(title, m, h * .13, w - m * 2, h * .22, 84);
    text(subline, m, h * .36, w - m * 2, h * .09, 28, sub, '400');
    bodyY = h * .49; bodyH = h * .37;
    if (asset) { photo(w * .67, h * .49, w * .265, h * .37); bodyW = w * .56; }
  } else {
    photo(w * .48, h * .12, w * .455, h * .58);
    text(title, m, h * .15, w * .38, h * .34, 68);
    text(subline, m, h * .52, w * .36, h * .17, 27, sub, '400');
    bodyY = h * .73; bodyH = h * .13;
  }

  // Points: số trong pill tròn accent + đường kẻ mảnh
  const rowH = bodyH / Math.max(points.length, 1);
  points.forEach((p, i) => {
    const y = bodyY + i * rowH;
    const centerY = y + rowH / 2;
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = ink; ctx.fillRect(bodyX, y, bodyW, 1); ctx.restore();
    const r = Math.min(rowH * .3, 22, w * .028);
    const cx = bodyX + r, cy = centerY;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = t.accent; ctx.fill();
    ctx.fillStyle = onAccent; ctx.font = `700 ${Math.round(r * 1.05)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx, cy + 1);
    ctx.restore();
    const textX = bodyX + r * 2 + gap;
    text(p, textX, centerY - rowH * .36, bodyW - r * 2 - gap, rowH * .72, 28, ink, '500');
  });

  // CTA pill gọn + badge ưu đãi
  const ctaH = Math.min(h * .058, 76);
  const ctaY = h - m - ctaH;
  ctx.save(); ctx.font = `700 ${Math.round(h * .024)}px ${FONT}`;
  const ctaLabel = copy.cta || '';
  const ctaW = Math.min(Math.max(ctx.measureText(ctaLabel).width + gap * 3.2, w * .32), w * .55);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.roundRect(m, ctaY, ctaW, ctaH, ctaH / 2); ctx.fillStyle = t.accent; ctx.fill(); ctx.restore();
  ctx.save();
  ctx.fillStyle = onAccent; ctx.font = `700 ${Math.round(h * .024)}px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(ctaLabel, m + gap * 1.3, ctaY + ctaH / 2);
  // mũi tên
  const ax = m + ctaW - gap * 1.6, ay = ctaY + ctaH / 2;
  ctx.strokeStyle = onAccent; ctx.lineWidth = Math.max(2, h * .003); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax - 10, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax - 5, ay - 5); ctx.lineTo(ax, ay); ctx.lineTo(ax - 5, ay + 5); ctx.stroke();
  ctx.restore();

  if (state.offer) {
    ctx.save();
    ctx.font = `700 ${Math.round(h * .021)}px ${FONT}`;
    const label = 'Ưu đãi: ' + state.offer;
    const ow = Math.min(ctx.measureText(label).width + gap * 2.4, w - m * 2 - ctaW - gap);
    const ox = m + ctaW + gap, oy = ctaY, oh = ctaH;
    ctx.beginPath(); ctx.roundRect(ox, oy, ow, oh, oh / 2);
    ctx.fillStyle = bgImg ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.06)';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, h * .0016); ctx.strokeStyle = t.accent; ctx.stroke();
    ctx.beginPath(); ctx.rect(ox, oy, ow, oh); ctx.clip();
    ctx.fillStyle = bgImg ? '#ffffff' : t.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, ox + gap * 1.1, oy + oh / 2);
    ctx.restore();
  }

  return true;
}
