import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Lót ly: mọi mẫu × mọi hình (tròn, vuông, die-cut) × 2 mặt — chữ nằm gọn trong đường cắt, không đè nhau,
// không quá nhỏ, không đè QR; 3 chất liệu; chữ dài; logo; tải PNG 2 mặt / PDF 2 trang / zip tờ in–cắt; 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'coaster');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'coaster');

async function audit(page: Page, label: string) {
  for (const side of ['front', 'back'] as const) {
    const r = await page.locator(`[data-testid="co-preview-${side}"] svg`).evaluate((svg: SVGSVGElement) => {
      const d = svg.querySelector('#CutPreview')!.getAttribute('d')!;
      const NS = 'http://www.w3.org/2000/svg';
      const cut = document.createElementNS(NS, 'path'); cut.setAttribute('d', d); svg.appendChild(cut);
      const inside = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x / 10; p.y = y / 10; return cut.isPointInFill(p); };
      const texts = Array.from(svg.querySelectorAll('#Content text')) as SVGTextElement[];
      const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
        const b = t.getBBox();
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        const base = parseFloat(t.getAttribute('y') || '0');
        return { role: t.getAttribute('data-role') || '', text: t.textContent || '', fs, x0: b.x, x1: b.x + b.width, y0: base - fs * 0.8, y1: base + fs * 0.15 };
      });
      const out: string[] = [];
      for (const b of boxes) {
        const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [(b.x0 + b.x1) / 2, b.y0], [(b.x0 + b.x1) / 2, b.y1]];
        if (!pts.every(([x, y]) => inside(x, y))) out.push(`chữ lòi ra ngoài đường cắt: "${b.text}"`);
        const min = b.role === 'brand' ? 22 : 13; // 2.2mm / 1.3mm
        if (b.fs < min) out.push(`chữ quá nhỏ (${(b.fs / 10).toFixed(2)}mm): "${b.text}"`);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1) out.push(`chữ đè nhau: "${a.text}" × "${c.text}"`);
      }
      const qr = svg.querySelector('[data-role="qr"] rect') as SVGRectElement | null;
      if (qr) {
        const q = qr.getBBox();
        for (const [x, y] of [[q.x, q.y], [q.x + q.width, q.y], [q.x, q.y + q.height], [q.x + q.width, q.y + q.height]]) if (!inside(x, y)) out.push('QR lòi ra ngoài đường cắt');
        for (const b of boxes) if (b.x0 < q.x + q.width && q.x < b.x1 && b.y0 < q.y + q.height && q.y < b.y1) out.push(`chữ đè QR: "${b.text}"`);
      }
      cut.remove();
      return { out, n: boxes.length, roles: boxes.map((b) => b.role) };
    });
    expect(r.out, `${label} · mặt ${side}`).toEqual([]);
    expect(r.n, `${label} · mặt ${side}: không có chữ`).toBeGreaterThan(1);
    if (side === 'front') expect(r.roles, `${label}: thiếu tên`).toContain('brand');
  }
}

