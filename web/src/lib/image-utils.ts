// Xử lý ảnh sản phẩm của user ngay trên trình duyệt (không tốn server). Trả về object URL (blob:) cho nhẹ re-render.

async function toBitmap(src: Blob | string): Promise<ImageBitmap> {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src;
  return createImageBitmap(blob);
}

function canvasBlob(c: HTMLCanvasElement, type = 'image/png', q?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas rỗng'))), type, q));
}

// Thu nhỏ ảnh tải lên (ảnh điện thoại 4000px → tối đa maxSide) để preview/xuất mượt.
export async function scaleImage(file: Blob, maxSide = 1400): Promise<string> {
  const bmp = await toBitmap(file);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const jpeg = file.type === 'image/jpeg';
  return URL.createObjectURL(await canvasBlob(c, jpeg ? 'image/jpeg' : 'image/png', jpeg ? 0.92 : undefined));
}

// Cắt bỏ viền trong suốt (sau khi tách nền) để sản phẩm lấp đầy khung, chừa margin nhỏ.
async function trimTransparent(blob: Blob, margin = 0.04): Promise<Blob> {
  const bmp = await toBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (data[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return blob;
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * margin);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1 + m * 2;
  out.height = y1 - y0 + 1 + m * 2;
  out.getContext('2d')!.drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, m, m, x1 - x0 + 1, y1 - y0 + 1);
  return canvasBlob(out);
}

// Tách nền (WASM @imgly, chạy client) — CHỈ gọi khi user bấm nút.
export async function cutoutImage(src: string): Promise<string> {
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(await (await fetch(src)).blob());
  return URL.createObjectURL(await trimTransparent(blob));
}

// "Bánh Mì Cô Ba!" → "banh-mi-co-ba"
export function slugify(s: string, fallback = 'mivy'): string {
  const out = s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return out || fallback;
}
