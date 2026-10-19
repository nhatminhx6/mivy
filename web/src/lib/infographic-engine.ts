// Infographic "trend" engine — listicle / hot-take / so sánh.
// Render 100% bằng CODE (canvas), KHÔNG gọi AI realtime. Template gen sẵn, user chỉ chọn + điền.

export type InfographicStyleId = 'cyber' | 'violet' | 'sunset' | 'mono';

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
}

interface Preset {
  bg: [string, string, string];
  glow: string;
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
  { id: 'cyber', name: 'Cyber Blue' },
  { id: 'violet', name: 'Violet Punch' },
  { id: 'sunset', name: 'Sunset Amber' },
  { id: 'mono', name: 'Mono Ink' },
];

const PRESETS: Record<InfographicStyleId, Preset> = {
  cyber: {
    bg: ['#0a1430', '#0b2d63', '#05081a'], glow: 'rgba(56,189,248,0.28)',
    accent: '#38bdf8', accent2: '#60a5fa', contrast: '#fb7185',
    titleGrad: ['#ffffff', '#38bdf8'], ink: '#f8fafc', muted: '#9fb3d1',
    card: 'rgba(255,255,255,0.045)', cardBorder: 'rgba(120,180,255,0.16)',
    iconBg: 'rgba(56,189,248,0.14)', pillBg: 'rgba(56,189,248,0.12)', pillBorder: 'rgba(56,189,248,0.4)',
  },
  violet: {
    bg: ['#16082e', '#3b0f66', '#0a0418'], glow: 'rgba(167,139,250,0.30)',
    accent: '#a78bfa', accent2: '#c084fc', contrast: '#f472b6',
    titleGrad: ['#ffffff', '#c084fc'], ink: '#faf5ff', muted: '#c4b5d8',
    card: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(192,132,252,0.18)',
    iconBg: 'rgba(167,139,250,0.16)', pillBg: 'rgba(167,139,250,0.14)', pillBorder: 'rgba(167,139,250,0.42)',
  },
  sunset: {
    bg: ['#2a0f16', '#7c2d12', '#160608'], glow: 'rgba(251,191,36,0.26)',
    accent: '#fbbf24', accent2: '#fb923c', contrast: '#fb7185',
    titleGrad: ['#ffffff', '#fbbf24'], ink: '#fff7ed', muted: '#e7c9a8',
    card: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(251,191,36,0.18)',
    iconBg: 'rgba(251,191,36,0.15)', pillBg: 'rgba(251,191,36,0.13)', pillBorder: 'rgba(251,191,36,0.4)',
  },
  mono: {
    bg: ['#0c0c0e', '#1b1b20', '#070708'], glow: 'rgba(255,255,255,0.10)',
    accent: '#e5e7eb', accent2: '#9ca3af', contrast: '#f87171',
    titleGrad: ['#ffffff', '#9ca3af'], ink: '#f9fafb', muted: '#9ca3af',
    card: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(255,255,255,0.12)',
    iconBg: 'rgba(255,255,255,0.08)', pillBg: 'rgba(255,255,255,0.08)', pillBorder: 'rgba(255,255,255,0.22)',
  },
};

const FONT = '"Be Vietnam Pro", system-ui, sans-serif';

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
) {
  const W = 1080;
  const H = aspect === '1:1' ? 1080 : aspect === '9:16' ? 1920 : 1350;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const p = PRESETS[styleId] || PRESETS.cyber;

  // ===== Nền gradient + glow =====
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, p.bg[0]); bg.addColorStop(0.55, p.bg[1]); bg.addColorStop(1, p.bg[2]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.12, H * 0.02, 20, W * 0.12, H * 0.02, W * 0.9);
  glow.addColorStop(0, p.glow); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

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