test('Lót ly: mọi mẫu × hình × 2 mặt, chất liệu, chữ dài, tải file, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/coaster');
  const tpls = page.getByTestId('co-tpl');
  await expect(tpls).toHaveCount(12, { timeout: 120_000 });
  await page.getByTestId('tab-flat').click();
  const shapes = page.getByTestId('co-shape');
  const nShapes = await shapes.count();
  expect(nShapes).toBe(7);

  for (let i = 0; i < 12; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(60);
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('co-preview-front').locator('..').locator('..').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
    for (let s = 0; s < nShapes; s++) {
      await shapes.nth(s).click();
      await page.waitForTimeout(30);
      await audit(page, `mẫu ${i} hình ${s}`);
    }
  }

  // 3 chất liệu trên vài mẫu
  for (const i of [0, 3, 5, 9, 11]) {
    await tpls.nth(i).click();
    for (const m of ['wood', 'rubber', 'pulp']) {
      await page.getByTestId(`co-mat-${m}`).click();
      await page.waitForTimeout(40);
      await audit(page, `mẫu ${i} ${m}`);
    }
  }

  // chữ dài trên mọi hình × mọi bố cục
  await tpls.nth(0).click();
  const long = { brand: 'CÔNG TY TNHH CÀ PHÊ RANG XAY QUỐC BẢO', tagline: 'CÀ PHÊ SẠCH · RANG MỘC · GIAO TẬN NƠI', slogan: 'Mỗi ly cà phê là một câu chuyện vui', est: 'SINCE 2019 · SÀI GÒN', wifi: 'QuocBao Coffee Tang 2 Wifi 5G', pass: 'caphengonmoingay2026', handle: '@quocbao.coffee.rangxay', link: 'https://instagram.com/quocbao.coffee.rangxay/menu-mua-he-2026' };
  for (const [k, v] of Object.entries(long)) await page.getByTestId(`co-field-${k}`).fill(v);
  const layouts = page.getByTestId('co-layout');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (let s = 0; s < nShapes; s++) {
      await shapes.nth(s).click();
      await page.waitForTimeout(30);
      await audit(page, `chữ dài bố cục ${l} hình ${s}`);
    }
    await page.getByTestId('co-preview-front').locator('..').locator('..').screenshot({ path: path.join(OUT, `chu-dai-${l}.png`) });
  }

  // logo khách
  await tpls.nth(0).click();
  for (const [k, v] of Object.entries({ brand: 'THU HÀ COFFEE', tagline: 'RANG XAY MỖI NGÀY', slogan: 'Cà phê ngon – chuyện vui', est: 'SINCE 2019', wifi: 'ThuHa Coffee', pass: 'caphengon', handle: '@thuha.coffee', link: 'https://instagram.com/thuha.coffee' })) await page.getByTestId(`co-field-${k}`).fill(v);
  const png = Buffer.from((await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d')!;
    x.fillStyle = '#7C3A12'; x.beginPath(); x.arc(100, 100, 90, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.fillText('TH', 100, 132);
    return c.toDataURL('image/png');
  })).split(',')[1], 'base64');
  await page.getByTestId('co-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="co-preview-front"] svg [data-role="logo"]')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'logo');
  await page.getByRole('button', { name: /Bỏ logo/ }).click();

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  expect(fs.readFileSync(await grab('co-png')).readUInt32BE(16)).toBe(1600);
  expect(fs.readFileSync(await grab('co-png-back')).readUInt32BE(16)).toBe(1600);
  const pdf = fs.readFileSync(await grab('co-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const zip = fs.readFileSync(await grab('co-zip')).toString('utf8');
  expect(zip.startsWith('PK')).toBe(true);
  expect((zip.match(/id="CutContour"/g) || []).length).toBe(1); // chỉ tờ mặt trước
  expect((zip.match(/id="In"/g) || []).length).toBe(2);
  expect(zip).not.toMatch(/<text[\s>]/);
  const per = Number(/data-count="(\d+)"/.exec(zip)?.[1]);
  expect(per).toBeGreaterThanOrEqual(12);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 3D: 3 chất liệu, ảnh lớn
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __coSnap?: unknown }).__coSnap);
  const snap = async (name: string) => {
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => (window as unknown as { __coSnap: (w: number, h: number) => Promise<string> }).__coSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(150_000);
    fs.writeFileSync(path.join(OUT, name), buf);
    return buf;
  };
  await page.getByTestId('co-mat-pulp').click();
  fs.writeFileSync(path.join(SHOTS, 'lot-ly-giay-boi-ca-phe-3d.png'), await snap('3d-pulp.png'));
  await tpls.nth(3).click();
  fs.writeFileSync(path.join(SHOTS, 'lot-ly-bia-tem-co-dien-3d.png'), await snap('3d-beer.png'));
  await tpls.nth(1).click();
  await page.getByTestId('co-mat-wood').click();
  fs.writeFileSync(path.join(SHOTS, 'lot-ly-go-hat-ca-phe-3d.png'), await snap('3d-wood.png'));
  await tpls.nth(5).click();
  await page.getByTestId('co-mat-rubber').click();
  fs.writeFileSync(path.join(SHOTS, 'lot-ly-cao-su-tra-sua-3d.png'), await snap('3d-rubber.png'));
  await page.getByTestId('co-mat-pulp').click();
  await tpls.nth(9).click();
  await snap('3d-wedding.png');
  // khung xem 3D trên trang + tải ảnh 3D
  const d3 = fs.readFileSync(await grab('co-3d'));
  expect(d3.readUInt32BE(16)).toBe(1600);

  expect(errors).toEqual([]);
});
