import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

// QC trụ "Ảnh & video sản phẩm" (/studio/image): 4 tab dùng chung bộ ảnh, đủ khổ, xuất ZIP/MP4 đúng,
// Người mẫu AI (giả lập Hugging Face — không tốn lượt GPU), tự lưu, điện thoại không tràn ngang, link cũ chuyển hướng.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'product-studio');
const SAMPLE = path.join(__dirname, '..', 'public', 'sample-products', '10-perfume.png');

// canvas có nội dung thật (không trắng/đen trơn)
async function canvasFilled(page: Page, selector: string) {
  return page.$$eval(selector, (cs) => (cs as HTMLCanvasElement[]).map((c) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
    return { w: c.width, h: c.height, colors: seen.size };
  }));
}
const jpegWH = (b: Uint8Array) => { for (let i = 2; i < b.length - 9; i++) if (b[i] === 0xff && (b[i + 1] === 0xc0 || b[i + 1] === 0xc2)) return [b[i + 7] * 256 + b[i + 8], b[i + 5] * 256 + b[i + 6]]; return [0, 0]; };
const pngWH = (b: Uint8Array) => { const d = new DataView(b.buffer, b.byteOffset); return [d.getUint32(16), d.getUint32(20)]; };
const imgWH = (b: Uint8Array) => (b[0] === 0x89 ? pngWH(b) : jpegWH(b));

async function openWithSamples(page: Page) {
  await page.goto('/studio/image');
  await page.evaluate(() => indexedDB.deleteDatabase('mivy'));
  await page.goto('/studio/image');
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click();
  await expect(page.getByTestId('shot-product').first()).toBeVisible();
}

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test('link cũ chuyển về đúng tab', async ({ page }) => {
  for (const [from, want] of [['/studio', '/studio/image'], ['/studio/product', 'tab=banner'], ['/studio/model', 'tab=model'], ['/studio/video', 'tab=video']]) {
    await page.goto(from); await expect(page).toHaveURL(new RegExp(want.replace('?', '\\?')));
  }
});

test('tab Nền studio: đủ 3 khổ, đổi nền thì ảnh đổi, ZIP đúng kích thước', async ({ page }) => {
  await openWithSamples(page);
  await page.waitForTimeout(1500);
  const cells = await canvasFilled(page, '[data-testid=shot-product] canvas');
  expect(cells.length).toBeGreaterThanOrEqual(3);
  for (const c of cells) expect(c.colors, 'canvas trống').toBeGreaterThan(20);
  // ảnh xem trước thu nhỏ nên làm tròn lệch chút → so với sai số 0,02
  const ratios = cells.slice(0, 3).map((c) => c.h / c.w).sort();
  [1, 1.25, 16 / 9].forEach((want, i) => expect(Math.abs(ratios[i] - want), `khổ thứ ${i + 1}`).toBeLessThan(0.02));
  const before = await page.locator('[data-testid=shot-product] canvas').first().evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.getByRole('button', { name: 'Sân khấu', exact: true }).click(); await page.waitForTimeout(600);
  const after = await page.locator('[data-testid=shot-product] canvas').first().evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  expect(after).not.toBe(before);
  await page.screenshot({ path: path.join(OUT, 'studio.png') });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải tất cả/ }).click()]);
  const files = unzipSync(new Uint8Array(fs.readFileSync(await dl.path())));
  const names = Object.keys(files).filter((n) => /\.(png|jpe?g)$/i.test(n));
  expect(names.length).toBeGreaterThanOrEqual(3);
  const sizes = new Set(names.map((n) => imgWH(files[n]).join('x')));
  for (const want of ['1080x1080', '1080x1350', '1080x1920']) expect(sizes, `thiếu khổ ${want}`).toContain(want);
});

test('tab Banner giá: vẽ được + ZIP cả bộ', async ({ page }) => {
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Banner giá').click();
  await expect(page.getByTestId('studio-product-strip')).toBeVisible();
  await page.waitForTimeout(1500);
  const cs = await canvasFilled(page, 'canvas');
  expect(cs.some((c) => c.colors > 20)).toBeTruthy();
  await page.screenshot({ path: path.join(OUT, 'banner.png') });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải cả bộ banner/ }).click()]);
  const files = unzipSync(new Uint8Array(fs.readFileSync(await dl.path())));
  expect(Object.keys(files).length).toBeGreaterThanOrEqual(3);
});

