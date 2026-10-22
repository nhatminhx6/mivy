import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC trang Tạo logo: lưới 24 logo vẽ sạch (chữ không lòi khung / không đè nhau) với tên ngắn + dài, mọi gu, mọi kiểu;
// xuất PNG đúng kích thước + nền trong suốt; SVG nhúng font; lưu được vào bộ nhận diện. Ảnh lưới → QC_OUT để anh duyệt.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'logo');
const KINDS = ['Chữ + điểm nhấn', 'Chữ in hoa', 'Monogram ngang', 'Monogram đứng', 'Huy hiệu', 'Icon ngang', 'Icon đứng'];

async function checkLogos(page: Page, selector: string, tag: string) {
  const n = await page.locator(selector).count();
  expect(n, `${tag}: không thấy logo nào để kiểm`).toBeGreaterThan(0);
  if (selector.includes("logo-grid")) expect(n, `${tag}: lưới phải đủ 24`).toBe(24);
  const bad = await page.evaluate((sel) => {
    const issues: string[] = [];
    // Hộp NÉT MỰC thật của chữ (canvas actualBoundingBox) — getBBox() của SVG tính cả ô chữ (ascent/descent font)
    // nên báo sai với font ô cao như Pacifico.
    const ctx = document.createElement('canvas').getContext('2d')!;
    const ink = (t: SVGTextElement) => {
      const size = parseFloat(t.getAttribute('font-size') || '16');
      ctx.font = `${t.getAttribute('font-weight') || 400} ${size}px ${t.getAttribute('font-family')}`;
      const ls = t.getAttribute('letter-spacing');
      (ctx as any).letterSpacing = ls ? `${parseFloat(ls) * size}px` : '0px';
      const middle = t.getAttribute('text-anchor') === 'middle';
      ctx.textAlign = middle ? 'center' : 'left';
      const m = ctx.measureText(t.textContent || '');
      const x = parseFloat(t.getAttribute('x') || '0') - (middle && ls ? (parseFloat(ls) * size) / 2 : 0);
      const y = parseFloat(t.getAttribute('y') || '0');
      return { x: x - m.actualBoundingBoxLeft, y: y - m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
    };
    const box = (el: SVGGraphicsElement) => (el.tagName === 'text' && !el.querySelector('textPath') ? ink(el as SVGTextElement) : el.getBBox());
    document.querySelectorAll(sel).forEach((svg, i) => {
      const s = svg as SVGSVGElement;
      if (s.outerHTML.includes('NaN')) issues.push(`#${i} có NaN`);
      const vb = s.viewBox.baseVal;
      const texts = (Array.from(s.querySelectorAll('text')) as SVGTextElement[]).filter((t) => !t.querySelector('textPath'));
      for (const t of texts) {
        const b = box(t);
        if (b.x < vb.x - 1 || b.y < vb.y - 1 || b.x + b.width > vb.x + vb.width + 1 || b.y + b.height > vb.y + vb.height + 1) {
          issues.push(`#${i} ${s.dataset.logoKind}: chữ "${t.textContent}" lòi khung`);
        }
      }
      if (s.dataset.logoKind !== 'badge') {
        const parts = Array.from(s.children).filter((c) => c.tagName === 'text' || c.tagName === 'g') as SVGGraphicsElement[];
        for (let a = 0; a < parts.length; a++) for (let b = a + 1; b < parts.length; b++) {
          const p = box(parts[a]), q = box(parts[b]);
          const ix = Math.min(p.x + p.width, q.x + q.width) - Math.max(p.x, q.x);
          const iy = Math.min(p.y + p.height, q.y + q.height) - Math.max(p.y, q.y);
          if (ix > 2 && iy > 2) issues.push(`#${i} ${s.dataset.logoKind}: "${parts[a].textContent}" đè "${parts[b].textContent}"`);
        }
      }
    });
    return issues;
  }, selector);
  expect(bad, tag).toEqual([]);
}

const pngInfo = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] });

