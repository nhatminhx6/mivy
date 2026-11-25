// Xuất SVG đang hiện trên trang (thiệp, sticker, móc khoá…) → PNG / PDF in, chạy hết trên trình duyệt.
// SVG vẽ qua <img> không tải được font/ảnh ngoài → nhúng font (data URL) + ảnh (data URL) trước khi vẽ.
import { drawWatermark } from './design-engine';
import { embedFontCss } from './html-export';
import { pdfFromImage, printPageDims, drawPrintPage } from './print-export';
import { preloadFontsFor, outlineTextInto } from './svg-outline';

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

// Bản sao SVG tự chứa (font + ảnh nhúng) — dùng để vẽ ra ảnh hoặc tải file .svg.
// opts.outline: đổi <text> → <path> cho FILE IN (độc lập font ở xưởng). Đo trên el gốc (đang trong DOM).
export async function selfContainedSvg(el: SVGSVGElement, fontImportCss?: string, opts: { outline?: boolean } = {}): Promise<SVGSVGElement> {
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
  if (opts.outline) {
    try { await preloadFontsFor(el); outlineTextInto(el, svg); } catch { /* lỗi outline → giữ <text>, không chặn xuất file */ }
  }
  return svg;
}

export async function svgToCanvas(svg: SVGSVGElement, outW: number, outH: number, bg?: string): Promise<HTMLCanvasElement> {
  svg.setAttribute('width', String(outW)); svg.setAttribute('height', String(outH));
  const src = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
  try {
    let im = new Image(); im.src = url; await im.decode();
    // Chrome: lần đầu giải mã SVG có @font-face nhúng, các subset phụ (vd 'vietnamese' của Montserrat) chưa kịp nạp
    // → ầ/Đ/Ố… rơi sang font dự phòng (dấu rời). Giải mã lần 2 sau 1 khung hình thì font đã sẵn → chữ đúng.
    if (src.includes('@font-face')) {
      await new Promise<void>((r) => setTimeout(r, 60)); // setTimeout (không rAF: tab ẩn thì rAF đứng)
      im = new Image(); im.src = url; await im.decode();
    }
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
  const c = await svgToCanvas(await selfContainedSvg(el, fontImportCss, { outline: true }), outW, outH, '#ffffff');
  return pdfFromImage(c.toDataURL('image/png'), outW, outH, trim, bleedMm);
}

// Nhiều mặt (vd card visit: mặt trước + sau) → 1 PDF in NHIỀU TRANG, mỗi mặt 1 trang có lề xén + vạch cắt.
export async function svgsToPrintPdf(els: SVGSVGElement[], fontImportCss: string | undefined, trim: { wMm: number; hMm: number }, bleedMm: number, dpi = 300): Promise<Blob> {
  const { pageW, pageH } = printPageDims(trim, bleedMm);
  const { jsPDF } = await import('jspdf');
  const orientation = pageW >= pageH ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
  const wMm = trim.wMm + bleedMm * 2, hMm = trim.hMm + bleedMm * 2;
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  for (let i = 0; i < els.length; i++) {
    if (i > 0) pdf.addPage([pageW, pageH], orientation);
    const c = await svgToCanvas(await selfContainedSvg(els[i], fontImportCss, { outline: true }), outW, outH, '#ffffff');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawPrintPage(pdf as any, c.toDataURL('image/png'), outW, outH, trim, bleedMm);
  }
  return pdf.output('blob');
}

// SVG đúng khổ thật → PDF 1 trang, KHÔNG thêm vạch cắt (dùng cho dieline/khuôn bế đã có sẵn nét cắt + bế).
export async function svgToSizedPdf(el: SVGSVGElement, fontImportCss: string | undefined, wMm: number, hMm: number, dpi = 150): Promise<Blob> {
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  const c = await svgToCanvas(await selfContainedSvg(el, fontImportCss, { outline: true }), outW, outH, '#ffffff');
  const { jsPDF } = await import('jspdf');
  const orientation = wMm >= hMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation, compress: true });
  pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
  return pdf.output('blob');
}

export async function svgFileBlob(el: SVGSVGElement, fontImportCss?: string): Promise<Blob> {
  return new Blob([new XMLSerializer().serializeToString(await selfContainedSvg(el, fontImportCss, { outline: true }))], { type: 'image/svg+xml' });
}

// Ảnh JPEG nhỏ gọn (nền trắng, không watermark) — làm ảnh xem trước gửi kèm đơn in
export async function svgToJpeg(el: SVGSVGElement, fontImportCss: string | undefined, outW: number): Promise<Blob> {
  const vb = el.viewBox.baseVal;
  const outH = Math.round((outW * vb.height) / vb.width);
  const c = await svgToCanvas(await selfContainedSvg(el, fontImportCss), outW, outH, '#ffffff');
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.85));
}