test('tab Video: xem trước chạy + xuất MP4', async ({ page }) => {
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Video').click();
  // máy đang bận (chạy kèm test khác) thì khung đầu vẽ chậm → chờ tới khi có hình thay vì chờ cứng
  await expect.poll(async () => (await canvasFilled(page, '[data-testid=video-preview] canvas'))[0]?.colors ?? 0, { timeout: 20_000 }).toBeGreaterThan(20);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId('video-export').click()]);
  const size = fs.statSync(await dl.path()).size;
  expect(size).toBeGreaterThan(200_000);
  await page.screenshot({ path: path.join(OUT, 'video.png') });
});

test('tab Người mẫu AI: chưa đăng nhập → mời đăng ký; có tiền → tạo ảnh trừ ví; hết tiền → nạp', async ({ page }) => {
  const png = fs.readFileSync(SAMPLE);
  let me: Record<string, unknown> | null = null;
  await page.route(/\/v1\/me$/, (r) => (me ? r.fulfill({ json: me }) : r.fulfill({ status: 401, json: { error: { code: 'unauthorized', message: 'x' } } })));
  await page.route(/\/v1\/tryon$/, (r) => r.fulfill({ body: png, contentType: 'image/png', headers: { 'X-Balance': '0' } }));
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Người mẫu AI').click();
  await expect(page.getByTestId('model-login')).toBeVisible();
  await expect(page.getByTestId('account-login')).toBeVisible();

  me = { id: 7, email: 'a@b.vn', name: '', balance: 2, is_admin: false, prices: { tryon: 2 } };
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Người mẫu AI').click();
  await expect(page.getByTestId('account-balance')).toContainText('2 đồng');
  await page.getByTestId('model-generate').click();
  await expect(page.locator('[data-testid=model-result] img')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('account-balance')).toContainText('0 đồng');
  await expect(page.getByTestId('model-paywall')).toBeVisible();
  await expect(page.getByTestId('model-generate')).toHaveCount(0);
  await page.screenshot({ path: path.join(OUT, 'model.png') });
});

test('tự lưu: tải lại trang vẫn còn ảnh + kiểu đã chọn', async ({ page }) => {
  await openWithSamples(page);
  await page.getByRole('button', { name: 'Đá cẩm thạch', exact: true }).click();
  await expect(page.getByTestId('studio-saved')).toBeVisible({ timeout: 15_000 });
  const n = await page.getByTestId('shot-product').count();
  await page.reload(); await page.waitForTimeout(2000);
  await expect(page.getByTestId('shot-product')).toHaveCount(n);
  await expect(page.getByRole('button', { name: 'Đá cẩm thạch', exact: true })).toHaveClass(/bg-white/);
});

test('tab Xoá vật thể: tô → AI xoá đúng vùng, ngoài vùng giữ nguyên, hoàn tác + dùng ảnh', async ({ page }) => {
  test.setTimeout(180_000);
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Xoá vật thể').click();
  await expect(page).toHaveURL(/tab=erase/);
  await expect(page.getByTestId('erase-status')).toBeHidden({ timeout: 120_000 }); // tải xong model
  const mask = page.getByTestId('erase-mask'); const box = (await mask.boundingBox())!;
  // tô 1 vệt ngang giữa ảnh (đè lên sản phẩm)
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, { steps: 12 }); await page.mouse.up();
  const read = () => page.getByTestId('erase-canvas').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const at = (fx: number, fy: number) => { const i = (Math.round(fy * c.height) * c.width + Math.round(fx * c.width)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    return { mid: [0.4, 0.5, 0.6].map((x) => at(x, 0.5)), far: [at(0.05, 0.05), at(0.95, 0.95), at(0.5, 0.1)] };
  });
  const before = await read();
  await page.getByTestId('erase-run').click();
  await expect(page.getByTestId('erase-apply')).toBeVisible({ timeout: 60_000 });
  const after = await read();
  const diff = (a: number[][], b: number[][]) => a.reduce((s, p, i) => s + Math.abs(p[0] - b[i][0]) + Math.abs(p[1] - b[i][1]) + Math.abs(p[2] - b[i][2]), 0);
  expect(diff(before.mid, after.mid), 'vùng tô phải đổi').toBeGreaterThan(30);
  expect(diff(before.far, after.far), 'ngoài vùng tô phải giữ nguyên').toBe(0);
  await page.screenshot({ path: path.join(OUT, 'erase.png') });
  await page.getByTestId('erase-undo').click();
  expect(diff(before.mid, (await read()).mid), 'hoàn tác về ảnh cũ').toBe(0);
  // chế độ bấm chọn vật (SAM): bấm 1 phát là khoanh được vùng để xoá
  await page.getByRole('button', { name: 'Chọn vật', exact: true }).click();
  await expect(page.getByTestId('erase-panel')).toHaveAttribute('data-sam', 'ready', { timeout: 120_000 });
  await mask.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
  await expect(page.getByTestId('erase-run')).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Tô', exact: true }).click();
  // xoá lại rồi dùng ảnh → về Nền studio
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 8 }); await page.mouse.up();
  await page.getByTestId('erase-run').click();
  await page.getByTestId('erase-apply').click();
  await expect(page).toHaveURL(/\/studio\/image$/);
});

