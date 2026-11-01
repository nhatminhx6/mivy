import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bìa & Avatar (/studio/brand-assets): mọi nền style × mọi khổ — ảnh nền tải được, canvas có vẽ, chụp lại để anh duyệt.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'brand-assets');
const TAG = process.env.SHOT_TAG || 'bia';
const KINDS = ['Bìa Facebook', 'Bìa Zalo OA', 'Bìa Shopee', 'Bìa YouTube', 'Avatar'];

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test('bìa & avatar: nền style tải được, canvas vẽ đủ mọi khổ', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/brand-assets');
  const scenes = page.getByTestId('cover-scenes').locator('button');
  await expect(scenes.first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  const n = await scenes.count();
  expect(n).toBeGreaterThanOrEqual(8);

  const canvas = page.locator('canvas').first();
  for (const k of KINDS) {
    await page.getByRole('button', { name: k, exact: true }).click();
    for (let i = 0; i < n; i++) {
      await scenes.nth(i).click(); await page.waitForTimeout(350);
      // ô trái-trên vùng chữ phải khác nền trơn: đếm số màu khác nhau trên toàn canvas
      const colors = await canvas.evaluate((c: HTMLCanvasElement) => {
        const x = c.getContext('2d')!; const d = x.getImageData(0, 0, c.width, c.height).data; const set = new Set<number>();
        for (let j = 0; j < d.length; j += 4 * 97) set.add((d[j] >> 4) << 8 | (d[j + 1] >> 4) << 4 | (d[j + 2] >> 4));
        return set.size;
      });
      expect(colors, `${k} cảnh ${i + 1}: canvas trơn — ảnh nền chưa vẽ`).toBeGreaterThan(60);
      await canvas.screenshot({ path: path.join(OUT, `${TAG}-${k.replace(/\s+/g, '-')}-${i + 1}.png`) });
    }
  }
  expect(errors).toEqual([]);
});
