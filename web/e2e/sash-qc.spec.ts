import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Băng đeo chéo: mọi mẫu × khổ — chữ nằm trong vùng đoạn trước, không lòi khỏi bề rộng băng, không chồng nhau,
// đủ to; chữ dài vẫn gọn; danh sách tên → mỗi người 1 băng; cảnh báo tương phản; file in/PNG/SVG/3D tải được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'sash');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  const r = await page.locator('[data-testid="sh-front"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const a = vb.x + 70, b = vb.x + vb.width - 70, W = vb.height;
    const items = Array.from(svg.querySelectorAll('text')).map((t) => {
      const bb = (t as SVGTextElement).getBBox();
      const size = parseFloat(t.getAttribute('font-size') || '0');
      const base = parseFloat(t.getAttribute('y') || '0');
      const fam = t.getAttribute('font-family') || '';
      const script = /Great Vibes|Dancing/.test(fam);
      // khung mực ước lượng theo cỡ chữ (bbox của text gồm cả khoảng trống dòng của font)
      const top = base - size * (script ? 0.62 : 0.76), bottom = base + size * (script ? 0.28 : 0.2);
      return { role: t.getAttribute('data-role'), x0: bb.x, x1: bb.x + bb.width, top, bottom, base, size, txt: t.textContent };
    });
    return { a, b, W, items };
  });
  const bad: string[] = [];
  for (const it of r.items) {
    if (it.x0 < r.a - 1 || it.x1 > r.b + 1) bad.push(`${it.role} "${it.txt}" ngang ${it.x0.toFixed(0)}–${it.x1.toFixed(0)} ngoài vùng ${r.a}–${r.b}`);
    if (it.top < -0.5 || it.bottom > r.W + 0.5) bad.push(`${it.role} "${it.txt}" lòi khỏi bề rộng băng (${it.top.toFixed(1)}–${it.bottom.toFixed(1)} / ${r.W})`);
  }
  const titles = r.items.filter((i) => i.role === 'title').sort((x, y) => x.base - y.base), sub = r.items.find((i) => i.role === 'sub');
  const title = titles[titles.length - 1];
  if (title && title.size < 12) bad.push(`chữ chính quá nhỏ ${title.size.toFixed(1)}mm`);
  if (sub && sub.size < 5.5) bad.push(`dòng phụ quá nhỏ ${sub.size.toFixed(1)}mm`);
  if (title && sub && sub.base - sub.size * 0.76 < title.base - 0.5) bad.push('dòng phụ đè lên chữ chính');
  for (let i = 1; i < titles.length; i++) if (titles[i].top < titles[i - 1].base - 0.5) bad.push('2 dòng chữ chính chồng nhau');
  expect(bad, `${label}: ${bad.join(' | ')}`).toEqual([]);
}

