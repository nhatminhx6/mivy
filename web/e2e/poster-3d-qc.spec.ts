import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC 3D poster ở /studio/marketing: tab 3D dựng được mọi cảnh × khổ, tải ảnh 3D đúng kích thước,
// bản thiết kế phẳng vẫn hiện khi quay lại tab, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'poster-3d');

test('Poster 3D: khung / băng keo / giá đứng × mọi khổ', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/marketing');
  await expect(page.getByTestId('tab-3d')).toBeVisible({ timeout: 90_000 });
  // mặc định là bản thiết kế phẳng (sản phẩm chính là ảnh đăng mạng)
  await expect(page.getByTestId('ad-preview')).toBeVisible();
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('poster-3d')).toBeVisible();
  await expect(page.locator('[data-testid="poster-3d"] canvas')).toHaveCount(1, { timeout: 60_000 });

  // 4:5 chạy đủ 3 cảnh; các khổ khác 1 cảnh tiêu biểu (giữ thời gian chạy hợp lý)
  const plan: [string, string[]][] = [['Dọc 4:5', ['frame', 'tape', 'stand']], ['Vuông 1:1', ['tape']], ['Story 9:16', ['stand']], ['Ngang 16:9', ['frame']]];
  for (const [size, scenes] of plan) {
    await page.getByRole('button', { name: size, exact: true }).click();
    for (const scene of scenes) {
      await page.getByTestId(`poster-scene-${scene}`).click();
      if (scene === 'frame') await page.getByTestId('poster-frame-oak').click();
      await page.waitForTimeout(1500);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('poster-3d-png').click()]);
      const p = path.join(OUT, `poster-${scene}-${size.replace(/[^a-z0-9]/gi, '')}.png`);
      await dl.saveAs(p);
      const buf = fs.readFileSync(p);
      expect(buf.readUInt32BE(16), `${scene} ${size}: rộng ảnh 3D`).toBe(1600);
      expect(buf.readUInt32BE(20), `${scene} ${size}: cao ảnh 3D`).toBe(size === 'Ngang 16:9' ? 1200 : 2000);
      expect(buf.length, `${scene} ${size}: ảnh 3D không rỗng`).toBeGreaterThan(80_000);
    }
  }
  // quay lại bản thiết kế phẳng: preview HTML hiện lại, tải PNG vẫn chạy
  await page.getByTestId('tab-flat').click();
  await expect(page.getByTestId('ad-preview')).toBeVisible();
  const [png] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: /Tải ảnh PNG/ }).click()]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  // Gửi yêu cầu in: có nút, mở hộp không lỗi; file in là PDF đúng khổ + ảnh xem trước 3D
  const pr = page.getByTestId('print-request');
  await expect(pr).toBeVisible();
  await pr.click();
  await expect(page.getByTestId('print-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  const files = await page.evaluate(() => (window as unknown as { __posterPrint: () => Promise<{ fileType: string; fileSize: number; fileName: string; previewType: string; previewSize: number; head: string }> }).__posterPrint());
  expect(files.head).toBe('%PDF-');
  expect(files.fileSize).toBeGreaterThan(100_000);
  expect(files.fileName).toMatch(/cm\.pdf$/);
  expect(files.previewType).toBe('image/jpeg');
  expect(files.previewSize).toBeGreaterThan(20_000);
  expect(errors).toEqual([]);
});