test('Tạo logo: lưới sạch, tinh chỉnh, xuất & lưu', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.goto('/studio/logo');
  const tiles = page.getByTestId('logo-tile');
  await expect(tiles).toHaveCount(24, { timeout: 60_000 });

  // font tiếng Việt load đủ
  const missing = await page.evaluate(() => {
    const fonts = new Set(Array.from(document.querySelectorAll('[data-testid="logo-grid"] text'))
      .map((t) => `${t.getAttribute('font-weight') || 400} 40px ${t.getAttribute('font-family') || ''}`));
    return Array.from(fonts).filter((f) => !document.fonts.check(f, 'Ắ'));
  });
  expect(missing, 'font chưa load').toEqual([]);

  const grid = '[data-testid="logo-grid"] svg[data-logo-kind]';
  for (const [n, s] of [['Mộc', ''], ['Tiệm Bánh Ngọt Nhà Mây Xanh', 'Ngọt ngào mỗi ngày bên bạn'], ['Bánh Mì Cô Ba', 'Ngon từ tâm']]) {
    await page.getByTestId('logo-name').fill(n);
    await page.getByTestId('logo-slogan').fill(s);
    for (const gu of ['', 'Sang trọng', 'Dễ thương', 'Mạnh mẽ']) {
      if (gu) await page.getByRole('button', { name: gu, exact: true }).click();
      await checkLogos(page, grid, `lưới "${n}" gu=${gu || 'tất cả'}`);
      if (gu) await page.getByRole('button', { name: gu, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Xem bộ khác' }).click();
    await checkLogos(page, grid, `lưới "${n}" bộ khác`);
  }
  await page.getByRole('button', { name: 'Xem bộ khác' }).click();
  await page.getByTestId('logo-grid').screenshot({ path: path.join(OUT, 'logo-grid.png') });

  // tinh chỉnh: mọi kiểu trên logo đang chọn
  await tiles.nth(2).click();
  for (const k of KINDS) {
    await page.getByRole('button', { name: k, exact: true }).click();
    await checkLogos(page, '[data-testid="logo-preview"] svg', `preview kiểu ${k}`);
  }
  await page.getByRole('button', { name: 'Monogram ngang', exact: true }).click();
  await page.getByTestId('logo-font').selectOption('playfair');
  await checkLogos(page, '[data-testid="logo-preview"] svg', 'preview đổi font');

  // xuất
  const grab = async (btn: string | RegExp) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: btn }).click()]);
    const p = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(p);
    return p;
  };
  const png = pngInfo(fs.readFileSync(await grab(/PNG nền trong/)));
  expect(png.w).toBe(2000);
  expect(png.colorType, 'PNG phải có kênh alpha (nền trong)').toBe(6);
  const av = pngInfo(fs.readFileSync(await grab(/Avatar tròn/)));
  expect([av.w, av.h]).toEqual([1000, 1000]);
  expect(pngInfo(fs.readFileSync(await grab('Bản đen'))).w).toBe(2000);
  const svgText = fs.readFileSync(await grab(/^SVG$/), 'utf8');
  expect(svgText).toContain('@font-face');
  expect(svgText).toContain('data:font');

  // lưu vào bộ nhận diện
  await page.getByRole('button', { name: /Lưu vào bộ nhận diện/ }).click();
  await expect(page.getByRole('button', { name: /Đã lưu vào bộ nhận diện/ })).toBeVisible({ timeout: 30_000 });
  const kit = await page.evaluate(() => JSON.parse(localStorage.getItem('mivy-brand-v1') || '{}'));
  expect(kit.name).toBe('Bánh Mì Cô Ba');
  expect(String(kit.logo)).toMatch(/^data:image\/png/);
});

// Vùng in trên ảnh mockup thật (khớp PHOTO_PRINT trong merch-engine — đổi bên đó thì đổi ở đây)
const PRINT: Record<string, [number, number, number, number]> = {
  tshirt: [417, 185, 250, 220], mug: [500, 430, 310, 260], tumbler: [450, 445, 190, 230],
  tote: [379, 540, 300, 280], cap: [425, 320, 230, 150], box: [545, 450, 250, 200],
};

