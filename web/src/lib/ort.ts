// onnxruntime-web dùng chung cho các AI ảnh chạy trên trình duyệt (xoá vật thể, làm nét…).
// Model tải 1 lần rồi cache trong Cache Storage. Có WebGPU thì chạy GPU (nhanh hơn nhiều);
// không có thì chạy CPU trong worker (proxy) để trang không bị đơ.

const ORT_VERSION = '1.21.0'; // khớp package.json

export type Ort = typeof import('onnxruntime-web');
export type OrtSession = import('onnxruntime-web').InferenceSession;

const hasGpu = () => typeof navigator !== 'undefined' && 'gpu' in navigator;

let _ort: Promise<Ort> | null = null;
export function getOrt(): Promise<Ort> {
  if (!_ort) {
    _ort = import('onnxruntime-web').then((ort) => {
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      ort.env.wasm.proxy = !hasGpu(); // proxy chỉ hợp với CPU, dùng WebGPU thì tắt
      return ort;
    });
    _ort.catch(() => { _ort = null; });
  }
  return _ort;
}

async function modelBytes(url: string): Promise<ArrayBuffer> {
  const get = async () => { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; };
  try {
    const cache = await caches.open('mivy-models');
    const hit = await cache.match(url);
    if (hit) return hit.arrayBuffer();
    const r = await get();
    await cache.put(url, r.clone()).catch(() => null);
    return r.arrayBuffer();
  } catch {
    return (await get()).arrayBuffer(); // không có Cache Storage (vd trang không bảo mật)
  }
}

const _sessions = new Map<string, Promise<{ ort: Ort; session: OrtSession }>>();
/** Tạo (1 lần) phiên chạy model theo URL. gpu: thử WebGPU trước, lỗi thì về CPU. */
export function getSession(url: string, gpu = false) {
  let p = _sessions.get(url);
  if (!p) {
    p = (async () => {
      const ort = await getOrt();
      const bytes = new Uint8Array(await modelBytes(url));
      if (gpu && hasGpu()) {
        try { return { ort, session: await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'] }) }; } catch { /* máy không có GPU dùng được → CPU */ }
      }
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
      return { ort, session };
    })();
    _sessions.set(url, p);
    p.catch(() => _sessions.delete(url));
  }
  return p;
}
