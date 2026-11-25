import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tem bảo hành / niêm phong: mọi mẫu × mọi khổ → chữ nằm gọn trong hình tem (tròn/chữ nhật),
// tờ in A4: số seri duy nhất + chạy liên tục + đủ đường bế CutContour, tải PNG/PDF/file cắt (zip nhiều tờ), 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'seal');

async function auditStamp(page: Page, label: string) {
  const r = await page.locator('[data-testid="seal-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal; const W = vb.width, H = vb.height; const round = svg.getAttribute('data-shape') === 'round';
    const inv = svg.getScreenCTM()!.inverse();
    const bad: string[] = []; let n = 0;
    for (const t of Array.from(svg.querySelectorAll('text'))) {
      if (!t.textContent?.trim()) continue;
      const bb = t.getBBox(); const m = inv.multiply(t.getScreenCTM()!);
      // co nhẹ hộp chữ (hộp getBBox gồm cả khoảng dấu/descender rộng hơn nét thật)
      const ix = bb.width * 0.04, iy = bb.height * 0.18;
      const pts = [[bb.x + ix, bb.y + iy], [bb.x + bb.width - ix, bb.y + iy], [bb.x + ix, bb.y + bb.height - iy], [bb.x + bb.width - ix, bb.y + bb.height - iy]]
        .map(([x, y]) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m); });
      n++;
      const out = pts.some((p) => round
        ? Math.hypot(p.x - W / 2, p.y - H / 2) > W / 2 + 1
        : p.x < -1 || p.y < -1 || p.x > W + 1 || p.y > H + 1);
      if (out && !t.closest('[clip-path]')) bad.push(t.textContent || '');
      if (bb.height > 0 && bb.height < 9 && !t.closest('[clip-path]')) bad.push(`chữ quá nhỏ (<0.9mm): ${t.textContent}`);
    }
    return { n, bad };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(2);
  expect(r.bad, `${label}: chữ lòi ra ngoài tem`).toEqual([]);
}

test('Tem bảo hành + niêm phong: mọi mẫu × khổ, tờ seri, file in, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/seal');
  const tpls = page.getByTestId('seal-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.getByTestId('tab-flat').click();

  let total = 0;
  for (const kind of ['warranty', 'seal'] as const) {
    await page.getByTestId(`seal-kind-${kind}`).click();
    const n = await tpls.count();
    expect(n).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      const sizes = page.getByTestId('seal-size');
      for (let z = 0; z < await sizes.count(); z++) {
        await sizes.nth(z).click();
        await page.waitForTimeout(60);
        await auditStamp(page, `${kind} mẫu ${i} khổ ${z}`);
      }
      await page.getByTestId('seal-preview').screenshot({ path: path.join(OUT, `${kind}-${String(i).padStart(2, '0')}.png`) });
      total++;
    }
  }
  expect(total).toBeGreaterThanOrEqual(10);

  // chất liệu đổi được (bạc 7 màu có nền hologram ở bản xem)
  await page.getByTestId('seal-materials').locator('button').nth(1).click();
  await expect(page.locator('[data-testid="seal-preview"] svg [fill^="url(#"]').first()).toBeAttached();

  // tờ in: seri duy nhất, liên tục, đủ đường bế
  await page.getByTestId('seal-kind-warranty').click();
  await tpls.first().click();
  await page.getByTestId('seal-size').first().click(); // Ø20
  await page.getByTestId('seal-prefix').fill('QB');
  await page.getByTestId('seal-start').fill('120');
  await page.getByTestId('seal-count').fill('300');
  const sheet = await page.locator('[data-testid="seal-sheet"] > svg').evaluate((svg) => ({
    serials: Array.from(svg.querySelectorAll('[data-serial]')).map((t) => t.textContent || ''),
    cuts: svg.querySelectorAll('#CutContour use').length,
    uses: svg.querySelectorAll('#In use').length,
  }));
  expect(sheet.serials.length).toBeGreaterThan(40);
  expect(new Set(sheet.serials).size, 'seri trùng').toBe(sheet.serials.length);
  sheet.serials.forEach((s, i) => expect(s).toBe(`QB${String(120 + i).padStart(6, '0')}`));
  expect(sheet.cuts).toBe(sheet.serials.length);
  expect(sheet.uses).toBe(sheet.serials.length);
  const perSheet = sheet.serials.length, pages = Math.ceil(300 / perSheet);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return { p, name: dl.suggestedFilename(), buf: fs.readFileSync(p) };
  };
  const zip = await grab('seal-svg');
  expect(zip.name).toMatch(/\.zip$/);
  expect(zip.buf.subarray(0, 2).toString()).toBe('PK');
  const zs = zip.buf.toString('latin1');
  expect((zs.match(/id="CutContour"/g) || []).length, 'mỗi tờ 1 lớp CutContour').toBe(pages);
  expect((zs.match(/<text[ >]/g) || []).length, 'chữ phải outline hết').toBe(0);
  expect(zs).toContain(`-to-${String(pages).padStart(2, '0')}.svg`);

  await page.getByTestId('seal-count').fill('40');
  const one = await grab('seal-svg');
  expect(one.name).toMatch(/\.svg$/);
  const os = one.buf.toString('utf8');
  expect(os).toContain('id="In"');
  expect(os).toContain('id="CutContour"');
  expect(os).toContain('width="210mm"');

  const pdf = await grab('seal-pdf');
  expect(pdf.buf.subarray(0, 4).toString()).toBe('%PDF');
  const png = await grab('seal-png');
  expect(png.buf.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // link catalog ?kind=seal mở đúng tab niêm phong, 3D dựng được
  await page.goto('/studio/seal?kind=seal');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('seal-kind-seal')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-testid="mockup-3d"]')).not.toContainText('chưa hỗ trợ');
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'seal-3d.png') });
  expect(errors).toEqual([]);
});
