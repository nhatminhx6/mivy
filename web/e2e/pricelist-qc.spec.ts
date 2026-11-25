import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bảng giá: mọi mẫu × khổ × bố cục vừa khổ (không tràn, chữ không bị cắt), dán nhanh từ Excel/ghi chú tách đúng,
// menu dài tự chia cột (9:16/A4 vừa, 1:1 báo tràn), xuất đúng pixel (A4 = 2480×3508), áp bộ nhận diện.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'pricelist');
const PRESETS = ['Quán cà phê', 'Spa / Nail', 'Bảng giá sỉ shop', 'Tiệm bánh'];
const ASPECTS = ['Dọc 4:5', 'Story 9:16', 'Vuông 1:1', 'A4 in'];
const LAYOUTS = ['Menu quán', 'Bảng đen', 'Thẻ', 'Tối giản sang'];
const pngWH = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

async function check(page: Page, tag: string, allowOverflow = false) {
  await page.waitForTimeout(250);
  if (!allowOverflow) await expect(page.getByTestId('pl-overflow'), `${tag}: báo tràn khổ`).toHaveCount(0);
  const issues = await page.evaluate((allow) => {
    const node = document.querySelector('[data-testid="pl-preview"] [data-asset]') as HTMLElement;
    const nr = node.getBoundingClientRect();
    const body = node.querySelector('[data-pl-body]') as HTMLElement;
    const out: string[] = [];
    if (!allow && (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1)) out.push('thân bảng giá bị tràn');
    if (node.innerHTML.includes('NaN')) out.push('NaN');
    // cột phải CÂN: chia ≥2 cột thì cột nào cũng có món, cột thấp nhất ≥ 45% cột cao nhất
    const cols = Array.from(body.querySelectorAll('[data-pl-col]')) as HTMLElement[];
    if (cols.length >= 2) {
      const hs = cols.map((c) => c.getBoundingClientRect().height);
      if (cols.some((c) => !c.querySelector('[data-pl-price]'))) out.push(`có cột trống (${cols.length} cột)`);
      else if (Math.min(...hs) < Math.max(...hs) * 0.45) out.push(`cột lệch: ${hs.map((h) => Math.round(h)).join('/')}`);
    }
    // 2 cột giá (M/L, lẻ/sỉ): chữ giá không được dính nhau
    const textBox = (el: Element) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); };
    body.querySelectorAll('[data-pl-section]').forEach((sec) => {
      sec.querySelectorAll(':scope > div').forEach((row) => {
        const ps = Array.from(row.querySelectorAll('[data-pl-price]')).filter((e) => e.textContent!.trim());
        for (let i = 1; i < ps.length; i++) {
          const a = textBox(ps[i - 1]), b = textBox(ps[i]);
          if (b.left - a.right < 4) out.push(`giá dính nhau: "${ps[i - 1].textContent}${ps[i].textContent}"`);
        }
      });
    });
    node.querySelectorAll('*').forEach((el) => {
      if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())) return;
      const r = el.getBoundingClientRect();
      let clip = nr;
      for (let p = el.parentElement; p && p !== node; p = p.parentElement) if (getComputedStyle(p).overflow !== 'visible') { clip = p.getBoundingClientRect(); break; }
      if (r.left < clip.left - 1 || r.right > clip.right + 1 || r.top < clip.top - 1 || r.bottom > clip.bottom + 1) out.push(`chữ bị cắt: "${el.textContent!.trim().slice(0, 30)}"`);
    });
    return out;
  }, allowOverflow);
  expect(issues, tag).toEqual([]);
}

test('Bảng giá: mọi mẫu × khổ vừa khổ + mọi bố cục', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.goto('/studio/pricelist');
  await page.getByTestId('tab-flat').click(); // mặc định tab 3D → soi bản thiết kế phẳng
  await expect(page.locator('[data-testid="pl-preview"] [data-pl-body]')).toBeVisible({ timeout: 60_000 });
  for (const p of PRESETS) {
    await page.getByRole('button', { name: p, exact: true }).click();
    for (const a of ASPECTS) {
      await page.getByRole('button', { name: a, exact: true }).click();
      await check(page, `${p} · ${a}`);
    }
    await page.getByRole('button', { name: 'Dọc 4:5', exact: true }).click();
    for (const l of LAYOUTS) {
      await page.getByRole('button', { name: l, exact: true }).click();
      await check(page, `${p} · bố cục ${l}`);
    }
    const preset = { 'Quán cà phê': 'Bảng đen', 'Spa / Nail': 'Tối giản sang', 'Bảng giá sỉ shop': 'Thẻ', 'Tiệm bánh': 'Menu quán' }[p]!;
    await page.getByRole('button', { name: preset, exact: true }).click();
    await page.waitForTimeout(200);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải ảnh PNG/ }).click()]);
    const f = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(f);
    expect(pngWH(fs.readFileSync(f)), p).toEqual([2160, 2700]);
  }
  await expect(page.getByTestId('print-request'), 'có nút Gửi yêu cầu in').toBeVisible();
  // A4 in 300dpi
  await page.getByRole('button', { name: 'A4 in', exact: true }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải ảnh PNG/ }).click()]);
  const f = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(f);
  expect(dl.suggestedFilename()).toContain('a4-300dpi');
  expect(pngWH(fs.readFileSync(f))).toEqual([2480, 3508]);
});

