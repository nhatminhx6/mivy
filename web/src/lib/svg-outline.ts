// Outline chữ: đổi <text> trong SVG thành <path> để FILE IN không phụ thuộc xưởng có font hay không.
// Cách: dùng chính API đo chữ của trình duyệt (getStartPositionOfChar) trên SVG ĐANG hiển thị → trình
// duyệt lo toàn bộ layout (căn lề, letter-spacing, tspan, xuống dòng) nên khớp 100% với preview; opentype.js
// chỉ lấy HÌNH DẠNG từng glyph từ TTF static tải sẵn ở /public/fonts (không gọi dịch vụ ngoài lúc chạy).
// An toàn: gặp bất kỳ trục trặc nào (thiếu font, thiếu glyph, cấu trúc lệch) thì GIỮ NGUYÊN <text> — không
// bao giờ tệ hơn hành vi cũ (font vẫn được nhúng ở selfContainedSvg).

type OTPath = { toPathData: (decimals?: number) => string };
type OTFont = {
  charToGlyph: (c: string) => { index: number };
  getPath: (text: string, x: number, y: number, fontSize: number, opts?: object) => OTPath;
};

const SVGNS = 'http://www.w3.org/2000/svg';

type Variant = { weight: number; italic: boolean; url: string };
// Font mà engine thiệp (card-engine) + bảng hiệu (signage-engine) dùng. Thiếu entry → giữ <text> (fallback an toàn).
const FONTS: Record<string, Variant[]> = {
  'great vibes': [{ weight: 400, italic: false, url: '/fonts/GreatVibes-400.ttf' }],
  'alex brush': [{ weight: 400, italic: false, url: '/fonts/AlexBrush-400.ttf' }],
  allura: [{ weight: 400, italic: false, url: '/fonts/Allura-400.ttf' }],
  'dancing script': [{ weight: 700, italic: false, url: '/fonts/DancingScript-700.ttf' }],
  lobster: [{ weight: 400, italic: false, url: '/fonts/Lobster-400.ttf' }],
  bungee: [{ weight: 400, italic: false, url: '/fonts/Bungee-400.ttf' }],
  'cormorant garamond': [
    { weight: 500, italic: true, url: '/fonts/CormorantGaramond-500i.ttf' },
    { weight: 600, italic: false, url: '/fonts/CormorantGaramond-600.ttf' },
    { weight: 700, italic: false, url: '/fonts/CormorantGaramond-700.ttf' },
  ],
  'playfair display': [{ weight: 800, italic: false, url: '/fonts/PlayfairDisplay-800.ttf' }],
  montserrat: [{ weight: 800, italic: false, url: '/fonts/Montserrat-800.ttf' }],
  'baloo 2': [
    { weight: 600, italic: false, url: '/fonts/Baloo2-600.ttf' },
    { weight: 800, italic: false, url: '/fonts/Baloo2-800.ttf' },
  ],
  'be vietnam pro': [
    { weight: 600, italic: false, url: '/fonts/BeVietnamPro-600.ttf' },
    { weight: 800, italic: false, url: '/fonts/BeVietnamPro-800.ttf' },
  ],
  // bảng hiệu (signage) — font riêng ngoài danh mục thiệp
  'saira stencil one': [{ weight: 400, italic: false, url: '/fonts/SairaStencilOne-400.ttf' }],
  'big shoulders stencil display': [{ weight: 800, italic: false, url: '/fonts/BigShouldersStencil-800.ttf' }],
  'black ops one': [{ weight: 400, italic: false, url: '/fonts/BlackOpsOne-400.ttf' }],
  oswald: [{ weight: 700, italic: false, url: '/fonts/Oswald-700.ttf' }],
  prata: [{ weight: 400, italic: false, url: '/fonts/Prata-400.ttf' }],
};

function pickVariant(family: string, weight: number, italic: boolean): Variant | null {
  const vs = FONTS[family];
  if (!vs) return null;
  let best: Variant | null = null;
  let bestScore = Infinity;
  for (const v of vs) {
    const score = Math.abs(v.weight - weight) + (v.italic === italic ? 0 : 1000);
    if (score < bestScore) { bestScore = score; best = v; }
  }
  return best;
}

const pending = new Map<string, Promise<OTFont | null>>();
const loaded = new Map<string, OTFont>();
function loadFont(url: string): Promise<OTFont | null> {
  if (!pending.has(url)) {
    pending.set(url, (async () => {
      try {
        const ot: any = await import('opentype.js');
        const parse = ot.parse || ot.default?.parse;
        if (!parse) return null;
        const buf = await (await fetch(url)).arrayBuffer();
        const font = parse(buf) as OTFont;
        loaded.set(url, font);
        return font;
      } catch {
        return null;
      }
    })());
  }
  return pending.get(url)!;
}

