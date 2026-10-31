"""Người mẫu AI: gọi FASHN VTON 1.5 (Apache-2.0) trên Hugging Face Space qua giao thức hàng chờ Gradio.

Server chỉ chuyển yêu cầu (GPU là của HF) — đi qua server để trừ tiền trước khi gen, user không lách được.
"""

import json
import secrets

import httpx

CATEGORIES = {"top": "tops", "bottom": "bottoms", "dress": "one-pieces"}
PHOTO_TYPES = {"flat-lay", "model"}


class TryOnError(Exception):
    def __init__(self, message: str, quota: bool = False) -> None:
        super().__init__(message)
        self.quota = quota


def space_host(space: str) -> str:
    return "https://" + space.lower().replace("/", "-").replace("_", "-").replace(".", "-") + ".hf.space"


class TryOnService:
    def __init__(self, space: str, hf_token: str = "", timeout: float = 400) -> None:
        self.base = space_host(space) + "/gradio_api"
        self.headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
        self.timeout = timeout

    async def _upload(self, c: httpx.AsyncClient, data: bytes, name: str) -> dict:
        r = await c.post(f"{self.base}/upload", files={"files": (name, data)})
        r.raise_for_status()
        return {"path": r.json()[0], "orig_name": name, "meta": {"_type": "gradio.FileData"}}

    async def generate(self, person: bytes, garment: bytes, garment_kind: str, photo_type: str, seed: int) -> bytes:
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout, follow_redirects=True) as c:
                p, g = await self._upload(c, person, "person.jpg"), await self._upload(c, garment, "garment.jpg")
                session = secrets.token_hex(6)
                # 50 bước + guidance 1.5: cấu hình anh đã duyệt
                body = {"data": [p, g, CATEGORIES[garment_kind], photo_type, 50, 1.5, seed, True],
                        "event_data": None, "fn_index": 2, "trigger_id": None, "session_hash": session}
                (await c.post(f"{self.base}/queue/join", json=body)).raise_for_status()
                out = None
                async with c.stream("GET", f"{self.base}/queue/data", params={"session_hash": session}) as r:
                    async for line in r.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        m = json.loads(line[5:])
                        if m.get("msg") == "process_completed":
                            out = m
                            break
                if not out or not out.get("success"):
                    o = (out or {}).get("output") or {}
                    raise TryOnError(" ".join(filter(None, [(out or {}).get("title"), o.get("error")])) or "no output")
                item = out["output"]["data"][0]
                item = item[0] if isinstance(item, list) else item
                url = item.get("url") or f"{self.base}/file={item['path']}"
                img = await c.get(url)
                img.raise_for_status()
                return img.content
        except TryOnError as e:
            msg = str(e)
            if any(k in msg.lower() for k in ("quota", "exceeded", "illegal duration", "larger than the maximum")):
                raise TryOnError("Máy chủ AI đang hết lượt GPU, thử lại sau ít phút nhé.", quota=True) from e
            raise TryOnError("Máy chủ AI đang gặp sự cố, chưa tạo được ảnh. Thử lại sau nhé.") from e
        except httpx.HTTPError as e:
            raise TryOnError("Không kết nối được máy chủ AI, thử lại sau nhé.") from e
