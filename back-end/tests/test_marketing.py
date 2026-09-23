import httpx
import pytest

from app.core.config import Settings
from app.services.marketing_service import MarketingBrief, generate_marketing
from app.services.text_service import TextGenerationError


@pytest.mark.asyncio
async def test_marketing_validates_three_directions(monkeypatch):
    import json

    captured = {}

    async def post(self, url, **kwargs):
        captured.update(kwargs["json"])
        item = {
            "headline": "Bộ sưu tập mới",
            "subline": "Đen trắng tối giản",
            "cta": "Khám phá",
            "caption": "Thông tin bộ sưu tập.",
        }
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "message": {"content": json.dumps({k: item for k in ["launch", "story", "action"]})}
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    result = await generate_marketing(
        Settings(), MarketingBrief(name="Giày", details="Đen trắng", offer="Giá 500.000đ")
    )
    assert set(result.model_dump()) == {"launch", "story", "action"}
    assert "500.000" in captured["messages"][1]["content"]
    assert captured["keep_alive"] == 0


@pytest.mark.asyncio
async def test_marketing_rejects_incomplete_model_response(monkeypatch):
    async def post(self, url, **kwargs):
        return httpx.Response(
            200, request=httpx.Request("POST", url), json={"message": {"content": "{}"}}
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    with pytest.raises(TextGenerationError):
        await generate_marketing(Settings(), MarketingBrief(name="Giày", details="Đen trắng"))


def test_long_industry_brief_and_unknown_industry():
    from pydantic import ValidationError

    assert (
        len(MarketingBrief(name="JD", details="x" * 10000, industry="recruitment").details) == 10000
    )
    with pytest.raises(ValidationError):
        MarketingBrief(name="JD", details="x", industry="unknown")


@pytest.mark.asyncio
async def test_industry_requires_highlights(monkeypatch):
    import json

    async def post(self, url, **kwargs):
        schema = kwargs["json"]["format"]["$defs"]["MarketingCopy"]
        assert "points" in schema["required"]
        item = {
            "headline": "Vị trí",
            "subline": "Thông tin",
            "cta": "Ứng tuyển",
            "caption": "Chi tiết",
        }
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "message": {"content": json.dumps({k: item for k in ["launch", "story", "action"]})}
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    with pytest.raises(TextGenerationError):
        await generate_marketing(
            Settings(), MarketingBrief(name="JD", details="React", industry="recruitment")
        )
