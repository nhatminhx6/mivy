import time

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.engines.base import GenerationEngine, GenerationInput, GenerationOutput
from app.main import create_app

PNG = b"\x89PNG\r\n\x1a\n" + b"test-image"


def submit(client: TestClient) -> str:
    response = client.post(
        "/v1/generations/images",
        files={"image": ("product.png", PNG, "image/png")},
        data={"prompt": "A polished product advertisement"},
    )
    assert response.status_code == 202
    return response.json()["job_id"]


def wait_for_terminal_state(client: TestClient, job_id: str) -> dict[str, object]:
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        data = client.get(f"/v1/generations/{job_id}").json()
        if data["status"] in {"completed", "failed"}:
            return data
        time.sleep(0.02)
    raise AssertionError("job did not finish")


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "mivy-backend"}


def test_web_ui(client: TestClient) -> None:
    response = client.get("/ui/")
    assert response.status_code == 200
    assert "Mivy Studio" in response.text


def test_successful_image_upload(client: TestClient) -> None:
    response = client.post(
        "/v1/generations/images",
        files={"image": ("untrusted.png", PNG, "image/png")},
        data={"prompt": "Studio lighting", "style": "minimal"},
    )
    assert response.status_code == 202
    assert response.json()["status"] == "queued"


def test_invalid_file_type(client: TestClient) -> None:
    response = client.post(
        "/v1/generations/images",
        files={"image": ("product.gif", b"GIF89a", "image/gif")},
        data={"prompt": "Advertisement"},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_file_type"


def test_oversized_upload(client: TestClient) -> None:
    response = client.post(
        "/v1/generations/images",
        files={"image": ("large.png", b"x" * (1024 * 1024 + 1), "image/png")},
        data={"prompt": "Advertisement"},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "upload_too_large"


def test_missing_job(client: TestClient) -> None:
    response = client.get("/v1/generations/not-a-job")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "job_not_found"


def test_complete_mock_generation_flow(client: TestClient) -> None:
    job_id = submit(client)
    state = wait_for_terminal_state(client, job_id)
    assert state["status"] == "completed"
    assert state["progress"] == 100
    assert state["output_url"].endswith(f"/v1/generations/{job_id}/result")  # type: ignore[union-attr]
    result = client.get(f"/v1/generations/{job_id}/result")
    assert result.status_code == 200
    assert result.content == PNG


class FailingEngine(GenerationEngine):
    calls = 0

    async def generate(self, generation_input: GenerationInput) -> GenerationOutput:
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("Deliberate test failure")
        output = generation_input.input_image_path.parent.parent / "outputs" / "recovered.png"
        output.write_bytes(generation_input.input_image_path.read_bytes())
        return GenerationOutput(output)


def test_failed_job_does_not_kill_worker(settings: Settings) -> None:
    with TestClient(create_app(settings, FailingEngine())) as client:
        first = submit(client)
        second = submit(client)
        assert wait_for_terminal_state(client, first)["status"] == "failed"
        assert wait_for_terminal_state(client, second)["status"] == "completed"
