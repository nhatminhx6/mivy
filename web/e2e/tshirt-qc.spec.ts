import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Áo thun đồng phục: mọi mẫu × mọi vị trí in — hình/chữ nằm trong khung vị trí, màu ⊆ bộ mực đang dùng,
// in lụa đúng số màu + film tách màu (+ lót trắng áo tối), DTF không film, danh sách 30 bạn (áo lớp),
// áo đội: mặt sau riêng từng người + bảng size tự đếm, logo khách, tải PDF (đủ trang) / PNG / SVG (outline) / ảnh 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tshirt');

async function audit(page: Page, pos: string, label: string) {
  return page.locator(`[data-testid="ts-print-${pos}"] svg`).first().evaluate((svg: SVGSVGElement, lb: string) => {
    const vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect();
    const k = vb.width / r.width;
    const skip = (el: Element) => !!el.closest('defs, mask, clipPath, [clip-path]');
    const bad: string[] = [];
    const colors = new Set<string>();
    let texts = 0;
    svg.querySelectorAll('text, path, circle, ellipse, rect, line, image').forEach((el) => {
      if (skip(el)) return;
      if (el.tagName === 'text') texts++;
      for (const a of ['fill', 'stroke']) {
        const v = el.getAttribute(a);
        if (v && v !== 'none') colors.add(v.toLowerCase());
      }
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return;
      const x0 = (b.left - r.left) * k + vb.x, y0 = (b.top - r.top) * k + vb.y;
      const x1 = x0 + b.width * k, y1 = y0 + b.height * k;
      const tol = 1.2;
      if (x0 < -tol || y0 < -tol || x1 > vb.width + tol || y1 > vb.height + tol) bad.push(`${el.tagName}"${(el.textContent || '').slice(0, 24)}" [${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}] ngoài ${vb.width}×${vb.height}`);
    });
    return { lb, bad, colors: [...colors], texts };
  }, label);
}
const positions = (page: Page) => page.locator('[data-testid^="ts-print-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('ts-print-', '')));
const usedInks = async (page: Page) => (await page.getByTestId('ts-used').innerText()).match(/#[0-9A-F]{6}/gi)!.map((c) => c.toLowerCase());
const seps = (page: Page) => page.locator('[data-testid="ts-seps"] svg').evaluateAll((els) => els.map((s) => {
  const cs = new Set<string>(); let n = 0;
  s.querySelectorAll('[data-ink] text, [data-ink] path, [data-ink] circle, [data-ink] ellipse, [data-ink] rect, [data-ink] line').forEach((e) => {
    if (e.closest('defs, mask, clipPath')) return; n++;
    for (const a of ['fill', 'stroke']) { const v = e.getAttribute(a); if (v && v !== 'none') cs.add(v.toLowerCase()); }
  });
  return { pos: s.getAttribute('data-pos'), sep: s.getAttribute('data-sep'), n, colors: [...cs] };
}));

test('áo thun: mọi mẫu × vị trí, số màu in lụa, film + lót trắng, danh sách, size, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tshirt');
  const tpls = page.getByTestId('ts-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(12);

  // ----- mọi mẫu × mọi vị trí (có + không in tay áo) -----
  await page.getByTestId('tab-flat').click();
  for (const sleeve of [false, true]) {
    if (sleeve) await page.getByTestId('ts-sleeve').check();
    for (let i = 0; i < nT; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(150);
      const used = await usedInks(page);
      let texts = 0;
      for (const ps of await positions(page)) {
        const r = await audit(page, ps, `mẫu ${i} ${ps}${sleeve ? ' +tay' : ''}`);
        expect(r.bad, `${r.lb}: hình/chữ lòi khỏi khung vị trí in`).toEqual([]);
        expect(r.colors.every((c) => used.includes(c)), `${r.lb}: màu lạ ${r.colors} ∉ ${used}`).toBe(true);
        texts += r.texts;
      }
      expect(texts, `mẫu ${i}: có chữ`).toBeGreaterThan(1);
      if (!sleeve) await page.getByTestId('ts-flat').screenshot({ path: path.join(OUT, `ao-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }
  await page.getByTestId('ts-sleeve').uncheck();

  // ----- in lụa 1..4 màu trên mẫu chạy bộ (áo trắng, 3 màu): film đúng số màu, toàn đen -----
  await tpls.nth(10).click();
  for (const n of [1, 2, 3, 4]) {
    await page.getByTestId(`ts-nink-${n}`).click();
    await page.waitForTimeout(150);
    const used = await usedInks(page);
    expect(used.length).toBe(n);
    const all = new Set<string>();
    for (const ps of await positions(page)) (await audit(page, ps, `${n} màu`)).colors.forEach((c) => all.add(c));
    expect(all.size, `${n} màu: đếm màu`).toBeLessThanOrEqual(n);
    const ss = await seps(page);
    expect(ss.filter((s) => s.sep === 'u'), 'áo trắng: không cần lót trắng').toEqual([]);
    for (const s of ss) { expect(s.n).toBeGreaterThan(0); expect(s.colors).toEqual(['#000000']); }
    const front = ss.filter((s) => s.pos === 'front').length;
    expect(front, `${n} màu: số film mặt trước`).toBe(Math.min(n, 3));
  }
  // áo tối in lụa → có film lót trắng mỗi vị trí
  await tpls.nth(0).click(); // công ty · navy · in lụa 2 màu
  await page.waitForTimeout(150);
  let ss = await seps(page);
  expect(ss.filter((s) => s.sep === 'u').length, 'áo navy: lót trắng').toBe((await positions(page)).length);
  // DTF: không film
  await page.getByTestId('ts-method-dtf').click();
  await expect(page.locator('[data-testid="ts-seps"] svg')).toHaveCount(0);
  await page.getByTestId('ts-method-screen').click();

  // ----- thêu logo ngực (polo): không film cho vị trí thêu, xem trước có vân thêu -----
  await tpls.nth(2).click();
  await page.waitForTimeout(150);
  ss = await seps(page);
  expect(ss.filter((s) => s.pos === 'chest')).toEqual([]);
  await expect(page.locator('[data-testid="ts-flat"] [data-stitch]').first()).toBeAttached();

  // ----- áo lớp: 30 bạn → 30 tên sau lưng, nằm gọn -----
  await tpls.nth(4).click();
  const names = Array.from({ length: 30 }, (_, i) => ['Quốc Bảo', 'Thu Hà', 'Gia Khánh', 'Bảo Ngọc', 'Nguyễn Hoàng Phương Anh', 'Đức Huy'][i % 6] + (i >= 6 ? ` ${i}` : ''));
  await page.getByTestId('ts-people').fill(names.join('\n'));
  await page.waitForTimeout(250);
  const backNames = await page.locator('[data-testid="ts-print-back"] svg text').evaluateAll((els) => els.map((e) => e.textContent));
  for (const n of names) expect(backNames, `thiếu tên ${n}`).toContain(n);
  expect((await audit(page, 'back', '30 bạn')).bad).toEqual([]);
  await page.getByTestId('ts-flat').screenshot({ path: path.join(OUT, 'ao-lop-30-ban.png') });
  // chữ dài vẫn gọn
  await page.getByTestId('ts-cls').fill('12 Chuyên Anh 1');
  await page.getByTestId('ts-slogan').fill('Thanh xuân rực rỡ, mãi mãi không quên những ngày bên nhau');
  await page.getByTestId('ts-small').fill('Trường THPT chuyên Lê Hồng Phong — TP. Hồ Chí Minh');
  await page.waitForTimeout(200);
  for (const ps of await positions(page)) expect((await audit(page, ps, `chữ dài ${ps}`)).bad).toEqual([]);

  // ----- áo đội: mặt sau riêng từng người + bảng size tự đếm theo danh sách -----
  await tpls.nth(6).click();
  await page.waitForTimeout(200);
  const team = ['Quốc Bảo | 10 | L', 'Thu Hà | 7 | S', 'Gia Khánh | 9 | M', 'Bảo Ngọc | 21 | M', 'Nguyễn Trần Hoàng Phương | 99 | XL', 'Đức Huy | 4 | XXL'];
  await page.getByTestId('ts-people').fill(team.join('\n'));
  await page.waitForTimeout(250);
  await expect(page.locator('[data-testid="ts-people-backs"] svg[data-person]')).toHaveCount(team.length);
  const pb = await page.locator('[data-testid="ts-people-backs"] svg[data-person]').evaluateAll((els) => els.map((s) => [...s.querySelectorAll('text')].map((t) => t.textContent).join('|')));
  expect(pb[1]).toContain('THU HÀ'); expect(pb[1]).toContain('7');
  expect(pb[4]).toContain('99');
  await expect(page.getByTestId('ts-qty-M')).toHaveValue('2');
  await expect(page.getByTestId('ts-qty-XL')).toHaveValue('1');
  await expect(page.getByTestId('ts-total')).toContainText('6');
  await page.getByTestId('ts-persons').getByRole('button').nth(4).click();
  await page.waitForTimeout(150);
  expect((await audit(page, 'back', 'tên dài')).bad).toEqual([]);
  await page.getByTestId('ts-flat').screenshot({ path: path.join(OUT, 'ao-doi-ten-so.png') });

  // ----- logo khách: in lụa → lọc 1 màu -----
  await tpls.nth(0).click();
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const x = c.getContext('2d')!; x.fillStyle = '#1b3a6b'; x.beginPath(); x.arc(100, 100, 80, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.fillText('Q', 100, 132);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('ts-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const img = page.locator('[data-testid="ts-print-chest"] svg image');
  await expect(img).toHaveCount(1);
  expect(await img.getAttribute('filter')).toMatch(/url\(#tslogo/);
  expect((await audit(page, 'chest', 'logo')).bad).toEqual([]);

  // ----- size nhập tay -----
  await page.getByTestId('ts-qty-S').fill('12');
  await expect(page.getByTestId('ts-total')).toContainText('37');

  // ----- tải file -----
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 240_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const expectPages = Number(await page.getByTestId('ts-pdf').getAttribute('data-pages'));
  const pdf = fs.readFileSync(await grab('ts-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBe(expectPages);
  // PNG + SVG vị trí sau lưng (300×400mm)
  await page.getByTestId('ts-dlpos').getByRole('button', { name: 'Sau lưng' }).click();
  const p2 = fs.readFileSync(await grab('ts-png'));
  expect(p2.readUInt32BE(16)).toBe(Math.round((300 / 25.4) * 200));
  const svg = fs.readFileSync(await grab('ts-svg'), 'utf8');
  expect(svg).toContain('viewBox="0 0 300 400"');
  expect(svg).not.toContain('<text');

  // ----- 3D: polo + áo thun, ảnh 3D -----
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const p3 = fs.readFileSync(await grab('ts-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'ao-3d-cong-ty.png') });
  await tpls.nth(2).click();
  await page.waitForTimeout(3000);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'ao-3d-polo.png') });
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