test('Xoá vật thể → Tự tìm chữ: khoanh đúng dòng chữ, không dính chỗ trống, xoá được', async ({ page }) => {
  test.setTimeout(180_000);
  await openWithSamples(page);
  // ảnh thử: nền chuyển màu + 1 dòng chữ to ở trên + chữ Trung nhỏ ở dưới
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 600; const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 900, 600); g.addColorStop(0, '#e9d5c3'); g.addColorStop(1, '#9fb7c9'); x.fillStyle = g; x.fillRect(0, 0, 900, 600);
    x.fillStyle = '#7c3aed'; x.beginPath(); x.arc(450, 330, 120, 0, Math.PI * 2); x.fill();
    x.font = 'bold 56px Arial'; x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeText('SALE 50% SHOP', 60, 100); x.fillText('SALE 50% SHOP', 60, 100);
    x.font = '32px sans-serif'; x.fillStyle = '#d00'; x.fillText('淘宝 包邮 正品', 560, 560);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('shot-upload').setInputFiles({ name: 'chu-test.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await page.getByTestId('studio-tabs').getByText('Xoá vật thể').click();
  await page.getByTestId('studio-product-strip').getByTitle('chu-test').click();
  await expect(page.getByTestId('erase-status')).toBeHidden({ timeout: 120_000 });
  await page.getByTestId('erase-find-text').click();
  await expect(page.getByTestId('erase-run')).toBeEnabled({ timeout: 60_000 });
  const cover = await page.getByTestId('erase-mask').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const frac = (x0: number, y0: number, x1: number, y1: number) => { let a = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { n++; if (d[(y * c.width + x) * 4 + 3] > 20) a++; } return a / n; };
    return { big: frac(70, 60, 470, 100), small: frac(570, 535, 760, 560), circle: frac(400, 280, 500, 380), empty: frac(600, 150, 880, 250) };
  });
  console.log('độ phủ mask chữ', cover);
  expect(cover.big, 'dòng chữ to').toBeGreaterThan(0.6);
  expect(cover.small, 'chữ Trung nhỏ').toBeGreaterThan(0.4);
  expect(cover.circle, 'hình tròn không phải chữ').toBeLessThan(0.05);
  expect(cover.empty, 'chỗ trống').toBe(0);
  await page.getByTestId('erase-run').click();
  await expect(page.getByTestId('erase-apply')).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: path.join(OUT, 'erase-text.png') });
  // hàng loạt: 3 ảnh (2 mẫu + ảnh chữ) → ít nhất ảnh chữ được xoá, hoàn tác trả lại ảnh cũ
  const thumb = () => page.getByTestId('studio-product-strip').getByTitle('chu-test').locator('img').getAttribute('src');
  const t0 = await thumb();
  await page.getByTestId('erase-batch-run').click();
  await expect(page.getByTestId('erase-batch-msg')).toContainText(/Đã xoá chữ ở \d+ ảnh/, { timeout: 120_000 });
  expect(await thumb(), 'ảnh chữ đã đổi').not.toBe(t0);
  await page.getByTestId('erase-batch-msg').getByRole('button', { name: 'Hoàn tác' }).click();
  expect(await thumb(), 'hoàn tác về ảnh cũ').toBe(t0);
});

test('tab Đổi màu: ra đủ màu, nền giữ nguyên, thêm vào bộ ảnh + ZIP', async ({ page }) => {
  test.setTimeout(120_000);
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Đổi màu').click();
  await expect(page).toHaveURL(/tab=recolor/);
  await page.getByTestId('studio-product-strip').getByTitle('sneaker').click();
  await expect(page.getByTestId('recolor-variant')).toHaveCount(6, { timeout: 20_000 });
  await expect(page.getByTestId('recolor-main')).toBeVisible();
  // biến thể Đen tối hơn Trắng ở vùng sản phẩm; điểm nền (trong suốt) không đổi
  const stats = await page.getByTestId('recolor-variant').locator('canvas').evaluateAll((cs) => (cs as HTMLCanvasElement[]).map((c) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 200) { sum += d[i] + d[i + 1] + d[i + 2]; n++; }
    return { mean: sum / Math.max(1, n) / 3, corner: d[3] };
  }));
  console.log('độ sáng trung bình các màu', stats.map((x) => Math.round(x.mean)));
  const names = await page.getByTestId('recolor-variant').locator('span.truncate').allTextContents();
  const m = (nm: string) => stats[names.indexOf(nm)].mean;
  expect(m('Trắng') - m('Đen'), 'Trắng phải sáng hơn Đen rõ').toBeGreaterThan(40);
  await page.screenshot({ path: path.join(OUT, 'recolor.png') });
  const before = await page.getByTestId('studio-product-strip').locator('button[title]').count();
  await page.getByTestId('recolor-use-all').click();
  await expect(page.getByTestId('studio-product-strip').locator('button[title]')).toHaveCount(before + 6);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('recolor-zip').click()]);
  const z = unzipSync(new Uint8Array(fs.readFileSync(await dl.path())));
  expect(Object.keys(z).filter((f) => f.endsWith('.jpg'))).toHaveLength(6);
});

