import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC trang Tạo CV: 10 bố cục × màu (kể cả màu tự chọn) vẽ đủ, chữ không lòi khỏi tờ A4, nội dung dài tự thu nhỏ, ảnh đại diện, tải PDF + PNG.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cv');

// phần tử có chữ lòi ra ngoài tờ (ngang/dọc) trong bản đúng cỡ
async function clipped(page: Page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('[aria-hidden] [data-cv-sheet]') as HTMLElement;
    const r = sheet.getBoundingClientRect(); const bad: string[] = [];
    sheet.querySelectorAll('div,span,li').forEach((el) => {
      if (!el.childNodes.length || !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())) return;
      const b = el.getBoundingClientRect();
      if (b.width && (b.right > r.right + 1 || b.left < r.left - 1 || b.bottom > r.bottom + 1)) bad.push((el.textContent || '').slice(0, 40));
    });
    return bad;
  });
}

test('Tạo CV: 10 bố cục sạch, đổi màu, nội dung dài, ảnh, tải PDF/PNG', async ({ page }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/cv');
  await page.evaluate(() => localStorage.removeItem('mivy-cv-v1'));
  await page.reload();
  const tpls = page.getByTestId('cv-tpl');
  await expect(tpls).toHaveCount(10, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);

  for (let i = 0; i < 10; i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    expect(await clipped(page), `mẫu ${i + 1}: chữ lòi khỏi tờ`).toEqual([]);
    await expect(page.getByTestId('cv-overflow')).toHaveCount(0);
    await page.getByTestId('cv-preview').screenshot({ path: path.join(OUT, `cv-${i + 1}.png`) });
  }
  await page.locator('[data-testid="cv-tpl"]').first().locator('..').screenshot({ path: path.join(OUT, 'cv-grid.png') }).catch(() => null);

  // tên dài + nhiều kinh nghiệm → tự thu chữ, không lòi
  await page.getByTestId('cv-name').fill('Nguyễn Trần Hoàng Gia Khánh');
  for (let k = 0; k < 2; k++) await page.getByTestId('cv-add-job').click();
  const jobs = page.getByTestId('cv-job');
  for (let k = 2; k < 4; k++) {
    await jobs.nth(k).locator('input').nth(0).fill('Trưởng nhóm Thương mại điện tử');
    await jobs.nth(k).locator('input').nth(1).fill('Công ty Cổ phần Bán lẻ Phương Nam');
    await jobs.nth(k).locator('input').nth(2).fill('01/2019 – 05/2021');
    await jobs.nth(k).locator('textarea').fill('Quản lý gian hàng Shopee, Lazada doanh thu 2 tỷ/tháng\nXây quy trình xử lý đơn, giảm 40% đơn trễ\nĐào tạo 6 nhân viên mới');
  }
  for (let i = 0; i < 10; i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    expect(await clipped(page), `mẫu ${i + 1} nội dung dài: chữ lòi`).toEqual([]);
  }
  // đổi màu: bảng màu có sẵn + màu tự chọn → nền cột đổi theo
  const pal = page.getByTestId('cv-palettes').locator('button');
  expect(await pal.count()).toBe(5);
  await tpls.nth(0).click();
  const bgOf = () => page.evaluate(() => getComputedStyle(document.querySelector('[aria-hidden] [data-cv-sheet] > div > div') as HTMLElement).backgroundColor);
  const seen = new Set<string>();
  for (let k = 0; k < 5; k++) { await pal.nth(k).click(); seen.add(await bgOf()); }
  expect(seen.size, 'mỗi bảng màu phải đổi nền cột').toBe(5);
  await page.getByTestId('cv-color').fill('#c2410c');
  expect(await bgOf()).toBe('rgb(126, 42, 8)');
  for (let i = 0; i < 10; i++) { await tpls.nth(i).click(); await page.waitForTimeout(120); await page.getByTestId('cv-preview').screenshot({ path: path.join(OUT, `cv-custom-${i + 1}.png`) }); }
  await page.getByTestId('cv-preview').screenshot({ path: path.join(OUT, 'cv-long.png') });

  // ảnh đại diện
  const img = fs.readdirSync(path.join(__dirname, '..', 'public', 'test-raw')).find((f) => /\.(jpe?g|png|webp)$/i.test(f));
  await tpls.nth(0).click(); // bố cục ATS cố ý không có ảnh
  if (img) {
    await page.getByTestId('cv-photo').setInputFiles(path.join(__dirname, '..', 'public', 'test-raw', img));
    await expect(page.locator('[aria-hidden] [data-cv-sheet] img')).toHaveCount(1, { timeout: 10_000 });
  }
  await tpls.nth(0).click();

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('cv-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(80_000);
  const png = fs.readFileSync(await grab('cv-png'));
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1985, 2807]);

  // tải lại trang vẫn giữ nội dung
  await page.reload();
  await expect(page.getByTestId('cv-name')).toHaveValue('Nguyễn Trần Hoàng Gia Khánh', { timeout: 30_000 });
  expect(errors).toEqual([]);
});
