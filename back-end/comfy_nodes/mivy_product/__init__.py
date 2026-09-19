"""Product masking for the local Mivy background replacement workflow."""

import numpy as np
import torch
from PIL import Image
from rembg import new_session, remove


class MivyProductMask:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",)}}

    RETURN_TYPES = ("MASK", "MASK")
    RETURN_NAMES = ("product", "background")
    FUNCTION = "segment"
    CATEGORY = "Mivy"

    def __init__(self):
        self.session = None

    def segment(self, image):
        if self.session is None:
            self.session = new_session("u2netp", providers=["CPUExecutionProvider"])
        masks = []
        for frame in image:
            source = Image.fromarray(
                (frame.detach().cpu().numpy().clip(0, 1) * 255).astype(np.uint8)
            )
            mask = remove(source, session=self.session, only_mask=True)
            alpha = np.asarray(mask, dtype=np.float32) / 255.0
            # Make the solid interior opaque while retaining antialiased edges.
            alpha = np.clip((alpha - 0.05) / 0.9, 0, 1)
            coverage = float((alpha > 0.5).mean())
            if not 0.01 < coverage < 0.95:
                raise ValueError("Cannot isolate product; use a clear product photo.")
            masks.append(torch.from_numpy(alpha))
        product = torch.stack(masks)
        return product, 1.0 - product


NODE_CLASS_MAPPINGS = {"MivyProductMask": MivyProductMask}
NODE_DISPLAY_NAME_MAPPINGS = {"MivyProductMask": "Mivy Product Mask"}
