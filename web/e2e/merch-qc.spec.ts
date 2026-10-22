import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

// QC studio Vật phẩm (ảnh thật): đổi màu CHỈ trong vùng sản phẩm (nền giữ nguyên), logo không lem ra nền,
// sản phẩm tối tự in logo trắng, vị trí "ngực trái" đúng chỗ, cỡ logo co giãn, file in đúng khổ 300dpi, ZIP đủ.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'merch');
const pngWH = (b: Uint8Array) => { const d = new DataView(b.buffer, b.byteOffset); return [d.getUint32(16), d.getUint32(20)]; };

async function setKit(page: Page) {
  await page.goto('/studio/merch');
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 300;
    const x = c.getContext('2d')!;
    x.fillStyle = '#b91c1c'; x.beginPath(); x.arc(150, 150, 120, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111827'; x.font = 'bold 90px Arial'; x.fillText('CÔ BA', 290, 185);
    localStorage.setItem('mivy-brand-v1', JSON.stringify({ name: 'Bánh Mì Cô Ba', logo: c.toDataURL('image/png'), colorPrimary: '#3a0d0d', colorSecondary: '#7a1f1f', colorAccent: '#e23d28', colorInk: '#1a0e0e', colorSurface: '#fdf1ef', fontHeadingId: 'playfair', fontBodyId: 'be-vietnam', voice: 'than-thien', contact: {} }));
  });
  await page.reload();
  await expect(page.locator('[data-testid="merch-tile"][data-ready="1"]')).toHaveCount(6, { timeout: 60_000 });
}

// So canvas preview với ảnh gốc + mặt nạ: thống kê nền (ngoài mặt nạ) và vùng chênh lệch
async function analyze(page: Page, item: string) {
  await page.waitForTimeout(300);
  return page.evaluate(async (item) => {
    const cv = document.querySelector('[data-testid="merch-preview"]') as HTMLCanvasElement;
    const W = cv.width, H = cv.height;
    const load = async (src: string) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!; x.drawImage(im, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
    const photo = await load(`/mockups/${item}.jpg`), mask = await load(`/mockups/masks/${item}.png`);
    const cur = cv.getContext('2d')!.getImageData(0, 0, W, H).data;
    let bgN = 0, bgBad = 0, minX = W, minY = H, maxX = -1, maxY = -1, bright = 0, prodLum = 0, prodN = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x > W * 0.78 && y > H * 0.9) continue; // watermark
      const i = (y * W + x) * 4;
      const d = Math.abs(cur[i] - photo[i]) + Math.abs(cur[i + 1] - photo[i + 1]) + Math.abs(cur[i + 2] - photo[i + 2]);
      const L = (0.299 * cur[i] + 0.587 * cur[i + 1] + 0.114 * cur[i + 2]) / 255;
      if (mask[i + 3] < 5) { bgN++; if (d > 30) bgBad++; continue; }
      if (mask[i + 3] > 240) { prodLum += L; prodN++; if (L > 0.85) bright++; }
      if (d > 60) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    const k = 1080 / W;
    return { bgBadPct: (100 * bgBad) / bgN, prodLum: prodLum / prodN, brightPct: (100 * bright) / prodN, bbox: [minX * k, minY * k, maxX * k, maxY * k] };
  }, item);
}

async function texture(page: Page, item: string, [x0, y0, x1, y1]: number[]) {
  await page.waitForTimeout(300);
  return page.evaluate(async ({ item, r }) => {
    const cv = document.querySelector('[data-testid="merch-preview"]') as HTMLCanvasElement;
    const W = cv.width, H = cv.height, k = W / 1080;
    const load = async (src: string) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!; x.drawImage(im, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
    const photo = await load(`/mockups/${item}.jpg`), mask = await load(`/mockups/masks/${item}.png`);
    const cur = cv.getContext('2d')!.getImageData(0, 0, W, H).data;
    const a: number[] = [], b: number[] = [];
    for (let y = Math.round(r[1] * k); y < r[3] * k; y++) for (let x = Math.round(r[0] * k); x < r[2] * k; x++) {
      const i = (y * W + x) * 4; if (mask[i + 3] < 240) continue;
      a.push((0.299 * cur[i] + 0.587 * cur[i + 1] + 0.114 * cur[i + 2]) / 255); b.push((0.299 * photo[i] + 0.587 * photo[i + 1] + 0.114 * photo[i + 2]) / 255);
    }
    const sd = (v: number[]) => { const m = v.reduce((s, x) => s + x, 0) / v.length; return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length); };
    const sorted = [...a].sort((p, q) => p - q);
    return { ratio: sd(a) / Math.max(1e-6, sd(b)), maxLum: sorted[Math.floor(sorted.length * 0.995)], medLum: sorted[Math.floor(sorted.length / 2)] };
  }, { item, r: [x0, y0, x1, y1] });
}

