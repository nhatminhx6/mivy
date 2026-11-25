import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tạp dề: mọi mẫu × kiểu (yếm / ngang hông / bistro) × túi — hình/chữ trong vùng in, không đè, đúng số màu;
// in lụa 1–3 màu + film tách màu; thêu (vân chỉ, ≤6 màu chỉ, bảng màu chỉ); chuyển nhiệt (nền mờ, không film);
// logo 1 màu; chữ dài; tên từng nhân viên (mỗi tên 1 trang); tải PDF/PNG/SVG/ảnh 3D; 3D 3 kiểu; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'apron');

async function audit(page: Page, label: string) {
  return page.locator('[data-testid="ap-print"] svg').evaluate((svg: SVGSVGElement, lb: string) => {
    const vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect();
    const k = vb.width / r.width;
    const skip = (el: Element) => !!el.closest('defs, mask, clipPath, pattern');
    const bad: string[] = [];
    const colors = new Set<string>();
    let texts = 0, minFont = 99;
    svg.querySelectorAll('text, path, circle, ellipse, rect, line, image').forEach((el) => {
      if (skip(el) || el.hasAttribute('data-tint')) return;
      if (el.tagName === 'text') { texts++; minFont = Math.min(minFont, parseFloat(el.getAttribute('font-size') || '99')); }
      for (const a of ['fill', 'stroke']) {
        const v = el.getAttribute(a);
        if (v && v !== 'none' && !v.startsWith('url(')) colors.add(v.toLowerCase());
      }
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return;
      const x0 = (b.left - r.left) * k + vb.x, y0 = (b.top - r.top) * k + vb.y;
      const x1 = x0 + b.width * k, y1 = y0 + b.height * k;
      const tol = 1.2;
      if (x0 < -tol || y0 < -tol || x1 > vb.width + tol || y1 > vb.height + tol) bad.push(`${el.tagName}"${(el.textContent || '').slice(0, 24)}" [${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}] ngoài ${vb.width}×${vb.height}`);
    });
    // chữ không đè nhau: chữ thường so từng <text> nhiều kí tự; chữ cung tròn (1 kí tự/1 text) bỏ qua
    const boxes = [...svg.querySelectorAll('text')].filter((t) => !skip(t) && (t.textContent || '').trim().length > 1).map((t) => {
      const b = t.getBoundingClientRect();
      return { s: (t.textContent || '').slice(0, 20), x0: b.left, y0: b.top + b.height * 0.2, x1: b.right, y1: b.bottom - b.height * 0.2 };
    });
    const overlap: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ix = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), iy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ix > 2 && iy > 2) overlap.push(`"${a.s}" × "${c.s}"`);
    }
    return { lb, bad, overlap, colors: [...colors], texts, minFont, w: vb.width, h: vb.height };
  }, label);
}
const usedColors = async (page: Page) => ((await page.getByTestId('ap-used').innerText()).match(/#[0-9A-F]{6}/gi) || []).map((c) => c.toLowerCase());

test('tạp dề: mọi mẫu × kiểu × túi, in lụa / thêu / chuyển nhiệt, film, tên nhân viên, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/apron');
  const tpls = page.getByTestId('ap-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const flat = page.getByTestId('ap-flat');

  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  const combos: [string, string][] = [['bib', 'center'], ['bib', 'none'], ['waist', 'split'], ['waist', 'none'], ['bistro', 'center'], ['bistro', 'none']];
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    for (const [st, pk] of combos) {
      await page.getByTestId(`ap-style-${st}`).click();
      await page.getByTestId(`ap-pocket-${pk}`).click();
      await page.waitForTimeout(80);
      const r = await audit(page, `mẫu ${i} ${st}/${pk}`);
      expect(r.bad, `${r.lb}: hình/chữ lòi khỏi vùng in`).toEqual([]);
      expect(r.overlap, `${r.lb}: chữ đè nhau`).toEqual([]);
      expect(r.texts, `${r.lb}: có chữ`).toBeGreaterThan(2);
      const used = await usedColors(page);
      expect(r.colors.every((c) => used.includes(c)), `${r.lb}: màu lạ ${r.colors} ∉ ${used}`).toBe(true);
      if (st === 'bib' && pk === 'center') await flat.screenshot({ path: path.join(OUT, `tap-de-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }

  // in lụa 1/2/3 màu (mẫu BBQ 3 màu) + film đen trên trắng
  await tpls.nth(10).click();
  await page.getByTestId('ap-method-screen').click();
  await page.getByTestId('ap-style-bib').click();
  for (const n of [1, 2, 3]) {
    await page.getByTestId(`ap-nink-${n}`).click();
    await page.waitForTimeout(120);
    const r = await audit(page, `${n} màu`);
    expect(r.colors.length, `${n} màu: đếm màu`).toBe(n);
    const seps = await page.locator('[data-testid="ap-seps"] svg').evaluateAll((els) => els.map((s) => {
      const cs = new Set<string>(); let n2 = 0;
      s.querySelectorAll('[data-ink] text, [data-ink] path, [data-ink] circle, [data-ink] rect, [data-ink] line').forEach((e) => {
        if (e.closest('defs, mask')) return; n2++;
        for (const a of ['fill', 'stroke']) { const v = e.getAttribute(a); if (v && v !== 'none') cs.add(v.toLowerCase()); }
      });
      return { n: n2, colors: [...cs] };
    }));
    expect(seps.length, `${n} màu: số film`).toBe(n);
    for (const s of seps) { expect(s.n).toBeGreaterThan(0); expect(s.colors).toEqual(['#000000']); }
  }

  // thêu: vân chỉ trên bản xem, ≤6 màu chỉ, không film, có bảng màu chỉ (PDF +1 trang)
  await page.getByTestId('ap-method-embroider').click();
  await page.waitForTimeout(150);
  await expect(page.locator('[data-testid="ap-flat"] [data-stitch]').first()).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('[data-testid="ap-seps"] svg')).toHaveCount(0, { timeout: 15_000 });
  expect((await usedColors(page)).length).toBeLessThanOrEqual(6);
  expect(await page.getByTestId('ap-pdf').getAttribute('data-pages')).toBe('3');
  // chuyển nhiệt: nền mờ, không film
  await page.getByTestId('ap-mat-du').click();
  await page.getByTestId('ap-method-sub').click();
  await expect(page.locator('[data-testid="ap-print"] [data-tint]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-testid="ap-seps"] svg')).toHaveCount(0, { timeout: 15_000 });
  await page.getByTestId('ap-mat-kaki').click();
  await page.getByTestId('ap-method-screen').click();
  await page.getByTestId('ap-nink-2').click();

  // logo khách: in lụa → lọc 1 màu
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const x = c.getContext('2d')!; x.fillStyle = '#3a2a1b'; x.beginPath(); x.arc(100, 100, 80, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.fillText('K', 100, 132);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('ap-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  for (const i of [0, 2, 4, 1]) {
    await tpls.nth(i).click();
    await page.waitForTimeout(120);
    const img = page.locator('[data-testid="ap-print"] svg image');
    await expect(img).toHaveCount(1, { timeout: 15_000 });
    expect(await img.getAttribute('filter')).toMatch(/url\(#apink/);
    const lr = await audit(page, `logo mẫu ${i}`);
    expect(lr.bad).toEqual([]);
    expect(lr.overlap).toEqual([]);
  }
  await flat.screenshot({ path: path.join(OUT, 'tap-de-logo.png') });

  // chữ dài + tên nhân viên ở mọi bố cục × kiểu
  await page.getByTestId('ap-names').fill('Nguyễn Thị Thu Hà\nQuốc Bảo\nGia Khánh');
  for (const i of [0, 1, 2, 4, 6, 10]) {
    await tpls.nth(i).click();
    await page.getByTestId('ap-brand').fill('Nhà hàng Bếp Việt Quốc Bảo chi nhánh Phú Mỹ Hưng');
    await page.getByTestId('ap-tagline').fill('Món ngon chuẩn vị nhà · Nguyên liệu tươi mỗi sáng');
    await page.getByTestId('ap-since').fill('Since 2018 · 12 Nguyễn Huệ, Q.1');
    for (const st of ['bib', 'waist', 'bistro']) {
      await page.getByTestId(`ap-style-${st}`).click();
      await page.waitForTimeout(100);
      const r = await audit(page, `chữ dài mẫu ${i} ${st}`);
      expect(r.bad, r.lb).toEqual([]);
      expect(r.overlap, r.lb).toEqual([]);
    }
  }
  await expect(page.locator('[data-testid="ap-print"] svg text', { hasText: 'NGUYỄN THỊ THU HÀ' })).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-testid="ap-people-print"] svg')).toHaveCount(3, { timeout: 15_000 });
  await flat.screenshot({ path: path.join(OUT, 'tap-de-chu-dai-ten.png') });

  // tải file: yếm in lụa 2 màu, 3 tên → xem màu + file in + 2 film + 3 tên = 7 trang
  await page.getByTestId('ap-style-bib').click();
  await page.getByTestId('ap-nink-2').click();
  await page.waitForTimeout(150);
  expect(await page.getByTestId('ap-pdf').getAttribute('data-pages')).toBe('7');
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('ap-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBe(7);
  const p = fs.readFileSync(await grab('ap-png'));
  expect(p.readUInt32BE(16)).toBe(Math.round((200 / 25.4) * 200));
  const svg = fs.readFileSync(await grab('ap-svg'), 'utf8');
  expect(svg).toContain('viewBox="0 0 200 170"');
  expect(svg).not.toContain('<text');

  // 3D: 3 kiểu + tải ảnh 3D
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 30_000 });
  for (const st of ['waist', 'bistro', 'bib']) { await page.getByTestId(`ap-style-${st}`).click(); await page.waitForTimeout(1200); }
  const p3 = fs.readFileSync(await grab('ap-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'tap-de-3d.png') });
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
