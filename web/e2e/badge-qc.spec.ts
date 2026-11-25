import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thẻ đeo: mọi mẫu × mọi khổ × 2 loại — chữ nằm trong thẻ, né lỗ bấm, không đè nhau; tên dài vẫn vừa;
// danh sách 30 người ra đủ 30 thẻ, PDF in đủ 30 + 1 trang mặt sau; PDF dây đeo, PNG, 3D dựng được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'badge');

async function audit(page: Page, label: string, id = 'bd-front') {
  const r = await page.locator(`[data-testid="${id}"] svg`).evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const slot = svg.querySelector('[data-noprint]') as SVGGraphicsElement | null;
    const sb = slot?.getBBox();
    const boxes: { t: string; x0: number; x1: number; y0: number; y1: number }[] = [];
    const bad: string[] = [];
    svg.querySelectorAll('text').forEach((t) => {
      if (t.closest('[transform]') || t.getAttribute('transform') || !t.textContent?.trim()) return; // chữ xoay (dải dọc) bỏ qua
      if (t.closest('clipPath') || t.closest('g[clip-path]')) return; // chữ cái đầu trong khung ảnh
      const b = t.getBBox();
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      const y = parseFloat(t.getAttribute('y') || '0');
      const box = { t: t.textContent!, x0: b.x, x1: b.x + b.width, y0: y - fs * 0.72, y1: y + fs * 0.2 };
      if (box.x0 < vb.x + 20 || box.x1 > vb.x + vb.width - 20 || box.y0 < vb.y + 20 || box.y1 > vb.y + vb.height - 12) bad.push(`ngoài thẻ: ${box.t}`);
      if (sb && box.x1 > sb.x && box.x0 < sb.x + sb.width && box.y0 < sb.y + sb.height + 6 && box.y1 > sb.y) bad.push(`đè lỗ bấm: ${box.t}`);
      if (fs < 12) bad.push(`chữ quá nhỏ (${(fs / 10).toFixed(2)}mm): ${box.t}`);
      boxes.push(box);
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ox > 4 && oy > 4) bad.push(`đè nhau: "${a.t}" × "${c.t}"`);
    }
    return { bad, n: boxes.length };
  });
  expect(r.bad, label).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(3);
}

const LONG_STAFF = 'Nguyễn Hoàng Thiên Phúc Quốc Bảo | Phó Giám đốc Phát triển Kinh doanh Khu vực Miền Nam | AK-2027-000123';
const LONG_EVENT = 'Tôn Nữ Hoàng Thị Bảo Ngọc Thu Hà | Tổng Giám đốc Tập đoàn Đầu tư Phát triển Sao Mai Toàn Cầu | Diễn giả';

test('Thẻ đeo: mọi mẫu, tên dài, in hàng loạt 30 người, tải file', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/badge');
  await expect(page.getByTestId('bd-tpl').first()).toBeVisible({ timeout: 60_000 });
  // mặc định tab 3D: dựng được canvas
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('tab-flat').click();

  for (const kind of ['staff', 'event'] as const) {
    await page.getByTestId(`bd-kind-${kind}`).click();
    await page.waitForTimeout(300);
    const sizes = page.locator('[data-testid="bd-sizes"] button');
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      const tpls = page.getByTestId('bd-tpl');
      for (let i = 0; i < await tpls.count(); i++) {
        await tpls.nth(i).click();
        await page.waitForTimeout(80);
        await audit(page, `${kind} khổ ${s} mẫu ${i}`);
        await audit(page, `${kind} khổ ${s} mẫu ${i} mặt sau`, 'bd-back');
        if (s === 0) await page.getByTestId('bd-front').screenshot({ path: path.join(OUT, `${kind}-${i + 1}.png`) });
      }
      // tên + chức vụ rất dài vẫn vừa thẻ (mẫu cuối của khổ này)
      const people = page.getByTestId('bd-people');
      const keep = await people.inputValue();
      await people.fill(kind === 'staff' ? LONG_STAFF : LONG_EVENT);
      for (let i = 0; i < await tpls.count(); i++) {
        await tpls.nth(i).click(); await page.waitForTimeout(60);
        await audit(page, `${kind} khổ ${s} mẫu ${i} tên dài`);
      }
      await page.getByTestId('bd-front').screenshot({ path: path.join(OUT, `${kind}-size${s}-ten-dai.png`) });
      await people.fill(keep);
    }
    await page.getByTestId('bd-back').screenshot({ path: path.join(OUT, `${kind}-mat-sau.png`) });
  }

  // in hàng loạt: 30 người → 30 thẻ, PDF 31 trang (30 mặt trước + 1 mặt sau chung)
  await page.getByTestId('bd-kind-staff').click();
  const list = Array.from({ length: 30 }, (_, i) => `Nhân viên Số ${i + 1} | Chuyên viên ${i % 3 ? 'Kinh doanh' : 'Kỹ thuật'} | AK-${String(100 + i)}`).join('\n');
  await page.getByTestId('bd-people').fill(list);
  await expect(page.getByTestId('bd-card')).toHaveCount(30);
  await expect(page.getByTestId('bd-person')).toHaveCount(30);
  await expect(page.locator('[data-testid="bd-print-cards"] > div > svg')).toHaveCount(30);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('bd-pdf')).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, 'PDF thẻ: 30 mặt trước + 1 mặt sau').toBe(31);
  const lan = fs.readFileSync(await grab('bd-lanyard-pdf')).toString('latin1');
  expect(lan.startsWith('%PDF')).toBe(true);
  expect(lan).toMatch(/\/MediaBox\s*\[\s*0 0 2551/); // 900mm = 2551pt
  const png = fs.readFileSync(await grab('bd-png'));
  expect(png.readUInt32BE(16)).toBe(1600);

  // 3D dựng lại sau khi đổi bao đựng / bản dây
  await page.getByTestId('tab-3d').click();
  await page.locator('[data-testid="bd-holder"] button').first().click();
  await page.locator('[data-testid="bd-lanyard-w"] button').nth(1).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
