import { test, expect } from '@playwright/test';

// QC: hoạ tiết trang trí dịp (vd sao kiểu "Rải") đổi được hình + màu, reset về màu dịp.

test('Trang trí dịp: đổi hình + màu hoạ tiết', async ({ page }) => {
  await page.goto('/studio/marketing');
  const preview = page.locator('[data-testid="ad-preview"]');
  await preview.waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: '🎨 Thiết kế & Trang trí' }).first().click();
  await page.locator('[data-testid="season-select"]').selectOption('tet');
  await page.locator('[data-testid="season-style"]').selectOption('scatter');
  const custom = page.locator('[data-testid="decor-custom"]');
  await expect(custom).toBeVisible();

  // mặc định Tết = hoa mai, màu đỏ dịp
  await expect.poll(() => preview.innerHTML()).toContain('#c81e1e');

  await custom.getByRole('button', { name: 'Sao', exact: true }).click();
  await expect.poll(() => preview.innerHTML()).toContain('M0 -46 L13 -14'); // path ngôi sao

  await page.locator('[data-testid="decor-c1"]').fill('#00aaff');
  await page.locator('[data-testid="decor-c2"]').fill('#112233');
  await expect.poll(() => preview.innerHTML()).toContain('#00aaff');
  expect(await preview.innerHTML()).toContain('#112233');
  expect(await preview.innerHTML()).not.toContain('#c81e1e');
  if (process.env.QC_OUT) await custom.locator('..').locator('..').screenshot({ path: `${process.env.QC_OUT}/decor-controls.png` });
  if (process.env.QC_OUT) await preview.screenshot({ path: `${process.env.QC_OUT}/decor-preview.png` });

  // reset màu → về màu dịp
  await custom.getByRole('button', { name: 'Màu theo dịp' }).click();
  await expect.poll(() => preview.innerHTML()).toContain('#c81e1e');
  expect(await preview.innerHTML()).not.toContain('#00aaff');
});
