import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Lịch Tết để bàn: mọi mẫu × bìa + tháng dựng được, âm lịch đúng (Tết 2027 = 6/2 → "1/1"),
// 13 trang in đủ, PDF in 13 trang, PNG tải được, 3D lên hình, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'calendar');

test('Lịch Tết: mọi mẫu, âm lịch, PDF 13 trang', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/calendar');
  const tpls = page.getByTestId('cal-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  // 3D mặc định: có canvas
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('tab-flat').click();

  const view = page.getByTestId('cal-view');
  const pages = page.getByTestId('cal-page');
  await expect(pages).toHaveCount(13);
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (const pg of [0, 2, 9]) {
      await pages.nth(pg).click();
      const texts = await view.locator('svg text').allTextContents();
      if (pg === 0) {
        expect(texts.join(' '), `mẫu ${i} bìa`).toContain('ĐINH MÙI');
        expect(texts).toContain('2027');
      } else {
        const days = texts.filter((t) => /^\d{1,2}$/.test(t)).length;
        expect(days, `mẫu ${i} tháng ${pg}: đủ ô ngày (dương + âm)`).toBeGreaterThanOrEqual(50);
      }
      if (pg === 2) expect(texts, `mẫu ${i}: mùng 1 Tết Đinh Mùi rơi vào 6/2`).toContain('1/1');
      // chữ không tràn ra ngoài khổ
      const out = await view.locator('svg').evaluate((svg: SVGSVGElement) => {
        const vb = svg.viewBox.baseVal; const bad: string[] = [];
        svg.querySelectorAll('text').forEach((t) => {
          const b = (t as SVGTextElement).getBBox();
          if (b.width && (b.x < vb.x - 1 || b.x + b.width > vb.x + vb.width + 1)) bad.push(t.textContent || '');
        });
        return bad;
      });
      expect(out, `mẫu ${i} trang ${pg}: chữ tràn khổ`).toEqual([]);
      await view.screenshot({ path: path.join(OUT, `cal-${i + 1}-p${pg}.png`) });
    }
  }

  // sửa thông tin + đổi hoa + khổ nhỏ
  await page.getByTestId('cal-brand').fill('TIỆM BÁNH THU HÀ');
  await page.getByTestId('cal-greeting').fill('Vạn Sự Như Ý');
  await page.getByTestId('cal-flowers').locator('button').nth(1).click();
  await page.getByTestId('cal-size').nth(1).click();
  await pages.nth(0).click();
  await expect(view.locator('svg text', { hasText: 'Vạn Sự Như Ý' })).toHaveCount(1);
  await expect(page.locator('[data-testid="cal-print"] > div > svg')).toHaveCount(13);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const png = fs.readFileSync(await grab('cal-png'));
  expect(png.readUInt32BE(16)).toBe(2000);
  const pdf = fs.readFileSync(await grab('cal-pdf')).toString('latin1');
  expect((pdf.match(/\/Type\s*\/Page(?!s)/g) || []).length, 'PDF in đủ 13 trang').toBe(13);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});

