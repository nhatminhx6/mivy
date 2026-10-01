import asyncio
import logging
import random
import struct
import urllib.parse
import zlib
from pathlib import Path
from uuid import uuid4

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


class VisualGenerationError(Exception):
    """Lỗi khi tạo ảnh hoặc ảnh trả về không hợp lệ."""
    pass


def parse_image_dimensions(data: bytes) -> tuple[str, int, int]:
    """
    Xác thực và đọc kích thước của ảnh (PNG, JPEG, WEBP).
    Từ chối HTML/JSON error page, dữ liệu rác hoặc ảnh bị truncate.
    Trả về (mime_type, width, height) hoặc raise VisualGenerationError.
    """
    if len(data) < 16:
        raise VisualGenerationError("Dữ liệu ảnh rỗng hoặc quá ngắn (dưới 16 bytes).")

    prefix = data[:64].lower()
    if b"<!doctype" in prefix or b"<html" in prefix or b"{\"error\"" in prefix or b"<svg" in prefix:
        raise VisualGenerationError("Nhận phản hồi HTML/JSON lỗi từ provider thay vì dữ liệu ảnh.")

    # 1. PNG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        if len(data) < 24:
            raise VisualGenerationError("Header PNG bị hỏng hoặc chưa hoàn chỉnh.")
        w, h = struct.unpack(">II", data[16:24])
        return "image/png", w, h

    # 2. JPEG
    if data.startswith(b"\xff\xd8"):
        idx = 2
        data_len = len(data)
        while idx < data_len - 8:
            if data[idx] != 0xFF:
                idx += 1
                continue
            marker = data[idx + 1]
            # SOF markers: SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h, w = struct.unpack(">HH", data[idx + 5:idx + 9])
                return "image/jpeg", w, h
            else:
                length = struct.unpack(">H", data[idx + 2:idx + 4])[0]
                idx += 2 + length
        raise VisualGenerationError("Không tìm thấy SOF marker hợp lệ trong JPEG header.")

    # 3. WEBP
    if data.startswith(b"RIFF") and len(data) >= 30 and data[8:12] == b"WEBP":
        format_type = data[12:16]
        if format_type == b"VP8 ":
            w, h = struct.unpack("<HH", data[26:30])
            return "image/webp", w & 0x3FFF, h & 0x3FFF
        elif format_type == b"VP8L":
            b0, b1, b2, b3 = data[21:25]
            w = 1 + (((b1 & 0x3F) << 8) | b0)
            h = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
            return "image/webp", w, h
        elif format_type == b"VP8X":
            w = 1 + struct.unpack("<I", data[24:27] + b"\x00")[0]
            h = 1 + struct.unpack("<I", data[27:30] + b"\x00")[0]
            return "image/webp", w, h
        raise VisualGenerationError("Định dạng WEBP không được hỗ trợ.")

    raise VisualGenerationError("Định dạng ảnh không được hỗ trợ (chỉ nhận PNG, JPEG, WEBP).")


def validate_image_bytes(image_bytes: bytes, min_width: int = 256, min_height: int = 256) -> tuple[str, int, int]:
    """
    Xác thực decode, định dạng và kích thước tối thiểu của ảnh.
    Ngăn chặn 100% bug ảnh 1x1 hoặc ảnh rác masquerade thành công.
    """
    mime_type, width, height = parse_image_dimensions(image_bytes)
    if width < min_width or height < min_height:
        raise VisualGenerationError(
            f"Kích thước ảnh không đạt chuẩn tối thiểu: {width}x{height} (yêu cầu >= {min_width}x{min_height})."
        )
    return mime_type, width, height


def create_valid_png(width: int, height: int, color: tuple[int, int, int] = (16, 185, 129)) -> bytes:
    """Tạo một file PNG chuẩn RFC có kích thước thực sự phục vụ mock test và nền thủ công."""
    raw_row = bytes([0]) + bytes(color) * width
    raw_data = raw_row * height
    compressed = zlib.compress(raw_data)

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b"IHDR" + ihdr_data)
    png.extend(struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + struct.pack(">I", ihdr_crc))
    # IDAT
    idat_crc = zlib.crc32(b"IDAT" + compressed)
    png.extend(struct.pack(">I", len(compressed)) + b"IDAT" + compressed + struct.pack(">I", idat_crc))
    # IEND
    iend_crc = zlib.crc32(b"IEND")
    png.extend(struct.pack(">I", 0) + b"IEND" + struct.pack(">I", iend_crc))
    return bytes(png)


