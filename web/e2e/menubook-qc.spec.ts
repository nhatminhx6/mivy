import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Menu dạng sổ: mọi phong cách × khổ × số cột — chữ nằm trong trang, không chồng nhau, không quá nhỏ;
// chia trang tự động (≤16, chẵn), báo tràn khi ép ít trang; ảnh món, logo; tải PDF ruột/bìa, PNG, SVG, 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'menubook');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const probs: string[] = [];
    const svgs = [...document.querySelectorAll('[data-testid="mb-hidden"] [data-role^="pg-"] svg')] as SVGSVGElement[];
    let minSize = Infinity, texts = 0;
    for (const svg of svgs) {
      const [W, H] = (svg.dataset.trim || '0x0').split('x').map(Number);
      const boxes: { x: number; y: number; w: number; h: number; t: string }[] = [];
      for (const t of [...svg.querySelectorAll('text')] as SVGTextElement[]) {
        if (!t.textContent?.trim()) continue;
        texts++;
        const b = t.getBBox();
        minSize = Math.min(minSize, parseFloat(t.getAttribute('font-size') || '99'));
        if (b.x < 0.6 || b.y < 0.6 || b.x + b.width > W - 0.6 || b.y + b.height > H - 0.6) probs.push(`p${svg.dataset.page} ra ngoài trang: "${t.textContent}"`);
        boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height, t: t.textContent || '' });
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
        const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ox > 0.5 && oy > 0.4 * Math.min(a.h, c.h)) probs.push(`p${svg.dataset.page} chồng chữ: "${a.t}" × "${c.t}"`);
      }
    }
    const info = document.querySelector('[data-testid="mb-info"]') as HTMLElement;
    return { probs, minSize, texts, pages: Number(info.dataset.pages), overflow: info.dataset.overflow, svgs: svgs.length };
  });
  expect(r.probs, `${label}: ${r.probs.slice(0, 5).join(' | ')}`).toEqual([]);
  expect(r.minSize, `${label}: chữ nhỏ nhất ${r.minSize}mm`).toBeGreaterThanOrEqual(1.6);
  expect(r.texts).toBeGreaterThan(20);
  expect(r.pages % 2, `${label}: số trang chẵn`).toBe(0);
  expect(r.pages).toBeLessThanOrEqual(16);
  expect(r.svgs).toBe(r.pages);
  return r;
}

const pdfPages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