test('Logo trên đồ thật: 9 mockup có logo, không lòi khung, tải lẻ + zip', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.goto('/studio/logo');
  await expect(page.getByTestId('logo-tile')).toHaveCount(24, { timeout: 60_000 });
  await page.getByTestId('logo-name').fill('Bánh Mì Cô Ba');
  await page.getByTestId('logo-slogan').fill('Ngon từ tâm');
  await page.getByTestId('logo-tile').nth(3).click();

  const tiles = page.getByTestId('mockup-tile');
  await expect(tiles).toHaveCount(9);
  await expect(page.locator('[data-testid="mockup-tile"] canvas[data-ready="1"]')).toHaveCount(6, { timeout: 60_000 });
  await page.waitForTimeout(800);

  // logo thật sự in lên ảnh: vùng in khác ảnh mockup gốc
  const diffs = await page.evaluate(async (print) => {
    const out: Record<string, number> = {};
    for (const [id, [x, y, w, h]] of Object.entries(print)) {
      const cv = document.querySelector(`[data-mockup="${id}"] canvas`) as HTMLCanvasElement;
      const im = new Image(); im.src = `/mockups/${id}.jpg`; await im.decode();
      const ref = document.createElement('canvas'); ref.width = 1080; ref.height = 1080;
      const rc = ref.getContext('2d')!; rc.drawImage(im, 0, 0, 1080, 1080);
      const sx = cv.width / 1080;
      const a = cv.getContext('2d')!.getImageData(x * sx, y * sx, w * sx, h * sx).data;
      const b = rc.getImageData(x, y, w, h).data;
      let d = 0, n = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i += 16) { d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n++; }
      out[id] = d / n;
    }
    return out;
  }, PRINT);
  for (const [id, d] of Object.entries(diffs)) expect(d, `mockup ${id}: logo chưa in lên (lệch ${d.toFixed(1)})`).toBeGreaterThan(3);

  // mockup vẽ bằng code: không chi tiết nào lòi khỏi ô
  const outside = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="mockup-tile"]')).flatMap((tile) => {
    if (tile.querySelector('canvas')) return [];
    const r = tile.getBoundingClientRect();
    const bad = Array.from(tile.querySelectorAll('div, span, svg')).filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && (b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1);
    });
    const nan = tile.innerHTML.includes('NaN') ? ['NaN'] : [];
    return [...nan, ...bad.map((el) => `${(tile as HTMLElement).dataset.mockup}: ${(el.textContent || el.tagName).slice(0, 30)}`)];
  }));
  expect(outside, 'mockup code lòi khung').toEqual([]);
  await page.getByTestId('mockup-grid').screenshot({ path: path.join(OUT, 'mockup-grid.png') });

  // bấm vào mockup → xem lớn; ←/→ chuyển; tải ảnh đang xem; Esc / bấm nền để đóng
  const viewer = page.getByTestId('lightbox');
  await page.getByRole('button', { name: 'Xem lớn Áo thun' }).click();
  await expect(viewer).toBeVisible({ timeout: 15_000 });
  await expect(viewer).toContainText('Áo thun · 1/9');
  expect(await viewer.locator('img').evaluate((im: HTMLImageElement) => im.decode().then(() => im.naturalWidth))).toBe(1080);
  await page.keyboard.press('ArrowRight');
  await expect(viewer).toContainText('Nón · 2/9');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(viewer).toContainText('Name card · 9/9');
  const [vdl] = await Promise.all([page.waitForEvent('download'), viewer.getByRole('button', { name: 'Tải ảnh này' }).click()]);
  expect(vdl.suggestedFilename()).toContain('mockup-namecard');
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await page.getByRole('button', { name: 'Xem lớn Bảng hiệu' }).click();
  await expect(viewer).toContainText('Bảng hiệu');
  await viewer.click({ position: { x: 5, y: 5 } });
  await expect(viewer).toBeHidden();

  // tải lẻ: 1 ảnh thật + 1 mockup code
  for (const label of ['Tải Túi tote', 'Tải Name card']) {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: label }).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p);
    const i = pngInfo(fs.readFileSync(p));
    expect([i.w, i.h], label).toEqual([1080, 1080]);
  }
  // zip cả bộ
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByRole('button', { name: /Tải tất cả mockup/ }).click()]);
  const zp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(zp);
  const { unzipSync } = await import('fflate');
  const files = unzipSync(new Uint8Array(fs.readFileSync(zp)));
  expect(Object.keys(files)).toHaveLength(9);
  for (const [n, b] of Object.entries(files)) {
    const i = pngInfo(Buffer.from(b));
    expect([i.w, i.h], n).toEqual([1080, 1080]);
    fs.writeFileSync(path.join(OUT, n), b);
  }
});