test('Bảng giá: dán nhanh từ Excel/ghi chú tách đúng', async ({ page }) => {
  await page.goto('/studio/pricelist');
  await page.getByTestId('tab-flat').click(); // mặc định tab 3D → soi bản thiết kế phẳng
  await page.getByRole('button', { name: /Dán nhanh/ }).click();
  const text = ['# Cà phê', 'Cà phê sữa đá - 29k', 'Bạc xỉu | 32.000đ | Ít ngọt', 'Cà phê muối (mới)\t25000', '', '# Trà sữa | M | L', 'Trà sữa trân châu (hot) | 30k | 37k', 'Trà đào\t35k\t42k\tCó topping'].join('\n');
  await page.getByTestId('pl-paste').fill(text);
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.getByText('2 nhóm · 5 món')).toBeVisible();
  const prev = page.getByTestId('pl-preview');
  for (const t of ['Cà phê sữa đá', '29k', 'Ít ngọt', '25.000đ', 'MỚI', 'HOT', 'Trà đào', '42k', 'Có topping']) await expect(prev, t).toContainText(t);
  await check(page, 'sau khi dán');
});

test('Bảng giá: menu 40 món tự chia cột; 9:16 & A4 vừa, 1:1 báo tràn', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/studio/pricelist');
  await page.getByTestId('tab-flat').click(); // mặc định tab 3D → soi bản thiết kế phẳng
  await page.getByRole('button', { name: /Dán nhanh/ }).click();
  const lines: string[] = [];
  for (let s = 1; s <= 4; s++) { lines.push(`# Nhóm ${s}`); for (let i = 1; i <= 10; i++) lines.push(`Món số ${s}.${i} thơm ngon - ${20 + i}k`); }
  await page.getByTestId('pl-paste').fill(lines.join('\n'));
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  for (const a of ['Story 9:16', 'A4 in']) {
    await page.getByRole('button', { name: a, exact: true }).click();
    await check(page, `40 món · ${a}`);
  }
  const cols = await page.locator('[data-pl-body]').evaluate((el) => el.querySelectorAll('[data-pl-col]').length);
  expect(cols, 'menu dài phải chia cột').toBeGreaterThanOrEqual(2);
  // 1:1 với 40 món: tự chia 3 cột + co chữ vẫn phải vừa (không cắt chữ)
  await page.getByRole('button', { name: 'Vuông 1:1', exact: true }).click();
  await check(page, '40 món · 1:1', true);
  // 80 món ở 1:1 thì chắc chắn quá khổ → phải BÁO cho user
  await page.getByRole('button', { name: /Dán nhanh/ }).click();
  const more: string[] = [];
  for (let s = 1; s <= 8; s++) { more.push(`# Nhóm ${s}`); for (let i = 1; i <= 10; i++) more.push(`Món số ${s}.${i} thơm ngon - ${20 + i}k`); }
  await page.getByTestId('pl-paste').fill(more.join('\n'));
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.getByTestId('pl-overflow')).toBeVisible();
});

test('Bảng giá: áp bộ nhận diện (tên, logo, liên hệ, màu)', async ({ page }) => {
  await page.goto('/studio/pricelist');
  await page.getByTestId('tab-flat').click(); // mặc định tab 3D → soi bản thiết kế phẳng
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 120;
    const x = c.getContext('2d')!; x.fillStyle = '#b91c1c'; x.fillRect(0, 0, 300, 120);
    localStorage.setItem('mivy-brand-v1', JSON.stringify({ name: 'Bánh Mì Cô Ba', logo: c.toDataURL('image/png'), colorPrimary: '#3a0d0d', colorSecondary: '#7a1f1f', colorAccent: '#e23d28', colorInk: '#1a0e0e', colorSurface: '#fdf1ef', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam', voice: 'than-thien', contact: { phone: '0909 000 111' } }));
  });
  await page.reload();
  const prev = page.getByTestId('pl-preview');
  await expect(prev).toContainText('Bánh Mì Cô Ba');
  await expect(prev).toContainText('0909 000 111');
  await expect(prev.locator('img[src^="data:image/png"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Thương hiệu' })).toBeVisible();
  await check(page, 'có bộ nhận diện');
});
