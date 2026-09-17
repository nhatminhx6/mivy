from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import UploadFile


class UploadValidationError(ValueError):
    pass


CONTENT_TYPE_SUFFIXES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class StorageService:
    def __init__(self, upload_dir: Path, max_upload_size_mb: int) -> None:
        self.upload_dir = upload_dir
        self.max_bytes = max_upload_size_mb * 1024 * 1024

    async def save_upload(self, upload: UploadFile) -> Path:
        suffix = CONTENT_TYPE_SUFFIXES.get(upload.content_type or "")
        if suffix is None:
            raise UploadValidationError("Unsupported file type. Use JPG, PNG, or WEBP")
        destination = self.upload_dir / f"{uuid4()}{suffix}"
        size = 0
        try:
            async with aiofiles.open(destination, "wb") as file:
                while chunk := await upload.read(1024 * 1024):
                    size += len(chunk)
                    if size > self.max_bytes:
                        raise UploadValidationError(
                            f"Upload exceeds the {self.max_bytes // (1024 * 1024)} MB limit"
                        )
                    await file.write(chunk)
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        finally:
            await upload.close()
        return destination

