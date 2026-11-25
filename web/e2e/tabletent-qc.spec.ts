import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tent card để bàn: mọi mẫu × mọi mặt — chữ nằm trong mặt thẻ, không chồng nhau, không quá nhỏ;
// 3 kiểu (chữ A / tam giác / mica V) có khuôn bế đúng (nét cắt + số nét gấp); bảng tên N người → PDF N trang;
// tải PNG / PDF / ảnh 3D; ảnh 3D dựng được cho cả 3 kiểu; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tabletent');
fs.mkdirSync(OUT, { recursive: true });

// 1×1 PNG đỏ (logo giả)
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

async function auditFaces(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: { face: number; outside: string[]; overlaps: string[]; tiny: string[]; n: number }[] = [];
    document.querySelectorAll('[data-testid="tt-faces"] [data-testid^="tt-face-"] svg').forEach((svg, fi) => {
      const s = svg as SVGSVGElement;
      const vb = s.viewBox.baseVal;
      const texts = Array.from(s.querySelectorAll('text')) as SVGTextElement[];
      const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
        const b = t.getBBox(); const fs = parseFloat(t.getAttribute('font-size') || '0');
        return { t: (t.textContent || '').trim(), x: b.x, y: b.y, w: b.width, h: b.height, fs };
      });
      const outside = boxes.filter((b) => b.x < vb.x || b.y < vb.y - 2 || b.x + b.w > vb.x + vb.width || b.y + b.h > vb.y + vb.height + 2).map((b) => b.t);
      const overlaps: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ay0 = a.y + a.h * 0.2, ay1 = a.y + a.h * 0.8, cy0 = c.y + c.h * 0.2, cy1 = c.y + c.h * 0.8;
        if (a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && ay0 < cy1 && cy0 < ay1) overlaps.push(`${a.t} ⨯ ${c.t}`);
      }
      // 1 đơn vị lưới = w/1000 mm → cỡ chữ tối thiểu 1.6mm
      const mmPerU = Number(s.closest('[data-face-mm]')?.getAttribute('data-face-mm') || 0.1);
      const tiny = boxes.filter((b) => b.fs * mmPerU < 1.6).map((b) => `${b.t} (${(b.fs * mmPerU).toFixed(2)}mm)`);
      out.push({ face: fi, outside, overlaps, tiny, n: boxes.length });
    });
    return out;
  });
  for (const f of r) {
    expect(f.n, `${label} mặt ${f.face}: có chữ`).toBeGreaterThan(0);
    expect(f.outside, `${label} mặt ${f.face}: chữ lòi ra ngoài`).toEqual([]);
    expect(f.overlaps, `${label} mặt ${f.face}: chữ chồng nhau`).toEqual([]);
    expect(f.tiny, `${label} mặt ${f.face}: chữ quá nhỏ (<1.6mm)`).toEqual([]);
  }
  return r;
}

const pdfPages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