test('Vật phẩm: đổi màu đúng vùng, logo không lem, mực tự đổi, vị trí/cỡ, file in, ZIP', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  await setKit(page);

  // Áo trắng, logo màu ở giữa ngực: chỉ chỗ in thay đổi, nằm trong vùng in
  let a = await analyze(page, 'tshirt');
  expect(a.bgBadPct, 'nền bị đổi').toBeLessThan(0.2);
  expect(a.bbox[0]).toBeGreaterThan(405); expect(a.bbox[2]).toBeLessThan(680);
  const cy = (a.bbox[1] + a.bbox[3]) / 2;
  expect(cy, 'logo áo phải ở tầm ngực, không xuống bụng').toBeGreaterThan(240); expect(cy).toBeLessThan(345);
  const wide = a.bbox[2] - a.bbox[0];

  // Ngực trái
  await page.getByRole('button', { name: 'Ngực trái', exact: true }).click();
  a = await analyze(page, 'tshirt');
  expect(a.bbox[0], 'ngực trái lệch').toBeGreaterThan(598); expect(a.bbox[2]).toBeLessThan(702); expect(a.bbox[3]).toBeLessThan(280);
  await page.getByRole('button', { name: 'Giữa ngực', exact: true }).click();

  // Cỡ 50% nhỏ hơn
  await page.getByTestId('merch-scale').fill('50');
  a = await analyze(page, 'tshirt');
  expect(a.bbox[2] - a.bbox[0], 'cỡ 50% phải nhỏ hơn').toBeLessThan(wide * 0.7);
  await page.getByTestId('merch-scale').fill('100');

  // Áo đen: nền giữ nguyên, áo tối, logo tự in TRẮNG
  await page.getByRole('button', { name: 'Màu Đen', exact: true }).click();
  a = await analyze(page, 'tshirt');
  expect(a.bgBadPct, 'đổi màu tràn ra nền').toBeLessThan(0.2);
  expect(a.prodLum, 'áo phải tối').toBeLessThan(0.3);
  expect(a.brightPct, 'logo trắng phải hiện trên áo đen').toBeGreaterThan(0.5);
  const folds = await texture(page, 'tshirt', [420, 620, 660, 860]);
  const neck = await page.evaluate(async () => {
    const cv = document.querySelector('[data-testid="merch-preview"]') as HTMLCanvasElement; const W = cv.width, H = cv.height, k = W / 1080;
    const im = new Image(); im.src = '/mockups/tshirt.jpg'; await im.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!; x.drawImage(im, 0, 0, W, H);
    const o = x.getImageData(0, 0, W, H).data, cur = cv.getContext('2d')!.getImageData(0, 0, W, H).data;
    let d = 0, n = 0;
    for (let y = 0; y < 50 * k; y++) for (let xx = Math.round(450 * k); xx < 630 * k; xx++) { const i = (y * W + xx) * 4; d += Math.abs(cur[i] - o[i]) + Math.abs(cur[i + 1] - o[i + 1]) + Math.abs(cur[i + 2] - o[i + 2]); n++; }
    return d / n;
  });
  expect(neck, 'cổ người mẫu bị tô màu áo').toBeLessThan(4);
  expect(folds.ratio, 'áo đen bị bệt, mất nếp vải').toBeGreaterThan(0.45);

  // Ly sứ, logo 130%: vẫn không lem ra nền
  await page.getByRole('button', { name: 'Chỉnh Ly sứ' }).click();
  a = await analyze(page, 'mug');
  expect(a.bbox[0], 'logo ly lấn sang quai/mép trái').toBeGreaterThan(385); expect(a.bbox[2], 'logo ly lấn mép phải').toBeLessThan(905);
  await page.getByRole('button', { name: 'Màu Navy', exact: true }).click();
  const glossy = await texture(page, 'mug', [560, 300, 900, 900]);
  expect(glossy.maxLum, 'ly navy mất vệt bóng men').toBeGreaterThan(0.7);
  expect(glossy.medLum).toBeLessThan(0.35);
  await page.getByTestId('merch-scale').fill('130');
  a = await analyze(page, 'mug');
  expect(a.bgBadPct, 'ly: logo/màu lem ra nền').toBeLessThan(0.2);

  // Phối màu vài món cho bộ ảnh duyệt
  for (const [item, color] of [['Nón', 'Đỏ đô'], ['Ly giữ nhiệt', 'Kem'], ['Túi tote', 'Kem']]) {
    await page.getByRole('button', { name: `Chỉnh ${item}` }).click();
    await page.getByRole('button', { name: `Màu ${color}`, exact: true }).click();
  }

  // Xem lớn
  await page.getByRole('button', { name: /^Xem lớn/ }).click();
  await expect(page.getByTestId('lightbox')).toBeVisible();
  await page.keyboard.press('Escape');

  // File in áo đen giữa ngực: 25cm @300dpi = 2953px, mực trắng
  await page.getByRole('button', { name: 'Chỉnh Áo thun' }).click();
  const [pf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /File in 300dpi/ }).click()]);
  expect(pf.suggestedFilename()).toMatch(/tshirt-giua-nguc-25cm-300dpi-muc-trang\.png$/);
  const pp = path.join(OUT, pf.suggestedFilename()); await pf.saveAs(pp);
  expect(pngWH(new Uint8Array(fs.readFileSync(pp)))[0]).toBe(2953);

  // ZIP: 6 mockup + 6 file in + hướng dẫn
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByRole('button', { name: /Tải trọn bộ/ }).click()]);
  const zp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(zp);
  const files = unzipSync(new Uint8Array(fs.readFileSync(zp)));
  const names = Object.keys(files);
  expect(names.filter((n) => n.startsWith('mockup/'))).toHaveLength(6);
  expect(names.filter((n) => n.startsWith('file-in/'))).toHaveLength(6);
  expect(names).toContain('huong-dan-in.txt');
  for (const n of names.filter((x) => x.startsWith('mockup/'))) {
    expect(pngWH(files[n]), n).toEqual([2160, 2160]);
    fs.writeFileSync(path.join(OUT, path.basename(n)), files[n]);
  }
  await page.getByTestId('merch-grid').screenshot({ path: path.join(OUT, 'merch-grid.png') });
});

test('Vật phẩm: chưa có logo — logo chữ tạm vẫn in được', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/studio/merch');
  await expect(page.getByText('Chưa có logo')).toBeVisible();
  await expect(page.locator('[data-testid="merch-tile"][data-ready="1"]')).toHaveCount(6, { timeout: 60_000 });
  const a = await analyze(page, 'tshirt');
  expect(a.bbox[2], 'logo chữ tạm phải được in').toBeGreaterThan(0);
});
