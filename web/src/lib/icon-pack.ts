// Bộ icon app & web từ 1 icon vuông 1024: Web (favicon.ico/svg, apple-touch, PWA manifest), Android (mipmap + adaptive),
// iOS (AppIcon.appiconset), ảnh store. Dựng 100% trên trình duyệt, đóng ZIP bằng fflate.

export interface IconPackInput {
  full: HTMLCanvasElement; // 1024, nền đặc (dùng cho iOS, favicon, store)
  fg: HTMLCanvasElement; // 1024, nền trong suốt, dấu nằm trong vùng an toàn (Android adaptive foreground)
  bgColor: string; // màu nền lớp background Android adaptive
  faviconSvg: string;
  appName: string;
  platforms: { web: boolean; android: boolean; ios: boolean };
}

// thu nhỏ nhiều bước (mỗi lần ≤ 1/2) cho icon nhỏ vẫn nét
function resize(src: HTMLCanvasElement, size: number, round = false): HTMLCanvasElement {
  let cur = src;
  while (cur.width / 2 > size) {
    const h = document.createElement('canvas'); h.width = Math.round(cur.width / 2); h.height = Math.round(cur.height / 2);
    const hc = h.getContext('2d')!; hc.imageSmoothingQuality = 'high'; hc.drawImage(cur, 0, 0, h.width, h.height); cur = h;
  }
  const out = document.createElement('canvas'); out.width = out.height = size;
  const oc = out.getContext('2d')!; oc.imageSmoothingQuality = 'high';
  if (round) { oc.beginPath(); oc.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); oc.clip(); }
  oc.drawImage(cur, 0, 0, size, size);
  return out;
}
const png = (c: HTMLCanvasElement) => new Promise<Uint8Array>((res, rej) => c.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error('rỗng'))), 'image/png'));

// PNG không kênh alpha (RGB) — App Store từ chối icon có alpha.
let _crc: Uint32Array | null = null;
function crc32(buf: Uint8Array): number {
  if (!_crc) { _crc = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; _crc[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = _crc[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
}
async function pngRgb(c: HTMLCanvasElement): Promise<Uint8Array> {
  const { zlibSync } = await import('fflate');
  const { width: w, height: h } = c; const d = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, t = y * (w * 3 + 1) + 1 + x * 3; raw[t] = d[s]; raw[t + 1] = d[s + 1]; raw[t + 2] = d[s + 2]; } }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length); const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i); out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
  };
  const ihdr = new Uint8Array(13); const iv = new DataView(ihdr.buffer); iv.setUint32(0, w); iv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw, { level: 9 })), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
// favicon.ico chứa nhiều cỡ PNG (Windows Vista+ / mọi trình duyệt đều đọc được)
function ico(images: { size: number; data: Uint8Array }[]): Uint8Array {
  const head = 6 + 16 * images.length; const total = head + images.reduce((a, i) => a + i.data.length, 0);
  const out = new Uint8Array(total); const dv = new DataView(out.buffer);
  dv.setUint16(2, 1, true); dv.setUint16(4, images.length, true);
  let off = head;
  images.forEach((im, i) => {
    const e = 6 + i * 16; out[e] = im.size >= 256 ? 0 : im.size; out[e + 1] = im.size >= 256 ? 0 : im.size;
    dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true); dv.setUint32(e + 8, im.data.length, true); dv.setUint32(e + 12, off, true);
    out.set(im.data, off); off += im.data.length;
  });
  return out;
}
const txt = (s: string) => new TextEncoder().encode(s);

export async function buildIconPack(o: IconPackInput): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const name = o.appName.trim() || 'App';
  if (o.platforms.web) {
    const p16 = await png(resize(o.full, 16)), p32 = await png(resize(o.full, 32)), p48 = await png(resize(o.full, 48));
    files['web/favicon.ico'] = ico([{ size: 16, data: p16 }, { size: 32, data: p32 }, { size: 48, data: p48 }]);
    files['web/favicon-16x16.png'] = p16; files['web/favicon-32x32.png'] = p32;
    files['web/favicon.svg'] = txt(o.faviconSvg);
    files['web/apple-touch-icon.png'] = await png(resize(o.full, 180));
    files['web/android-chrome-192x192.png'] = await png(resize(o.full, 192));
    files['web/android-chrome-512x512.png'] = await png(resize(o.full, 512));
    files['web/maskable-icon-512x512.png'] = await png(resize(o.full, 512));
    files['web/site.webmanifest'] = txt(JSON.stringify({
      name, short_name: name.slice(0, 12), start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: o.bgColor,
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }, null, 2));
    files['web/HUONG-DAN.txt'] = txt([
      'Chép toàn bộ file trong thư mục web/ vào thư mục gốc website (Next.js: thư mục public/), rồi thêm vào <head>:', '',
      '<link rel="icon" href="/favicon.ico" sizes="48x48">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/site.webmanifest">',
      `<meta name="theme-color" content="${o.bgColor}">`,
    ].join('\n'));
  }
  if (o.platforms.android) {
    const dens: [string, number][] = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
    for (const [d, k] of dens) {
      files[`android/res/mipmap-${d}/ic_launcher.png`] = await png(resize(o.full, Math.round(48 * k)));
      files[`android/res/mipmap-${d}/ic_launcher_round.png`] = await png(resize(o.full, Math.round(48 * k), true));
      files[`android/res/mipmap-${d}/ic_launcher_foreground.png`] = await png(resize(o.fg, Math.round(108 * k)));
    }
    const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n';
    files['android/res/mipmap-anydpi-v26/ic_launcher.xml'] = txt(adaptive);
    files['android/res/mipmap-anydpi-v26/ic_launcher_round.xml'] = txt(adaptive);
    files['android/res/values/ic_launcher_background.xml'] = txt(`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${o.bgColor}</color>\n</resources>\n`);
    files['android/HUONG-DAN.txt'] = txt('Chép thư mục res/ vào app/src/main/ của project Android (Flutter: android/app/src/main/, React Native: android/app/src/main/). Ghi đè file cũ.\nAndroidManifest.xml dùng: android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round"');
  }
  if (o.platforms.ios) {
    files['ios/AppIcon.appiconset/AppIcon-1024.png'] = await pngRgb(resize(o.full, 1024));
    files['ios/AppIcon.appiconset/Contents.json'] = txt(JSON.stringify({
      images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'mivy', version: 1 },
    }, null, 2));
    files['ios/HUONG-DAN.txt'] = txt('Xcode 14+: kéo thư mục AppIcon.appiconset vào Assets.xcassets (ghi đè AppIcon cũ). Xcode tự sinh mọi cỡ từ ảnh 1024.\nFlutter: ios/Runner/Assets.xcassets/ — React Native: ios/<TenApp>/Images.xcassets/');
  }
  if (o.platforms.android || o.platforms.ios) {
    if (o.platforms.ios) files['store/app-store-1024x1024.png'] = await pngRgb(resize(o.full, 1024));
    if (o.platforms.android) files['store/google-play-512x512.png'] = await png(resize(o.full, 512));
  }
  const { zipSync } = await import('fflate');
  return zipSync(files, { level: 6 });
}