// '"Be Vietnam Pro", sans-serif' -> 'be vietnam pro'
const famName = (css: string) => (css || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();

// Mỗi ký tự ánh xạ tới element quyết định kiểu chữ của nó (text hoặc tspan con).
function charStyles(textEl: Element): { ch: string; family: string; weight: number; italic: boolean; size: number }[] {
  const out: { ch: string; family: string; weight: number; italic: boolean; size: number }[] = [];
  const walk = (node: Node, styleEl: Element) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const cs = getComputedStyle(styleEl);
        const style = {
          family: famName(cs.fontFamily),
          weight: parseInt(cs.fontWeight, 10) || 400,
          italic: cs.fontStyle === 'italic',
          size: parseFloat(cs.fontSize) || 0,
        };
        for (const ch of child.textContent || '') out.push({ ch, ...style });
      } else if (child.nodeType === 1) {
        walk(child, child as Element);
      }
    });
  };
  walk(textEl, textEl);
  return out;
}

// Tải trước mọi font mà SVG cần (phải gọi + await trước khi dựng path, vì opentype dùng kiểu đồng bộ sau đó).
export async function preloadFontsFor(root: SVGSVGElement): Promise<void> {
  const urls = new Set<string>();
  root.querySelectorAll('text').forEach((t) => {
    for (const info of charStyles(t)) {
      const v = pickVariant(info.family, info.weight, info.italic);
      if (v) urls.add(v.url);
    }
  });
  await Promise.all([...urls].map(loadFont));
}

// Dựng chuỗi path cho 1 <text>. Trả null nếu không outline được (giữ nguyên <text>).
function buildPath(textEl: SVGTextContentElement): string | null {
  let n: number;
  try { n = textEl.getNumberOfChars(); } catch { return null; }
  if (!n) return null;
  const infos = charStyles(textEl);
  if (infos.length !== n) return null; // whitespace/cấu trúc lệch → bỏ qua cho an toàn
  let d = '';
  for (let i = 0; i < n; i++) {
    const inf = infos[i];
    if (!inf.ch.trim()) continue; // khoảng trắng: không có glyph, vị trí ký tự kế đã do trình duyệt tính
    const v = pickVariant(inf.family, inf.weight, inf.italic);
    if (!v) return null; // font ngoài danh mục → giữ <text>
    const font = loaded.get(v.url);
    if (!font) return null;
    const glyph = font.charToGlyph(inf.ch);
    if (!glyph || glyph.index === 0) return null; // font thiếu glyph (vd ký tự CJK) → giữ <text>
    let pos: { x: number; y: number };
    try { pos = textEl.getStartPositionOfChar(i); } catch { return null; }
    d += font.getPath(inf.ch, pos.x, pos.y, inf.size).toPathData(2);
  }
  return d || null;
}

const STYLE_PROPS: [string, string][] = [
  ['fill', 'fill'], ['fillOpacity', 'fill-opacity'],
  ['stroke', 'stroke'], ['strokeWidth', 'stroke-width'],
  ['strokeOpacity', 'stroke-opacity'], ['strokeLinejoin', 'stroke-linejoin'],
  ['strokeLinecap', 'stroke-linecap'], ['paintOrder', 'paint-order'],
];

// Đo trên SVG gốc (đang trong DOM) → thay <text> tương ứng trong bản clone bằng <path>.
// src và clone phải cùng cấu trúc (clone là bản sao của src).
export function outlineTextInto(src: SVGSVGElement, clone: SVGSVGElement): void {
  const srcTexts = Array.from(src.querySelectorAll('text'));
  const cloneTexts = Array.from(clone.querySelectorAll('text'));
  if (srcTexts.length === 0 || srcTexts.length !== cloneTexts.length) return;
  srcTexts.forEach((t, i) => {
    const d = buildPath(t as unknown as SVGTextContentElement);
    if (!d) return; // giữ nguyên <text> clone (fallback: font vẫn được nhúng)
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', d);
    const cs = getComputedStyle(t);
    for (const [js, attr] of STYLE_PROPS) {
      const val = (cs as any)[js] as string;
      if (val && val !== 'none' && !(attr === 'stroke-width' && parseFloat(val) === 0)) {
        if (attr === 'stroke' && val === 'none') continue;
        path.setAttribute(attr, val);
      }
    }
    if (!path.getAttribute('stroke')) path.removeAttribute('stroke');
    const tr = t.getAttribute('transform');
    if (tr) path.setAttribute('transform', tr);
    cloneTexts[i].replaceWith(path);
  });
}
