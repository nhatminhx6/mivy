import { test, expect } from '@playwright/test';

/**
 * QC v2 — test 100% tính năng gen hình:
 *  - Poster: mọi ngành × full-photo/matrix × 14 template × MÙA × STICKER × VIỀN × 3 loại
 *  - Banner sản phẩm (khổ × nền), Bảng giá (style × khổ), Brand-assets (bìa × mẫu + wordmark), Vật phẩm
 * window.__audit() tự chấm:
 *  - canvas trống · chữ tràn mép (poster) · số lệch text
 *  - TRANG TRÍ (mùa/sticker) ĐÈ CTA/nội dung (dùng bounding-box renderer tự ghi) · box tràn khung
 */
test('QC v2 — mọi hình không lỗi', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/studio/qc');

  // Chờ render đủ canvas (poster + banner + bảng giá + brand + vật phẩm)
  await page.waitForFunction(() => document.querySelectorAll('canvas').length >= 150, undefined, { timeout: 60_000 });
  // Chờ ảnh nền + box capture xong
  await page.waitForFunction(() => ((window as unknown as { __qcAlign?: unknown[] }).__qcAlign?.length || 0) > 100, undefined, { timeout: 60_000 });
  await page.waitForTimeout(3000);

  const res = await page.evaluate(() => (window as unknown as { __audit: () => unknown }).__audit());
  console.log('QC audit:', JSON.stringify(res));

  expect(errors, 'không có lỗi JS khi render').toEqual([]);
  const out = res as { total: number; alignChecks: number; boxes: number; problems: unknown[] };
  expect(out.total).toBeGreaterThanOrEqual(150);
  expect(out.alignChecks).toBeGreaterThan(100);
  expect(out.boxes, 'phải có bounding-box để kiểm đè nhau').toBeGreaterThan(100);
  expect(out.problems, 'không hình nào lỗi (trống/tràn/đè/lệch)').toEqual([]);
});
