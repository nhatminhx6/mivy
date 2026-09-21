"""Run using .comfyui/.venv/bin/python -m unittest discover -s image_tests."""

import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from app.services.product_renderer import SIZES, compose, render


class ProductRendererTests(unittest.TestCase):
    def setUp(self):
        self.source = Image.new("RGB", (600, 400), "#204060")
        self.mask = Image.new("L", self.source.size)
        ImageDraw.Draw(self.mask).rectangle((20, 140, 580, 260), fill=255)

    def test_all_ratios_keep_whole_wide_subject_with_padding(self):
        for aspect, size in SIZES.items():
            with self.subTest(aspect=aspect):
                output, cutout, info = compose(self.source, self.mask, aspect, "studio_white")
                self.assertEqual(output.size, size)
                self.assertEqual(info["source_subject_box"], [20, 140, 581, 261])
                x, y = info["subject_position"]
                w, h = info["subject_size"]
                self.assertGreaterEqual(x, info["padding"])
                self.assertGreaterEqual(y, info["padding"])
                self.assertLessEqual(x + w, size[0] - info["padding"])
                self.assertLessEqual(y + h, size[1] - info["padding"])
                self.assertAlmostEqual(w / h, 561 / 121, delta=0.03)
                self.assertEqual(output.getpixel((x + w // 2, y + h // 2)), (32, 64, 96))
                self.assertEqual(output.getpixel((0, 0)), (255, 255, 255))
                self.assertEqual(output.getpixel((size[0] - 1, size[1] - 1)), (255, 255, 255))
                self.assertEqual(cutout.getpixel((200, 200)), (32, 64, 96, 255))

    def test_real_holes_are_not_filled(self):
        ImageDraw.Draw(self.mask).rectangle((200, 175, 300, 225), fill=0)
        _, cutout, _ = compose(self.source, self.mask, "1:1", "studio_white")
        self.assertEqual(cutout.getpixel((250, 200))[3], 0)
        self.assertEqual(cutout.getpixel((190, 200))[3], 255)

    def test_gradient_is_repeatable_and_has_no_generated_objects(self):
        first, _, _ = compose(self.source, self.mask, "4:5", "gradient")
        second, _, _ = compose(self.source, self.mask, "4:5", "gradient")
        self.assertEqual(first.tobytes(), second.tobytes())
        self.assertEqual(first.getpixel((0, 0)), (246, 217, 224))
        self.assertEqual(first.getpixel((1079, 1349)), (217, 228, 246))

    def test_empty_mask_rejected(self):
        with self.assertRaises(ValueError):
            compose(self.source, Image.new("L", self.source.size), "1:1", "studio_white")

    def test_transparent_png_uses_original_alpha_without_model(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = self.source.convert("RGBA")
            image.putalpha(self.mask)
            image.save(root / "input.png")
            info = render(
                root / "input.png",
                root / "output.png",
                root / "cache",
                "nonexistent-model",
                "9:16",
                "studio_white",
            )
            self.assertEqual(info["model"], "input_alpha")
            self.assertEqual(info["output_size"], [1080, 1920])
            self.assertTrue((root / "output.mask.png").exists())
            self.assertTrue((root / "output.cutout.png").exists())
            with Image.open(root / "output.png") as output:
                self.assertEqual(output.size, (1080, 1920))

    def test_subject_colors_unchanged_before_placement(self):
        source = Image.fromarray(
            np.random.default_rng(1).integers(0, 256, (400, 600, 3), dtype=np.uint8)
        )
        _, rgba, _ = compose(source, self.mask, "1:1", "studio_white")
        np.testing.assert_array_equal(np.asarray(rgba)[:, :, :3], np.asarray(source))