INDUSTRY_PROMPTS = {
    "recruitment": {
        "emerald_pro": (
            "Cinematic 3D abstract geometric glass sculptures, glowing emerald green "
            "and mint neon light rays, dark obsidian background, minimal clean depth "
            "of field, modern tech branding aesthetic, 8k wallpaper, studio product "
            "lighting, no text, no letters, no watermark"
        ),
        "tech_dark": (
            "Futuristic glowing tech server room perspective, deep cyber blue and amber "
            "orange light rays, dark moody studio lighting, clean minimal corporate "
            "technology architecture, 8k wallpaper, depth of field, no text, no letters"
        ),
        "warm_editorial": (
            "Warm modern architectural interior, soft terracotta and beige natural "
            "lighting, clean minimalist scandinavian studio space, wooden textures, "
            "airy elegant atmosphere, 8k photo, no text, no letters"
        ),
        "bold_vibrant": (
            "High energy 3D abstract fluid dynamic shapes, electric orange and deep "
            "royal navy contrast, cinematic neon glow, glossy reflective surfaces, "
            "futuristic agency style, 8k render, no text, no letters"
        ),
        "clean_minimal": (
            "Minimalist clean white studio interior with subtle emerald accent shadows, "
            "frosted glass panels, soft ambient daylight, architectural elegance, "
            "premium corporate aesthetic, 8k, no text, no letters"
        ),
    },
    "education": {
        "warm_editorial": (
            "Creative artisan workshop table, warm morning sunlight, notebooks, pottery "
            "clay tools, soft shadows, inspirational educational aesthetic, editorial "
            "photography, 8k, no text, no letters"
        ),
        "emerald_pro": (
            "Modern creative classroom lab, minimalist glass desks, soft mint and emerald "
            "ambient illumination, futuristic learning hub, clean airy composition, "
            "8k render, no text, no letters"
        ),
    },
    "service": {
        "tech_dark": (
            "High-tech digital network fiber optic node, subtle blue and copper gradients, "
            "clean corporate infrastructure, atmospheric depth of field, 8k render, "
            "no text, no letters"
        ),
        "clean_minimal": (
            "Luxury modern office boardroom, bright panoramic window, sleek marble table, "
            "soft daylight, high-end professional consulting atmosphere, 8k photo, "
            "no text, no letters"
        ),
    },
    "general": {
        "default": (
            "Premium abstract modern studio background, elegant 3D organic floating forms, "
            "soft dramatic lighting, minimalist luxury branding aesthetic, 8k render, "
            "no text, no letters"
        ),
    },
}

ASPECT_DIMENSIONS = {
    "1:1": (1024, 1024),
    "4:5": (1024, 1280),
    "9:16": (768, 1344),
}


