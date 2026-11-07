import sys, numpy as np, torch, onnx
from onnx2torch import convert
import coremltools as ct
from PIL import Image
from ai_edge_litert.interpreter import Interpreter
M = sys.argv[1]; img = sys.argv[2]
net = convert(onnx.load(f"{M}/dl/hf/onnx/model.onnx")).eval()

class Wrap(torch.nn.Module):
    """NCHW 0…255 image in → per-pixel class probabilities (1×6×256×256) out."""
    def __init__(s, n): super().__init__(); s.n = n
    def forward(s, x):
        y = s.n((x / 255.0).permute(0, 2, 3, 1))
        return torch.softmax(y, dim=-1).permute(0, 3, 1, 2)

w = Wrap(net).eval()
ex = torch.rand(1, 3, 256, 256) * 255
tr = torch.jit.trace(w, ex)
ml = ct.convert(tr, inputs=[ct.ImageType(name="image", shape=(1, 3, 256, 256), color_layout=ct.colorlayout.RGB)],
                outputs=[ct.TensorType(name="classes")], minimum_deployment_target=ct.target.iOS17,
                compute_precision=ct.precision.FLOAT16)
ml.short_description = "MediaPipe Selfie Multiclass 256 (Apache-2.0): background, hair, body skin, face skin, clothes, others"
ml.save(f"{M}/PersonParts.mlpackage")
# validate against the official TFLite
pil = Image.open(img).convert("RGB").resize((256, 256))
c = ml.predict({"image": pil})["classes"][0]          # 6×256×256
it = Interpreter(model_path=f"{M}/dl/selfie_multiclass_256x256.tflite"); it.allocate_tensors()
x = np.asarray(pil, dtype=np.float32)[None] / 255.0
it.set_tensor(it.get_input_details()[0]["index"], x); it.invoke(); t = it.get_tensor(it.get_output_details()[0]["index"])[0]
print("coreml vs tflite argmax agree", (c.argmax(0) == t.argmax(-1)).mean())
