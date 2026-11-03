// Xuất SVG đang hiện trên trang (thiệp, sticker, móc khoá…) → PNG / PDF in, chạy hết trên trình duyệt.
// SVG vẽ qua <img> không tải được font/ảnh ngoài → nhúng font (data URL) + ảnh (data URL) trước khi vẽ.
import { drawWatermark } from './design-engine';
import { embedFontCss } from './html-export';
import { pdfFromImage } from './print-export';

const MM_PER_IN = 25.4;
const dataUrlCache = new Map<string, Promise<string>>();

export function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return Promise.resolve(url);
  if (!dataUrlCache.has(url)) {
    dataUrlCache.set(url, fetch(url).then((r) => r.blob()).then((b) => new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(b);
    })));
  }
  return dataUrlCache.get(url)!;
}

// Bản sao SVG tự chứa (font + ảnh nhúng) — dùng để vẽ ra ảnh hoặc tải file .svg
export async function selfContainedSvg(el: SVGSVGElement, fontImportCss?: string): Promise<SVGSVGElement> {
  const svg = el.cloneNode(true) as SVGSVGElement;
  svg.removeAttribute('style'); svg.removeAttribute('class');
  if (fontImportCss) {
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = await embedFontCss(fontImportCss);
    svg.insertBefore(st, svg.firstChild);
  }
  await Promise.all(Array.from(svg.querySelectorAll('image')).map(async (im) => {
    const href = im.getAttribute('href') || im.getAttribute('xlink:href');
    if (!href || href.startsWith('data:')) return;
    im.setAttribute('href', await toDataUrl(href));
  }));
  return svg;
}

export async function svgToCanvas(svg: SVGSVGElement, outW: number, outH: number, bg?: string): Promise<HTMLCanvasElement> {
  svg.setAttribute('width', String(outW)); svg.setAttribute('height', String(outH));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const im = new Image(); im.src = url; await im.decode();
    const c = document.createElement('canvas'); c.width = outW; c.height = outH;
    const ctx = c.getContext('2d')!;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, outW, outH); }
    ctx.drawImage(im, 0, 0, outW, outH);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

const canvasBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));

// PNG xem/đăng: có watermark Mivy (bản free)
export async function svgToPng(el: SVGSVGElement, fontImportCss: string | undefined, outW: number, opts: { watermark?: boolean } = {}): Promise<Blob> {
  const vb = el.viewBox.baseVal;
  const outH = Math.round((outW * vb.height) / vb.width);
  const c = await svgToCanvas(await selfContainedSvg(el, fontImportCss), outW, outH);
  if (opts.watermark !== false) drawWatermark(c);
  return canvasBlob(c);
}

// PDF in: SVG đã gồm lề xén (viewBox nới bleed) → vẽ 300dpi → trang PDF có vạch cắt
export async function svgToPrintPdf(el: SVGSVGElement, fontImportCss: string | undefined, trim: { wMm: number; hMm: number }, bleedMm: number, dpi = 300): Promise<Blob> {
  const wMm = trim.wMm + bleedMm * 2, hMm = trim.hMm + bleedMm * 2;
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  const c = await svgToCanvas(await selfContainedSvg(el, fontImportCss), outW, outH, '#ffffff');
  return pdfFromImage(c.toDataURL('image/png'), outW, outH, trim, bleedMm);
}

export async function svgFileBlob(el: SVGSVGElement, fontImportCss?: string): Promise<Blob> {
  return new Blob([new XMLSerializer().serializeToString(await selfContainedSvg(el, fontImportCss))], { type: 'image/svg+xml' });
}

// Ảnh JPEG nhỏ gọn (nền trắng, không watermark) — làm ảnh xem trước gửi kèm đơn in
export async function svgToJpeg(el: SVGSVGElement, fontImportCss: string | undefined, outW: number): Promise<Blob> {
  const vb = el.viewBox.baseVal;
  const outH = Math.round((outW * vb.height) / vb.width);
  const c = await svgToCanvas(await selfContainedSvg(el, fontImportCss), outW, outH, '#ffffff');
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.85));
}