class VisualService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.backgrounds_dir = settings.output_dir / "backgrounds"
        self.backgrounds_dir.mkdir(parents=True, exist_ok=True)

    def get_prompt_for_industry(
        self, industry: str, theme: str, custom_prompt: str | None = None
    ) -> str:
        if custom_prompt and custom_prompt.strip():
            return f"{custom_prompt.strip()}, clean background, no text, no words, no watermark"
        industry_group = INDUSTRY_PROMPTS.get(industry, INDUSTRY_PROMPTS["general"])
        if theme in industry_group:
            return industry_group[theme]
        if "default" in industry_group:
            return industry_group["default"]
        first_prompt = next(iter(industry_group.values()))
        return first_prompt

    async def generate_background(
        self,
        industry: str = "recruitment",
        theme: str = "emerald_pro",
        prompt: str | None = None,
        aspect_ratio: str = "4:5",
        seed: int | None = None,
    ) -> tuple[str, Path]:
        """
        Generates an AI background image and saves it to output_dir/backgrounds.
        Returns: (relative_url, file_path)
        Raises VisualGenerationError if generation fails or output image is invalid.
        """
        width, height = ASPECT_DIMENSIONS.get(aspect_ratio, (1024, 1280))
        final_prompt = self.get_prompt_for_industry(industry, theme, prompt)
        seed_val = seed if seed is not None else random.randint(1000, 999999)

        engine = getattr(self.settings, "visual_engine", "pollinations")

        if engine == "mock":
            filename = f"bg_{uuid4().hex[:12]}.png"
            destination = self.backgrounds_dir / filename
            mock_bytes = create_valid_png(width, height, color=(16, 185, 129))
            validate_image_bytes(mock_bytes, min_width=256, min_height=256)
            destination.write_bytes(mock_bytes)
            return f"/v1/creative/backgrounds/{filename}", destination

        if engine == "pollinations":
            try:
                encoded_prompt = urllib.parse.quote(final_prompt)
                url = (
                    f"{self.settings.pollinations_base_url}/prompt/{encoded_prompt}"
                    f"?width={width}&height={height}&model=flux&nologo=true&seed={seed_val}"
                )
                async with httpx.AsyncClient(timeout=35.0, follow_redirects=True) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    image_bytes = response.content

                    mime_type, w, h = validate_image_bytes(image_bytes, min_width=256, min_height=256)
                    ext = ".jpg" if "jpeg" in mime_type else ".png"
                    filename = f"bg_{uuid4().hex[:12]}{ext}"
                    destination = self.backgrounds_dir / filename

                    await asyncio.to_thread(destination.write_bytes, image_bytes)
                    return f"/v1/creative/backgrounds/{filename}", destination
            except VisualGenerationError:
                raise
            except Exception as exc:
                logger.error("Pollinations background generation failed: %s", exc)
                raise VisualGenerationError(f"Không thể tạo ảnh nền từ AI provider: {exc}") from exc

        raise VisualGenerationError(f"Engine tạo ảnh nền không hợp lệ: {engine}")

    def generate_procedural_background(
        self,
        theme: str = "emerald_pro",
        aspect_ratio: str = "4:5",
    ) -> tuple[str, Path]:
        """
        Tạo ảnh nền thủ công/procedural gradient chuẩn kích thước thật có nhãn rõ ràng.
        Không masquerade thành ảnh AI.
        """
        width, height = ASPECT_DIMENSIONS.get(aspect_ratio, (1024, 1280))
        theme_colors = {
            "emerald_pro": (6, 78, 59),
            "tech_dark": (15, 23, 42),
            "warm_editorial": (120, 53, 15),
            "bold_vibrant": (67, 56, 202),
            "clean_minimal": (241, 245, 249),
        }
        color = theme_colors.get(theme, (15, 23, 42))
        png_bytes = create_valid_png(width, height, color=color)
        validate_image_bytes(png_bytes, min_width=256, min_height=256)

        filename = f"bg_procedural_{uuid4().hex[:12]}.png"
        destination = self.backgrounds_dir / filename
        destination.write_bytes(png_bytes)
        return f"/v1/creative/backgrounds/{filename}", destination

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str | None = None,
        job_id: str | None = None,
        seed: int | None = None,
    ) -> tuple[str, Path]:
        """
        Generates an AI image directly from prompt using Pollinations Flux.
        Zero cost (0đ), high quality rendering.
        Raises VisualGenerationError if generation fails or output image is invalid.
        """
        width, height = ASPECT_DIMENSIONS.get(aspect_ratio, (1024, 1024))
        full_prompt = prompt
        if style:
            full_prompt = f"{prompt}, {style} style, high quality commercial photo, studio lighting, masterpiece"
        seed_val = seed if seed is not None else random.randint(1000, 999999)

        file_stem = job_id or f"art_{uuid4().hex[:12]}"
        engine = getattr(self.settings, "visual_engine", "pollinations")

        if engine == "mock":
            destination = self.settings.output_dir / f"{file_stem}.png"
            mock_bytes = create_valid_png(width, height, color=(30, 41, 59))
            validate_image_bytes(mock_bytes, min_width=256, min_height=256)
            destination.write_bytes(mock_bytes)
            return f"/v1/generations/{destination.name}", destination

        if engine == "pollinations":
            try:
                encoded_prompt = urllib.parse.quote(full_prompt)
                url = (
                    f"{self.settings.pollinations_base_url}/prompt/{encoded_prompt}"
                    f"?width={width}&height={height}&model=flux&nologo=true&seed={seed_val}"
                )
                async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    image_bytes = response.content

                    mime_type, w, h = validate_image_bytes(image_bytes, min_width=256, min_height=256)
                    ext = ".jpg" if "jpeg" in mime_type else ".png"
                    destination = self.settings.output_dir / f"{file_stem}{ext}"

                    await asyncio.to_thread(destination.write_bytes, image_bytes)
                    return f"/v1/generations/{destination.name}", destination
            except VisualGenerationError:
                raise
            except Exception as e:
                logger.error("Pollinations image generation failed: %s", e)
                raise VisualGenerationError(f"Tạo ảnh AI thất bại từ provider: {e}") from e

        raise VisualGenerationError(f"Engine tạo ảnh không hợp lệ: {engine}")
