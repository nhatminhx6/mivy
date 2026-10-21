import { test, expect } from '@playwright/test';
import path from 'path';

// QC: bố cục SẢN PHẨM — kéo Phóng to / Dịch ảnh phải ĐỔI vị trí/kích thước sản phẩm.
// Upload ảnh thật, chụp before/after để kiểm bằng mắt + assert transform đổi.

const OUT = '/private/tmp/claude-502/-Users-minh-nn1-Projects-personal-mivy/9f30c701-411a-4e65-bac7-c4928ef4a15a/scratchpad';
const SAMPLE = path.resolve(__dirname, '../public/sample-products/04-sneaker.png');

const setRange = async (page: import('@playwright/test').Page, label: string, val: number) => {
  const ok = await page.evaluate(({ label, val }: { label: string; val: number }) => {
    const el = document.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null;
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { label, val });
  if (!ok) throw new Error(`Không thấy slider: ${label}`);
};

const productTransform = (page: import('@playwright/test').Page): Promise<string> =>
  page.evaluate(() => {
    const root = document.querySelector('[data-testid="ad-preview"]');
    const img = root?.querySelector('img') as HTMLElement | null;
    return img ? getComputedStyle(img).transform : 'none';
  });

test('Bố cục Sản phẩm — slider Phóng to/Dịch ĐỔI sản phẩm (có ảnh chụp)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/studio/marketing');
  await page.waitForSelector('[data-testid="ad-preview"]', { timeout: 30_000 });

  // Chọn skin "Sản phẩm · kem"
  await page.locator('button[title="Sản phẩm · kem"]').first().scrollIntoViewIfNeeded();
  await page.locator('button[title="Sản phẩm · kem"]').first().click();

  // Upload ảnh vào mục combo sản phẩm (không auto tách nền)
  await page.setInputFiles('input[aria-label="Thêm ảnh sản phẩm"]', SAMPLE);
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="ad-preview"] img');
    return !!img && (img as HTMLImageElement).complete;
  }, undefined, { timeout: 20_000 });
  await page.waitForTimeout(600);

  const preview = page.locator('[data-testid="ad-preview"]');
  await preview.screenshot({ path: `${OUT}/qc-product-before.png` });
  const t0 = await productTransform(page);

  // Phóng to 200% + dịch
  await setRange(page, 'Phóng to ảnh chính', 200);
  await setRange(page, 'Dịch ảnh chính ngang', 20);
  await setRange(page, 'Dịch ảnh chính dọc', 80);
  await page.waitForTimeout(600);
  await preview.screenshot({ path: `${OUT}/qc-product-after.png` });
  const t1 = await productTransform(page);

  console.log('product transform before/after:', JSON.stringify({ t0, t1 }));
  expect(t1, `transform sản phẩm phải đổi khi kéo slider (before=${t0})`).not.toBe(t0);
  expect(errors).toEqual([]);
});
