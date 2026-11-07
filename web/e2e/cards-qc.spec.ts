import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC trang Thiệp (/studio/cards): mọi mẫu × khổ, tên dài — chữ không tràn khung/không đè nhau, tải PNG + PDF in đúng.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cards');
fs.mkdirSync(OUT, { recursive: true });

// chữ nằm trọn trong thiệp, trong bề rộng cho phép, và không đè lên nhau
async function audit(page: Page, label: string) {
  const bad = await page.locator('[data-testid="card-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const errs: string[] = [];
    const boxes: { b: DOMRect; t: string }[] = [];
    svg.querySelectorAll<SVGTextElement>('[data-card-text]').forEach((el) => {
      const b = el.getBBox();
      const maxw = Number(el.dataset.maxw), cx = Number(el.dataset.cx);
      const t = el.textContent || '';
      if (b.x < vb.x - 1 || b.x + b.width > vb.x + vb.width + 1 || b.y < vb.y - 1 || b.y + b.height > vb.y + vb.height + 1) errs.push(`ra ngoài thiệp: "${t}"`);
      if (b.width > maxw * 1.02 + 2 || Math.abs(b.x + b.width / 2 - cx) > maxw * 0.55) errs.push(`tràn bề rộng: "${t}" ${b.width.toFixed(0)}>${maxw.toFixed(0)}`);
      boxes.push({ b, t });
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].b, c = boxes[j].b;
      const ox = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x);
      const oy = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
      // bbox chữ viết tay có đuôi dài → chỉ bắt chồng nhau thật (> 35% chiều cao dòng thấp hơn)
      if (ox > 2 && oy > Math.min(a.height, c.height) * 0.35) errs.push(`đè nhau: "${boxes[i].t}" × "${boxes[j].t}"`);
    }
    return errs;
  });
  expect(bad, label).toEqual([]);
}

test('Thiệp: mọi mẫu cưới + sinh nhật sạch layout, chụp lại để soi', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/studio/cards');
  await expect(page.getByTestId('card-tpl')).toHaveCount(28, { timeout: 60_000 });
  for (const kind of ['Thiệp cưới', 'Sinh nhật']) {
    await page.getByRole('button', { name: kind, exact: true }).click();
    const tpls = page.getByTestId('card-tpl');
    const n = await tpls.count();
    expect(n).toBeGreaterThanOrEqual(24);
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      const name = (await tpls.nth(i).innerText()).trim();
      await audit(page, `${kind} · ${name}`);
      if (i % 4 === 0) await page.getByTestId('card-preview').screenshot({ path: path.join(OUT, `${kind === 'Sinh nhật' ? 'bd' : 'wd'}-${String(i).padStart(2, '0')}.png`) });
    }
  }
});

test('Thiệp: đổi khổ + tên/địa chỉ dài vẫn không tràn', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/studio/cards');
  await expect(page.getByTestId('card-tpl')).toHaveCount(28, { timeout: 60_000 });
  await page.getByTestId('card-groom').fill('Nguyễn Trần Hoàng Gia Khánh');
  await page.getByTestId('card-bride').fill('Lê Phạm Ngọc Thu Hà Phương');
  await page.getByTestId('card-address').fill('Nhà hàng tiệc cưới Riverside Palace, 360D Bến Vân Đồn, Phường 1, Quận 4, Thành phố Hồ Chí Minh');
  await page.getByTestId('card-groomFamily').fill('Ông Nguyễn Trần Văn Hoàng Long\nBà Phạm Thị Ngọc Bích\nQ. Tân Phú, TP.HCM');
  const sizes = page.getByTestId('card-size');
  const tpls = page.getByTestId('card-tpl');
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < await tpls.count(); i++) {
      await tpls.nth(i).click();
      await audit(page, `cưới dài · khổ ${s} · mẫu ${i}`);
    }
    await page.getByTestId('card-preview').screenshot({ path: path.join(OUT, `long-size${s}.png`) });
  }
  await page.getByRole('button', { name: 'Sinh nhật', exact: true }).click();
  await page.getByTestId('card-name').fill('Nguyễn Hoàng Bảo Anh Thư');
  await page.getByTestId('card-age').fill('100');
  await page.getByTestId('card-message').fill('Thân mời cả nhà cùng bạn bè gần xa đến chung vui tiệc sinh nhật tròn trăm tuổi của cụ, có tiệc buffet và văn nghệ');
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < await tpls.count(); i++) {
      await tpls.nth(i).click();
      await audit(page, `sinh nhật dài · khổ ${s} · mẫu ${i}`);
    }
  }
});

test('Thiệp: tải PNG + file in PDF', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/studio/cards');
  await expect(page.getByTestId('card-tpl')).toHaveCount(28, { timeout: 60_000 });
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByTestId('card-png').click()]);
  const pngPath = path.join(OUT, png.suggestedFilename());
  await png.saveAs(pngPath);
  expect(fs.statSync(pngPath).size).toBeGreaterThan(50_000);
  const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('card-pdf').click()]);
  const pdfPath = path.join(OUT, pdf.suggestedFilename());
  await pdf.saveAs(pdfPath);
  const head = fs.readFileSync(pdfPath).subarray(0, 5).toString();
  expect(head).toBe('%PDF-');
  expect(pdf.suggestedFilename()).toContain('12x17cm');
});
