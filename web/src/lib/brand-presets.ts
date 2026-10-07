import { BrandKit } from '@/types';

export interface Palette {
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorInk: string;
  colorSurface: string;
}

// 12 palette hoàn chỉnh (primary + secondary + accent + ink + surface), phối tay — không AI.
export const COLOR_PRESETS: Palette[] = [
  { name: 'Xanh ngọc', colorPrimary: '#0f3d2e', colorSecondary: '#14604a', colorAccent: '#10b981', colorInk: '#0f1b16', colorSurface: '#f0faf5' },
  { name: 'Đỏ nhiệt', colorPrimary: '#3a0d0d', colorSecondary: '#7a1f1f', colorAccent: '#e23d28', colorInk: '#1a0e0e', colorSurface: '#fdf1ef' },
  { name: 'Cam năng động', colorPrimary: '#3a1f05', colorSecondary: '#7a4310', colorAccent: '#f97316', colorInk: '#241503', colorSurface: '#fff4ea' },
  { name: 'Xanh dương', colorPrimary: '#0b2545', colorSecondary: '#13457f', colorAccent: '#2f80ed', colorInk: '#0a1626', colorSurface: '#eef4fd' },
  { name: 'Tím sang', colorPrimary: '#2a1a4a', colorSecondary: '#4a2f87', colorAccent: '#7c3aed', colorInk: '#180f2e', colorSurface: '#f3eefd' },
  { name: 'Hồng ngọt', colorPrimary: '#4a1130', colorSecondary: '#842055', colorAccent: '#ec4899', colorInk: '#2a0a1c', colorSurface: '#fdeff6' },
  { name: 'Vàng gold', colorPrimary: '#3a2f0a', colorSecondary: '#7a6512', colorAccent: '#eab308', colorInk: '#201a05', colorSurface: '#fdf9ea' },
  { name: 'Đen tối giản', colorPrimary: '#141414', colorSecondary: '#3a3a3a', colorAccent: '#f5a524', colorInk: '#111111', colorSurface: '#f4f4f5' },
  { name: 'Xanh mint', colorPrimary: '#0d3b3b', colorSecondary: '#136b67', colorAccent: '#14b8a6', colorInk: '#0a2222', colorSurface: '#effbfa' },
  { name: 'Nâu ấm', colorPrimary: '#3a2416', colorSecondary: '#6b4328', colorAccent: '#b4703a', colorInk: '#24150c', colorSurface: '#faf3ec' },
  { name: 'Pastel dịu', colorPrimary: '#5b4b8a', colorSecondary: '#8a74c9', colorAccent: '#9b7ede', colorInk: '#2a2440', colorSurface: '#f4f1fb' },
  { name: 'Xanh lá tươi', colorPrimary: '#143d10', colorSecondary: '#2d6b22', colorAccent: '#65c23a', colorInk: '#0c2208', colorSurface: '#f1faee' },
];

export const FONT_PRESETS: { id: string; name: string; family: string }[] = [
  { id: 'be-vietnam', name: 'Be Vietnam Pro', family: '"Be Vietnam Pro", sans-serif' },
  { id: 'montserrat', name: 'Montserrat', family: '"Montserrat", sans-serif' },
  { id: 'lora', name: 'Lora', family: '"Lora", serif' },
  { id: 'playfair', name: 'Playfair Display', family: '"Playfair Display", serif' },
];

export const VOICE_OPTIONS: { id: BrandKit['voice']; name: string; desc: string }[] = [
  { id: 'than-thien', name: 'Thân thiện', desc: 'Gần gũi, dễ thương' },
  { id: 'chuyen-nghiep', name: 'Chuyên nghiệp', desc: 'Nghiêm túc, tin cậy' },
  { id: 'nang-dong', name: 'Năng động', desc: 'Trẻ trung, sôi nổi' },
  { id: 'sang-trong', name: 'Sang trọng', desc: 'Cao cấp, tinh tế' },
];

export const DEFAULT_BRAND: BrandKit = {
  name: '',
  slogan: '',
  colorPrimary: COLOR_PRESETS[0].colorPrimary,
  colorSecondary: COLOR_PRESETS[0].colorSecondary,
  colorAccent: COLOR_PRESETS[0].colorAccent,
  colorInk: COLOR_PRESETS[0].colorInk,
  colorSurface: COLOR_PRESETS[0].colorSurface,
  fontHeadingId: 'be-vietnam',
  fontBodyId: 'be-vietnam',
  voice: 'than-thien',
  contact: {},
};

export const fontFamilyById = (id?: string): string =>
  FONT_PRESETS.find((f) => f.id === id)?.family || FONT_PRESETS[0].family;

/* ---- Sinh sắc độ (shade/tint) từ 1 màu bằng HSL — không AI ---- */
function hexToHsl(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh /= 6;
  }
  return [hh * 360, s * 100, l * 100];
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const col = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * col).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
// amount: -100..100 (âm = tối đi, dương = sáng lên)
export function adjust(hex: string, amount: number): string {
  try {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, s, Math.max(0, Math.min(100, l + amount)));
  } catch {
    return hex;
  }
}

const KEY = 'mivy-brand-v1';

export function loadBrand(): BrandKit | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BRAND, ...parsed, contact: { ...DEFAULT_BRAND.contact, ...(parsed.contact || {}) } } as BrandKit;
  } catch {
    return null;
  }
}

export function saveBrand(b: BrandKit): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(b));
    return true;
  } catch {
    return false;
  }
}

// Gộp contact thành 1 dòng hiển thị trên poster.
export function contactLine(c?: BrandKit['contact']): string {
  if (!c) return '';
  const parts: string[] = [];
  if (c.phone) parts.push(c.phone);
  if (c.zalo) parts.push('Zalo: ' + c.zalo);
  if (c.address) parts.push(c.address);
  if (c.website) parts.push(c.website);
  return parts.join('  ·  ');
}
