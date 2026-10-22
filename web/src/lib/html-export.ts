// Xuất template HTML ({w,h,css,html}) → PNG ngay trên trình duyệt (không tốn server).
// Dùng chung cho preview (TemplateHtmlPreview) và xuất hàng loạt (bộ ảnh đa sàn).

const cssCache = new Map<string, Promise<string>>();

export function fetchCss(url: string): Promise<string> {
  if (!cssCache.has(url)) cssCache.set(url, fetch(url).then((r) => r.text()).catch(() => ''));
  return cssCache.get(url)!;
}

export function importUrls(css: string): string[] {
  return Array.from(new Set(Array.from(css.matchAll(/@import url\(['"]?([^'")]+)['"]?\)/g)).map((m) => m[1])));
}

export const stripImports = (css: string) => css.replace(/@import url\([^)]*\);?/g, '').trim();

// CSS @font-face thật (đã tải từ các @import) — để nhúng font vào ảnh xuất.
export async function fontCssFor(css: string): Promise<string> {
  return (await Promise.all(importUrls(css || '').map(fetchCss))).join('\n');
}

// Font NHÚNG thẳng (data URL) để đưa cho html-to-image: ảnh được vẽ qua SVG-as-image, không tải được
// font từ link ngoài (fonts.gstatic.com) → nếu đưa CSS link ngoài, PNG xuất ra sẽ dùng font dự phòng.
const fileCache = new Map<string, Promise<string>>();
const embedCache = new Map<string, Promise<string>>();
const FONT_URL = /url\((['"]?)(https?:[^)'"]+)\1\)/g;

function fileAsDataUrl(url: string): Promise<string> {
  if (!fileCache.has(url)) {
    fileCache.set(url, fetch(url).then((r) => r.blob()).then((b) => new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(b);
    })).catch(() => url));
  }
  return fileCache.get(url)!;
}

export function embedFontCss(css: string): Promise<string> {
  if (!embedCache.has(css)) {
    embedCache.set(css, (async () => {
      const raw = await fontCssFor(css);
      const urls = Array.from(new Set(Array.from(raw.matchAll(FONT_URL)).map((m) => m[2])));
      const map = new Map(await Promise.all(urls.map(async (u) => [u, await fileAsDataUrl(u)] as const)));
      return raw.replace(FONT_URL, (_m, _q, u: string) => `url(${map.get(u) || u})`);
    })());
  }
  return embedCache.get(css)!;
}

export interface HtmlTemplate { w: number; h: number; css: string; html: string }

// Render template vào 1 node ẩn ngoài màn hình rồi chụp PNG đúng kích thước (pixelRatio 1 = đúng w×h px).
export async function renderHtmlToPng(t: HtmlTemplate, pixelRatio = 1): Promise<Blob> {
  const fontCss = await fontCssFor(t.css);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${t.w}px;height:${t.h}px;overflow:hidden;pointer-events:none;`;
  const style = document.createElement('style');
  style.textContent = `${fontCss}\n${stripImports(t.css)}`;
  const node = document.createElement('div');
  node.style.cssText = `width:${t.w}px;height:${t.h}px;`;
  node.innerHTML = t.html;
  host.append(style, node);
  document.body.appendChild(host);
  try {
    await (document as any).fonts?.ready;
    await Promise.all(Array.from(node.querySelectorAll('img')).map((i) => (i.complete ? null : i.decode().catch(() => null))));
    const { toBlob } = await import('html-to-image');
    const embedded = await embedFontCss(t.css);
    const blob = await toBlob(node, { width: t.w, height: t.h, pixelRatio, cacheBust: false, fontEmbedCSS: embedded, skipFonts: !embedded });
    if (!blob) throw new Error('Xuất ảnh rỗng');
    return blob;
  } finally {
    host.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
