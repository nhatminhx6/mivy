import { AssetInfo, CopyItem, MarketingState, PosterKind } from '@/types';
import { TEMPLATES } from './template-catalog';
import { posterText } from './design-engine';
import { fontFamilyById, contactLine } from './brand-presets';
import { resolveStorySource, stripLeadingEnumeration } from './balanced-pages';
import { normalizeCanvasContext } from './poster-font';
import { qcBox } from './qc-capture';
import { getSeason } from './season-engine';

const DEFAULT_FONT = '"Be Vietnam Pro", sans-serif';

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function drawCatalogPoster(canvas: HTMLCanvasElement, state: MarketingState, kind: PosterKind, copy: CopyItem, asset: AssetInfo | null, bgImg: CanvasImageSource | null = null, logoImg: CanvasImageSource | null = null) {
  const t = TEMPLATES.find(t => t.id === (state.templateId || (state.backgroundImage !== undefined ? "editorial" : undefined)));
  if (!t) return false;
  const ctx = canvas.getContext('2d')!;
  normalizeCanvasContext(ctx, canvas);
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S, m = w * .065, gap = w * .025;

  // Brand kit: dùng CẢ palette + font đôi.
  const bk = state.brandKit;
  // Dịp sale nhuộm tông màu nhấn (CTA/số/badge/offer) để ra chất sự kiện,
  // dù vẫn giữ nền + brand tên shop. Dịp thắng accent template/brand.
  const season = getSeason(state.season);
  const seasonOn = !!season && season.id !== 'none' && !!season.c1;
  const ACCENT = seasonOn ? season!.c1 : (bk?.colorAccent || t.accent);
  const SECONDARY = seasonOn ? season!.c2 : (bk?.colorSecondary || t.accent);
  const HEAD = state.headingFontId ? fontFamilyById(state.headingFontId) : bk ? fontFamilyById(bk.fontHeadingId) : DEFAULT_FONT;
  const BODY = state.bodyFontId ? fontFamilyById(state.bodyFontId) : state.headingFontId ? fontFamilyById(state.headingFontId) : bk ? fontFamilyById(bk.fontBodyId) : DEFAULT_FONT;
  const onAccent = luminance(ACCENT) > 0.6 ? '#141414' : '#ffffff';

  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);

  if (bgImg) {
    const im = bgImg as HTMLImageElement;
    const sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
    if (sw && sh) {
      const blur = state.backgroundBlur ?? 0, bleed = blur * 3;
      const scale = Math.max((w + bleed * 2) / sw, (h + bleed * 2) / sh);
      ctx.save(); ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(im, (w - sw * scale) * (state.backgroundX ?? 50) / 100, (h - sh * scale) * (state.backgroundY ?? 50) / 100, sw * scale, sh * scale); ctx.restore();
      ctx.fillStyle = `rgba(0,0,0,${(state.backgroundDim ?? 35) / 100})`; ctx.fillRect(0, 0, w, h);
      const sc = ctx.createLinearGradient(0, 0, 0, h);
      sc.addColorStop(0, 'rgba(0,0,0,0.60)');
      sc.addColorStop(0.32, 'rgba(0,0,0,0.12)');
      sc.addColorStop(0.60, 'rgba(0,0,0,0.30)');
      sc.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = sc; ctx.fillRect(0, 0, w, h);
    }
  }

  const ink = bgImg ? '#ffffff' : t.ink;
  const subColor = bgImg ? 'rgba(255,255,255,0.88)' : t.ink;

  const text = (s: string, x: number, y: number, ww: number, hh: number, size: number, color: string = ink, weight = '700', face: string = BODY) => {
    if (!s) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
    if (bgImg) { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 1; }
    posterText(ctx, s, x, y, ww, hh, size, color, weight, face);
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

  // Brand: logo nếu có, không thì chip chữ; kèm slogan.
  let brandBottom = m + 44;
  if (logoImg) {
    const li = logoImg as HTMLImageElement;
    const lsw = li.naturalWidth || li.width, lsh = li.naturalHeight || li.height;
    if (lsw && lsh) {
      const lh = h * .05, lw = (lsw / lsh) * lh;
      ctx.save(); if (bgImg) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; }
      ctx.drawImage(li, m, m, Math.min(lw, w * .4), lh); ctx.restore();
      brandBottom = m + lh;
    }
  } else {
    text((state.brand || '').toUpperCase(), m, m, w - m * 2, 40, 24, bgImg ? 'rgba(255,255,255,0.95)' : ACCENT, '700', HEAD);
    brandBottom = m + 34;
  }
  if (bk?.slogan) {
    text(bk.slogan, m, brandBottom + 6, w * .6, 32, 18, bgImg ? 'rgba(255,255,255,0.8)' : SECONDARY, '500', BODY);
  }

  const title = copy.headline || state.name;
  const resolved = resolveStorySource(state, copy);
  const allPts = resolved.items;
  const points = kind === 'story'
    ? resolved.pageItems
    : allPts.slice(0, 3);
  const subline = (copy.subline && norm(copy.subline) !== norm(title) && norm(copy.subline) !== norm(points[0])) ? copy.subline : '';

  const L = (t as { layout?: string }).layout || t.id;
  let bodyX = m, bodyY = h * .48, bodyW = w - m * 2, bodyH = h * .34;
  if (L === 'editorial') {
    text(title, m, h * .13, w * .53, h * .24, 76, ink, '800', HEAD);
    text(subline, m, h * .39, w * .49, h * .13, 28, subColor, '400');
    photo(w * .64, h * .13, w * .295, h * .66);
    bodyW = w * .51; bodyY = h * .55; bodyH = h * .27;
  } else if (L === 'spotlight') {
    text(title, m, h * .12, w - m * 2, h * .17, 76, ink, '800', HEAD);
    photo(m, h * .31, w * .52, h * .46, true);
    bodyX = w * .62; bodyW = w - bodyX - m; bodyY = h * .34; bodyH = h * .43;
    text(subline, m, h * .79, w - m * 2, h * .07, 26, subColor, '400');
  } else if (L === 'billboard') {
    ctx.fillStyle = bk ? bk.colorPrimary : t.ink; ctx.fillRect(m, h * .13, w - m * 2, h * .33);
    text(title, m + gap, h * .15, w - m * 2 - gap * 2, h * .29, 105, bk ? '#ffffff' : t.bg, '800', HEAD);
    text(subline, m, h * .49, w - m * 2, h * .10, 30, subColor, '400');
    bodyY = h * .62; bodyH = h * .23;
    if (asset) { photo(w * .67, h * .49, w * .265, h * .36); bodyW = w * .56; }
  } else if (L === 'magazine') {
    text(title, m, h * .12, w - m * 2, h * .16, 72, ink, '800', HEAD);
    photo(m, h * .30, w - m * 2, h * .32);
    text(subline, m, h * .65, w - m * 2, h * .08, 26, subColor, '400');
    bodyY = h * .75; bodyH = h * .12;
  } else if (L === 'agenda') {
    text(title, m, h * .13, w - m * 2, h * .22, 84, ink, '800', HEAD);
    text(subline, m, h * .36, w - m * 2, h * .09, 28, subColor, '400');
    bodyY = h * .49; bodyH = h * .37;
    if (asset) { photo(w * .67, h * .49, w * .265, h * .37); bodyW = w * .56; }
  } else if (L === 'banner') {
    text(title, m, h * .14, w * .54, h * .3, 82, ink, '800', HEAD);
    text(subline, m, h * .46, w * .5, h * .1, 28, subColor, '400');
    photo(w * .6, h * .12, w * .33, h * .52);
    bodyX = m; bodyW = w * .52; bodyY = h * .58; bodyH = h * .24;
  } else if (L === 'sale') {
    ctx.save(); ctx.fillStyle = ACCENT; ctx.fillRect(0, h * .12, w, h * .015); ctx.restore();
    text(title, m, h * .17, w - m * 2, h * .26, 94, ink, '800', HEAD);
    text(subline, m, h * .45, w - m * 2, h * .1, 30, subColor, '500');
    if (asset) { photo(w * .64, h * .56, w * .29, h * .28); bodyW = w * .54; }
    bodyY = h * .58; bodyH = h * .24;
  } else if (L === 'minimal') {
    text(title, m, h * .3, w - m * 2, h * .22, 74, ink, '800', HEAD);
    text(subline, m, h * .53, w - m * 2, h * .1, 26, subColor, '400');
    bodyY = h * .64; bodyH = h * .18;
  } else if (L === 'frame') {
    const bw = state.borderWidth ?? Math.round(w * .007);
    if (bw > 0) {
      ctx.save(); ctx.strokeStyle = state.borderColor || ACCENT; ctx.lineWidth = bw;
      const fm = m * .5; const rad = state.borderRadius ?? 0;
      ctx.beginPath(); ctx.roundRect(fm + bw / 2, fm + bw / 2, w - fm * 2 - bw, h - fm * 2 - bw, rad); ctx.stroke(); ctx.restore();
    }
    text(title, m, h * .16, w - m * 2, h * .2, 74, ink, '800', HEAD);
    text(subline, m, h * .38, w - m * 2, h * .08, 26, subColor, '400');
    if (asset) photo(w * .28, h * .49, w * .44, h * .27, true);
    bodyY = asset ? h * .78 : h * .5; bodyH = asset ? h * .1 : h * .28;
  } else {
    photo(w * .48, h * .12, w * .455, h * .58);
    text(title, m, h * .15, w * .38, h * .34, 68, ink, '800', HEAD);
    text(subline, m, h * .52, w * .36, h * .17, 27, subColor, '400');
    bodyY = h * .73; bodyH = h * .13;
  }

  const rowH = bodyH / Math.max(points.length, 1);
  points.forEach((p, i) => {
    const y = bodyY + i * rowH;
    const centerY = y + rowH / 2;
    const r = Math.min(rowH * .3, 22, w * .028);
    const cx = bodyX + r, cy = centerY;
    // số tròn — căn tâm hàng
    ctx.save();
    normalizeCanvasContext(ctx);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = ACCENT; ctx.fill();
    ctx.fillStyle = onAccent; ctx.font = `700 ${Math.round(r * 1.05)}px ${HEAD}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx, cy + 1);
    ctx.restore();
    // text — căn CÙNG tâm hàng với số (baseline middle), tối đa 2 dòng
    const textX = bodyX + r * 2 + gap;
    const textMaxW = bodyW - r * 2 - gap;
    const fs = Math.min(28, Math.max(18, Math.round(rowH * 0.3)));
    const lineH = Math.round(fs * 1.25);
    ctx.save();
    normalizeCanvasContext(ctx);
    if (bgImg) { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 1; }
    ctx.font = `500 ${fs}px ${BODY}`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const words = (stripLeadingEnumeration(p) || '').split(/\s+/);
    const lines: string[] = [];
    let curL = '';
    for (const wd of words) {
      const tt = curL ? curL + ' ' + wd : wd;
      if (ctx.measureText(tt).width > textMaxW && curL) { lines.push(curL); curL = wd; } else { curL = tt; }
    }
    if (curL) lines.push(curL);
    const vis = lines.slice(0, 2);
    const sy = centerY - ((vis.length - 1) * lineH) / 2;
    vis.forEach((l, li) => ctx.fillText(l, textX, Math.round(sy + li * lineH)));
    ctx.restore();
    // QC: ghi tâm Y của số (cy) và text để audit so khớp
    const rec = (globalThis as unknown as { __qcAlign?: { n: number; t: number }[] }).__qcAlign;
    if (rec) rec.push({ n: cy, t: sy + ((vis.length - 1) * lineH) / 2 });
  });

  // Dòng liên hệ (SĐT/Zalo/địa chỉ) ngay trên CTA
  const cline = contactLine(bk?.contact);
  const ctaH = Math.min(h * .058, 76);
  const ctaY = h - m - ctaH;
  if (cline) {
    text(cline, m, ctaY - h * .035, w - m * 2, h * .03, 19, bgImg ? 'rgba(255,255,255,0.9)' : t.ink, '500', BODY);
  }

  ctx.save();
  normalizeCanvasContext(ctx);
  ctx.font = `700 ${Math.round(h * .024)}px ${HEAD}`;
  const ctaLabel = copy.cta || '';
  const ctaW = Math.min(Math.max(ctx.measureText(ctaLabel).width + gap * 3.2, w * .32), w * .55);
  ctx.restore();
  qcBox('cta', m, ctaY, ctaW, ctaH, 'cta');
  ctx.save(); ctx.beginPath(); ctx.roundRect(m, ctaY, ctaW, ctaH, ctaH / 2); ctx.fillStyle = ACCENT; ctx.fill(); ctx.restore();
  ctx.save();
  normalizeCanvasContext(ctx);
  ctx.fillStyle = onAccent; ctx.font = `700 ${Math.round(h * .024)}px ${HEAD}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(ctaLabel, m + gap * 1.3, ctaY + ctaH / 2);
  const ax = m + ctaW - gap * 1.6, ay = ctaY + ctaH / 2;
  ctx.strokeStyle = onAccent; ctx.lineWidth = Math.max(2, h * .003); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax - 10, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax - 5, ay - 5); ctx.lineTo(ax, ay); ctx.lineTo(ax - 5, ay + 5); ctx.stroke();
  ctx.restore();

  if (state.offer) {
    ctx.save();
    normalizeCanvasContext(ctx);
    ctx.font = `700 ${Math.round(h * .021)}px ${BODY}`;
    let label = 'Ưu đãi: ' + state.offer;
    const innerPad = gap * 1.1;
    // pill chiếm hết phần còn lại của hàng, cạnh nút CTA
    const ow = Math.max(w * .2, w - m * 2 - ctaW - gap);
    const avail = ow - innerPad * 2;
    // cắt gọn bằng "…" nếu dài quá — KHÔNG để tràn/cụt chữ
    if (ctx.measureText(label).width > avail) {
      while (label.length > 4 && ctx.measureText(label + '…').width > avail) label = label.slice(0, -1);
      label = label.replace(/[\s·.,-]+$/, '') + '…';
    }
    const ox = m + ctaW + gap, oy = ctaY, oh = ctaH;
    qcBox('cta', ox, oy, ow, oh, 'offer');
    ctx.beginPath(); ctx.roundRect(ox, oy, ow, oh, oh / 2);
    ctx.fillStyle = bk ? SECONDARY : (bgImg ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.06)');
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, h * .0016); ctx.strokeStyle = ACCENT; ctx.stroke();
    ctx.fillStyle = bk ? '#ffffff' : (bgImg ? '#ffffff' : t.ink); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, ox + innerPad, oy + oh / 2);
    ctx.restore();
  }

  // Viền khung tuỳ chọn cho các layout khác (frame đã tự vẽ ở trên)
  if (L !== 'frame' && state.borderWidth && state.borderWidth > 0) {
    const bw = state.borderWidth; const rad = state.borderRadius ?? 0;
    ctx.save(); ctx.strokeStyle = state.borderColor || ACCENT; ctx.lineWidth = bw;
    const fm = m * .5; ctx.beginPath(); ctx.roundRect(fm + bw / 2, fm + bw / 2, w - fm * 2 - bw, h - fm * 2 - bw, rad); ctx.stroke(); ctx.restore();
  }

  return true;
}
