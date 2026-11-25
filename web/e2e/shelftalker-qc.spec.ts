import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tem kệ · wobbler · shelf strip · tem giá · bảng treo: mọi mẫu chữ nằm trong hình bế, không đè nhau, đủ lớn;
// tem giá tự tính % giảm + số tờ đúng; file in–cắt có CutContour, chữ đã outline; 3D dựng được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'shelftalker');
const TPLS = ['wob-sale', 'wob-arrow', 'wob-pharma', 'wob-baby', 'wob-beauty', 'strip-sale', 'strip-elec', 'strip-pharma', 'tag-shock', 'tag-pharma', 'dan-sale', 'dan-baby', 'dan-elec'];

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: string[] = [];
    const svgs = Array.from(document.querySelectorAll('[data-testid="st-preview"] svg[data-kind]')) as SVGSVGElement[];
    // dải strip: chỉ soi bản cả dải (bản phóng to là crop)
    const list = svgs.filter((s) => !(s.dataset.kind === 'strip' && s.viewBox.baseVal.width < 900));
    let texts = 0;
    for (const svg of list) {
      const cut = svg.querySelector('[data-cut]') as SVGPathElement;
      const boxes: { x0: number; x1: number; y0: number; y1: number; t: string }[] = [];
      for (const el of Array.from(svg.querySelectorAll('text:not([data-shadow])')) as SVGTextElement[]) {
        const t = el.textContent || ''; if (!t.trim()) continue;
        texts++;
        const fs = parseFloat(el.getAttribute('font-size') || '0'), base = parseFloat(el.getAttribute('y') || '0');
        const bb = el.getBBox();
        const box = { x0: bb.x + bb.width * 0.01, x1: bb.x + bb.width * 0.99, y0: base - fs * 0.74, y1: base + fs * 0.12, t };
        boxes.push(box);
        if (fs < 1.6) out.push(`chữ quá nhỏ ${fs.toFixed(2)}mm: "${t}"`);
        for (const [x, y] of [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]]) {
          const p = svg.createSVGPoint(); p.x = x; p.y = y;
          if (!cut.isPointInFill(p)) { out.push(`lòi khỏi hình bế: "${t}" (${x.toFixed(1)},${y.toFixed(1)})`); break; }
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 0.3 && oy > 0.3) out.push(`đè nhau: "${a.t}" × "${b.t}"`);
      }
    }
    return { out, texts, n: list.length };
  });
  expect(r.n, `${label}: có bản xem trước`).toBeGreaterThan(0);
  expect(r.texts, `${label}: có chữ`).toBeGreaterThan(2);
  expect(r.out, label).toEqual([]);
}

const grab = async (page: Page, id: string) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
};

test('Tem kệ · wobbler · strip · tem giá · bảng treo: mọi mẫu, tem giá hàng loạt, file in–cắt, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/shelftalker');
  await expect(page.getByTestId('st-tpl').first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();

  for (const id of TPLS) {
    await page.locator(`[data-tpl="${id}"]`).click();
    await page.waitForTimeout(250);
    await audit(page, `mẫu ${id}`);
    await page.getByTestId('st-preview').screenshot({ path: path.join(OUT, `st-${id}.png`) });
  }

  // chữ rất dài: mọi hình wobbler + bảng treo vẫn gọn trong hình bế
  await page.getByTestId('st-kind-wobbler').click();
  await page.getByTestId('st-field-headline').fill('Siêu khuyến mãi cuối năm cực sốc');
  await page.getByTestId('st-field-value').fill('Giảm đến -50%');
  await page.getByTestId('st-field-sub').fill('Áp dụng cho toàn bộ ngành hàng tiêu dùng đến hết ngày 31/12/2026');
  await page.getByTestId('st-field-brand').fill('Siêu thị mini Quốc Bảo chi nhánh Thủ Đức');
  for (const s of await page.locator('[data-testid="st-wob-shapes"] button').all()) { await s.click(); await page.waitForTimeout(150); await audit(page, `wobbler dài ${await s.innerText()}`); }
  await page.getByTestId('st-kind-dangler').click();
  for (const s of await page.locator('[data-testid="st-dan-shapes"] button').all()) { await s.click(); await page.waitForTimeout(150); await audit(page, `bảng treo dài ${await s.innerText()}`); }
  await page.getByTestId('st-kind-strip').click(); await page.waitForTimeout(150); await audit(page, 'strip dài');

  // tem giá: % giảm tự tính, 30 sản phẩm → số tờ đúng, mọi khổ
  await page.locator('[data-tpl="tag-shock"]').click();
  const lines = ['Nước giặt hương hoa | 100.000 | 75.000 | Túi 3,5kg'];
  for (let i = 2; i <= 30; i++) lines.push(`Sản phẩm khuyến mãi số ${i} tên khá dài để thử xuống dòng | ${50 + i}k | ${40 + i}k | Hộp ${i}0g`);
  await page.getByTestId('st-field-items').fill(lines.join('\n'));
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid="st-preview"] [data-role="pct"]')).toHaveText('-25%');
  await expect(page.getByTestId('st-items-info')).toContainText('30 sản phẩm');
  for (const s of await page.locator('[data-testid="st-tag-sizes"] button').all()) { await s.click(); await page.waitForTimeout(150); await audit(page, `tem giá ${await s.innerText()}`); }
  await page.locator('[data-testid="st-tag-sizes"] button').first().click(); // 18 tem/tờ → 2 tờ
  await page.waitForTimeout(300);
  const pdf = fs.readFileSync(await grab(page, 'st-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const zip = fs.readFileSync(await grab(page, 'st-svg')).toString('latin1');
  expect(zip.startsWith('PK')).toBe(true);
  expect((zip.match(/id="CutContour"/g) || []).length).toBe(2);
  expect(zip).not.toMatch(/<text[\s>]/);
  const png = fs.readFileSync(await grab(page, 'st-png'));
  expect(png.readUInt32BE(16)).toBe(1600);

  // wobbler: file in–cắt 1 tờ SVG, có CutContour, chữ outline
  await page.locator('[data-tpl="wob-sale"]').click(); await page.waitForTimeout(300);
  const svg = fs.readFileSync(await grab(page, 'st-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect(svg).not.toMatch(/<text[\s>]/);
  // bảng treo 2 mặt → zip 2 tờ
  await page.locator('[data-tpl="dan-elec"]').click(); await page.waitForTimeout(300);
  const dz = fs.readFileSync(await grab(page, 'st-svg')).toString('latin1');
  expect((dz.match(/id="CutContour"/g) || []).length).toBe(2);
  expect(dz).toContain('mat-sau');

  // 3D: mỗi loại dựng được, chụp ảnh
  await page.getByTestId('tab-3d').click();
  for (const id of ['wob-sale', 'strip-elec', 'tag-pharma', 'dan-baby']) {
    await page.locator(`[data-tpl="${id}"]`).click();
    await page.waitForTimeout(3500);
    const u = await page.evaluate(async () => await (window as unknown as { __stSnap: (w: number, h: number) => Promise<string> }).__stSnap(1200, 900));
    expect(u.length).toBeGreaterThan(20000);
    fs.writeFileSync(path.join(OUT, `st-3d-${id}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  const p3 = fs.readFileSync(await grab(page, 'st-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
