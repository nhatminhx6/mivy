// Xuất FILE IN CHUẨN (PDF 300dpi + bleed + crop marks) ngay trên trình duyệt — không tốn server.
// Khác file xem màn hình: đúng khổ vật lý (mm), có lề tràn (bleed) để xưởng xén, có vạch cắt (crop marks).
// Màu RGB — in kỹ thuật số / PP / decal / tờ rơi tại VN nhận tốt. (CMYK offset để sau, cần back-end.)

export interface PrintSize {
  id: string;
  label: string;      // tên hiển thị
  wMm: number;        // bề rộng vùng in thật (trim) — mm
  hMm: number;        // bề cao vùng in thật (trim) — mm
  dpi: number;        // độ phân giải khuyến nghị (khổ lớn nhìn xa → dpi thấp hơn)
  group: string;      // nhóm để gom trong UI
}

// Kho khổ in chuẩn — user CHỌN, code ghép (đúng kiến trúc Mivy: không gọi AI theo request).
export const PRINT_SIZES: PrintSize[] = [
  // Giấy / tờ rơi / poster
  { id: 'a6',       label: 'A6 · 105×148mm (tờ rơi nhỏ)',     wMm: 105, hMm: 148, dpi: 300, group: 'Giấy – tờ rơi – poster' },
  { id: 'a5',       label: 'A5 · 148×210mm (tờ rơi)',         wMm: 148, hMm: 210, dpi: 300, group: 'Giấy – tờ rơi – poster' },
  { id: 'a4',       label: 'A4 · 210×297mm',                  wMm: 210, hMm: 297, dpi: 300, group: 'Giấy – tờ rơi – poster' },
  { id: 'a3',       label: 'A3 · 297×420mm (poster)',         wMm: 297, hMm: 420, dpi: 300, group: 'Giấy – tờ rơi – poster' },
  { id: 'a2',       label: 'A2 · 420×594mm (poster lớn)',     wMm: 420, hMm: 594, dpi: 200, group: 'Giấy – tờ rơi – poster' },
  // Danh thiếp / voucher
  { id: 'namecard', label: 'Danh thiếp · 90×54mm',            wMm: 90,  hMm: 54,  dpi: 300, group: 'Danh thiếp – voucher' },
  { id: 'voucher',  label: 'Voucher / phiếu · 85×54mm',       wMm: 85,  hMm: 54,  dpi: 300, group: 'Danh thiếp – voucher' },
  // Decal / sticker
  { id: 'decal-s',  label: 'Decal vuông · 50×50mm',           wMm: 50,  hMm: 50,  dpi: 300, group: 'Decal – sticker' },
  { id: 'decal-m',  label: 'Decal vuông · 100×100mm',         wMm: 100, hMm: 100, dpi: 300, group: 'Decal – sticker' },
  // Khổ lớn (bạt / standee / banner)
  { id: 'standee',  label: 'Standee · 60×160cm',              wMm: 600, hMm: 1600, dpi: 100, group: 'Bạt – standee – banner' },
  { id: 'pp-8060',  label: 'Banner ngang · 80×60cm',         wMm: 800, hMm: 600,  dpi: 120, group: 'Bạt – standee – banner' },
  { id: 'pp-80120', label: 'Banner đứng · 80×120cm',         wMm: 800, hMm: 1200, dpi: 120, group: 'Bạt – standee – banner' },
  { id: 'pp-120200',label: 'Phông bạt · 120×200cm',          wMm: 1200, hMm: 2000, dpi: 80,  group: 'Bạt – standee – banner' },
];

const MM_PER_IN = 25.4;
const DEFAULT_BLEED_MM = 3;   // lề tràn mỗi cạnh
const MARK_ROOM_MM = 5;       // khoảng trắng ngoài bleed để chứa vạch cắt
const MARK_LEN_MM = 4;        // chiều dài 1 vạch cắt
const MAX_PX = 7000;          // chặn canvas quá to → trình duyệt tạo ảnh rỗng

const mm2px = (mm: number, dpi: number) => Math.round((mm / MM_PER_IN) * dpi);

