import { test, expect } from '@playwright/test';

// QC: 2 card editor marketing ("Chữ hiển thị trên ảnh", "Thiết kế & Trang trí") gập/mở được.

test('Card editor marketing gập/mở được', async ({ page }) => {
  await page.goto('/studio/marketing');
  await page.waitForSelector('[data-testid="ad-preview"]', { timeout: 30_000 });

  // Card "Chữ hiển thị trên ảnh" (tab Nội dung, mặc định)
  const field = page.getByText('Tiêu đề Poster', { exact: true });
  const textCard = page.getByRole('button', { name: /Chữ hiển thị trên ảnh/ });
  await expect(field).toBeVisible();
  await textCard.click();
  await expect(field).toBeHidden();
  await textCard.click();
  await expect(field).toBeVisible();

  // Card "Thiết kế & Trang trí": nút đầu là tab, nút sau là tiêu đề card gập
  await page.getByRole('button', { name: '🎨 Thiết kế & Trang trí' }).first().click();
  const hint = page.getByText('Gợi ý tiêu đề:', { exact: true });
  const designCard = page.getByRole('button', { name: '🎨 Thiết kế & Trang trí' }).nth(1);
  await expect(hint).toBeVisible();
  await designCard.click();
  await expect(hint).toBeHidden();
  await designCard.click();
  await expect(hint).toBeVisible();
});