// QC Lịch treo tường (?kind=wall): mọi mẫu × 13 tờ/7 tờ, âm lịch đúng, chữ không tràn, PDF đủ tờ, 3D treo tường lên hình
test('Lịch treo tường: mọi mẫu, 7/13 tờ, PDF, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/calendar?kind=wall');
  await expect(page.getByTestId('cal-kind-wall')).toHaveAttribute('data-active', 'true', { timeout: 60_000 });
  const tpls = page.getByTestId('cal-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  // ảnh 3D góc mặc định
  await page.waitForFunction(() => !!(window as unknown as { __calSnap?: unknown }).__calSnap, null, { timeout: 30_000 });
  const snap = async (name: string) => {
    const url = await page.evaluate(() => (window as unknown as { __calSnap: (w: number, h: number) => Promise<string> }).__calSnap(1000, 1250));
    fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  };
  await snap('wall-3d-bia.png');
  await page.getByTestId('tab-flat').click();

  const view = page.getByTestId('cal-view');
  const pages = page.getByTestId('cal-page');
  const sheets = page.getByTestId('cal-sheets').locator('button');
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(6);
  const audit = async (label: string) => {
    const r = await view.locator('svg').evaluate((svg: SVGSVGElement) => {
      const vb = svg.viewBox.baseVal; const bad: string[] = [];
      svg.querySelectorAll('text').forEach((t) => {
        const b = (t as SVGTextElement).getBBox();
        if (b.width && (b.x < vb.x - 1 || b.x + b.width > vb.x + vb.width + 1 || b.y < vb.y - 1 || b.y + b.height > vb.y + vb.height + 1)) bad.push(t.textContent || '');
      });
      return bad;
    });
    expect(r, `${label}: chữ tràn khổ`).toEqual([]);
  };
  for (const [si, count] of [[1, 13], [0, 7]] as const) {
    await sheets.nth(si).click();
    await expect(pages).toHaveCount(count);
    const feb = count === 13 ? 2 : 1; // tờ có tháng 2
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      for (const pg of [0, feb, count - 1]) {
        await pages.nth(pg).click();
        const texts = await view.locator('svg text').allTextContents();
        if (pg === 0) {
          expect(texts.join(' '), `mẫu ${i} bìa`).toContain('ĐINH MÙI');
          expect(texts).toContain('2027');
        } else {
          const days = texts.filter((t) => /^\d{1,2}$/.test(t)).length;
          expect(days, `mẫu ${i} tờ ${pg}: đủ ô ngày`).toBeGreaterThanOrEqual(count === 13 ? 50 : 100);
        }
        if (pg === feb) expect(texts, `mẫu ${i}: mùng 1 Tết Đinh Mùi rơi vào 6/2`).toContain('1/1');
        await audit(`${count} tờ mẫu ${i} tờ ${pg}`);
        if (pg !== 0 || i < 4) await view.screenshot({ path: path.join(OUT, `wall-${count}-${i + 1}-p${pg}.png`) });
      }
    }
  }
  await expect(page.locator('[data-testid="cal-print"] > div > svg')).toHaveCount(7);

  // khổ lớn + sửa chữ + logo
  await page.getByTestId('cal-size').nth(1).click();
  await page.getByTestId('cal-brand').fill('CÔNG TY QUỐC BẢO');
  await page.getByTestId('cal-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') });
  await pages.nth(0).click();
  await expect(view.locator('svg text', { hasText: 'CÔNG TY QUỐC BẢO' })).toHaveCount(1);
  await expect(view.locator('svg image')).not.toHaveCount(0);
  await audit('40×60 + logo');

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 240_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf7 = fs.readFileSync(await grab('cal-pdf')).toString('latin1');
  expect((pdf7.match(/\/Type\s*\/Page(?!s)/g) || []).length, 'PDF 7 tờ').toBe(7);
  await sheets.nth(1).click();
  await expect(page.locator('[data-testid="cal-print"] > div > svg')).toHaveCount(13);
  const pdf13 = fs.readFileSync(await grab('cal-pdf')).toString('latin1');
  expect((pdf13.match(/\/Type\s*\/Page(?!s)/g) || []).length, 'PDF 13 tờ').toBe(13);
  const png = fs.readFileSync(await grab('cal-png'));
  expect(png.readUInt32BE(16)).toBe(2000);

  // 3D các mẫu khác + lịch để bàn vẫn mở được
  await page.getByTestId('tab-3d').click();
  await pages.nth(2).click();
  await tpls.nth(1).click();
  await page.waitForTimeout(800);
  await snap('wall-3d-navy-thang2.png');
  await tpls.nth(2).click();
  await page.waitForTimeout(800);
  await snap('wall-3d-vom-dao-thang2.png');
  await page.getByTestId('cal-kind-desk').click();
  await expect(pages).toHaveCount(13);
  await expect(page.getByTestId('cal-size').first()).toContainText('21 × 15');
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});

