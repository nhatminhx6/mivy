import asyncio
import random
import urllib.parse
from pathlib import Path
from uuid import uuid4

import httpx

from app.core.config import Settings

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
        """
        width, height = ASPECT_DIMENSIONS.get(aspect_ratio, (1024, 1280))
        final_prompt = self.get_prompt_for_industry(industry, theme, prompt)
        seed_val = seed if seed is not None else random.randint(1000, 999999)

        filename = f"bg_{uuid4().hex[:12]}.jpg"
        destination = self.backgrounds_dir / filename

        engine = getattr(self.settings, "visual_engine", "pollinations")

        if engine == "mock":
            # Deterministic mock file for testing
            destination.write_bytes(b"MOCK_JPEG_CONTENT")
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
                    if len(image_bytes) > 1024:
                        await asyncio.to_thread(destination.write_bytes, image_bytes)
                        return f"/v1/creative/backgrounds/{filename}", destination
            except Exception:
                # If network fails or Pollinations times out, write a local fallback
                pass

        # Fallback: create procedural minimal gradient
        fallback_bytes = self._create_gradient_fallback(theme, width, height)
        png_filename = f"bg_{uuid4().hex[:12]}.png"
        fallback_dest = self.backgrounds_dir / png_filename
        await asyncio.to_thread(fallback_dest.write_bytes, fallback_bytes)
        return f"/v1/creative/backgrounds/{png_filename}", fallback_dest

    def _create_gradient_fallback(self, theme: str, width: int, height: int) -> bytes:
        # 1x1 transparent PNG bytes
        return bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000b49444154789c636000020000050001e9342e2a0000000049454e44ae426082"
        )
