"""Đăng ký / đăng nhập (cookie httpOnly), ví đồng Mivy, admin cộng tiền, Người mẫu AI có trừ tiền."""

import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel

from app.db.models import User, WalletKind
from app.services.account_service import AccountError, AccountService
from app.services.tryon_service import CATEGORIES, PHOTO_TYPES, TryOnError, TryOnService

router = APIRouter(prefix="/v1", tags=["account"])
COOKIE = "mivy_session"


def accounts(request: Request) -> AccountService:
    return request.app.state.accounts


async def current_user(request: Request) -> User:
    token = request.cookies.get(COOKIE) or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    user = await accounts(request).user_by_token(token) if token else None
    if not user:
        raise HTTPException(401, {"code": "unauthorized", "message": "Đăng nhập để dùng tính năng này nhé."})
    return user


async def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, {"code": "forbidden", "message": "Chỉ admin mới làm được việc này."})
    return user


def fail(e: AccountError) -> HTTPException:
    return HTTPException(e.status, {"code": e.code, "message": e.message})


def public(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "balance": u.balance, "is_admin": u.is_admin}


class RegisterIn(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginIn(BaseModel):
    email: str
    password: str


class TopupIn(BaseModel):
    email: str
    amount: int
    note: str = ""


def set_cookie(request: Request, response: Response, token: str) -> None:
    st = request.app.state.settings
    response.set_cookie(COOKIE, token, max_age=st.session_days * 86400, httponly=True, samesite="lax",
                        secure=st.cookie_secure, path="/")


@router.post("/auth/register")
async def register(body: RegisterIn, request: Request, response: Response) -> dict:
    svc = accounts(request)
    try:
        await svc.register(body.email, body.password, body.name)
        user, token = await svc.login(body.email, body.password)
    except AccountError as e:
        raise fail(e) from e
    set_cookie(request, response, token)
    return public(user)


@router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response) -> dict:
    try:
        user, token = await accounts(request).login(body.email, body.password)
    except AccountError as e:
        raise fail(e) from e
    set_cookie(request, response, token)
    return public(user)


@router.post("/auth/logout")
async def logout(request: Request, response: Response) -> dict:
    if token := request.cookies.get(COOKIE):
        await accounts(request).logout(token)
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
async def me(request: Request, user: User = Depends(current_user)) -> dict:
    return {**public(user), "prices": {"tryon": request.app.state.settings.tryon_price}}


def tx_out(tx, email: str) -> dict:
    return {"id": tx.id, "email": email, "amount": tx.amount, "kind": tx.kind, "note": tx.note,
            "balance_after": tx.balance_after, "created_at": tx.created_at.isoformat()}


@router.get("/me/transactions")
async def my_transactions(request: Request, user: User = Depends(current_user)) -> list[dict]:
    return [tx_out(tx, e) for tx, e in await accounts(request).transactions(user.id, 100)]


# ---------- admin ----------
@router.get("/admin/users")
async def admin_users(request: Request, q: str = "", _: User = Depends(admin_user)) -> list[dict]:
    return [{**public(u), "created_at": u.created_at.isoformat()} for u in await accounts(request).search_users(q)]


@router.post("/admin/topup")
async def admin_topup(body: TopupIn, request: Request, admin: User = Depends(admin_user)) -> dict:
    try:
        user, after = await accounts(request).topup(body.email, body.amount, body.note, admin.email)
    except AccountError as e:
        raise fail(e) from e
    return {"email": user.email, "balance": after}


@router.get("/admin/transactions")
async def admin_transactions(request: Request, _: User = Depends(admin_user)) -> list[dict]:
    return [tx_out(tx, e) for tx, e in await accounts(request).transactions(None, 100)]


# ---------- Người mẫu AI (trừ tiền trước, lỗi thì hoàn) ----------
MAX_IMG = 8 * 1024 * 1024


@router.post("/tryon")
async def tryon(
    request: Request,
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
    garment_kind: str = Form("top"),
    photo_type: str = Form("flat-lay"),
    user: User = Depends(current_user),
) -> Response:
    if garment_kind not in CATEGORIES or photo_type not in PHOTO_TYPES:
        raise HTTPException(422, {"code": "bad_input", "message": "Loại đồ không hợp lệ."})
    p, g = await person.read(), await garment.read()
    if not p or not g or len(p) > MAX_IMG or len(g) > MAX_IMG:
        raise HTTPException(422, {"code": "bad_image", "message": "Ảnh trống hoặc quá lớn (tối đa 8MB)."})
    svc, price = accounts(request), request.app.state.settings.tryon_price
    try:
        await svc.charge(user.id, price, "Người mẫu AI")
    except AccountError as e:
        raise fail(e) from e
    engine: TryOnService = request.app.state.tryon
    try:
        img = await engine.generate(p, g, garment_kind, photo_type, secrets.randbelow(1_000_000))
    except TryOnError as e:
        after = await svc.credit(user.id, price, WalletKind.REFUND, "Hoàn tiền: tạo ảnh lỗi")
        raise HTTPException(429 if e.quota else 502, {"code": "tryon_failed", "message": str(e), "balance": after}) from e
    after = (await svc.get(user.id)).balance
    media = "image/webp" if img[:4] == b"RIFF" else "image/png" if img[:4] == b"\x89PNG" else "image/jpeg"
    return Response(img, media_type=media, headers={"X-Balance": str(after)})
