// Trang trí theo DỊP cho poster skin — mỗi dịp có hoạ tiết riêng + nhiều KIỂU.
// Dùng màu/nhãn từ SEASON_PRESETS; kiểu (variant) áp chung cho mọi dịp.
import { getSeason } from './season-engine';

export const SEASON_VARIANTS = [
  { id: 'ribbon', label: 'Ruy băng' },
  { id: 'badge', label: 'Huy hiệu' },
  { id: 'banner', label: 'Dải ngang' },
  { id: 'corners', label: 'Góc hoạ tiết' },
];

// hoạ tiết riêng từng dịp (SVG nội dung, vẽ trong viewBox -50..50), tô bằng `col`
function motifInner(seasonId: string, col: string): string {
  switch (seasonId) {
    case 'tet': // mai 5 cánh
      return `<g fill="${col}">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-22" rx="13" ry="24" transform="rotate(${a})"/>`).join('')}<circle r="9" fill="#b45309"/></g>`;
    case 'trungthu': // lồng đèn
      return `<g fill="none" stroke="${col}" stroke-width="5"><rect x="-26" y="-28" width="52" height="56" rx="26"/><line x1="-26" y1="0" x2="26" y2="0"/><line x1="0" y1="-28" x2="0" y2="28"/><line x1="-14" y1="-26" x2="-14" y2="26"/><line x1="14" y1="-26" x2="14" y2="26"/><line x1="0" y1="-28" x2="0" y2="-40" stroke-width="4"/><line x1="0" y1="28" x2="0" y2="42" stroke-width="4"/></g>`;
    case '8thang3': // trái tim
      return `<path d="M0 30 C-40 2 -34 -30 -12 -30 C-2 -30 0 -20 0 -16 C0 -20 2 -30 12 -30 C34 -30 40 2 0 30 Z" fill="${col}"/>`;
    case 'noel': // cây thông
      return `<g fill="${col}"><polygon points="0,-40 22,-6 -22,-6"/><polygon points="0,-20 28,20 -28,20"/><rect x="-7" y="20" width="14" height="14"/></g>`;
    case 'blackfriday': // tag
      return `<g fill="none" stroke="${col}" stroke-width="5"><path d="M-30 -6 L6 -30 L34 -2 L-2 34 Z"/><circle cx="18" cy="-14" r="6" fill="${col}"/></g>`;
    case '1111':
    case '1212': // tia sét
      return `<polygon points="6,-38 -22,8 2,8 -6,38 26,-10 2,-10" fill="${col}"/>`;
    default: // sao
      return `<path d="M0 -36 L10 -11 L37 -11 L15 6 L24 33 L0 17 L-24 33 L-15 6 L-37 -11 L-10 -11 Z" fill="${col}"/>`;
  }
}

function motifSvg(seasonId: string, col: string, px: number): string {
  return `<svg width="${px}" height="${px}" viewBox="-50 -50 100 100" style="display:block;flex:0 0 auto;">${motifInner(seasonId, col)}</svg>`;
}

// overlay HTML cho một dịp + kiểu
export function renderSeasonDecor(seasonId: string | undefined, variant: string | undefined, fontBody: string): string {
  const s = getSeason(seasonId);
  if (!s || s.id === 'none') return '';
  const v = variant || 'ribbon';
  const text = s.suggest || s.label.replace(/^[^\wÀ-ỹ]+\s*/, '');
  const { c1, c2 } = s;

  if (v === 'badge') {
    return `<div style="position:absolute;top:44px;right:44px;z-index:6;width:168px;height:168px;border-radius:50%;background:${c1};color:${c2};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transform:rotate(-8deg);box-shadow:0 10px 26px rgba(0,0,0,0.28);">
      ${motifSvg(s.id, c2, 52)}
      <span style="font-family:${fontBody};font-weight:800;font-size:20px;letter-spacing:0.05em;text-align:center;max-width:140px;line-height:1.1;">${text}</span>
    </div>`;
  }

  if (v === 'banner') {
    return `<div style="position:absolute;top:0;left:0;right:0;z-index:6;height:92px;background:${c1};color:${c2};display:flex;align-items:center;justify-content:center;gap:22px;">
      ${motifSvg(s.id, c2, 40)}
      <span style="font-family:${fontBody};font-weight:800;font-size:32px;letter-spacing:0.12em;">${text}</span>
      ${motifSvg(s.id, c2, 40)}
    </div>`;
  }

  if (v === 'corners') {
    const m = (x: string, y: string, rot: number) => `<div style="position:absolute;${x};${y};transform:rotate(${rot}deg);">${motifSvg(s.id, c1, 96)}</div>`;
    return `<div style="position:absolute;inset:0;z-index:6;pointer-events:none;">
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${c1}" stroke-width="2" opacity="0.8"><rect x="40" y="40" width="1000" height="1270"/></svg>
      ${m('top:54px', 'left:54px', -12)}${m('top:54px', 'right:54px', 12)}${m('bottom:54px', 'left:54px', 12)}${m('bottom:54px', 'right:54px', -12)}
    </div>`;
  }

  // ribbon (mặc định)
  return `<div style="position:absolute;top:0;right:0;width:360px;height:360px;overflow:hidden;pointer-events:none;z-index:6;">
    <div style="position:absolute;top:70px;right:-92px;width:380px;transform:rotate(45deg);background:${c1};color:${c2};font-family:${fontBody};font-weight:800;font-size:30px;letter-spacing:0.08em;text-align:center;padding:16px 0;box-shadow:0 8px 22px rgba(0,0,0,0.28);">${text}</div>
  </div>`;
}
