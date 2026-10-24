// Bấm chọn vật thể (Segment Anything — SlimSAM) chạy ngay trên trình duyệt bằng transformers.js.
// Mã hoá ảnh 1 lần (vài giây) → mỗi lần bấm chỉ giải mã mask (~nhanh). Model tải từ HuggingFace lần đầu rồi cache.

const MODEL_ID = 'Xenova/slimsam-77-uniform';

type TF = typeof import('@huggingface/transformers');
let _lib: Promise<{ tf: TF; model: any; processor: any }> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any

function lib() {
  if (!_lib) {
    _lib = (async () => {
      const tf = await import('@huggingface/transformers');
      const [model, processor] = await Promise.all([
        tf.SamModel.from_pretrained(MODEL_ID, { dtype: 'q8' }),
        tf.AutoProcessor.from_pretrained(MODEL_ID),
      ]);
      return { tf, model, processor };
    })();
    _lib.catch(() => { _lib = null; });
  }
  return _lib;
}

export interface SamSession {
  /** Mask nhị phân (W×H, 1 = thuộc vật thể) cho điểm bấm (toạ độ pixel ảnh gốc). */
  maskAt(x: number, y: number): Promise<Uint8Array>;
  width: number;
  height: number;
}

// cache theo ảnh: tách nền xong là chuẩn bị sẵn (preload) → mở khung sửa là bấm được ngay
const _sessions = new Map<string, Promise<SamSession>>();
export function getSamSession(src: string): Promise<SamSession> {
  let p = _sessions.get(src);
  if (!p) { p = createSamSession(src); _sessions.set(src, p); p.catch(() => _sessions.delete(src)); }
  return p;
}

async function createSamSession(src: string): Promise<SamSession> {
  const { tf, model, processor } = await lib();
  const image = await tf.RawImage.read(src);
  const inputs = await processor(image);
  const emb = await model.get_image_embeddings(inputs);
  const [rh, rw] = inputs.reshaped_input_sizes[0] as [number, number];
  const W = image.width, H = image.height;
  return {
    width: W, height: H,
    async maskAt(x, y) {
      const input_points = new tf.Tensor('float32', [(x / W) * rw, (y / H) * rh], [1, 1, 1, 2]);
      const input_labels = new tf.Tensor('int64', [BigInt(1)], [1, 1, 1]);
      const { pred_masks, iou_scores } = await model({ ...emb, input_points, input_labels });
      const masks = await processor.post_process_masks(pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
      const m = masks[0]; // [1, 3, H, W] — 3 mức: chi tiết / bộ phận / cả vùng
      const scores = Array.from(iou_scores.data as Float32Array);
      const plane = W * H; const data = m.data as Uint8Array;
      const areas = [0, 1, 2].map((k) => { let a = 0; for (let i = k * plane; i < (k + 1) * plane; i++) a += data[i] ? 1 : 0; return a / plane; });
      // Mask hợp lệ: điểm đủ cao (≥ max - 0.12), không phải mảng nền lớn (> 45% ảnh), không vụn (< 0.2%).
      // Trong đó lấy mask lớn nhất = cả vật (không chỉ ngọn lửa). Lấy max-score thuần dễ dính nguyên mảng tường.
      const top = Math.max(...scores);
      const ok = [0, 1, 2].filter((k) => scores[k] >= top - 0.12 && areas[k] <= 0.45 && areas[k] >= 0.002);
      const pickK = ok.length ? ok.reduce((a, k) => (areas[k] > areas[a] ? k : a), ok[0]) : scores.indexOf(top);
      return data.slice(pickK * plane, (pickK + 1) * plane);
    },
  };
}
