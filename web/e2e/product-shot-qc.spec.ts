import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

// QC Ảnh sản phẩm chuẩn sàn: sản phẩm nằm đúng vùng an toàn từng khổ (TikTok né nút phải + khối dưới),
// cỡ co giãn, nền cảnh thật/bục, ảnh chưa tách nền vẫn chuẩn hoá được, tách nền khi bấm, vùng an toàn KHÔNG lọt vào
// ảnh xuất, ZIP chia thư mục theo sàn đúng kích thước.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'product-shot');
const jpgWH = (b: Buffer) => {
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return [0, 0];
};

// Hộp bao sản phẩm trên canvas xem trước (nền Xám + không bóng: nền chỉ đổi theo chiều dọc → so với pixel đầu hàng)
async function bbox(page: Page, nth: number) {
  await page.waitForTimeout(250);
  return page.locator('[data-testid="shot-cell"] canvas').nth(nth).evaluate((c: HTMLCanvasElement) => {
    const { width: W, height: H } = c;
    const d = c.getContext('2d')!.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      const r = (y * W) * 4;
      for (let x = 0; x < W; x++) {
        const i = r + x * 4;
        if (Math.abs(d[i] - d[r]) + Math.abs(d[i + 1] - d[r + 1]) + Math.abs(d[i + 2] - d[r + 2]) > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    return { l: x0 / W, t: y0 / H, r: x1 / W, b: y1 / H };
  });
}

test('Ảnh sản phẩm: vùng an toàn, cỡ, nền, tách nền, xuất', async ({ page }) => {
  test.setTimeout(400_000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.goto('/studio/image');
  await expect(page.getByText('Chưa có ảnh nào')).toBeVisible();
  await page.getByRole('button', { name: /Dùng ảnh mẫu/ }).click();
  await expect(page.getByTestId('shot-product')).toHaveCount(3);
  await expect(page.locator('[data-testid="shot-cell"] canvas[data-ready="1"]')).toHaveCount(9, { timeout: 30_000 });

  await page.getByRole('button', { name: 'Xám nhạt', exact: true }).click();
  await page.getByRole('button', { name: 'Không bóng', exact: true }).click();
  // ô 0..2 = sản phẩm 1 ở 1:1, 4:5, 9:16
  const sq = await bbox(page, 0), fb = await bbox(page, 1), tt = await bbox(page, 2);
  for (const [n, b] of [['1:1', sq], ['4:5', fb]] as const) {
    expect(b.l, `${n} lệch trái`).toBeGreaterThan(0.04); expect(b.r, `${n} lệch phải`).toBeLessThan(0.96);
    expect(b.t, `${n} sát trên`).toBeGreaterThan(0.04); expect(b.b, `${n} sát dưới`).toBeLessThan(0.96);
    expect(Math.max(b.r - b.l, b.b - b.t), `${n} sản phẩm quá nhỏ`).toBeGreaterThan(0.5);
  }
  expect(tt.r, 'TikTok: sản phẩm bị nút bên phải che').toBeLessThan(0.84);
  expect(tt.b, 'TikTok: sản phẩm lấn vùng chú thích/giỏ hàng').toBeLessThan(0.76);
  expect(tt.t).toBeGreaterThan(0.08);

  // cỡ sản phẩm
  const area = (b: { l: number; r: number; t: number; b: number }) => (b.r - b.l) * (b.b - b.t);
  await page.locator('input[type="range"]').fill('55');
  const small = area(await bbox(page, 0));
  await page.locator('input[type="range"]').fill('95');
  const big = area(await bbox(page, 0));
  expect(big, 'kéo cỡ không đổi').toBeGreaterThan(small * 1.6);
  await page.locator('input[type="range"]').fill('80');

  // nền cảnh thật + bục trưng bày vẽ được
  await page.getByRole('button', { name: 'Cảnh thật', exact: true }).click();
  await page.getByRole('button', { name: 'Ăn uống', exact: true }).click();
  await expect(page.locator('[data-testid="shot-cell"] canvas[data-ready="1"]')).toHaveCount(9, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Bục trưng bày', exact: true }).click();
  await page.getByRole('button', { name: 'Bóng mềm', exact: true }).click();

  // vùng an toàn TikTok chỉ hiện ở xem trước, KHÔNG lọt vào ảnh xuất
  await page.getByText(/Hiện vùng bị nút TikTok che/).click();
  const redPreview = await page.locator('[data-testid="shot-cell"] canvas').nth(2).evaluate((c: HTMLCanvasElement) => { const d = c.getContext('2d')!.getImageData(Math.round(c.width * 0.92), Math.round(c.height * 0.5), 1, 1).data; return d[0] - d[2]; });
  expect(redPreview, 'xem trước phải thấy vùng an toàn').toBeGreaterThan(20);
  const [dl9] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Tải .*TikTok · Reels/ }).first().click()]);
  const p9 = path.join(OUT, dl9.suggestedFilename()); await dl9.saveAs(p9);
  expect(jpgWH(fs.readFileSync(p9))).toEqual([1080, 1920]);
  const redExport = await page.evaluate(async (b64) => {
    const im = new Image(); im.src = `data:image/jpeg;base64,${b64}`; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d')!; x.drawImage(im, 0, 0);
    const d = x.getImageData(Math.round(im.width * 0.92), Math.round(im.height * 0.5), 1, 1).data; return d[0] - d[2];
  }, fs.readFileSync(p9).toString('base64'));
  expect(redExport, 'vùng an toàn bị lọt vào ảnh xuất').toBeLessThan(20);

  // ảnh CHƯA tách nền: vẫn chuẩn hoá khổ; bấm Tách nền → đã tách
  await page.getByTestId('shot-upload').setInputFiles(path.join(__dirname, '..', 'public', 'backgrounds', 'food', 'a.jpg'));
  await expect(page.getByTestId('shot-product')).toHaveCount(4);
  await expect(page.locator('[data-testid="shot-cell"] canvas[data-ready="1"]')).toHaveCount(12, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Tách nền', exact: true }).click();
  await expect(page.getByText('Đang tách…')).toBeVisible();
  await expect(page.getByText('Đã tách nền')).toHaveCount(4, { timeout: 240_000 });

  // ZIP: 4 ảnh × 3 khổ, chia thư mục theo sàn
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByRole('button', { name: /Tải tất cả/ }).click()]);
  const zp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(zp);
  const files = unzipSync(new Uint8Array(fs.readFileSync(zp)));
  const names = Object.keys(files);
  expect(names).toHaveLength(12);
  const want: Record<string, number[]> = { 'shopee-lazada-1x1/': [1080, 1080], 'facebook-instagram-4x5/': [1080, 1350], 'tiktok-story-9x16/': [1080, 1920] };
  for (const [folder, wh] of Object.entries(want)) {
    const inF = names.filter((n) => n.startsWith(folder));
    expect(inF, folder).toHaveLength(4);
    for (const n of inF) {
      expect(jpgWH(Buffer.from(files[n])), n).toEqual(wh);
      fs.writeFileSync(path.join(OUT, n.replace('/', '__')), files[n]);
    }
  }
});