test('Tent card để bàn: mẫu, khuôn bế, bảng tên, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tabletent');
  const tpls = page.getByTestId('tt-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  expect(await tpls.count()).toBeGreaterThanOrEqual(10);
  await page.getByTestId('tab-flat').click();

  // 1) mọi mẫu × 3 kiểu: chữ trong khung, không chồng
  for (const kind of ['a', 'tri', 'v']) {
    await page.getByTestId(`tt-kind-${kind}`).click();
    const n = await tpls.count();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(150);
      await auditFaces(page, `${kind} mẫu ${i}`);
      if (kind === 'a') await page.getByTestId('tt-faces').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}.png`) });
    }
    // khuôn bế: nét cắt + đúng số nét gấp
    const die = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="tt-dieline"] svg')!;
      return { cut: s.querySelectorAll('#CutContour path').length, folds: s.querySelectorAll('#Fold line').length, sheet: s.getAttribute('data-sheet') };
    });
    expect(die.cut, `${kind}: có nét cắt`).toBe(1);
    expect(die.folds, `${kind}: số nét gấp`).toBe(kind === 'a' ? 3 : kind === 'tri' ? 5 : 0);
    await page.getByTestId('tt-dieline').screenshot({ path: path.join(OUT, `khuon-${kind}.png`) });
  }

  // 2) nội dung dài vẫn gọn (chữ A, 10×15)
  await page.getByTestId('tt-kind-a').click();
  await tpls.nth(0).click();
  const longs: [string, string][] = [
    ['tt-comboName', 'Combo bánh flan cà phê muối kèm trà đào cam sả size lớn đặc biệt'],
    ['tt-comboDesc', 'Flan mềm mịn làm mỗi sáng, sốt cà phê rang xay Đà Lạt, kem muối béo nhẹ, thêm hạt điều rang giòn và lá bạc hà tươi'],
    ['tt-wifiName', 'AnKhang_Coffee_Tang2_Khach_VIP'],
    ['tt-brand', 'AN KHANG COFFEE & BAKERY · CHI NHÁNH THỦ ĐỨC'],
  ];
  for (const [id, v] of longs) await page.getByTestId(id).fill(v);
  await page.waitForTimeout(250);
  await auditFaces(page, 'chữ dài');
  // menu mini dài + happy hour
  for (const [i, use] of [[0, 'Menu mini'], [1, 'Happy hour']] as const) await page.getByTestId(`tt-use-${i}`).getByRole('button', { name: new RegExp(use) }).click();
  await page.getByTestId('tt-roomItems').fill(Array.from({ length: 9 }, (_, k) => `Món đặc biệt số ${k + 1} của bếp nhà | ${(k + 5) * 10}.000đ`).join('\n'));
  await page.waitForTimeout(250);
  await auditFaces(page, 'menu dài');
  await page.getByTestId('tt-faces').screenshot({ path: path.join(OUT, 'chu-dai.png') });

  // 3) logo khách tải lên hiện trên mặt thẻ
  await page.getByTestId('tt-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1PX });
  await expect(page.locator('[data-testid="tt-face-0"] svg image')).toHaveCount(1, { timeout: 10_000 });

  // 4) bảng tên: 4 người → 4 thẻ, PDF 4 trang; 20×10 ngang
  const nameTpl = page.getByTestId('tt-tpl').filter({ hasText: 'Bảng tên hội nghị' });
  await nameTpl.first().click();
  await page.getByTestId('tt-names').fill('Nguyễn Quốc Bảo | Giám đốc kinh doanh\nTrần Thu Hà | Trưởng phòng Marketing\nLê Gia Khánh | Đại diện đối tác An Khang\nPhạm Hoàng Bảo Ngọc Thanh Trúc | Phó tổng giám đốc phụ trách khu vực phía Nam');
  await expect(page.getByTestId('tt-count')).toContainText('4 đại biểu');
  await page.getByTestId('tt-who').selectOption('3');
  await page.waitForTimeout(250);
  await auditFaces(page, 'bảng tên dài');
  await page.getByTestId('tt-faces').screenshot({ path: path.join(OUT, 'bang-ten.png') });
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return fs.readFileSync(p);
  };
  const pdfA = await grab('tt-pdf');
  expect(pdfA.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdfPages(pdfA), 'chữ A: 4 đại biểu = 4 trang khuôn').toBe(4);

  // kệ chữ V: 2 thẻ rời / người → 8 trang
  await page.getByTestId('tt-kind-v').click();
  const pdfV = await grab('tt-pdf');
  expect(pdfPages(pdfV), 'mica V: 2 thẻ × 4 người').toBe(8);

  // PNG mặt trước 1600px
  const png = await grab('tt-png');
  expect(png.readUInt32BE(16)).toBe(1600);

  // 5) 3D: cả 3 kiểu dựng được + tải ảnh 3D
  await page.getByTestId('tt-tpl').nth(0).click();
  for (const kind of ['a', 'tri', 'v']) {
    await page.getByTestId(`tt-kind-${kind}`).click();
    await page.waitForTimeout(400);
    const url = await page.evaluate(() => (window as unknown as { __ttSnap: (w: number, h: number) => Promise<string> }).__ttSnap(1200, 900));
    expect(url.length, `3D ${kind}`).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${kind}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(3000);
  const shot3d = await grab('tt-3d');
  expect(shot3d.readUInt32BE(16)).toBe(1600);

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
