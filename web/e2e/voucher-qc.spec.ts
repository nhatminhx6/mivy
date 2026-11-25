import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Voucher · thẻ tích điểm · coupon: mọi mẫu × khổ × 2 mặt — chữ nằm trong khổ (chừa 0.5mm), không lấn qua răng cưa
// (cuống ↔ thân), có mã số đúng mặt; tờ in hàng loạt mã liên tiếp không trùng; PDF/ZIP/PNG tải được; 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'voucher');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const res: { side: string; bad: string[]; serials: string[]; texts: number; minFont: number }[] = [];
    for (const side of ['front', 'back']) {
      const svg = document.querySelector(`[data-testid="vc-${side}"] svg`) as SVGSVGElement;
      const vb = svg.viewBox.baseVal; const sr = svg.getBoundingClientRect();
      const k = vb.width / sr.width;
      const toU = (r: DOMRect) => ({ x0: (r.left - sr.left) * k + vb.x, y0: (r.top - sr.top) * k + vb.y, x1: (r.right - sr.left) * k + vb.x, y1: (r.bottom - sr.top) * k + vb.y });
      const bad: string[] = []; let minFont = 99;
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
      // vùng cuống / thân (voucher): lấy theo hình chữ nhật nền của vùng
      const regions = Array.from(svg.querySelectorAll('[data-region]')).map((g) => {
        const rect = g.querySelector(':scope > rect') as SVGRectElement | null;
        return { el: g, name: g.getAttribute('data-region'), x0: rect ? +rect.getAttribute('x')! : 0, x1: rect ? +rect.getAttribute('x')! + +rect.getAttribute('width')! : vb.width };
      });
      for (const t of texts) {
        const b = toU(t.getBoundingClientRect());
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        if (!t.closest('[data-motif]')) minFont = Math.min(minFont, fs);
        // hộp chữ của font (gồm khoảng trên/dưới) → chừa 0.5mm, nhưng chỉ xét bề ngang chặt, bề dọc nới theo cỡ chữ
        const padY = fs * 0.12;
        if (b.x0 < 5 || b.x1 > vb.width - 5 || b.y0 < -padY || b.y1 > vb.height + padY) bad.push(`"${t.textContent}" ra ngoài khổ (${b.x0.toFixed(0)},${b.y0.toFixed(0)},${b.x1.toFixed(0)},${b.y1.toFixed(0)})`);
        const reg = regions.find((g) => g.el.contains(t));
        if (reg && regions.length > 1 && (b.x0 < reg.x0 - 2 || b.x1 > reg.x1 + 2)) bad.push(`"${t.textContent}" lấn khỏi vùng ${reg.name}`);
      }
      const serials = Array.from(svg.querySelectorAll('[data-serial]')).map((s) => s.textContent || '');
      res.push({ side, bad, serials, texts: texts.length, minFont });
    }
    return res;
  });
  for (const s of r) {
    expect(s.bad, `${label} ${s.side}`).toEqual([]);
    expect(s.texts, `${label} ${s.side}: có chữ`).toBeGreaterThan(3);
    expect(s.minFont, `${label} ${s.side}: chữ quá nhỏ`).toBeGreaterThanOrEqual(15);
  }
  return r;
}