test('Nền studio: đóng logo shop (góc + lặp chéo) có trên ảnh xuất', async ({ page }) => {
  await openWithSamples(page);
  await page.getByTestId('shot-mark-on').check();
  // logo thử: ô vuông đỏ đặc
  const b64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 100; const x = c.getContext('2d')!; x.fillStyle = '#ff0000'; x.fillRect(0, 0, 200, 100); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('shot-mark-upload').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await page.getByTestId('shot-mark').getByRole('button', { name: 'Góc phải dưới' }).click();
  await page.waitForTimeout(1200);
  // canvas xem trước: góc phải dưới có màu đỏ logo, góc trái trên thì không
  const red = () => page.$$eval('[data-testid=shot-product] canvas, canvas[data-ready]', (cs) => {
    const c = cs[0] as HTMLCanvasElement; const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const frac = (fx0: number, fy0: number, fx1: number, fy1: number) => { let r = 0, n = 0; for (let y = Math.floor(fy0 * c.height); y < fy1 * c.height; y += 2) for (let x = Math.floor(fx0 * c.width); x < fx1 * c.width; x += 2) { const i = (y * c.width + x) * 4; n++; if (d[i] > 200 && d[i + 1] < 70 && d[i + 2] < 70) r++; } return r / n; };
    return { br: frac(0.7, 0.8, 1, 1), tl: frac(0, 0, 0.3, 0.2), mid: frac(0.3, 0.3, 0.7, 0.7) };
  });
  const a = await red();
  expect(a.br, 'logo góc phải dưới').toBeGreaterThan(0.05);
  expect(a.tl).toBe(0);
  await page.getByTestId('shot-mark').getByRole('button', { name: /Lặp chéo/ }).click();
  await page.getByTestId('shot-mark').locator('input[type=range]').fill('100');
  await page.waitForTimeout(1200);
  const b = await red();
  expect(b.tl, 'lặp chéo phủ cả góc trên').toBeGreaterThan(0.02);
  await page.screenshot({ path: path.join(OUT, 'shot-mark.png') });
});

test('tab Làm nét: phóng ×2 ra đúng kích thước, so trước/sau, dùng ảnh', async ({ page }) => {
  test.setTimeout(300_000);
  await openWithSamples(page);
  await page.getByTestId('studio-tabs').getByText('Làm nét').click();
  await expect(page).toHaveURL(/tab=sharpen/);
  await expect(page.getByTestId('upscale-status')).toBeHidden({ timeout: 60_000 });
  const [w, h] = (await page.getByTestId('upscale-size').textContent())!.match(/(\d+)×(\d+)/)!.slice(1).map(Number);
  await page.getByRole('button', { name: '×2', exact: true }).click();
  const t0 = Date.now();
  await page.getByTestId('upscale-run').click();
  await expect(page.getByTestId('upscale-apply')).toBeVisible({ timeout: 240_000 });
  console.log(`làm nét ${w}×${h} ×2: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const nat = await page.getByTestId('upscale-result').evaluate((im: HTMLImageElement) => [im.naturalWidth, im.naturalHeight]);
  expect(nat).toEqual([w * 2, h * 2]);
  await page.screenshot({ path: path.join(OUT, 'sharpen.png') });
  await page.getByTestId('upscale-apply').click();
  await expect(page).toHaveURL(/\/studio\/image$/);
});

test.describe('điện thoại 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('7 tab không tràn ngang, menu trượt mở được', async ({ page }) => {
    await openWithSamples(page);
    for (const t of ['Xoá vật thể', 'Làm nét', 'Đổi màu', 'Người mẫu AI', 'Banner giá', 'Video', 'Nền studio']) {
      await page.getByTestId('studio-tabs').getByText(t).click(); await page.waitForTimeout(1200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `tab ${t} tràn ngang`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(OUT, `mobile-${t.replace(/\s/g, '')}.png`) });
    }
    await page.getByTestId('studio-menu-btn').click();
    await expect(page.getByTestId('studio-sidebar')).toBeInViewport();
  });
});
