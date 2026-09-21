"""Run with .comfyui/.venv/bin/python -m unittest comfy_nodes.test_product_mask."""

import unittest
from unittest.mock import patch

import numpy as np
import torch
from PIL import Image

from comfy_nodes.mivy_product import MivyProductMask


class ProductMaskTests(unittest.TestCase):
    def test_enclosed_white_marking_is_preserved(self):
        mask = np.zeros((20, 20), dtype=np.uint8)
        mask[4:16, 4:16] = 255
        mask[8:12, 8:12] = 0  # Segmentation mistook white product detail for background.
        with (
            patch("comfy_nodes.mivy_product.new_session"),
            patch("comfy_nodes.mivy_product.remove", return_value=Image.fromarray(mask)),
        ):
            product, background = MivyProductMask().segment(torch.zeros((1, 20, 20, 3)))
        self.assertEqual(product[0, 9, 9].item(), 1.0)
        self.assertEqual(background[0, 9, 9].item(), 0.0)
        self.assertEqual(product[0, 0, 0].item(), 0.0)
        self.assertTrue(torch.allclose(product + background, torch.ones_like(product)))
