import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.account_service import normalize_phone

PDF = b"%PDF-1.4\n" + b"0" * 2048
JPG = b"\xff\xd8\xff" + b"0" * 512


@pytest.fixture
def client(tmp_path: Path):
    settings = Settings(
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        upload_dir=tmp_path / "uploads", output_dir=tmp_path / "outputs", print_dir=tmp_path / "print",
        generation_engine="mock", admin_emails="boss@mivy.vn",
    )
    with TestClient(create_app(settings)) as c:
        yield c


def register(c: TestClient, email: str, phone: str = "") -> dict:
    r = c.post("/v1/auth/register", json={"email": email, "password": "matkhau1", "phone": phone})
    assert r.status_code == 200, r.text
    return r.json()


def send_order(c: TestClient, **over):
    data = {
        "product": "card", "title": "Thiệp cưới 12×17cm", "quantity": "300", "material": "Giấy mỹ thuật",
        "contact_name": "Thu Hà", "phone": "+84 909.123.456", "address": "Q. Tân Phú", "need_by": "2026-12-01",
        "note": "In gấp giúp em", "design": json.dumps({"layout": "frame"}),
    }
    data.update(over.pop("data", {}))
    files = over.pop("files", {"file": ("thiep.pdf", PDF, "application/pdf"), "preview": ("p.jpg", JPG, "image/jpeg")})
    return c.post("/v1/print-orders", data=data, files=files)


def test_normalize_phone() -> None:
    assert normalize_phone("+84 909.123.456") == "0909123456"
    assert normalize_phone("0909 123 456") == "0909123456"
    assert normalize_phone("12345") == ""


def test_order_needs_login(client: TestClient) -> None:
    assert send_order(client).status_code == 401


def test_customer_orders_and_saves_phone(client: TestClient) -> None:
    register(client, "ha@gmail.com")
    r = send_order(client)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["code"] == "IN00001" and o["status"] == "new" and o["phone"] == "0909123456" and "admin_note" not in o
    me = client.get("/v1/me").json()
    assert me["phone"] == "0909123456" and me["name"] == "Thu Hà"
    mine = client.get("/v1/me/print-orders").json()
    assert [x["code"] for x in mine] == ["IN00001"]
    f = client.get(f"/v1/print-orders/{o['id']}/file")
    assert f.status_code == 200 and f.content == PDF and "IN00001-thiep.pdf" in f.headers["content-disposition"]
    assert client.get(f"/v1/print-orders/{o['id']}/preview").content == JPG


def test_order_rejects_bad_input(client: TestClient) -> None:
    register(client, "a@gmail.com")
    assert send_order(client, data={"phone": "abc"}).json()["error"]["code"] == "bad_phone"
    assert send_order(client, data={"quantity": "0"}).json()["error"]["code"] == "bad_quantity"
    assert send_order(client, data={"product": "mug"}).json()["error"]["code"] == "bad_product"
    bad_file = send_order(client, files={"file": ("x.exe", b"MZ", "application/octet-stream")})
    assert bad_file.json()["error"]["code"] == "bad_file"


def test_other_customer_cannot_see_order(client: TestClient) -> None:
    register(client, "a@gmail.com")
    oid = send_order(client).json()["id"]
    client.post("/v1/auth/logout")
    register(client, "b@gmail.com")
    assert client.get(f"/v1/print-orders/{oid}/file").status_code == 404
    assert client.get("/v1/me/print-orders").json() == []


def test_admin_quotes_and_tracks_customers(client: TestClient) -> None:
    register(client, "a@gmail.com", phone="0911222333")
    oid = send_order(client).json()["id"]
    assert client.get("/v1/admin/print-orders").status_code == 403
    client.post("/v1/auth/logout")
    register(client, "boss@mivy.vn")
    rows = client.get("/v1/admin/print-orders").json()
    assert rows[0]["email"] == "a@gmail.com" and rows[0]["admin_note"] == ""
    r = client.patch(f"/v1/admin/print-orders/{oid}", json={"status": "quoted", "price": 900000, "deposit": 450000,
                                                           "admin_note": "Xưởng Tân Phú 2.5k/cái"})
    assert r.status_code == 200 and r.json()["status_label"] == "Đã báo giá"
    assert client.patch(f"/v1/admin/print-orders/{oid}", json={"status": "lost"}).status_code == 400
    assert client.get("/v1/admin/print-orders?status=quoted").json()[0]["price"] == 900000
    assert client.get("/v1/admin/print-orders?q=IN00001").json()[0]["id"] == oid
    assert client.get("/v1/admin/print-orders?q=0911").json() == []  # SĐT của đơn là số khách nhập trong đơn
    cust = {c["email"]: c for c in client.get("/v1/admin/customers").json()}
    a = cust["a@gmail.com"]
    assert a["orders"] == 1 and a["total"] == 900000 and a["phone"] == "0911222333"  # SĐT đăng ký giữ nguyên
    assert client.patch(f"/v1/admin/customers/{a['id']}", json={"note": "Khách quen, thích giấy mỹ thuật"}).json()["note"]
    assert client.get("/v1/admin/customers?q=0911").json()[0]["note"].startswith("Khách quen")
    # admin xem được file của khách
    assert client.get(f"/v1/print-orders/{oid}/file").status_code == 200


def test_profile_phone(client: TestClient) -> None:
    register(client, "a@gmail.com")
    assert client.patch("/v1/me", json={"phone": "123"}).status_code == 400
    assert client.patch("/v1/me", json={"phone": "0909 000 111", "name": "An"}).json()["phone"] == "0909000111"


async def test_old_database_gets_new_columns(tmp_path: Path) -> None:
    import sqlite3

    from app.db.database import Database

    path = tmp_path / "old.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255), name VARCHAR(120), "
                "password_hash VARCHAR(255), balance INTEGER, is_admin BOOLEAN, created_at DATETIME)")
    con.execute("INSERT INTO users (email, name, password_hash, balance, is_admin) VALUES ('cu@gmail.com', '', 'x', 5, 0)")
    con.commit()
    con.close()
    db = Database(f"sqlite+aiosqlite:///{path}")
    await db.create_tables()
    await db.close()
    con = sqlite3.connect(path)
    cols = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    row = con.execute("SELECT phone, note, balance FROM users").fetchone()
    assert {"phone", "note"} <= cols and row == ("", "", 5)