test('Menu dạng sổ: mọi phong cách, chia trang, ảnh món, tải file', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/menubook');
  const tpls = page.getByTestId('mb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);

  // 1) mọi phong cách (A4 · 2 cột · song ngữ)
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    const r = await audit(page, `mẫu ${i}`);
    expect(r.overflow).toBe('0');
    await page.getByTestId('mb-view-spread').screenshot({ path: path.join(OUT, `mb-${i + 1}.png`) });
  }

  // 2) A5 · 1 cột · không song ngữ · bỏ trang mở đầu · giá 65.000đ
  await tpls.first().click();
  await page.getByTestId('mb-sizes').locator('button').nth(1).click();
  await page.getByTestId('mb-cols').locator('button').first().click();
  await page.getByTestId('mb-bilingual').uncheck();
  await page.getByTestId('mb-intro').uncheck();
  await page.getByTestId('mb-price-d').click();
  await audit(page, 'A5 1 cột');
  const hasVnd = await page.locator('[data-testid="mb-hidden"] text', { hasText: '65.000đ' }).count();
  expect(hasVnd).toBeGreaterThan(0);
  await page.getByTestId('mb-sizes').locator('button').nth(2).click(); // 24×32
  await audit(page, '24x32 1 cột');
  await page.getByTestId('mb-cols').locator('button').nth(1).click();
  await page.getByTestId('mb-bilingual').check();
  await page.getByTestId('mb-intro').check();
  await page.getByTestId('mb-price-k').click();
  await page.getByTestId('mb-sizes').locator('button').first().click();

  // 3) thực đơn dài: tự tăng trang (≤16); ép 4 trang → báo tràn
  const long = ['## Món nướng | Grill', ...Array.from({ length: 40 }, (_, i) => `Món nướng đặc sắc số ${i + 1} với tên khá dài để xuống dòng | ${59 + i}k | Ướp sả ớt, nướng than hoa, ăn kèm rau sống và nước chấm nhà làm | Grilled dish ${i + 1} | ${i % 3 === 0 ? 'cay' : i % 3 === 1 ? 'chay best' : ''}`),
    '## Đồ uống | Drinks', ...Array.from({ length: 20 }, (_, i) => `Nước ép trái cây ${i + 1} | ${25 + i}k | Ép tươi mỗi ngày | Fresh juice ${i + 1}`)].join('\n');
  await page.getByTestId('mb-menu').fill(long);
  const rl = await audit(page, 'thực đơn dài');
  expect(rl.pages).toBeGreaterThan(4);
  await page.getByTestId('mb-pages-4').click();
  await expect(page.getByTestId('mb-overflow')).toBeVisible();
  await page.getByTestId('mb-pages-auto').click();
  await expect(page.getByTestId('mb-overflow')).toHaveCount(0);

  // nạp lại trang → thực đơn mẫu (có món đặc biệt)
  await page.reload();
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  await tpls.nth(2).click();

  // 4) ảnh món đặc biệt + logo (ảnh tạo bằng canvas)
  const png = Buffer.from((await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 240;
    const x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 320, 240); g.addColorStop(0, '#c0392b'); g.addColorStop(1, '#f1c40f');
    x.fillStyle = g; x.fillRect(0, 0, 320, 240); x.fillStyle = '#fff'; x.beginPath(); x.arc(160, 120, 70, 0, 7); x.fill();
    return c.toDataURL('image/png');
  })).split(',')[1], 'base64');
  const photoIn = page.getByTestId('mb-photo-input');
  if (await photoIn.count()) {
    await photoIn.first().setInputFiles({ name: 'mon.png', mimeType: 'image/png', buffer: png });
    await expect(page.locator('[data-testid="mb-hidden"] [data-feat] image')).not.toHaveCount(0, { timeout: 10_000 });
  }
  await page.getByTestId('mb-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="mb-hidden"] [data-role="view-front"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'có ảnh + logo');
  await page.getByTestId('mb-view-spread').screenshot({ path: path.join(OUT, 'mb-anh-mon.png') });

  // 5) tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return fs.readFileSync(p);
  };
  const pages = Number(await page.getByTestId('mb-info').getAttribute('data-pages'));
  const inner = await grab('mb-pdf-inner');
  expect(inner.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdfPages(inner)).toBe(pages);
  await page.getByTestId('mb-cover-leather').click();
  const coverL = await grab('mb-pdf-cover');
  expect(pdfPages(coverL), 'bìa da: bản xem + khuôn ép').toBe(2);
  const svgL = (await grab('mb-svg')).toString('utf8');
  expect(svgL).not.toContain('<text');
  await page.getByTestId('mb-cover-hard').click();
  const coverH = await grab('mb-pdf-cover');
  expect(pdfPages(coverH), 'bìa cứng: trước + sau').toBe(2);
  const spread = await grab('mb-png');
  expect(spread.readUInt32BE(16)).toBeGreaterThan(1500);

  // 6) 3D: chụp góc mặc định cho cả 3 loại bìa + tải ảnh 3D
  await page.getByTestId('tab-3d').click();
  for (const c of ['hard', 'pvc', 'leather']) {
    await page.getByTestId(`mb-cover-${c}`).click();
    await page.waitForTimeout(600);
    const url = await page.evaluate(async () => (window as unknown as { __mbSnap: (w: number, h: number) => Promise<string> }).__mbSnap(1200, 900));
    expect(url.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `mb-3d-${c}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const shot = await grab('mb-3d');
  expect(shot.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
