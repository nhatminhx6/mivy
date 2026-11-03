import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Sticker + Móc khoá: mọi mẫu × kiểu cắt × cỡ — đường cắt liền 1 nét, đúng cỡ, lỗ khoen nằm gọn trong mica,
// file cắt có đủ lớp In + CutContour, tờ A4 xếp được nhiều con.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cutout');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string, sizeMm: number) {
  // chờ bản dựng khớp lựa chọn hiện tại
  await expect(page.locator('[data-testid="cut-preview"][data-ready="1"]')).toHaveCount(1, { timeout: 15_000 });
  const r = await page.locator('[data-testid="cut-file-svg"] svg').evaluate((svg: SVGSVGElement) => {
    const cut = svg.querySelector('#CutContour path') as SVGPathElement;
    const d = cut.getAttribute('d') || '';
    const b = cut.getBBox();
    const vb = svg.viewBox.baseVal;
    const hole = svg.querySelector('#CutContour circle') as SVGCircleElement | null;
    let holeOk = true;
    if (hole) {
      const cx = hole.cx.baseVal.value, cy = hole.cy.baseVal.value, rr = hole.r.baseVal.value + 15; // ≥1.5mm mica quanh lỗ
      for (let a = 0; a < 16; a++) {
        const p = svg.createSVGPoint(); p.x = cx + Math.cos((a / 16) * Math.PI * 2) * rr; p.y = cy + Math.sin((a / 16) * Math.PI * 2) * rr;
        if (!cut.isPointInFill(p)) holeOk = false;
      }
    }
    const img = svg.querySelector('#In image') as SVGImageElement;
    return {
      subpaths: (d.match(/M/g) || []).length, longest: Math.max(b.width, b.height) / 10,
      inside: b.x >= vb.x && b.y >= vb.y && b.x + b.width <= vb.x + vb.width && b.y + b.height <= vb.y + vb.height,
      hasHole: !!hole, holeOk, img: !!img?.getAttribute('href')?.startsWith('data:image/png'),
    };
  });
  expect(r.subpaths, `${label}: đường cắt phải 1 nét liền`).toBe(1);
  expect(r.inside, `${label}: đường cắt nằm trong khung`).toBe(true);
  expect(Math.abs(r.longest - sizeMm), `${label}: cạnh dài ${r.longest.toFixed(1)}mm ≠ ${sizeMm}mm`).toBeLessThan(sizeMm * 0.06 + 1);
  expect(r.img, `${label}: có lớp in`).toBe(true);
  return r;
}

for (const kind of ['sticker', 'keychain'] as const) {
  test(`${kind}: mọi mẫu × kiểu cắt sạch, chụp để soi`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`/studio/${kind}`);
    const presets = page.getByTestId('cut-preset');
    await expect(presets.first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-testid="cut-preset"] svg')).toHaveCount(await presets.count(), { timeout: 60_000 });
    const n = await presets.count();
    for (let i = 0; i < n; i++) {
      await presets.nth(i).click();
      const r = await audit(page, `${kind} mẫu ${i}`, 50);
      expect(r.hasHole).toBe(kind === 'keychain');
      if (kind === 'keychain') expect(r.holeOk, `${kind} mẫu ${i}: lỗ khoen sát mép`).toBe(true);
      await page.getByTestId('cut-preview').screenshot({ path: path.join(OUT, `${kind}-${String(i).padStart(2, '0')}.png`) });
    }
    // đổi kiểu cắt + cỡ trên 1 mẫu
    await presets.nth(1).click();
    const shapes = page.locator('[data-testid="cut-shapes"] button');
    const sizes = page.locator('[data-testid="cut-sizes"] button');
    for (let s = 0; s < await shapes.count(); s++) {
      await shapes.nth(s).click();
      for (let z = 0; z < await sizes.count(); z++) {
        await sizes.nth(z).click();
        const mm = Number((await sizes.nth(z).innerText()).replace(/[^\d.]/g, '')) * 10;
        const r = await audit(page, `${kind} shape ${s} size ${mm}`, mm);
        if (kind === 'keychain') expect(r.holeOk, `${kind} shape ${s} size ${mm}: lỗ khoen`).toBe(true);
      }
    }
  });
}

test('sticker: chữ dài / chỉ chữ / viền dày vẫn 1 nét cắt', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/studio/sticker');
  await expect(page.locator('[data-testid="cut-preset"] svg').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('cut-src-none').click();
  for (const t of ['A', 'Cảm ơn quý khách đã tin tưởng\nủng hộ shop mình nhiều nha\nhẹn gặp lại', 'Hi   bạn']) {
    await page.getByTestId('cut-text').fill(t);
    await audit(page, `chỉ chữ "${t}"`, 50);
  }
  await page.getByTestId('cut-src-icon').click();
  await page.locator('[data-testid="cut-shapes"] button').first().click();
  await page.getByTestId('cut-border').fill('5');
  await audit(page, 'viền 5mm', 50);
  await page.getByTestId('cut-preview').screenshot({ path: path.join(OUT, 'sticker-border5.png') });
});

test('móc khoá: tải PNG + file cắt + tờ A4', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/studio/keychain');
  await expect(page.locator('[data-testid="cut-preset"] svg').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(300);
  const save = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(p);
    return { p, name: dl.suggestedFilename(), text: id === 'cut-png' ? '' : fs.readFileSync(p, 'utf8') };
  };
  const png = await save('cut-png');
  expect(fs.statSync(png.p).size).toBeGreaterThan(20_000);
  const svg = await save('cut-svg');
  expect(svg.name).toMatch(/file-cat\.svg$/);
  expect(svg.text).toContain('id="CutContour"');
  expect(svg.text).toContain('id="In"');
  expect(svg.text).toMatch(/width="[\d.]+mm"/);
  const sheet = await save('cut-sheet');
  const n = Number(/-(\d+)con\.svg$/.exec(sheet.name)?.[1]);
  expect(n).toBeGreaterThanOrEqual(12);
  expect((sheet.text.match(/<use /g) || []).length).toBe(n * 2);
});
