from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.tryon_service import TryOnError

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


class FakeTryOn:
    def __init__(self) -> None:
        self.fail: TryOnError | None = None
        self.calls = 0

    async def generate(self, person: bytes, garment: bytes, kind: str, photo: str, seed: int) -> bytes:
        self.calls += 1
        if self.fail:
            raise self.fail
        return PNG


@pytest.fixture
def ctx(tmp_path: Path):
    settings = Settings(
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        upload_dir=tmp_path / "uploads", output_dir=tmp_path / "outputs",
        generation_engine="mock", admin_emails="boss@mivy.vn", signup_bonus=2, tryon_price=2,
    )
    app = create_app(settings)
    fake = FakeTryOn()
    app.state.tryon = fake
    with TestClient(app) as c:
        yield c, fake


def register(c: TestClient, email: str, pw: str = "matkhau1") -> dict:
    r = c.post("/v1/auth/register", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()


def tryon(c: TestClient):
    return c.post("/v1/tryon", files={"person": ("p.jpg", b"p"), "garment": ("g.jpg", b"g")},
                  data={"garment_kind": "top", "photo_type": "flat-lay"})


def test_register_gives_bonus_and_logs_in(ctx) -> None:
    c, _ = ctx
    u = register(c, "An@Gmail.com")
    assert u["email"] == "an@gmail.com" and u["balance"] == 2 and not u["is_admin"]
    me = c.get("/v1/me").json()
    assert me["balance"] == 2 and me["prices"]["tryon"] == 2
    assert [t["kind"] for t in c.get("/v1/me/transactions").json()] == ["signup"]


def test_register_rejects_bad_input_and_duplicates(ctx) -> None:
    c, _ = ctx
    assert c.post("/v1/auth/register", json={"email": "sai", "password": "matkhau1"}).status_code == 400
    assert c.post("/v1/auth/register", json={"email": "a@b.vn", "password": "123"}).status_code == 400
    register(c, "a@b.vn")
    assert c.post("/v1/auth/register", json={"email": "A@b.vn", "password": "matkhau1"}).status_code == 409


def test_login_logout(ctx) -> None:
    c, _ = ctx
    register(c, "a@b.vn")
    c.post("/v1/auth/logout")
    assert c.get("/v1/me").status_code == 401
    assert c.post("/v1/auth/login", json={"email": "a@b.vn", "password": "sai-roi"}).status_code == 401
    assert c.post("/v1/auth/login", json={"email": "a@b.vn", "password": "matkhau1"}).status_code == 200
    assert c.get("/v1/me").status_code == 200


def test_tryon_needs_login(ctx) -> None:
    c, fake = ctx
    assert tryon(c).status_code == 401 and fake.calls == 0


def test_tryon_charges_then_blocks_when_empty(ctx) -> None:
    c, fake = ctx
    register(c, "a@b.vn")
    r = tryon(c)
    assert r.status_code == 200 and r.content == PNG and r.headers["x-balance"] == "0"
    r = tryon(c)
    assert r.status_code == 402 and fake.calls == 1
    assert "Không đủ tiền" in r.json()["error"]["message"]


def test_tryon_refunds_on_failure(ctx) -> None:
    c, fake = ctx
    register(c, "a@b.vn")
    fake.fail = TryOnError("hết GPU", quota=True)
    r = tryon(c)
    assert r.status_code == 429 and r.json()["error"]["balance"] == 2
    assert c.get("/v1/me").json()["balance"] == 2
    assert [t["kind"] for t in c.get("/v1/me/transactions").json()] == ["refund", "charge", "signup"]


def test_admin_topup(ctx) -> None:
    c, _ = ctx
    register(c, "khach@b.vn")
    # user thường không được cộng tiền
    assert c.post("/v1/admin/topup", json={"email": "khach@b.vn", "amount": 100}).status_code == 403
    c.post("/v1/auth/logout")
    boss = register(c, "boss@mivy.vn")
    assert boss["is_admin"]
    r = c.post("/v1/admin/topup", json={"email": "khach@b.vn", "amount": 100, "note": "CK 100k"})
    assert r.status_code == 200 and r.json()["balance"] == 102
    assert c.post("/v1/admin/topup", json={"email": "khong-co@b.vn", "amount": 100}).status_code == 404
    assert c.get("/v1/admin/users", params={"q": "khach"}).json()[0]["balance"] == 102
    assert c.get("/v1/admin/transactions").json()[0]["kind"] == "topup"
