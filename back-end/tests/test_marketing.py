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
    assert set(result.model_dump()) == {"launch", "story", "action", "facts"}
    assert len(result.facts) >= 1
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


def test_dot1_jd_eight_points_multilingual():
    from app.services.marketing_service import fallback_marketing_copy

    jd_vi_mixed = (
        "1. Làm quen nhanh với codebase hiện tại và giải quyết technical debt\n"
        "2. Thiết kế kiến trúc hệ thống backend chịu tải cao\n"
        "3. Xây dựng giao diện web mượt mà bằng ReactJS và Next.js\n"
        "4. Phát triển các service microservices bằng NodeJS\n"
        "5. Mentoring và hướng dẫn các kỹ sư junior trong team\n"
        "6. Làm việc trực tiếp với các stakeholders và Product Owner\n"
        "7. Tối ưu cơ sở dữ liệu PostgreSQL và caching\n"
        "8. Cấp bậc: Lead/Senior Fullstack Software Engineer"
    )

    # 1. Test preserve/mixed language
    brief_mixed = MarketingBrief(
        name="Lead/Senior Fullstack Engineer",
        details=jd_vi_mixed,
        industry="recruitment",
        output_language="preserve",
    )
    res_mixed = fallback_marketing_copy(brief_mixed)

    assert len(res_mixed.facts) == 8
    # Assert all 8 points are extracted into facts
    fact_texts = " ".join(f.text for f in res_mixed.facts)
    assert "codebase" in fact_texts
    assert "technical debt" in fact_texts
    assert "ReactJS" in fact_texts
    assert "NodeJS" in fact_texts
    assert "Mentoring" in fact_texts
    assert "stakeholders" in fact_texts
    assert "Lead/Senior" in fact_texts

    # Assert no fake facts
    for copy in [res_mixed.launch, res_mixed.story, res_mixed.action]:
        corpus = f"{copy.headline} {copy.subline} {' '.join(copy.points)} {copy.caption}"
        assert "TP.HCM" not in corpus
        assert "Hybrid" not in corpus
        assert "0907124244" not in corpus
        assert "Macbook" not in corpus

    # 2. Test English output
    jd_en = (
        "1. Rapidly onboard existing codebase and resolve technical debt\n"
        "2. Design scalable high-load backend architecture\n"
        "3. Build responsive web interfaces with ReactJS and Next.js\n"
        "4. Develop performant microservices using NodeJS\n"
        "5. Mentoring and guiding junior developers in the squad\n"
        "6. Collaborate directly with stakeholders and Product Owners\n"
        "7. Optimize PostgreSQL and Redis caching layers\n"
        "8. Level: Lead/Senior Fullstack Software Engineer"
    )
    brief_en = MarketingBrief(
        name="Lead/Senior Fullstack Engineer",
        details=jd_en,
        industry="recruitment",
        output_language="en",
    )
    res_en = fallback_marketing_copy(brief_en)
    assert len(res_en.facts) == 8
    assert res_en.launch.cta == "Apply Now"
    assert "Requirements" in res_en.story.headline
    assert "TP.HCM" not in res_en.launch.caption
