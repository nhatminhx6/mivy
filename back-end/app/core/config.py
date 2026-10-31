from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "mivy-backend"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite+aiosqlite:///./data/mivy.db"
    upload_dir: Path = Path("./data/uploads")
    output_dir: Path = Path("./data/outputs")
    max_upload_size_mb: int = 25
    generation_engine: str = "mock"
    comfyui_base_url: str = "http://127.0.0.1:8188"
    comfyui_workflow_path: Path = Path("./workflows/product_ad.json")
    generation_timeout_seconds: int = 600
    ollama_base_url: str = "http://127.0.0.1:11434"
    text_model: str = "qwen3:8b"
    text_timeout_seconds: int = 300
    product_python: Path = Path(".comfyui/.venv/bin/python")
    product_model_home: Path = Path(".comfyui/models/rembg")
    product_cache_dir: Path = Path("data/cutout_cache")
    product_model: str = "birefnet-general"
    visual_engine: str = "pollinations"
    pollinations_base_url: str = "https://image.pollinations.ai"
    # Token cho provider gen ảnh (Pollinations/fal/Replicate/OpenAI/Google). Để trống = free tier.
    image_gen_token: str = ""
    # Tài khoản + ví: 1 đồng Mivy = 1.000đ
    signup_bonus: int = 2  # tặng khi đăng ký = 1 lượt gen AI
    tryon_price: int = 2  # 1 lần Người mẫu AI (FASHN)
    admin_emails: str = ""  # email admin, cách nhau dấu phẩy (được cộng tiền cho user)
    session_days: int = 30
    cookie_secure: bool = False  # bật khi chạy https
    # Người mẫu AI: FASHN VTON 1.5 trên Hugging Face (đổi sang Space riêng/Modal khi có)
    fashn_space: str = "fashn-ai/fashn-vton-1.5"
    hf_token: str = ""  # token HF của Mivy → nhiều lượt GPU hơn

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