test('Voucher · thẻ tích điểm · coupon: mọi mẫu × khổ, mã số, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/voucher');
  await expect(page.getByTestId('vc-tpl').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();

  let n = 0;
  for (const kind of ['voucher', 'loyalty', 'coupon']) {
    await page.getByTestId(`vc-kind-${kind}`).click();
    const tpls = page.getByTestId('vc-tpl');
    const sizes = page.locator('[data-testid="vc-sizes"] button');
    for (let i = 0; i < await tpls.count(); i++) {
      await tpls.nth(i).click();
      for (let z = 0; z < await sizes.count(); z++) {
        await sizes.nth(z).click();
        await page.waitForTimeout(80);
        const r = await audit(page, `${kind} mẫu ${i} khổ ${z}`);
        const numbered = kind === 'loyalty' ? 'back' : 'front';
        const sr = r.find((x) => x.side === numbered)!;
        expect(sr.serials.length, `${kind} mẫu ${i}: có mã số`).toBeGreaterThanOrEqual(1);
        if (z === 0) await page.locator('[data-testid="vc-front"]').screenshot({ path: path.join(OUT, `${kind}-${i + 1}-truoc.png`) });
        if (z === 0) await page.locator('[data-testid="vc-back"]').screenshot({ path: path.join(OUT, `${kind}-${i + 1}-sau.png`) });
        n++;
      }
    }
  }
  expect(n).toBeGreaterThanOrEqual(18);

  // chữ rất dài vẫn gọn (voucher)
  await page.getByTestId('vc-kind-voucher').click();
  await page.getByTestId('vc-tpl').nth(1).click();
  await page.getByTestId('vc-field-brand').fill('NHÀ HÀNG ẨM THỰC TRUYỀN THỐNG QUỐC BẢO');
  await page.getByTestId('vc-field-valueNote').fill('Áp dụng cho tất cả các món trong thực đơn, kể cả đồ uống và tráng miệng vào cuối tuần');
  await page.getByTestId('vc-field-cond').fill('Áp dụng tất cả các ngày trong tuần kể cả ngày lễ tết\nĐặt bàn trước tối thiểu 24 giờ qua hotline hoặc fanpage\nKhông quy đổi thành tiền mặt, không hoàn lại tiền thừa\nMỗi hoá đơn chỉ áp dụng một phiếu quà tặng');
  for (let z = 0; z < 2; z++) { await page.locator('[data-testid="vc-sizes"] button').nth(z).click(); await audit(page, `chữ dài khổ ${z}`); }
  await page.locator('[data-testid="vc-front"]').screenshot({ path: path.join(OUT, 'voucher-chu-dai.png') });

  // mã số: tờ in mã liên tiếp, không trùng
  await page.getByTestId('vc-field-prefix').fill('QB');
  await page.getByTestId('vc-field-start').fill('120');
  await page.getByTestId('vc-field-count').fill('9');
  await page.waitForTimeout(200);
  const sheet = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="vc-sheet"] [data-serial]')).map((s) => s.textContent));
  expect(sheet.length).toBeGreaterThan(0);
  // voucher: mỗi tấm in mã ở thân + cuống (2 chỗ cùng 1 số) → các số khác nhau phải liên tiếp, mỗi số đúng 2 lần
  const uniq = [...new Set(sheet)];
  uniq.forEach((s, i) => expect(s).toBe(`QB${String(120 + i).padStart(5, '0')}`));
  const per = await page.evaluate(() => Number(document.querySelector('[data-testid="vc-sheet"] svg')!.getAttribute('data-count')));
  expect(uniq.length, 'mỗi tấm 1 mã riêng').toBe(per);
  expect(sheet.length).toBe(per * 2);
  await expect(page.getByTestId('vc-serial-info')).toContainText('QB00120');
  await expect(page.getByTestId('vc-serial-info')).toContainText('QB00128');

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return { p, buf: fs.readFileSync(p) };
  };
  // ép kim bật → PDF 5 trang (trước, sau, đường cắt, 2 khuôn ép kim)
  if (!(await page.getByTestId('vc-foil').isChecked())) await page.getByTestId('vc-foil').check();
  const pdf = await grab('vc-pdf');
  expect(pdf.buf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.buf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length).toBe(5);
  await page.getByTestId('vc-foil').uncheck();
  const pdf2 = await grab('vc-pdf');
  expect((pdf2.buf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length).toBe(3);
  const png = await grab('vc-png-front');
  expect(png.buf.readUInt32BE(16)).toBe(1800);
  await grab('vc-png-back');
  const zip = await grab('vc-zip');
  expect(zip.buf.subarray(0, 2).toString()).toBe('PK');
  const zs = zip.buf.toString('utf8');
  expect((zs.match(/<svg/g) || []).length, 'zip: tờ có số + tờ mặt kia').toBeGreaterThanOrEqual(2);
  expect(zs).toContain('id="CutContour"');
  expect(zs).toContain('id="Perf"');
  expect(zs.includes('<text'), 'chữ trong tờ in phải outline hết').toBe(false);

  // 3D mọi loại
  await page.getByTestId('tab-3d').click();
  for (const kind of ['voucher', 'loyalty', 'coupon']) {
    await page.getByTestId(`vc-kind-${kind}`).click();
    await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
    const url = await page.evaluate(() => (window as unknown as { __vcSnap: (w: number, h: number) => Promise<string> }).__vcSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${kind}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const shot = await grab('vc-3d-png');
  expect(shot.buf.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
