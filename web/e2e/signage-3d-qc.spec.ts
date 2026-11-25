import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC 3D bảng hiệu: mọi loại bảng dựng được cảnh mặt tiền 3D (ngày + tối), ảnh 3D tải về đủ khổ, bảng thật nằm trong khung, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'signage-3d');

test('Bảng hiệu: 3D mặt tiền cho mọi loại, ngày/tối, tải ảnh 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/signage');
  await expect(page.getByTestId('sign-kind').first()).toBeVisible({ timeout: 90_000 });
  // mặc định mở tab 3D, bản thiết kế phẳng ẩn
  await expect(page.getByTestId('tab-3d')).toHaveAttribute('data-active', 'true');
  await expect(page.getByTestId('sign-preview')).toBeHidden();
  await page.waitForFunction(() => !!(window as unknown as { __sgSnap?: unknown }).__sgSnap, null, { timeout: 60_000 });

  const snap = async (name: string) => {
    await page.waitForTimeout(1500);
    const url = await page.evaluate(async () => (window as unknown as { __sgSnap: (w: number, h: number) => Promise<string> }).__sgSnap(1200, 900));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.readUInt32BE(16), `${name}: rộng ảnh`).toBe(1200);
    expect(buf.length, `${name}: ảnh 3D không trống`).toBeGreaterThan(60_000);
    fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
  };

  const kinds = await page.getByTestId('sign-kind').count();
  expect(kinds).toBeGreaterThanOrEqual(7);
  for (let k = 0; k < kinds; k++) {
    await page.getByTestId('sign-kind').nth(k).click();
    // vài mẫu mỗi loại (đổi hình dạng tấm: chữ nhật, tròn, vòm…)
    for (const ti of [0, 3]) {
      const tpl = page.getByTestId('sign-tpl').nth(ti);
      if (await tpl.count()) await tpl.click();
      await snap(`loai-${k}-mau-${ti}`);
    }
    // bật/tắt buổi tối
    await page.getByTestId('sign-night').click();
    await snap(`loai-${k}-doi-gio`);
    await page.getByTestId('sign-night').click();
  }
  // biển rộng ≥1,5m → mặt tiền quán (cửa cuốn + kính)
  await page.getByLabel('Rộng (cm)').fill('260');
  await snap('bien-quan-260cm');

  // tải ảnh 3D
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('sign-3d-png').click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p);
  expect(fs.readFileSync(p).readUInt32BE(16)).toBe(1600);

  // tab thiết kế phẳng vẫn hoạt động + file cắt vẫn tải được
  await page.getByTestId('tab-flat').click();
  await expect(page.getByTestId('sign-preview')).toBeVisible();
  const [cut] = await Promise.all([page.waitForEvent('download'), page.getByTestId('sign-cut').click()]);
  expect(cut.suggestedFilename()).toMatch(/\.svg$/);
  // đặt in được: có nút Gửi yêu cầu in
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
