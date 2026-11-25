import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Photobook · kỷ yếu: mọi mẫu tự dàn đúng số trang đôi, chữ nằm trong trang (không vắt qua gáy), không đè nhau,
// tải ảnh lên → tự dàn + cảnh báo dpi, kỷ yếu đủ chân dung theo danh sách, đổi bố cục/chú thích từng trang,
// PDF = bìa + từng trang đôi, PNG + ảnh 3D tải được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'photobook');
fs.mkdirSync(OUT, { recursive: true });

async function jpegs(page: Page, list: [number, number][]): Promise<{ name: string; mimeType: string; buffer: Buffer }[]> {
  const b64s = await page.evaluate((list) => list.map(([w, h], i) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${i * 47},55%,55%)`); g.addColorStop(1, `hsl(${i * 47 + 90},45%,75%)`);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(w * 0.5, h * 0.45, Math.min(w, h) * 0.22, 0, 7); x.fill();
    return c.toDataURL('image/jpeg', 0.88).split(',')[1];
  }), list);
  return b64s.map((b, i) => ({ name: `anh-${String(i + 1).padStart(2, '0')}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(b, 'base64') }));
}

// chữ trong mọi trang đôi + bìa ở dải trang: nằm trong khổ, không vắt qua gáy, không đè nhau, không quá nhỏ
async function auditText(page: Page, label: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('[data-testid="pb-strip"] svg').forEach((svg, si) => {
      const vb = (svg as SVGSVGElement).viewBox.baseVal;
      const isSpread = svg.hasAttribute('data-pb-spread');
      const W = vb.width / 2;
      const boxes: { b: DOMRect; t: string }[] = [];
      svg.querySelectorAll('text').forEach((t) => {
        if (t.getAttribute('data-pb') === 'spine') return; // chữ xoay (gáy) — getBBox không tính transform
        const b = (t as SVGTextElement).getBBox();
        if (!b.width) return;
        const txt = (t.textContent || '').slice(0, 30);
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`svg${si} lòi khổ: ${txt}`);
        if (isSpread && b.x < W - 0.5 && b.x + b.width > W + 0.5) out.push(`svg${si} vắt qua gáy: ${txt}`);
        if (fs < 2) out.push(`svg${si} chữ quá nhỏ ${fs.toFixed(2)}mm: ${txt}`);
        boxes.push({ b, t: txt });
      });
      // đè nhau: so hộp đã co 22% theo chiều cao (hộp chữ có khoảng trống dòng)
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b, c = boxes[j].b;
        const ah = a.height * 0.22, ch = c.height * 0.22;
        if (a.x < c.x + c.width - 0.3 && c.x < a.x + a.width - 0.3 && a.y + ah < c.y + c.height - ch && c.y + ch < a.y + a.height - ah) out.push(`svg${si} đè: "${boxes[i].t}" × "${boxes[j].t}"`);
      }
    });
    return out;
  });
  expect(bad, `${label}: ${bad.slice(0, 6).join(' | ')}`).toEqual([]);
}

test('Photobook · kỷ yếu: mẫu, tự dàn, ảnh, kỷ yếu, chỉnh trang, PDF + 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/photobook');
  const tpls = page.getByTestId('pb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);

  // 1) mọi mẫu × 2 khổ (vuông + A4 ngang): đúng số trang đôi, chữ sạch
  for (const size of ['25×25', 'A4 ngang']) {
    await page.getByTestId('pb-sizes').getByRole('button', { name: new RegExp(size) }).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(250);
      await expect(page.getByTestId('pb-sel')).toHaveCount(12); // 24 trang = 12 trang đôi
      await auditText(page, `mẫu ${i} · ${size}`);
      if (size === '25×25') await page.getByTestId('pb-strip').screenshot({ path: path.join(OUT, `strip-${String(i).padStart(2, '0')}.png`) });
    }
  }
  await page.getByTestId('pb-sizes').getByRole('button', { name: /25×25/ }).click();

  // 2) kỷ yếu: đủ chân dung theo danh sách (22 mẫu → 30 người)
  await tpls.nth(6).click();
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid="pb-strip"] [data-pb="sname"]')).toHaveCount(22);
  const many = Array.from({ length: 30 }, (_, i) => `Học sinh số ${i + 1} Nguyễn Văn Thành Đạt | Câu nói kỷ niệm thật dài của bạn số ${i + 1} để thử xuống dòng`).join('\n');
  await page.getByTestId('pb-field-students').fill(many);
  await page.waitForTimeout(400);
  await expect(page.locator('[data-testid="pb-strip"] [data-pb="sname"]')).toHaveCount(30);
  await auditText(page, 'kỷ yếu 30 người, tên dài');
  await page.getByTestId('pb-portrait-files').setInputFiles(await jpegs(page, Array.from({ length: 30 }, () => [600, 750] as [number, number])));
  await expect(page.locator('[data-testid="pb-strip"] image')).not.toHaveCount(0);

  // 3) tải ảnh: thay ảnh mẫu, tự dàn, cảnh báo ảnh nhỏ
  await tpls.nth(0).click();
  await page.getByTestId('pb-files').setInputFiles(await jpegs(page, [[3000, 2000], [2400, 3200], [3000, 2000], [2000, 2000], [3200, 2100], [2600, 1800], [3000, 2000], [320, 220]]));
  await expect(page.getByTestId('pb-photo')).toHaveCount(8, { timeout: 30_000 });
  await expect(page.getByTestId('pb-dpi')).toHaveCount(8);
  await expect(page.getByTestId('pb-dpi-warn')).toBeVisible();
  await auditText(page, 'ảnh khách');

  // 4) chỉnh 1 trang đôi: bố cục + đổi ảnh + chú thích; dài chữ
  await page.getByTestId('pb-sel').nth(2).click();
  await page.getByTestId('pb-layouts').getByRole('button', { name: /6 ảnh/ }).click();
  await expect(page.getByTestId('pb-where')).toContainText('6 ảnh');
  await page.getByTestId('pb-swap').click();
  await page.getByTestId('pb-caption').fill('Chuyến đi đáng nhớ nhất của cả nhà mình mùa hè năm ấy ở biển Quy Nhơn đầy nắng gió');
  await page.getByTestId('pb-field-title').fill('Những năm tháng tuyệt vời nhất của chúng ta bên nhau');
  await page.getByTestId('pb-field-intro').fill('Một đoạn mở đầu rất dài '.repeat(40));
  await page.waitForTimeout(400);
  await auditText(page, 'chữ dài');
  await page.getByTestId('pb-face').screenshot({ path: path.join(OUT, 'trang-sua.png') });

  // 5) 40 trang → 20 trang đôi; về 20 trang để xuất PDF nhanh
  await page.getByTestId('pb-pages').getByRole('button', { name: '40 trang' }).click();
  await expect(page.getByTestId('pb-sel')).toHaveCount(20);
  await page.getByTestId('pb-pages').getByRole('button', { name: '20 trang' }).click();
  await expect(page.getByTestId('pb-sel')).toHaveCount(10);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 240_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(11); // bìa + 10 trang đôi
  const png = fs.readFileSync(await grab('pb-png'));
  expect(png.readUInt32BE(16)).toBe(2400);

  // 6) 3D
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  const shot = fs.readFileSync(await grab('pb-shot'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  expect(errors).toEqual([]);
});
