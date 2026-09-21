import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.engines.comfyui_engine import ComfyUIEngine
from app.schemas.creative import CreativeBrief, CreativeContent
from app.services.text_service import TextGenerationError, TextService

BRIEF = {"name": "Workshop gốm", "details": "Nặn một chiếc cốc", "tone": "Gần gũi"}
CONTENT = {
    "headline": "Thử làm gốm cùng em",
    "body": "Nội dung do model trả về.",
    "reminder": "Caption do model trả về.",
    "script": "0–3s: Cảnh mở đầu.",
    "cta": "Tìm hiểu thêm",
    "image_prompt": "Pottery workshop, natural light, ceramic cups, no text",
}


def test_text_uses_service_output(client):
    service = client.app.state.text_service
    with patch.object(service, "generate", new=AsyncMock(return_value=CreativeContent(**CONTENT))):
        response = client.post("/v1/creative/text", json=BRIEF)
    assert response.status_code == 200
    assert response.json()["outputs"] == CONTENT


def test_text_failure_never_returns_template(client):
    with patch.object(
        client.app.state.text_service,
        "generate",
        new=AsyncMock(side_effect=TextGenerationError("Ollama unavailable")),
    ):
        response = client.post("/v1/creative/text", json=BRIEF)
    assert response.status_code == 503
    assert "outputs" not in response.json()


@pytest.mark.parametrize("change", [{"name": "  "}, {"details": ""}, {"concept": 9}])
def test_invalid_brief_does_not_call_model(client, change):
    with patch.object(client.app.state.text_service, "generate", new=AsyncMock()) as generate:
        assert client.post("/v1/creative/text", json={**BRIEF, **change}).status_code == 422
        generate.assert_not_called()


def test_creative_image_refuses_mock(client):
    response = client.post("/v1/creative/images", data={"prompt": CONTENT["image_prompt"]})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "image_not_configured"


@pytest.mark.asyncio
async def test_text_provider_payload_and_invalid_output(settings):
    sent = []

    async def post(_self, url, **kwargs):
        sent.append(kwargs["json"])
        return httpx.Response(
            200,
            json={"message": {"content": json.dumps(CONTENT)}},
            request=httpx.Request("POST", url),
        )

    with patch.object(httpx.AsyncClient, "post", post):
        result = await TextService(settings).generate(CreativeBrief(**BRIEF))
    assert result.body == CONTENT["body"]
    assert sent[0]["keep_alive"] == 0
    assert sent[0]["think"] is False
    assert '"tone": "Gần gũi"' in sent[0]["messages"][1]["content"]
    assert "maxLength" not in sent[0]["format"]["properties"]["body"]

    async def bad(_self, url, **kwargs):
        return httpx.Response(
            200, json={"message": {"content": "{}"}}, request=httpx.Request("POST", url)
        )

    with patch.object(httpx.AsyncClient, "post", bad), pytest.raises(TextGenerationError):
        await TextService(settings).generate(CreativeBrief(**BRIEF))


@pytest.mark.asyncio
async def test_image_workflow_selects_real_text_to_image_or_preserve_subject(tmp_path):
    engine = ComfyUIEngine("http://unused", Path("workflows/product_ad.json"), tmp_path, 10)
    generated = await engine._load_and_map_workflow(None, 'Pottery "studio"', "one")
    assert generated["3"]["class_type"] == "EmptyLatentImage"
    assert generated["12"]["class_type"] == "ImageScaleBy"
    assert generated["12"]["inputs"]["image"] == ["7", 0]
    assert generated["8"]["inputs"]["images"] == ["12", 0]
    assert "10" not in generated
    assert generated["4"]["inputs"]["text"] == 'Pottery "studio"'
    preserved = await engine._load_and_map_workflow("shoe.png", "Outdoor background", "two", "9:16")
    assert preserved["10"]["class_type"] == "MivyProductMask"
    assert preserved["12"]["inputs"]["image"] == ["11", 0]
    assert preserved["8"]["inputs"]["images"] == ["12", 0]
    assert (preserved["9"]["inputs"]["width"], preserved["9"]["inputs"]["height"]) == (512, 896)
    assert preserved["6"]["inputs"]["seed"] != generated["6"]["inputs"]["seed"]


@pytest.mark.asyncio
async def test_vietnamese_image_prompt_is_translated_and_event_facts_preserved(settings):
    calls = []
    content = {**CONTENT, "image_prompt": "Bàn gỗ, cốc gốm, ánh sáng tự nhiên"}

    async def post(_self, url, **kwargs):
        calls.append(kwargs["json"])
        output = content if len(calls) == 1 else {"prompt": CONTENT["image_prompt"]}
        return httpx.Response(
            200,
            json={"message": {"content": json.dumps(output)}},
            request=httpx.Request("POST", url),
        )

    with patch.object(httpx.AsyncClient, "post", post):
        result = await TextService(settings).generate(
            CreativeBrief(**BRIEF, when="15:00 ngày 27/09", where="Nhà Gốm")
        )
    assert len(calls) == 2
    assert result.image_prompt == CONTENT["image_prompt"]
    assert "15:00 ngày 27/09" in result.body
    assert "Nhà Gốm" in result.body


def test_product_background_requires_uploaded_image(client):
    response = client.post("/v1/creative/images", data={"background": "wood"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "image_required"


def test_static_product_job_keeps_preset_and_needs_no_comfyui(client):
    from types import SimpleNamespace

    from tests.test_api import PNG

    client.app.state.settings.generation_engine = "comfyui"
    create_job = AsyncMock(return_value=SimpleNamespace(id="product-test", status="queued"))
    with (
        patch.object(client.app.state.generation_service, "create_job", create_job),
        patch.object(client.app.state.job_queue, "enqueue", AsyncMock()),
        patch.object(httpx.AsyncClient, "get", side_effect=AssertionError("No diffusion call")),
    ):
        response = client.post(
            "/v1/creative/images",
            data={"background": "gradient", "aspect_ratio": "9:16"},
            files={"image": ("shoe.png", PNG, "image/png")},
        )
    assert response.status_code == 202
    assert create_job.call_args.args[2:] == ("product:gradient", "9:16")


def test_unvalidated_scene_rejected_instead_of_random_output(client):
    from tests.test_api import PNG

    response = client.post(
        "/v1/creative/images",
        data={"background": "wood"},
        files={"image": ("shoe.png", PNG, "image/png")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsupported_background"
