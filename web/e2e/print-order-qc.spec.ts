import { test, expect } from '@playwright/test';

// QC luồng đặt in (cần backend chạy ở :8000 với ADMIN_EMAILS=boss@mivy.vn, DB thử):
// khách chưa đăng nhập bấm "Gửi yêu cầu in" → tạo tài khoản ngay trong hộp (thiết kế giữ nguyên) → gửi đơn
// → "Đơn in của tôi" thấy đơn → admin báo giá + cọc → khách thấy trạng thái + hướng dẫn cọc.
const stamp = Date.now();

test('đặt in thiệp: đăng ký trong hộp → gửi đơn → admin báo giá → khách thấy cọc', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const health = await page.request.get('/v1/me').catch(() => null);
  test.skip(!health || health.status() >= 500, 'Backend :8000 chưa chạy');

  await page.goto('/studio/cards');
  await expect(page.getByTestId('card-tpl')).toHaveCount(28, { timeout: 60_000 });
  await page.getByTestId('card-groom').fill('Hoàng Long');
  await page.getByTestId('print-request').click();
  // chưa đăng nhập → tạo tài khoản ngay trong hộp
  await expect(page.getByTestId('print-auth')).toBeVisible();
  await page.getByTestId('auth-name').fill('Thu Hà');
  await page.getByTestId('auth-phone').fill('0909 123 456');
  await page.getByTestId('auth-email').fill(`ha${stamp}@gmail.com`);
  await page.getByTestId('auth-password').fill('matkhau1');
  await page.getByTestId('auth-submit').click();
  // form đặt in tự điền tên + SĐT từ tài khoản
  await expect(page.getByTestId('print-phone')).toHaveValue('0909123456', { timeout: 15_000 });
  await expect(page.getByTestId('print-name')).toHaveValue('Thu Hà');
  await page.getByTestId('print-qty').fill('300');
  await page.getByTestId('print-address').fill('12 Lũy Bán Bích, Q. Tân Phú');
  await page.getByTestId('print-submit').click();
  await expect(page.getByTestId('print-done')).toBeVisible({ timeout: 60_000 });
  const code = (await page.getByTestId('print-code').innerText()).trim();
  expect(code).toMatch(/^IN\d{5}$/);
  // thiết kế vẫn còn sau khi đăng ký + gửi
  await page.getByRole('button', { name: 'Tiếp tục thiết kế' }).click();
  await expect(page.getByTestId('card-groom')).toHaveValue('Hoàng Long');

  await page.goto('/studio/orders');
  const card = page.getByTestId('order-card').filter({ hasText: code });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('order-status')).toHaveText('Mới gửi');
  await expect(card).toContainText('300 cái');
  const preview = await card.locator('img').first().evaluate((im: HTMLImageElement) => im.decode().then(() => im.naturalWidth).catch(() => 0));
  expect(preview).toBeGreaterThan(100);
  const file = await page.request.get(await card.getByRole('link', { name: /Tải file in/ }).getAttribute('href') || '');
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe('%PDF-');

  // admin (phiên riêng) báo giá + cọc
  const admin = await browser.newPage();
  const reg = await admin.request.post('/v1/auth/register', { data: { email: 'boss@mivy.vn', password: 'matkhau1' } });
  if (reg.status() !== 200) await admin.request.post('/v1/auth/login', { data: { email: 'boss@mivy.vn', password: 'matkhau1' } });
  await admin.goto('/studio/admin');
  const row = admin.getByTestId('admin-order').filter({ hasText: code });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row).toContainText('0909123456');
  await row.getByTestId('admin-order-status').selectOption('quoted');
  await row.getByTestId('admin-order-price').fill('900000');
  await row.getByRole('button', { name: '50%' }).click();
  await expect(row.getByTestId('admin-order-deposit')).toHaveValue('450000');
  await row.getByTestId('admin-order-save').click();
  await expect(row).toContainText('Đã lưu');
  await admin.getByTestId('admin-tab-customers').click();
  const cust = admin.getByTestId('admin-customer').filter({ hasText: `ha${stamp}@gmail.com` });
  await expect(cust).toContainText('1 đơn');
  await expect(cust).toContainText('900.000đ');
  await admin.close();

  await page.reload();
  const c2 = page.getByTestId('order-card').filter({ hasText: code });
  await expect(c2.getByTestId('order-status')).toHaveText('Đã báo giá');
  await expect(c2.getByTestId('order-deposit')).toContainText('450.000đ');
  await expect(c2.getByTestId('order-deposit')).toContainText(code);
});

test('đặt in sticker khi đã đăng nhập: gửi kèm file cắt SVG', async ({ page }) => {
  test.setTimeout(120_000);
  const r = await page.request.post('/v1/auth/register', { data: { email: `st${stamp}@gmail.com`, password: 'matkhau1', phone: '0911222333' } });
  test.skip(r.status() >= 500, 'Backend :8000 chưa chạy');
  await page.goto('/studio/sticker');
  await expect(page.locator('[data-testid="cut-preview"][data-ready="1"]')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('print-request').click();
  await expect(page.getByTestId('print-phone')).toHaveValue('0911222333');
  await page.getByTestId('print-name').fill('Shop Bánh Nhà Na');
  await page.getByTestId('print-submit').click();
  await expect(page.getByTestId('print-done')).toBeVisible({ timeout: 60_000 });
  const mine = await (await page.request.get('/v1/me/print-orders')).json();
  expect(mine[0].product).toBe('sticker');
  expect(mine[0].file_name).toMatch(/file-cat\.svg$/);
  const svg = await (await page.request.get(`/v1/print-orders/${mine[0].id}/file`)).text();
  expect(svg).toContain('id="CutContour"');
});
