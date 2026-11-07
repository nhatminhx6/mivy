import sys, numpy as np
from ai_edge_litert.interpreter import Interpreter
import onnxruntime as ort
from PIL import Image
M = sys.argv[1]; img = sys.argv[2]
it = Interpreter(model_path=f"{M}/dl/selfie_multiclass_256x256.tflite"); it.allocate_tensors()
inp = it.get_input_details()[0]; out = it.get_output_details()
print("tflite in", inp["shape"], inp["dtype"], inp["quantization"]); print("tflite out", [(o["shape"], o["dtype"]) for o in out])
x = np.asarray(Image.open(img).convert("RGB").resize((256, 256)), dtype=np.float32)[None] / 255.0
it.set_tensor(inp["index"], x); it.invoke(); t = it.get_tensor(out[0]["index"])
s = ort.InferenceSession(f"{M}/dl/hf/onnx/model.onnx"); i0 = s.get_inputs()[0]
print("onnx in", i0.name, i0.shape, "out", [o.shape for o in s.get_outputs()])
xo = x if i0.shape[-1] == 3 else x.transpose(0, 3, 1, 2)
o = s.run(None, {i0.name: xo})[0]
o2 = o if o.shape[-1] == 6 else o.transpose(0, 2, 3, 1)
print("argmax agree", (t.argmax(-1) == o2.argmax(-1)).mean(), "maxdiff", np.abs(t - o2).max())
print("classes frac", np.bincount(t.argmax(-1).ravel(), minlength=6) / t[..., 0].size)
