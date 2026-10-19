// Đổ nội dung user (đã điền ở flow theo ngành) vào một template HTML tĩnh.
// Template mới hầu hết là text cứng (không có {{hole}}), nên bind theo cấu trúc DOM:
//  - headline  = cụm chữ có font-size lớn nhất
//  - subline   = cụm chữ lớn kế tiếp
//  - cta       = <a>/nút
//  - points[]  = các dòng trong list/khối lặp nếu có
//  - image     = ô ảnh (nền repeating-linear-gradient hoặc chứa chữ "ẢNH")
// Không có element phù hợp thì bỏ qua (giữ nguyên thiết kế gốc).

export interface FillContent {
  headline?: string;
  subline?: string;
  cta?: string;
  points?: string[];
  brand?: string;
  image?: string; // data URL hoặc URL
}

function fontSizeOf(el: HTMLElement): number {
  const m = /font-size\s*:\s*([\d.]+)px/i.exec(el.getAttribute('style') || '');
  return m ? parseFloat(m[1]) : 16;
}

function isUpper(s: string): boolean {
  const letters = s.replace(/[^a-zà-ỹ]/gi, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

function applyText(el: HTMLElement, text: string) {
  const was = (el.textContent || '').trim();
  el.textContent = isUpper(was) ? text.toUpperCase() : text;
}

export function fillTemplateHtml(html: string, c: FillContent): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<div id="mv-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('mv-root');
  if (!root) return html;

  const allEls = Array.from(root.querySelectorAll('*')) as HTMLElement[];
  const leaves = allEls.filter((el) => el.children.length === 0 && (el.textContent || '').trim().length > 0);
  const used = new Set<HTMLElement>();

  // ẢNH: ô placeholder
  if (c.image) {
    let slot: HTMLElement | null =
      (root.querySelector('div[style*="repeating-linear-gradient"]') as HTMLElement) || null;
    if (!slot) {
      const tag = leaves.find((el) => /ẢNH|Ảnh/.test(el.textContent || ''));
      slot = (tag?.parentElement as HTMLElement) || null;
    }
    if (slot) {
      slot.style.backgroundImage = `url(${c.image})`;
      slot.style.backgroundSize = 'cover';
      slot.style.backgroundPosition = 'center';
      slot.style.backgroundRepeat = 'no-repeat';
      (Array.from(slot.querySelectorAll('*')) as HTMLElement[]).forEach((x) => { x.style.opacity = '0'; });
    }
  }

  const bySize = leaves.filter((el) => !used.has(el)).sort((a, b) => fontSizeOf(b) - fontSizeOf(a));

  // HEADLINE = chữ to nhất
  if (c.headline && bySize[0]) {
    applyText(bySize[0], c.headline);
    used.add(bySize[0]);
  }

  // SUBLINE = chữ lớn kế tiếp, khác dòng headline, font nhỏ hơn
  if (c.subline) {
    const headSize = bySize[0] ? fontSizeOf(bySize[0]) : Infinity;
    const sub = bySize.find((el) => !used.has(el) && fontSizeOf(el) < headSize && fontSizeOf(el) >= 18);
    if (sub) { applyText(sub, c.subline); used.add(sub); }
  }

  // CTA = <a> hoặc nút (có padding + nền), chữ ngắn
  if (c.cta) {
    let cta: HTMLElement | null = root.querySelector('a') as HTMLElement | null;
    if (!cta) {
      cta = allEls.find((el) => {
        const st = el.getAttribute('style') || '';
        const txt = (el.textContent || '').trim();
        return !used.has(el) && /padding/.test(st) && /background/.test(st) && txt.length > 0 && txt.length <= 24;
      }) || null;
    }
    if (cta) {
      const leaf = (Array.from(cta.querySelectorAll('*')) as HTMLElement[]).find((x) => x.children.length === 0 && (x.textContent || '').trim()) || cta;
      applyText(leaf, c.cta);
      used.add(leaf);
    }
  }

  // POINTS: tìm khối có nhiều con cùng cỡ (list). Đổ lần lượt.
  if (c.points && c.points.length) {
    const containers = allEls.filter((el) => {
      const kids = Array.from(el.children) as HTMLElement[];
      if (kids.length < 2) return false;
      const texts = kids.filter((k) => (k.textContent || '').trim().length > 0);
      return texts.length >= 2 && texts.length <= 8;
    });
    // chọn container có số con gần số points nhất
    containers.sort((a, b) => Math.abs(a.children.length - c.points!.length) - Math.abs(b.children.length - c.points!.length));
    const box = containers[0];
    if (box) {
      const kids = (Array.from(box.children) as HTMLElement[]).filter((k) => (k.textContent || '').trim().length > 0);
      kids.forEach((k, i) => {
        if (i >= c.points!.length) return;
        const leaf = (Array.from(k.querySelectorAll('*')) as HTMLElement[]).filter((x) => x.children.length === 0 && (x.textContent || '').trim()).pop() || k;
        if (!used.has(leaf)) { applyText(leaf, c.points![i]); used.add(leaf); }
      });
    }
  }

  // BRAND: dòng chữ nhỏ ở góc (thường là tên brand/logo text)
  if (c.brand) {
    const small = bySize.filter((el) => !used.has(el) && fontSizeOf(el) <= 18 && (el.textContent || '').trim().length <= 20);
    if (small[0]) { applyText(small[0], c.brand); used.add(small[0]); }
  }

  return root.innerHTML;
}
