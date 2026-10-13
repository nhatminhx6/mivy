import { test, expect } from '@playwright/test';

/**
 * QC poster: render MỌI tổ hợp (12 ngành × full-photo/matrix + 14 template, × 3 loại)
 * rồi gọi window.__audit() — tự chấm: canvas trống, chữ tràn mép, SỐ LỆCH TEXT.
 * Toạ độ số/text do renderer tự ghi vào window.__qcAlign nên kiểm chính xác, không đoán pixel.
 */
test('Tất cả poster không lỗi layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/studio/qc');

  // Chờ render đủ canvas
  await page.waitForFunction(() => document.querySelectorAll('canvas').length >= 100, undefined, { timeout: 45_000 });
  // Chờ ảnh nền tải + vẽ xong (đủ phép kiểm số-thẳng-text)
  await page.waitForFunction(() => ((window as unknown as { __qcAlign?: unknown[] }).__qcAlign?.length || 0) > 100, undefined, { timeout: 45_000 });
  await page.waitForTimeout(1500);

  const res = await page.evaluate(() => (window as unknown as { __audit: () => unknown }).__audit());
  console.log('QC audit:', JSON.stringify(res));

  expect(errors, 'không có lỗi JS khi render').toEqual([]);
  const out = res as { total: number; alignChecks: number; problems: unknown[] };
  expect(out.total).toBeGreaterThanOrEqual(100);
  expect(out.alignChecks).toBeGreaterThan(100);
  expect(out.problems, 'không có poster nào lỗi layout').toEqual([]);
});
