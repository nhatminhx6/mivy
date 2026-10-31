import { MarketingState } from '@/types';

// Trang trí theo mùa sale VN — vẽ 100% bằng code (khung viền + hoạ tiết + tông màu),
// phủ lên poster có sẵn. KHÔNG tải ảnh mới, áp được cho mọi layout.
export interface SeasonPreset {
  id: string;
  label: string;
  c1: string; // màu chính
  c2: string; // màu phụ
  suggest: string; // gợi ý chữ sticker/ưu đãi cho dịp
}

export const SEASON_PRESETS: SeasonPreset[] = [
  { id: 'none', label: 'Không', c1: '', c2: '', suggest: '' },
  { id: 'tet', label: '🌸 Tết', c1: '#c81e1e', c2: '#fbbf24', suggest: 'SALE TẾT' },
  { id: '99', label: '🛒 9.9', c1: '#db2777', c2: '#f59e0b', suggest: '9.9' },
  { id: '1010', label: '🛒 10.10', c1: '#f43f5e', c2: '#fbbf24', suggest: '10.10' },
  { id: '1111', label: '🛒 11.11', c1: '#7c3aed', c2: '#f472b6', suggest: '11.11' },
  { id: '1212', label: '🛒 12.12', c1: '#2563eb', c2: '#f59e0b', suggest: '12.12' },
  { id: 'flashsale', label: '⚡ Flash Sale', c1: '#eab308', c2: '#ef4444', suggest: 'FLASH SALE' },
  { id: 'payday', label: '💸 Pay Day', c1: '#16a34a', c2: '#fbbf24', suggest: 'PAY DAY SALE' },
  { id: 'blackfriday', label: '🖤 Black Friday', c1: '#111827', c2: '#fbbf24', suggest: 'BLACK FRIDAY' },
  { id: 'trungthu', label: '🏮 Trung Thu', c1: '#b91c1c', c2: '#f59e0b', suggest: 'SALE TRUNG THU' },
  { id: '8thang3', label: '🌹 8/3', c1: '#db2777', c2: '#f9a8d4', suggest: 'QUÀ 8/3' },
  { id: 'valentine', label: '💝 Valentine', c1: '#e11d48', c2: '#fb7185', suggest: 'VALENTINE' },
  { id: '2010', label: '🌷 20/10', c1: '#c026d3', c2: '#f0abfc', suggest: 'QUÀ 20/10' },
  { id: '2011', label: '🎓 20/11', c1: '#1d4ed8', c2: '#93c5fd', suggest: 'TRI ÂN 20/11' },
  { id: '16', label: '🎈 1/6 Thiếu nhi', c1: '#0ea5e9', c2: '#fb7185', suggest: 'QUÀ 1/6' },
  { id: 'vulan', label: '🪷 Vu Lan', c1: '#db2777', c2: '#22c55e', suggest: 'VU LAN' },
  { id: '29', label: '🇻🇳 Quốc khánh 2/9', c1: '#da251d', c2: '#ffcd00', suggest: 'ĐẠI LỄ 2/9' },
  { id: '304', label: '🇻🇳 30/4 - 1/5', c1: '#da251d', c2: '#ffcd00', suggest: 'MỪNG LỄ 30/4' },
  { id: 'halloween', label: '🎃 Halloween', c1: '#ea580c', c2: '#7c3aed', suggest: 'HALLOWEEN' },
  { id: 'noel', label: '🎄 Giáng Sinh', c1: '#9f1239', c2: '#caa64a', suggest: 'MERRY XMAS' },
  { id: 'newyear', label: '🎆 Tết Dương lịch', c1: '#e11d48', c2: '#fbbf24', suggest: 'HAPPY NEW YEAR' },
  { id: 'yearend', label: '🏷️ Year End Sale', c1: '#111827', c2: '#f59e0b', suggest: 'YEAR END SALE' },
  { id: 'sinhnhat', label: '🎂 Sinh nhật shop', c1: '#ec4899', c2: '#fbbf24', suggest: 'SINH NHẬT SHOP' },
  { id: 'backtoschool', label: '🎒 Mùa tựu trường', c1: '#0d9488', c2: '#fcd34d', suggest: 'BACK TO SCHOOL' },
  { id: 'khaitruong', label: '🎉 Khai trương', c1: '#dc2626', c2: '#f59e0b', suggest: 'KHAI TRƯƠNG' },
];

