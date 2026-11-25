import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Giấy khen · chứng nhận: mọi mẫu (+ chữ dài, A3, dọc/ngang, song ngữ) — chữ nằm trong khổ, không đè nhau, không quá nhỏ;
// danh sách 30 người = 30 tấm, số hiệu chạy; tải PNG/PDF (đủ trang + khuôn ép kim) / ảnh 3D; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'certificate');
const NAMES = ['Học sinh giỏi · cổ điển đỏ', 'Học sinh tiên tiến · xanh', 'Nhân viên xuất sắc · nguyệt quế', 'Nhân viên xuất sắc · dọc', 'Bằng khen · đỏ trang trọng', 'Bằng khen · xanh lá', 'Khoá học · hiện đại navy', 'Khoá học · nguyệt quế ngọc', 'Khoá học · tối giản', 'Sự kiện · ruy băng đỏ rượu', 'Sự kiện · tím dọc', 'Sự kiện · nâu kem'];

async function pick(page: Page, name: string) {
  const tpls = page.getByTestId('ct-tpl');
  const texts = await tpls.evaluateAll((els) => els.map((e) => e.querySelector(':scope > div:last-child')?.textContent || ''));
  const i = texts.findIndex((t) => t === name);
  expect(i, `có mẫu ${name}`).toBeGreaterThanOrEqual(0);
  await tpls.nth(i).click();
  await page.waitForTimeout(250);
}

async function audit(page: Page, label: string) {
  const r = await page.locator('[data-testid="ct-flat"] svg').evaluate((svg: SVGSVGElement) => {
    const sb = svg.getBoundingClientRect();
    const mmPx = sb.width / parseFloat(svg.getAttribute('data-ct-w') || '297');
    const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
    const boxes = texts.map((t) => {
      const b = t.getBoundingClientRect();
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      // bbox chữ gồm cả khoảng ascent/descent → co 18% trên dưới để so đè
      return { t: t.textContent || '', x0: b.left, x1: b.right, y0: b.top + b.height * 0.18, y1: b.bottom - b.height * 0.18, hMm: b.height / mmPx, fs, script: /Vibes|Brush/.test(t.getAttribute('font-family') || '') };
    });
    const outside = boxes.filter((b) => b.x0 < sb.left + mmPx * 1.5 || b.x1 > sb.right - mmPx * 1.5 || b.y0 < sb.top + mmPx * 1.5 || b.y1 > sb.bottom - mmPx * 1.5).map((b) => b.t);
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.script || b.script) continue; // chữ thư pháp có nét bay dài, kiểm riêng bằng mắt
      const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ix > 2 && iy > 2) overlaps.push(`${a.t} × ${b.t}`);
    }
    const sc = parseFloat(svg.getAttribute('data-ct-s') || '1');
    // cỡ chữ thật (mm) = font-size (10 đơn vị = 1mm) × hệ số khổ; tối thiểu 2,2mm ≈ 6pt
    const tiny = boxes.filter((b) => (b.fs * sc) / 10 < 2.2).map((b) => `${b.t} (${((b.fs * sc) / 10).toFixed(2)}mm)`);
    return { n: boxes.length, outside, overlaps, tiny };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(6);
  expect(r.outside, `${label}: chữ lòi ra ngoài khổ`).toEqual([]);
  expect(r.overlaps, `${label}: chữ đè nhau`).toEqual([]);
  expect(r.tiny, `${label}: chữ quá nhỏ`).toEqual([]);
}