test('Băng đeo chéo: mọi mẫu × khổ, chữ dài, danh sách tên, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/studio/sash');
  const tpls = page.getByTestId('sh-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  await page.getByTestId('tab-flat').click();
  const sizes = page.locator('[data-testid="sh-sizes"] button');
  for (let z = 0; z < await sizes.count(); z++) {
    await sizes.nth(z).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      await audit(page, `khổ ${z} mẫu ${i}`);
      // mẫu mặc định không được tự báo "khó đọc"
      await expect(page.getByTestId('sh-warn')).toHaveCount(0);
      if (z === 0) await page.getByTestId('sh-front').screenshot({ path: path.join(OUT, `sash-${String(i).padStart(2, '0')}.png`) });
    }
  }
  await sizes.nth(1).click(); // 160cm: vùng chữ ngắn nhất

  // chữ rất dài ở mọi bố cục + mọi font
  await page.getByTestId('sh-title').fill('CHÀO MỪNG TÂN SINH VIÊN KHOÁ 50 TRƯỜNG ĐẠI HỌC');
  await page.getByTestId('sh-sub').fill('Khoa Quản trị Kinh doanh · Chuyên ngành Marketing số');
  const layouts = page.locator('[data-testid="sh-layouts"] button');
  const fonts = page.locator('[data-testid="sh-fonts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (let f = 0; f < await fonts.count(); f++) {
      await fonts.nth(f).click();
      await page.waitForTimeout(80);
      await audit(page, `dài · bố cục ${l} · font ${f}`);
    }
  }
  await page.getByTestId('sh-front').screenshot({ path: path.join(OUT, 'sash-chu-dai.png') });

  // cảnh báo tương phản: satin vàng + nhũ vàng
  await page.locator('[data-testid="sh-satins"] button').filter({ hasText: 'Vàng' }).click();
  await page.locator('[data-testid="sh-inks"] button').filter({ hasText: 'Nhũ vàng' }).click();
  await expect(page.getByTestId('sh-warn')).toBeVisible();
  await page.locator('[data-testid="sh-satins"] button').filter({ hasText: 'Đỏ' }).click();
  await expect(page.getByTestId('sh-warn')).toHaveCount(0);

  // danh sách 30 người → 30 băng, tên vào dòng phụ
  await tpls.nth(0).click();
  const names = Array.from({ length: 30 }, (_, i) => `Thành viên số ${i + 1}`);
  names[17] = 'Nguyễn Thị Thu Hà Phương Linh';
  await page.getByTestId('sh-names').fill(names.join('\n'));
  await expect(page.locator('[data-testid="sh-print-all"] > div > svg')).toHaveCount(30);
  await expect(page.getByTestId('sh-people').locator('button')).toHaveCount(30);
  await page.getByTestId('sh-people').locator('button').nth(17).click();
  await expect(page.locator('[data-testid="sh-front"] [data-role="sub"]')).toHaveText(names[17]);
  await audit(page, 'tên dài người 18');
  // print: đúng khổ + lề xén, có dấu gấp vai/may
  const pr = await page.locator('[data-testid="sh-print-all"] > div > svg').nth(5).evaluate((s: SVGSVGElement) => ({ vb: s.getAttribute('viewBox'), marks: s.querySelectorAll('[data-marks] path').length, sub: s.querySelector('[data-role="sub"]')?.textContent }));
  expect(pr.vb).toBe('-5 -5 1610 110');
  expect(pr.marks).toBe(2);
  expect(pr.sub).toBe(names[5]);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // PDF in: 5 người → 5 trang
  await page.getByTestId('sh-names').fill(names.slice(0, 5).join('\n'));
  await expect(page.locator('[data-testid="sh-print-all"] > div > svg')).toHaveCount(5);
  const pdf = fs.readFileSync(await grab('sh-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(5);
  const svg = fs.readFileSync(await grab('sh-svg'), 'utf8');
  expect(svg).not.toContain('<text');
  expect(svg).toContain('data-marks');
  const png = fs.readFileSync(await grab('sh-png'));
  expect(png.readUInt32BE(16)).toBe(2400);

  // 3D: mọi kiểu nối hông + nhũ bạc, chụp được
  await page.getByTestId('tab-3d').click();
  await page.waitForFunction(() => !!(window as unknown as { __shSnap?: unknown }).__shSnap, null, { timeout: 60_000 });
  const finishes = page.locator('[data-testid="sh-finishes"] button');
  for (let f = 0; f < await finishes.count(); f++) {
    await finishes.nth(f).click();
    if (f === 1) await page.locator('[data-testid="sh-inks"] button').filter({ hasText: 'Nhũ bạc' }).click();
    await page.waitForTimeout(300);
    const u = await page.evaluate(() => (window as unknown as { __shSnap: (w: number, h: number) => Promise<string> }).__shSnap(1000, 750));
    expect(u.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `sash-3d-${f}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.waitForTimeout(1500);
  const p3d = fs.readFileSync(await grab('sh-3d'));
  expect(p3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
