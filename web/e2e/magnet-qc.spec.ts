import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Nam châm tủ lạnh: mọi mẫu × mọi hình (chữ nhật, tròn, die-cut) — chữ nằm gọn trong đường cắt, không đè nhau,
// không quá nhỏ; chữ dài vẫn gọn; tải PNG / PDF / tờ A4 in–cắt (In + CutContour, chữ outline); 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'magnet');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'magnet');

async function audit(page: Page, label: string) {
  const r = await page.locator('[data-testid="mg-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const d = svg.querySelector('#CutPreview')!.getAttribute('d')!;
    const NS = 'http://www.w3.org/2000/svg';
    const cut = document.createElementNS(NS, 'path'); cut.setAttribute('d', d); svg.appendChild(cut);
    const inside = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x / 10; p.y = y / 10; return cut.isPointInFill(p); };
    const texts = Array.from(svg.querySelectorAll('#Content text')) as SVGTextElement[];
    const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox();
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      const base = parseFloat(t.getAttribute('y') || '0');
      // hộp chữ thực theo baseline: dấu tiếng Việt trên hoa ~0.8 cỡ, chân chữ ~0.15 cỡ
      return { role: t.getAttribute('data-role') || '', text: t.textContent || '', fs, x0: b.x, x1: b.x + b.width, y0: base - fs * 0.8, y1: base + fs * 0.15 };
    });
    const out: string[] = [];
    for (const b of boxes) {
      const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [(b.x0 + b.x1) / 2, b.y0], [(b.x0 + b.x1) / 2, b.y1]];
      if (!pts.every(([x, y]) => inside(x, y))) out.push(`chữ lòi ra ngoài đường cắt: "${b.text}"`);
      const min = b.role === 'hotline' ? 30 : b.role === 'brand' ? 20 : 15; // 3mm / 2mm / 1.5mm
      if (b.fs < min) out.push(`chữ quá nhỏ (${(b.fs / 10).toFixed(1)}mm): "${b.text}"`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1) out.push(`chữ đè nhau: "${a.text}" × "${c.text}"`);
    }
    const qr = svg.querySelector('[data-role="qr"] rect') as SVGRectElement | null;
    if (qr) {
      const q = qr.getBBox();
      for (const b of boxes) if (b.role !== 'qr-label' && b.x0 < q.x + q.width && q.x < b.x1 && b.y0 < q.y + q.height && q.y < b.y1) out.push(`chữ đè QR: "${b.text}"`);
    }
    cut.remove();
    return { out, n: boxes.length, roles: boxes.map((b) => b.role) };
  });
  expect(r.out, `${label}`).toEqual([]);
  expect(r.roles, `${label}: thiếu hotline`).toContain('hotline');
  return r;
}

test('Nam châm: mọi mẫu × hình, chữ dài, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/magnet');
  const tpls = page.getByTestId('mg-tpl');
  await expect(tpls).toHaveCount(12, { timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const shapes = page.getByTestId('mg-shape');
  const nShapes = await shapes.count();
  expect(nShapes).toBe(9);

  // mọi mẫu ở hình gốc + mọi hình của mẫu đó
  for (let i = 0; i < 12; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(60);
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('mg-preview').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
    for (let s = 0; s < nShapes; s++) {
      await shapes.nth(s).click();
      await page.waitForTimeout(30);
      await audit(page, `mẫu ${i} hình ${s}`);
    }
  }

  // chữ dài + QR trên mọi hình
  await tpls.nth(0).click();
  await page.getByTestId('mg-field-brand').fill('CÔNG TY TNHH GIAO HÀNG NHANH QUỐC BẢO');
  await page.getByTestId('mg-field-slogan').fill('Gọi là có ngay trong 30 phút!');
  await page.getByTestId('mg-field-hotline').fill('0909 123 456 – 0918 456 789');
  await page.getByTestId('mg-field-service').fill('CƠM VĂN PHÒNG · BÚN PHỞ · TRÀ SỮA · GIAO TẬN NƠI KHU CÔNG NGHIỆP');
  await page.getByTestId('mg-field-extra').fill('Mở cửa 6h – 22h · 125 Nguyễn Thị Thập, Q.7, TP.HCM');
  for (let s = 0; s < nShapes; s++) {
    await shapes.nth(s).click();
    await page.waitForTimeout(40);
    await audit(page, `chữ dài hình ${s}`);
    await page.getByTestId('mg-preview').screenshot({ path: path.join(OUT, `chu-dai-${s}.png`) });
  }

  // logo khách
  const png = Buffer.from((await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d')!;
    x.fillStyle = '#2563EB'; x.beginPath(); x.arc(100, 100, 90, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.fillText('QB', 100, 132);
    return c.toDataURL('image/png');
  })).split(',')[1], 'base64');
  await shapes.nth(0).click();
  await page.getByTestId('mg-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="mg-preview"] svg [data-role="logo"]')).toHaveCount(1, { timeout: 10_000 });

  // tải file
  await page.getByRole('button', { name: /Bỏ logo/ }).click();
  await tpls.nth(1).click(); // ly trà sữa die-cut
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pngF = fs.readFileSync(await grab('mg-png'));
  expect(pngF.readUInt32BE(16)).toBe(1600);
  const pdf = fs.readFileSync(await grab('mg-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svg = fs.readFileSync(await grab('mg-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect(svg).not.toMatch(/<text[\s>]/);
  const per = Number(/data-count="(\d+)"/.exec(svg)?.[1]);
  expect(per).toBeGreaterThanOrEqual(6);
  expect((svg.match(/<use /g) || []).length).toBe(per * 2);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 3D: dựng được + chụp ảnh lớn để soi
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!(window as unknown as { __mgSnap?: unknown }).__mgSnap);
  const snap = async (name: string) => {
    await page.waitForTimeout(600);
    const url = await page.evaluate(() => (window as unknown as { __mgSnap: (w: number, h: number) => Promise<string> }).__mgSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(OUT, name), buf);
    return buf;
  };
  // trả chữ mẫu cho ảnh thành phẩm
  await tpls.nth(0).click();
  for (const [k, v] of Object.entries({ brand: 'BẾP NHÀ THU HÀ', slogan: 'Gọi là có!', hotline: '0909 123 456', service: 'CƠM VĂN PHÒNG · GIAO TẬN NƠI', extra: 'Mở cửa 9h – 21h mỗi ngày' })) await page.getByTestId(`mg-field-${k}`).fill(v);
  fs.writeFileSync(path.join(SHOTS, 'nam-cham-chu-nhat-inox-3d.png'), await snap('3d-card.png'));
  await tpls.nth(1).click();
  await page.getByTestId('mg-materials').locator('button').nth(1).click();
  fs.writeFileSync(path.join(SHOTS, 'nam-cham-ly-tra-sua-mica-3d.png'), await snap('3d-cup-mica.png'));
  await page.getByTestId('mg-materials').locator('button').nth(0).click();
  await tpls.nth(10).click();
  await page.getByTestId('mg-fridge').locator('button').nth(1).click();
  fs.writeFileSync(path.join(SHOTS, 'nam-cham-ngoi-nha-tu-trang-3d.png'), await snap('3d-house-white.png'));
  await page.getByTestId('mg-fridge').locator('button').nth(0).click();
  await tpls.nth(2).click();
  await snap('3d-pizza.png');
  await tpls.nth(8).click();
  await snap('3d-r60.png');

  expect(errors).toEqual([]);
});