test('Giấy khen · chứng nhận: mọi mẫu, danh sách, xuất file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1500, height: 1100 });
  await page.goto('/studio/certificate');
  await expect(page.getByTestId('ct-tpl').first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('ct-tpl')).toHaveCount(12);
  await page.getByTestId('tab-flat').click();

  // mọi mẫu A4 + A3
  for (const [i, name] of NAMES.entries()) {
    await pick(page, name);
    await audit(page, name);
    await page.locator('[data-testid="ct-flat"]').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await page.getByTestId('ct-sizes').locator('button').nth(1).click();
  for (const name of [NAMES[0], NAMES[4], NAMES[10]]) { await pick(page, name); await audit(page, `${name} A3`); }
  await page.getByTestId('ct-sizes').locator('button').nth(0).click();

  // chữ dài trên mọi bố cục (ngang + dọc)
  await pick(page, NAMES[0]);
  await page.getByTestId('ct-field-name').fill('Nguyễn Hoàng Bảo Ngọc Phương Thảo Khánh Linh');
  await page.getByTestId('ct-field-reason').fill('Đã đạt danh hiệu Học sinh Xuất sắc toàn diện về học tập, rèn luyện và hoạt động phong trào\nNăm học 2026 – 2027 và giải Nhất kỳ thi học sinh giỏi cấp Thành phố môn Toán');
  await page.getByTestId('ct-field-org').fill('TRƯỜNG TRUNG HỌC CƠ SỞ VÀ TRUNG HỌC PHỔ THÔNG AN KHANG QUỐC TẾ');
  for (const lay of [0, 1, 2, 3, 4, 5]) {
    await page.getByTestId('ct-layouts').locator('button').nth(lay).click();
    for (const o of [0, 1]) { await page.getByTestId('ct-orient').locator('button').nth(o).click(); await page.waitForTimeout(150); await audit(page, `chữ dài · bố cục ${lay} · hướng ${o}`); }
  }
  await page.locator('[data-testid="ct-flat"]').screenshot({ path: path.join(OUT, 'chu-dai.png') });

  // song ngữ bật/tắt, quốc hiệu, bảng màu
  await pick(page, NAMES[6]);
  await page.getByTestId('ct-bilingual').uncheck(); await audit(page, 'khoá học bỏ song ngữ');
  await page.getByTestId('ct-bilingual').check();
  await pick(page, NAMES[1]);
  await page.getByTestId('ct-quochieu').uncheck(); await audit(page, 'giấy khen bỏ quốc hiệu');
  await page.getByTestId('ct-palettes').locator('button').nth(6).click(); await audit(page, 'đổi màu');

  // danh sách 30 người → 30 tấm, số hiệu chạy
  const list = Array.from({ length: 30 }, (_, i) => `Học sinh Thu Hà ${i + 1} | 6A${(i % 5) + 1}`).join('\n');
  await page.getByTestId('ct-list').fill(list);
  await expect(page.getByTestId('ct-serial-info')).toContainText('HS-0030');
  await expect(page.getByTestId('ct-person').locator('option')).toHaveCount(30);
  await page.getByTestId('ct-person').selectOption('17');
  await expect(page.locator('[data-testid="ct-flat"] svg')).toContainText('Học sinh Thu Hà 18');
  await expect(page.locator('[data-testid="ct-flat"] svg')).toContainText('HS-0018');
  await audit(page, 'danh sách tấm 18');

  // logo + con dấu (ảnh tạo tại chỗ)
  const png = Buffer.from((await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d')!; x.fillStyle = '#C0141F'; x.beginPath(); x.arc(60, 60, 55, 0, Math.PI * 2); x.fill(); return c.toDataURL('image/png'); })).split(',')[1], 'base64');
  await page.getByTestId('ct-up-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await page.getByTestId('ct-up-seal').setInputFiles({ name: 'dau.png', mimeType: 'image/png', buffer: png });
  await expect.poll(() => page.locator('[data-testid="ct-flat"] svg image').count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // PDF: 3 người + ép kim = 4 trang
  await page.getByTestId('ct-list').fill('Trần Gia Khánh | 9A3\nPhạm Bảo Ngọc | 9A1 | Học sinh Xuất sắc / Năm học 2026 – 2027\nLê Quốc Bảo | 9A2');
  await page.getByTestId('ct-foil').check();
  const pdf = fs.readFileSync(await grab('ct-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(4);
  const pngFile = fs.readFileSync(await grab('ct-png'));
  expect(pngFile.readUInt32BE(16)).toBe(2400);

  // 3D
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(3000);
  const shot = await page.evaluate(() => (window as unknown as { __ctSnap: (w: number, h: number) => Promise<string> }).__ctSnap(1600, 1200));
  fs.writeFileSync(path.join(OUT, 'thanh-pham-3d.png'), Buffer.from(shot.split(',')[1], 'base64'));
  expect(shot.length).toBeGreaterThan(50_000);
  const p3 = fs.readFileSync(await grab('ct-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