// Lịch bloc: bảng treo + tờ ngày. Âm lịch/can chi đúng (6/2/2027 = mùng 1 Tết, ngày Bính Thìn, tháng Nhâm Dần, năm Đinh Mùi;
// 1/1/2027 = 24/11 Bính Ngọ, ngày Canh Thìn, tháng Canh Tý), CN tô đỏ, chữ không tràn, PDF bảng 1 trang, PDF bloc tháng 1 = 31 trang.
test('Lịch bloc: âm lịch + can chi, mọi mẫu, PDF bảng + bloc, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const OUTB = path.join(OUT, 'bloc');
  fs.mkdirSync(OUTB, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/calendar?kind=bloc');
  const tpls = page.getByTestId('cal-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('cal-kind-bloc')).toHaveAttribute('data-active', 'true');
  await expect(page.getByTestId('bloc-info')).toContainText('Âm lịch 1/1 năm Đinh Mùi');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  const snap = async (name: string) => {
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => (window as unknown as { __calSnap: (w: number, h: number) => Promise<string> }).__calSnap(1000, 1250));
    fs.writeFileSync(path.join(OUTB, name), Buffer.from(url.split(',')[1], 'base64'));
  };
  await snap('bloc-3d-tet.png');
  await page.getByTestId('tab-flat').click();

  const view = page.getByTestId('cal-view');
  const pages = page.getByTestId('cal-page');
  const date = page.getByTestId('bloc-date');
  const audit = async (label: string) => {
    const bad = await view.locator('svg').first().evaluate((svg: SVGSVGElement) => {
      const vb = svg.viewBox.baseVal; const out: string[] = [];
      svg.querySelectorAll('text').forEach((t) => {
        // bỏ qua chữ nằm trong svg con (tờ bloc dán trên bảng) — kiểm riêng ở trang tờ ngày
        if (t.closest('svg') !== svg) return;
        const b = (t as SVGTextElement).getBBox();
        if (b.width && (b.x < vb.x - 1 || b.x + b.width > vb.x + vb.width + 1 || b.y < vb.y - 1 || b.y + b.height > vb.y + vb.height + 1)) out.push(t.textContent || '');
      });
      return out;
    });
    expect(bad, `${label}: chữ tràn khổ`).toEqual([]);
  };
  const sheetTexts = () => view.locator('svg text').allTextContents();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(6);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await pages.nth(0).click();
    const bt = (await sheetTexts()).join(' ');
    expect(bt, `mẫu ${i} bảng`).toContain('ĐINH MÙI');
    await audit(`mẫu ${i} bảng`);
    await view.screenshot({ path: path.join(OUTB, `bang-${i + 1}.png`) });
    await pages.nth(1).click();
    const st = await sheetTexts();
    for (const want of ['6', 'THỨ BẢY', 'MÙNG 1 TẾT', 'Ngày Bính Thìn', 'Tháng Nhâm Dần', 'Năm Đinh Mùi', '1']) expect(st, `mẫu ${i} tờ 6/2: ${want}`).toContain(want);
    await audit(`mẫu ${i} tờ ngày`);
    if (i < 4) await view.screenshot({ path: path.join(OUTB, `to-ngay-${i + 1}.png`) });
  }
  // 1/1/2027: 24/11 âm, Canh Thìn, Canh Tý, Bính Ngọ, Tết Dương lịch
  await date.fill('2027-01-01');
  let st = await sheetTexts();
  for (const want of ['1', 'THỨ SÁU', 'TẾT DƯƠNG LỊCH', 'Ngày Canh Thìn', 'Tháng Canh Tý', 'Năm Bính Ngọ', '24', 'THÁNG MƯỜI MỘT']) expect(st, `1/1/2027: ${want}`).toContain(want);
  // Chủ nhật 3/1 tô đỏ
  await page.getByTestId('bloc-next').click(); await page.getByTestId('bloc-next').click();
  st = await sheetTexts();
  expect(st).toContain('CHỦ NHẬT');
  const fillNum = await view.locator('svg text', { hasText: /^3$/ }).first().getAttribute('fill');
  expect(fillNum?.toUpperCase(), 'CN số đỏ').toBe('#C8102E');
  // tên dài + tục ngữ/hàng dòng vẫn trong khổ
  await page.getByTestId('cal-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ QUỐC BẢO');
  await audit('tờ ngày tên dài');
  await pages.nth(0).click();
  await audit('bảng tên dài');

  // khổ lớn + xuất file
  await page.getByTestId('cal-size').nth(1).click();
  await date.fill('2027-02-06');
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 300_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUTB, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdfBoard = fs.readFileSync(await grab('cal-pdf')).toString('latin1');
  expect((pdfBoard.match(/\/Type\s*\/Page(?!s)/g) || []).length, 'PDF bảng 1 trang').toBe(1);
  await page.getByTestId('bloc-months').locator('button').nth(1).click(); // tháng 1
  const pdfJan = fs.readFileSync(await grab('bloc-pdf')).toString('latin1');
  expect((pdfJan.match(/\/Type\s*\/Page(?!s)/g) || []).length, 'PDF bloc tháng 1 = 31 tờ').toBe(31);
  const png = fs.readFileSync(await grab('cal-png'));
  expect(png.readUInt32BE(16)).toBe(2000);
  await pages.nth(1).click();
  const svg = fs.readFileSync(await grab('cal-svg'), 'utf8');
  expect(svg).toContain('<path');

  // 3D mẫu khác
  await page.getByTestId('tab-3d').click();
  await tpls.nth(3).click();
  await snap('bloc-3d-doanh-nghiep-35x50.png');
  await tpls.nth(2).click();
  await snap('bloc-3d-phong-canh.png');
  // về lịch để bàn vẫn bình thường
  await page.getByTestId('cal-kind-desk').click();
  await expect(pages).toHaveCount(13);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