export interface PrintExportOpts {
  size: PrintSize;
  designW: number;   // px thiết kế của node (template.w)
  designH: number;   // px thiết kế của node (template.h)
  bleedMm?: number;
  fontEmbedCSS?: string;
  filename?: string;
}

// Render node DOM (đã đổ nội dung / sửa tay) → trang PDF đúng khổ in, kèm bleed + crop marks.
export async function exportPrintPdf(node: HTMLElement, opts: PrintExportOpts): Promise<Blob> {
  const { size, designW, designH, fontEmbedCSS } = opts;
  const bleedMm = opts.bleedMm ?? DEFAULT_BLEED_MM;

  // dpi hiệu dụng: hạ xuống nếu khổ × dpi vượt trần pixel của trình duyệt.
  let dpi = size.dpi;
  const longestMm = Math.max(size.wMm, size.hMm);
  const maxDpi = Math.floor((MAX_PX * MM_PER_IN) / longestMm);
  if (dpi > maxDpi) dpi = maxDpi;

  // Chụp node ở đúng tỉ lệ cần để vùng trim đạt dpi mục tiêu.
  const targetTrimPx = mm2px(size.wMm, dpi);
  const pixelRatio = Math.max(1, targetTrimPx / designW);
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    width: designW, height: designH, pixelRatio,
    cacheBust: false, fontEmbedCSS, skipFonts: !fontEmbedCSS,
  });

  // Kích thước trang = trim + bleed 2 cạnh + khoảng trắng chứa vạch cắt 2 cạnh.
  const bleedBoxW = size.wMm + bleedMm * 2;
  const bleedBoxH = size.hMm + bleedMm * 2;
  const pageW = bleedBoxW + MARK_ROOM_MM * 2;
  const pageH = bleedBoxH + MARK_ROOM_MM * 2;

  const { jsPDF } = await import('jspdf');
  const orientation = pageW >= pageH ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });

  // Ảnh phủ TOÀN vùng bleed box (cover, canh giữa) → mép thiết kế tràn ra tận lề xén.
  const bx = MARK_ROOM_MM, by = MARK_ROOM_MM;
  const imgRatio = designW / designH;
  const boxRatio = bleedBoxW / bleedBoxH;
  let drawW: number, drawH: number;
  if (imgRatio > boxRatio) { drawH = bleedBoxH; drawW = bleedBoxH * imgRatio; }
  else { drawW = bleedBoxW; drawH = bleedBoxW / imgRatio; }
  const dx = bx + (bleedBoxW - drawW) / 2;
  const dy = by + (bleedBoxH - drawH) / 2;
  // Cắt phần ảnh tràn ngoài bleed box cho gọn trang.
  pdf.saveGraphicsState?.();
  pdf.addImage(dataUrl, 'PNG', dx, dy, drawW, drawH, undefined, 'FAST');

  // Vạch cắt (crop marks) ở 4 góc vùng TRIM, nằm trong khoảng trắng ngoài bleed → không đè nội dung.
  const tx0 = MARK_ROOM_MM + bleedMm;            // mép trái vùng trim
  const ty0 = MARK_ROOM_MM + bleedMm;            // mép trên vùng trim
  const tx1 = tx0 + size.wMm;                     // mép phải
  const ty1 = ty0 + size.hMm;                     // mép dưới
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.15);
  const gap = bleedMm;                            // chừa đúng vùng bleed, không chạm trim
  const corner = (cx: number, cy: number, sx: number, sy: number) => {
    // vạch ngang: từ góc trim kéo ra ngoài
    pdf.line(cx - sx * gap, cy, cx - sx * (gap + MARK_LEN_MM), cy);
    // vạch dọc
    pdf.line(cx, cy - sy * gap, cx, cy - sy * (gap + MARK_LEN_MM));
  };
  corner(tx0, ty0, 1, 1);
  corner(tx1, ty0, -1, 1);
  corner(tx0, ty1, 1, -1);
  corner(tx1, ty1, -1, -1);

  return pdf.output('blob');
}