export function getSeason(id?: string): SeasonPreset | undefined {
  return SEASON_PRESETS.find((s) => s.id === id);
}

const frac = (n: number) => n - Math.floor(n);

// Sao lấp lánh 4 cánh — vẽ tại gốc
function drawSparkle(ctx: CanvasRenderingContext2D, r: number, col: string) {
  ctx.save(); ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.2, -r * 0.2, r, 0);
  ctx.quadraticCurveTo(r * 0.2, r * 0.2, 0, r); ctx.quadraticCurveTo(-r * 0.2, r * 0.2, -r, 0);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.2, 0, -r); ctx.fill(); ctx.restore();
}

// Hoa văn góc cổ điển (nét cong + cuộn + chấm) — vẽ ở gốc 0,0 toả vào trong
function drawCornerFlourish(ctx: CanvasRenderingContext2D, A: number, col: string, lw: number) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, A); ctx.bezierCurveTo(0, A * 0.42, A * 0.42, 0, A, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(A, 0); ctx.quadraticCurveTo(A - A * 0.32, 0, A - A * 0.32, A * 0.32); ctx.stroke();
  ctx.beginPath(); ctx.arc(A * 0.6, A * 0.27, lw * 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Bông tuyết 6 cánh (dendrite) — vẽ tại gốc, bán kính r
function drawSnowflake(ctx: CanvasRenderingContext2D, r: number, col: string) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.58); ctx.lineTo(r * 0.24, -r * 0.78); ctx.moveTo(0, -r * 0.58); ctx.lineTo(-r * 0.24, -r * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.84); ctx.lineTo(r * 0.16, -r * 0.99); ctx.moveTo(0, -r * 0.84); ctx.lineTo(-r * 0.16, -r * 0.99); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Vẽ trang trí mùa sale lên poster (overlay, trước sticker).
 */
// Hoạ tiết riêng từng dịp, vẽ bằng canvas (tâm tại 0,0, bán kính ~r), tô màu `col`.
function drawMotif(ctx: CanvasRenderingContext2D, id: string, r: number, col: string) {
  ctx.save();
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = 'round';
  switch (id) {
    case 'tet': // mai 5 cánh tinh xảo (cánh khuyết + nhuỵ tua)
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.rotate((i * 72 * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.12);
        ctx.bezierCurveTo(-r * 0.34, -r * 0.42, -r * 0.3, -r * 0.94, -r * 0.06, -r);
        ctx.quadraticCurveTo(0, -r * 0.9, r * 0.06, -r);
        ctx.bezierCurveTo(r * 0.3, -r * 0.94, r * 0.34, -r * 0.42, 0, -r * 0.12);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fillStyle = '#b45309'; ctx.fill();
      ctx.fillStyle = '#fde68a';
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i * 60 * Math.PI) / 180); ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.035, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      break;
    case 'trungthu': // lồng đèn tinh xảo
      // dây + nắp trên
      ctx.fillRect(-r * 0.03, -r, r * 0.06, r * 0.2);
      ctx.beginPath(); ctx.roundRect(-r * 0.32, -r * 0.82, r * 0.64, r * 0.15, r * 0.06); ctx.fill();
      // thân bầu
      ctx.beginPath(); ctx.ellipse(0, -r * 0.02, r * 0.6, r * 0.66, 0, 0, Math.PI * 2); ctx.fill();
      // đáy
      ctx.beginPath(); ctx.roundRect(-r * 0.32, r * 0.64, r * 0.64, r * 0.15, r * 0.06); ctx.fill();
      // tua rua
      ctx.lineWidth = r * 0.05; ctx.strokeStyle = col;
      for (const tx of [-r * 0.18, 0, r * 0.18]) { ctx.beginPath(); ctx.moveTo(tx, r * 0.79); ctx.lineTo(tx, r * 0.98); ctx.stroke(); }
      // gân sáng
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = r * 0.04;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.56);
      ctx.moveTo(-r * 0.34, -r * 0.4); ctx.quadraticCurveTo(-r * 0.52, -r * 0.02, -r * 0.34, r * 0.4);
      ctx.moveTo(r * 0.34, -r * 0.4); ctx.quadraticCurveTo(r * 0.52, -r * 0.02, r * 0.34, r * 0.4); ctx.stroke();
      break;
    case '8thang3': // trái tim + highlight
    case 'valentine':
    case '2010':
      ctx.beginPath(); ctx.moveTo(0, r * 0.6);
      ctx.bezierCurveTo(-r * 1.1, -r * 0.2, -r * 0.5, -r * 0.8, 0, -r * 0.3);
      ctx.bezierCurveTo(r * 0.5, -r * 0.8, r * 1.1, -r * 0.2, 0, r * 0.6);
      ctx.fill();
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.28, r * 0.13, r * 0.22, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    case 'noel': // cây thông 3 tầng + sao + bi
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.3, -r * 0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.lineTo(r * 0.45, -r * 0.08); ctx.lineTo(-r * 0.45, -r * 0.08); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.22); ctx.lineTo(r * 0.6, r * 0.5); ctx.lineTo(-r * 0.6, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillRect(-r * 0.1, r * 0.5, r * 0.2, r * 0.3);
      ctx.save(); ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(0, -r, r * 0.12, 0, Math.PI * 2); ctx.fill(); // sao đỉnh (chấm sáng)
      ctx.beginPath(); ctx.arc(-r * 0.16, r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.2, r * 0.28, r * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 0.05, -r * 0.3, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    case 'blackfriday':
    case '1111':
    case '1212':
    case '99':
    case '1010':
    case 'flashsale':
    case 'payday':
    case 'yearend': // tia sét + viền sáng
      ctx.beginPath(); ctx.moveTo(r * 0.15, -r); ctx.lineTo(-r * 0.55, r * 0.2); ctx.lineTo(0, r * 0.2); ctx.lineTo(-r * 0.15, r); ctx.lineTo(r * 0.6, -r * 0.25); ctx.lineTo(0, -r * 0.25); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = r * 0.04; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      break;
    case 'halloween': // bí ngô jack-o-lantern
      ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.86, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.ellipse(-r * 0.36, r * 0.12, r * 0.26, r * 0.74, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * 0.36, r * 0.12, r * 0.26, r * 0.74, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#4d7c0f'; ctx.fillRect(-r * 0.09, -r * 0.78, r * 0.18, r * 0.32);
      ctx.fillStyle = '#1a1a1a'; // mắt + miệng
      ctx.beginPath(); ctx.moveTo(-r * 0.46, -r * 0.1); ctx.lineTo(-r * 0.18, -r * 0.1); ctx.lineTo(-r * 0.32, r * 0.14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.46, -r * 0.1); ctx.lineTo(r * 0.18, -r * 0.1); ctx.lineTo(r * 0.32, r * 0.14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.4); ctx.lineTo(-r * 0.22, r * 0.28); ctx.lineTo(-r * 0.04, r * 0.42); ctx.lineTo(r * 0.14, r * 0.28); ctx.lineTo(r * 0.34, r * 0.42); ctx.lineTo(r * 0.44, r * 0.34); ctx.lineTo(r * 0.3, r * 0.56); ctx.lineTo(-r * 0.26, r * 0.56); ctx.closePath(); ctx.fill();
      break;
    case 'newyear': // pháo hoa
      ctx.save(); ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 6); ctx.beginPath(); ctx.moveTo(0, -r * 0.34); ctx.lineTo(0, -r * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -r, r * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2); ctx.fill();
      break;
    case '16': // bóng bay
      ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.6, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(-r * 0.08, r * 0.56); ctx.lineTo(r * 0.08, r * 0.56); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.moveTo(0, r * 0.56); ctx.quadraticCurveTo(r * 0.2, r * 0.82, 0, r); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.42, r * 0.11, r * 0.17, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    case 'vulan': // hoa sen
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate((i - 2) * 0.52); ctx.beginPath(); ctx.ellipse(0, -r * 0.48, r * 0.22, r * 0.56, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate((i - 1) * 0.5); ctx.beginPath(); ctx.ellipse(0, -r * 0.34, r * 0.14, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.restore();
      break;
    case '29':
    case '304': // sao vàng 5 cánh đầy đặn
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const ang = (Math.PI / 5) * i - Math.PI / 2; const rad = i % 2 ? r * 0.4 : r; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * rad, Math.sin(ang) * rad); }
      ctx.closePath(); ctx.fill();
      break;
    default: // sao
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2; const rad = i % 2 ? r * 0.42 : r;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/**
 * Vẽ trang trí dịp lên poster — 6 kiểu (corner/hang/column/stamp/scatter/seal) theo seasonStyle.
 * Mỗi kiểu dùng hoạ tiết (motif) riêng của dịp + tông màu dịp.
 */
export function drawSeasonDecor(canvas: HTMLCanvasElement, marketing: MarketingState) {
  const base = getSeason(marketing.season);
  if (!base || base.id === 'none') return;
  // màu + hình user tự chọn đè lên mặc định của dịp
  const s = { ...base, c1: marketing.seasonC1 || base.c1, c2: marketing.seasonC2 || base.c2, id: marketing.seasonMotif || base.id };
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = canvas.width / 1080;
  const W = canvas.width / S;
  const H = canvas.height / S;
  const variant = marketing.seasonStyle || 'corner';
  ctx.save();

  if (variant === 'hang') {
    // Treo châu + sao sát mép trên (thanh lịch, tránh đè nội dung)
    const br = W * 0.028;
    for (const x of [W * 0.3, W * 0.7]) {
      const y = W * 0.07;
      ctx.strokeStyle = s.c2; ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - br); ctx.stroke();
      ctx.fillStyle = s.c1; ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.c2; ctx.fillRect(x - br * 0.28, y - br - br * 0.22, br * 0.56, br * 0.3);
    }
    ctx.save(); ctx.translate(W * 0.5, W * 0.085); drawSparkle(ctx, W * 0.032, s.c2); ctx.restore();
  } else if (variant === 'column') {
    // 2 mép dọc: đường kẻ mảnh + hoạ tiết nhỏ xen kẽ (thanh lịch, không thanh đặc)
    const m = 48, r = W * 0.022;
    ctx.strokeStyle = s.c1; ctx.lineWidth = Math.max(2, W * 0.0035); ctx.lineCap = 'round';
    for (const bx of [m, W - m]) {
      ctx.beginPath(); ctx.moveTo(bx, m + 40); ctx.lineTo(bx, H - m - 40); ctx.stroke();
      for (let y = m + 40; y <= H - m - 40 + 1; y += (H - m * 2 - 80) / 6) drawMotifAt(ctx, s.id, bx, y, r, s.c2);
    }
  } else if (variant === 'stamp') {
    // Tem / huy hiệu góc phải trên
    const R = Math.round(W * 0.07), cx = W - R - 40, cy = R + 40;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12);
    ctx.shadowColor = 'rgba(0,0,0,0.26)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 7;
    ctx.fillStyle = s.c1; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = s.c2; ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2); ctx.stroke();
    drawMotifAt(ctx, s.id, 0, 0, R * 0.5, s.c2);
    ctx.restore();
  } else if (variant === 'scatter') {
    // Rải thành cụm ở 2 góc chéo (trên-phải + dưới-trái)
    drawMotifAt(ctx, s.id, W * 0.87, W * 0.055, W * 0.04, s.c1);
    drawMotifAt(ctx, s.id, W * 0.78, W * 0.1, W * 0.026, s.c2);
    drawMotifAt(ctx, s.id, W * 0.93, W * 0.11, W * 0.02, s.c1);
    drawMotifAt(ctx, s.id, W * 0.13, H - W * 0.055, W * 0.04, s.c1);
    drawMotifAt(ctx, s.id, W * 0.22, H - W * 0.1, W * 0.026, s.c2);
    drawMotifAt(ctx, s.id, W * 0.08, H - W * 0.11, W * 0.02, s.c1);
  } else if (variant === 'seal') {
    // Ấn tròn hoạ tiết lớn mờ (không viền khung)
    const cx = W / 2, cy = H * 0.3;
    ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = s.c1; ctx.lineWidth = W * 0.01;
    for (const rr of [W * 0.2, W * 0.15, W * 0.1]) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); }
    drawMotifAt(ctx, s.id, cx, cy, W * 0.11, s.c1);
    ctx.restore();
  } else if (variant === 'tile') {
    // In chìm — hoạ tiết lặp mờ khắp nền
    ctx.save(); ctx.globalAlpha = 0.07;
    const step = W * 0.17, r = W * 0.04;
    for (let gy = 0, row = 0; gy < H + step; gy += step, row++) {
      for (let gx = (row % 2 ? step / 2 : 0); gx < W + step; gx += step) drawMotifAt(ctx, s.id, gx, gy, r, s.c1);
    }
    ctx.restore();
  } else if (variant === 'giant') {
    // In chìm — dấu ấn lớn mờ ở góc
    ctx.save(); ctx.globalAlpha = 0.1; drawMotifAt(ctx, s.id, W * 0.84, H * 0.86, W * 0.5, s.c1); ctx.restore();
  } else if (variant === 'arc') {
    // In chìm — vòng cung mờ phía dưới + hoạ tiết nhỏ trên
    ctx.save(); ctx.globalAlpha = 0.13; ctx.strokeStyle = s.c1; ctx.lineWidth = W * 0.012;
    const cx = W / 2, cy = H * 1.02;
    for (const rr of [W * 0.55, W * 0.42, W * 0.29]) { ctx.beginPath(); ctx.arc(cx, cy, rr, Math.PI, 2 * Math.PI); ctx.stroke(); }
    ctx.globalAlpha = 0.16; drawMotifAt(ctx, s.id, W / 2, H * 0.12, W * 0.05, s.c1);
    ctx.restore();
  } else if (variant === 'falling') {
    // In chìm — hoạ tiết dịp rơi rải khắp, phân lớp chiều sâu (to-mờ sau, nhỏ-rõ trước)
    ctx.save();
    const pts = [[0.1, 0.14, 1], [0.3, 0.07, 0.6], [0.52, 0.2, 0.85], [0.72, 0.1, 0.55], [0.9, 0.17, 0.95], [0.16, 0.4, 0.7], [0.42, 0.46, 1.1], [0.66, 0.37, 0.6], [0.86, 0.52, 0.85], [0.2, 0.66, 0.9], [0.5, 0.73, 0.6], [0.78, 0.64, 1], [0.12, 0.88, 0.7], [0.37, 0.9, 0.5], [0.62, 0.92, 0.85], [0.9, 0.84, 0.6]];
    const base = W * 0.055;
    for (const [px, py, sc] of pts) { ctx.save(); ctx.globalAlpha = 0.06 + 0.1 * (sc - 0.5); ctx.translate(px * W, py * H); ctx.rotate(px * 6 + py * 11); drawMotif(ctx, s.id, base * sc, s.c1); ctx.restore(); }
    ctx.restore();
  } else if (variant === 'snow') {
    // In chìm — tuyết rơi: bông tuyết to mờ (sau) + chấm nhỏ rõ (trước)
    ctx.save();
    for (let i = 0; i < 11; i++) {
      const rx = frac(Math.sin(i * 91.3) * 33219.1), ry = frac(Math.sin(i * 57.7) * 71523.9), rs = frac(Math.sin(i * 41.1) * 9271.3);
      ctx.save(); ctx.globalAlpha = 0.07 + 0.06 * rs; ctx.translate(rx * W, ry * H); ctx.rotate(rs * 2);
      drawSnowflake(ctx, W * (0.03 + 0.035 * rs), '#ffffff'); ctx.restore();
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 42; i++) {
      const rx = frac(Math.sin(i * 127.1) * 43758.5), ry = frac(Math.sin(i * 311.7) * 52713.1), rs = frac(Math.sin(i * 74.7) * 19349.3);
      ctx.globalAlpha = 0.3 + 0.5 * rs;
      ctx.beginPath(); ctx.arc(rx * W, ry * H, W * (0.0035 + 0.009 * rs), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (variant === 'frame') {
    // Viền hoạ tiết: khung đôi inset + motif dịp 2 góc trên (tránh CTA ở đáy)
    const pad = W * 0.042, lw = Math.max(2, W * 0.004);
    ctx.strokeStyle = s.c1; ctx.lineWidth = lw;
    roundRect(ctx, pad, pad, W - 2 * pad, H - 2 * pad, W * 0.02); ctx.stroke();
    ctx.strokeStyle = s.c2; ctx.lineWidth = Math.max(1.5, lw * 0.5);
    roundRect(ctx, pad + lw * 2.2, pad + lw * 2.2, W - 2 * pad - lw * 4.4, H - 2 * pad - lw * 4.4, W * 0.016); ctx.stroke();
    const cm = W * 0.032;
    drawMotifAt(ctx, s.id, pad + cm + 6, pad + cm + 6, cm, s.c1);
    drawMotifAt(ctx, s.id, W - pad - cm - 6, pad + cm + 6, cm, s.c1);
  } else if (variant === 'bunting') {
    // Dây cờ tam giác treo ngang sát mép trên
    const n = 11, fw = W / n, y = W * 0.012, fh = W * 0.048;
    ctx.strokeStyle = s.c1; ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo((i + 0.5) * fw, y + fh * 0.42, (i + 1) * fw, y);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const x = i * fw; ctx.fillStyle = i % 2 ? s.c1 : s.c2;
      ctx.beginPath(); ctx.moveTo(x + fw * 0.12, y + fh * 0.08); ctx.lineTo(x + fw * 0.88, y + fh * 0.08); ctx.lineTo(x + fw * 0.5, y + fh); ctx.closePath(); ctx.fill();
    }
  } else if (variant === 'confetti') {
    // Giấy vụn rơi: mảnh vuông + tròn 2 tông + trắng, rải khắp
    for (let i = 0; i < 46; i++) {
      const rx = frac(Math.sin(i * 12.9) * 43758.5), ry = frac(Math.sin(i * 78.2) * 12543.1), rr = frac(Math.sin(i * 33.3) * 9999.9);
      ctx.save(); ctx.globalAlpha = 0.45 + 0.4 * rr; ctx.translate(rx * W, ry * H); ctx.rotate(rr * 6);
      ctx.fillStyle = i % 3 === 0 ? s.c1 : i % 3 === 1 ? s.c2 : '#ffffff';
      const sz = W * (0.009 + 0.011 * rr);
      if (i % 2) ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.62); else { ctx.beginPath(); ctx.arc(0, 0, sz * 0.52, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  } else if (variant === 'ribbon') {
    // Băng chéo góc trên-phải mang chữ dịp
    ctx.save(); ctx.translate(W, 0); ctx.rotate(Math.PI / 4);
    const bw = W * 0.055, len = W * 0.52, ox = -len * 0.46, oy = W * 0.14;
    ctx.fillStyle = s.c1; ctx.fillRect(ox, oy, len, bw);
    ctx.fillStyle = s.c2; ctx.fillRect(ox, oy, len, bw * 0.14); ctx.fillRect(ox, oy + bw * 0.86, len, bw * 0.14);
    const label = (s.suggest || '').toUpperCase();
    if (label) { ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(W * 0.03)}px "Be Vietnam Pro", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, ox + len / 2, oy + bw / 2); }
    ctx.restore();
  } else if (variant === 'rays') {
    // Tia sáng toả mờ từ đỉnh (sau nội dung)
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = s.c1;
    const cx = W / 2, cy = -H * 0.08, n = 24;
    for (let i = 0; i < n; i++) { if (i % 2) continue; ctx.save(); ctx.translate(cx, cy); ctx.rotate((i / n) * Math.PI * 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-W * 0.055, H * 1.6); ctx.lineTo(W * 0.055, H * 1.6); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
  } else {
    // corner — hoa văn góc cổ điển + CỤM hoạ tiết dịp ở góc trên-phải (vùng an toàn, không đè brand/CTA)
    const off = 46, A = W * 0.055, lw = Math.max(2, W * 0.0032);
    const fl = (cx: number, cy: number, sx: number, sy: number) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy); drawCornerFlourish(ctx, A, s.c2, lw); ctx.restore(); };
    fl(off, off, 1, 1); fl(W - off, off, -1, 1); fl(off, H - off, 1, -1); fl(W - off, H - off, -1, -1);
    // Cụm hoạ tiết dịp: to-mờ sau + nhỏ-rõ trước, 2 tông, toả từ góc trên-phải
    drawMotifAt(ctx, s.id, W * 0.9, W * 0.08, W * 0.055, s.c1);
    drawMotifAt(ctx, s.id, W * 0.8, W * 0.055, W * 0.032, s.c2);
    drawMotifAt(ctx, s.id, W * 0.86, W * 0.15, W * 0.026, s.c2);
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawMotifAt(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, r: number, col: string) {
  ctx.save(); ctx.translate(x, y); drawMotif(ctx, id, r, col); ctx.restore();
}

