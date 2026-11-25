import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Catalogue nhiều trang: mọi mẫu × mọi trang — chữ nằm trong trang, không chồng nhau; số trang luôn bội 4;
// bình trang đóng ghim đúng thứ tự (8 trang: 8|1 2|7 6|3 4|5); đổi loại/thứ tự trang; ảnh sản phẩm; khổ A5/A4 ngang;
// PDF trang đơn = N trang, PDF bình trang = N/2 trang; PNG + ảnh 3D tải được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'booklet');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const bad: string[] = [];
    const svgs = [...document.querySelectorAll('[data-testid="bk-print"] svg[data-page]')] as SVGSVGElement[];
    for (const svg of svgs) {
      const vb = svg.viewBox.baseVal; const b = -vb.x; const W = vb.width - b * 2, H = vb.height - b * 2;
      const boxes = ([...svg.querySelectorAll('text')] as SVGTextElement[]).filter((t) => (t.textContent || '').trim()).map((t) => {
        const bb = t.getBBox();
        return { t: t.textContent!, x: bb.x, y: bb.y, w: bb.width, h: bb.height };
      });
      for (const q of boxes) {
        if (q.x < -1 || q.y < -1 || q.x + q.w > W + 1 || q.y + q.h > H + 1) bad.push(`p${svg.dataset.page} ngoài trang: "${q.t}"`);
      }
      // chồng chữ: so phần lõi (bỏ 22% trên/dưới của hộp chữ = khoảng dấu & phần thừa line box)
      const core = boxes.map((q) => ({ ...q, y: q.y + q.h * 0.22, h: q.h * 0.56 }));
      for (let i = 0; i < core.length; i++) for (let j = i + 1; j < core.length; j++) {
        const a = core[i], c = core[j];
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ox > 2 && oy > 2) bad.push(`p${svg.dataset.page} chồng chữ: "${a.t}" × "${c.t}"`);
      }
    }
    return { n: svgs.length, bad };
  });
  expect(r.bad, `${label}: ${r.bad.slice(0, 6).join(' | ')}`).toEqual([]);
  return r.n;
}

test('Catalogue: mọi mẫu, số trang, bình trang, khổ, ảnh, xuất file', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/booklet');
  const tpls = page.getByTestId('bk-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 }); // 3D dựng được

  // mọi mẫu (12 trang mặc định)
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(150);
    expect(await audit(page, `mẫu ${i}`)).toBe(12);
  }
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('bk-spread').screenshot({ path: path.join(OUT, 'spread-mau-cuoi.png') });

  // số trang: luôn bội 4, bình trang 8 trang đúng thứ tự đóng ghim
  for (const c of [8, 16, 24, 12]) {
    await page.getByTestId(`bk-count-${c}`).click();
    await expect(page.getByTestId('bk-page-row')).toHaveCount(c);
    expect(c % 4).toBe(0);
    expect(await audit(page, `${c} trang`)).toBe(c);
  }
  await page.getByTestId('bk-count-8').click();
  await expect(page.getByTestId('bk-imposition')).toHaveText('8|1 2|7 6|3 4|5');
  await page.getByTestId('bk-count-12').click();
  await expect(page.getByTestId('bk-imposition')).toHaveText('12|1 2|11 10|3 4|9 8|5 6|7');

  // đổi loại trang + sắp xếp
  const sel = page.getByTestId('bk-page-type');
  await sel.nth(0).selectOption('team');
  await expect(page.locator('[data-testid="bk-print"] svg[data-page="2"]')).toHaveAttribute('data-type', 'team');
  await page.getByTestId('bk-page-row').nth(1).getByRole('button', { name: 'Xuống' }).click();
  await expect(page.locator('[data-testid="bk-print"] svg[data-page="3"]')).toHaveAttribute('data-type', 'team');
  for (const t of ['grid2', 'grid6', 'prices', 'projects', 'contact', 'notes', 'featured', 'about']) {
    await sel.nth(3).selectOption(t);
    await expect(page.locator('[data-testid="bk-print"] svg[data-page="5"]')).toHaveAttribute('data-type', t);
  }
  await audit(page, 'đổi loại trang');

  // nội dung dài
  await page.getByTestId('bk-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NỘI THẤT AN KHANG HOME VIỆT NAM');
  await page.getByTestId('bk-coverTitle').fill('Bộ sưu tập nội thất gỗ tự nhiên cao cấp dành cho căn hộ hiện đại năm 2027');
  await page.getByTestId('bk-products').fill(Array.from({ length: 9 }, (_, i) =>
    `Sofa góc chữ L bọc vải nhung cao cấp phiên bản giới hạn số ${i + 1} | NT-${900 + i} | 123.456.000đ | Khung gỗ sồi tự nhiên sấy 8%, đệm mút D40 bọc lông vũ, vải nhung chống bám bụi, tháo giặt dễ dàng, bảo hành năm năm tại nhà`).join('\n'));
  await page.waitForTimeout(300);
  await audit(page, 'chữ dài');

  // ảnh sản phẩm (chỉ trên máy)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMAAAA0QAQXk1h0DAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('bk-photo-p0').setInputFiles({ name: 'sp.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="bk-print"] image').first()).toBeAttached({ timeout: 10_000 });

  // khổ khác
  for (const s of ['a5', 'a4l', 'a4']) {
    await page.getByTestId(`bk-size-${s}`).click();
    await page.waitForTimeout(200);
    await audit(page, `khổ ${s}`);
    if (s !== 'a4') await page.getByTestId('bk-spread').screenshot({ path: path.join(OUT, `spread-${s}.png`) });
  }

  // xuất file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pages = (p: string) => (fs.readFileSync(p, 'latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  const reader = await grab('bk-pdf-reader');
  expect(fs.readFileSync(reader, 'latin1').startsWith('%PDF')).toBe(true);
  expect(pages(reader)).toBe(12);
  const imposed = await grab('bk-pdf-imposed');
  expect(pages(imposed)).toBe(6);
  const spng = fs.readFileSync(await grab('bk-png'));
  expect(spng.readUInt32BE(16)).toBe(2400);
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  const p3d = fs.readFileSync(await grab('bk-3d-png'));
  expect(p3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
