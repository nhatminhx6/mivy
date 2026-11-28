"""Đơn in: khách gửi yêu cầu in; xem đơn của mình. Admin: danh sách đơn, báo giá,
đổi trạng thái, danh sách khách hàng + ghi chú chăm sóc."""

from datetime import UTC, datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.account import admin_user, current_user, fail, optional_user, public
from app.db.models import MessageSender, OrderMessage, PrintOrder, User
from app.services.account_service import AccountError
from app.services.print_order_service import MAX_FILE, MAX_PREVIEW, STATUS_LABEL, PrintOrderService, order_code

router = APIRouter(prefix="/v1", tags=["print-orders"])


def orders(request: Request) -> PrintOrderService:
    return request.app.state.print_orders


def iso(dt: datetime | None) -> str | None:
    """SQLite trả datetime naive (mất tzinfo) → coi là UTC để client hiển thị đúng giờ VN."""
    if dt is None:
        return None
    return (dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt).isoformat()


def out(o: PrintOrder, admin: bool = False, email: str = "", unread: int = 0) -> dict:
    d = {
        "has_account": o.user_id is not None,
        "id": o.id,
        "code": order_code(o.id),
        "product": o.product,
        "title": o.title,
        "quantity": o.quantity,
        "material": o.material,
        "contact_name": o.contact_name,
        "phone": o.phone,
        "address": o.address,
        "need_by": o.need_by,
        "note": o.note,
        "status": o.status,
        "status_label": STATUS_LABEL.get(o.status, o.status),
        "price": o.price,
        "deposit": o.deposit,
        "file_name": o.file_name,
        "unread": unread,
        "created_at": iso(o.created_at),
        "updated_at": iso(o.updated_at),
    }
    if admin:
        d.update({"user_id": o.user_id, "email": email if "@" in email else "", "admin_note": o.admin_note})
    return d


def msg_out(m: OrderMessage) -> dict:
    return {
        "id": m.id,
        "order_id": m.order_id,
        "sender": m.sender,
        "body": m.body,
        "created_at": iso(m.created_at),
    }


class MessageBody(BaseModel):
    body: str


@router.post("/print-orders")
async def create_order(
    request: Request,
    background: BackgroundTasks,
    product: str = Form(...),
    title: str = Form(""),
    quantity: int = Form(...),
    material: str = Form(""),
    contact_name: str = Form(""),
    phone: str = Form(...),
    address: str = Form(""),
    need_by: str = Form(""),
    note: str = Form(""),
    design: str = Form(""),
    file: UploadFile | None = File(None),
    preview: UploadFile | None = File(None),
    user: User | None = Depends(optional_user),
) -> dict:
    svc = orders(request)
    try:
        o = await svc.create(
            user,
            product=product,
            title=title,
            quantity=quantity,
            material=material,
            contact_name=contact_name,
            phone=phone,
            address=address,
            need_by=need_by,
            note=note,
            design=design,
            file_name=(file.filename or "") if file else "",
            file_bytes=await file.read(MAX_FILE + 1) if file else b"",
            preview=await preview.read(MAX_PREVIEW + 1) if preview and file else None,
        )
    except AccountError as e:
        raise fail(e) from e
    background.add_task(svc.notify_new, o, public(user)["email"] if user else "")
    return out(o)


@router.get("/me/print-orders")
async def my_orders(request: Request, user: User = Depends(current_user)) -> list[dict]:
    rows = await orders(request).mine(user.id)
    unread = await orders(request).unread_map([o.id for o in rows], MessageSender.CUSTOMER)
    return [out(o, unread=unread.get(o.id, 0)) for o in rows]


async def owned(request: Request, order_id: int, user: User) -> PrintOrder:
    o = await orders(request).get(order_id)
    if not o or (o.user_id != user.id and not user.is_admin):
        raise HTTPException(404, {"code": "no_order", "message": "Không tìm thấy đơn."})
    return o


async def owner_only(request: Request, order_id: int, user: User) -> PrintOrder:
    """Chat phía khách: chỉ chủ đơn (đơn có tài khoản), không cho admin đi cửa này."""
    o = await orders(request).get(order_id)
    if not o or o.user_id != user.id:
        raise HTTPException(404, {"code": "no_order", "message": "Không tìm thấy đơn."})
    return o


# ---------- Chat theo đơn: phía khách ----------
@router.get("/print-orders/{order_id}/messages")
async def my_messages(
    order_id: int, request: Request, after: int = 0, user: User = Depends(current_user)
) -> list[dict]:
    await owner_only(request, order_id, user)
    svc = orders(request)
    await svc.mark_read(order_id, MessageSender.CUSTOMER)
    return [msg_out(m) for m in await svc.messages(order_id, after)]


@router.post("/print-orders/{order_id}/messages")
async def send_message(
    order_id: int,
    body: MessageBody,
    request: Request,
    background: BackgroundTasks,
    user: User = Depends(current_user),
) -> dict:
    o = await owner_only(request, order_id, user)
    svc = orders(request)
    try:
        m = await svc.add_message(order_id, MessageSender.CUSTOMER, body.body)
    except AccountError as e:
        raise fail(e) from e
    background.add_task(svc.notify_message, o, m.body)
    return msg_out(m)


@router.get("/print-orders/{order_id}/file")
async def order_file(
    order_id: int, request: Request, user: User = Depends(current_user)
) -> FileResponse:
    o = await owned(request, order_id, user)
    p = orders(request).file_path(o)
    if not o.file_name or not p.is_file():
        raise HTTPException(404, {"code": "no_file", "message": "File in không còn."})
    return FileResponse(p, filename=f"{order_code(o.id)}-{o.file_name}")


@router.get("/print-orders/{order_id}/preview")
async def order_preview(
    order_id: int, request: Request, user: User = Depends(current_user)
) -> FileResponse:
    o = await owned(request, order_id, user)
    p = orders(request).preview_path(o)
    if not p.exists():
        raise HTTPException(404, {"code": "no_preview", "message": "Không có ảnh xem trước."})
    return FileResponse(p, media_type="image/jpeg")


# ---------- admin ----------
class OrderPatch(BaseModel):
    status: str | None = None
    price: int | None = None
    deposit: int | None = None
    admin_note: str | None = None


class CustomerPatch(BaseModel):
    name: str | None = None
    phone: str | None = None
    note: str | None = None


@router.get("/admin/print-orders")
async def admin_orders(
    request: Request, status: str = "", q: str = "", _: User = Depends(admin_user)
) -> list[dict]:
    rows = await orders(request).admin_list(status, q)
    unread = await orders(request).unread_map([o.id for o, _e in rows], MessageSender.ADMIN)
    return [out(o, True, e, unread.get(o.id, 0)) for o, e in rows]


@router.patch("/admin/print-orders/{order_id}")
async def admin_update_order(
    order_id: int, body: OrderPatch, request: Request, _: User = Depends(admin_user)
) -> dict:
    try:
        o = await orders(request).admin_update(order_id, body.model_dump(exclude_unset=True))
    except AccountError as e:
        raise fail(e) from e
    return out(o, True)


# ---------- Chat theo đơn: phía admin ----------
@router.get("/admin/print-orders/{order_id}/messages")
async def admin_messages(
    order_id: int, request: Request, after: int = 0, _: User = Depends(admin_user)
) -> list[dict]:
    svc = orders(request)
    if not await svc.get(order_id):
        raise HTTPException(404, {"code": "no_order", "message": "Không tìm thấy đơn."})
    await svc.mark_read(order_id, MessageSender.ADMIN)
    return [msg_out(m) for m in await svc.messages(order_id, after)]


@router.post("/admin/print-orders/{order_id}/messages")
async def admin_send_message(
    order_id: int, body: MessageBody, request: Request, _: User = Depends(admin_user)
) -> dict:
    svc = orders(request)
    if not await svc.get(order_id):
        raise HTTPException(404, {"code": "no_order", "message": "Không tìm thấy đơn."})
    try:
        m = await svc.add_message(order_id, MessageSender.ADMIN, body.body)
    except AccountError as e:
        raise fail(e) from e
    return msg_out(m)


@router.get("/admin/customers")
async def admin_customers(
    request: Request, q: str = "", _: User = Depends(admin_user)
) -> list[dict]:
    rows = await orders(request).customers(q)
    return [
        {
            **public(r["user"]),
            "note": r["user"].note or "",
            "created_at": r["user"].created_at.isoformat(),
            "orders": r["orders"],
            "last_order_at": r["last_order_at"],
            "total": r["total"],
        }
        for r in rows
    ]


@router.patch("/admin/customers/{user_id}")
async def admin_update_customer(
    user_id: int, body: CustomerPatch, request: Request, _: User = Depends(admin_user)
) -> dict:
    try:
        u = await orders(request).update_customer(user_id, body.model_dump(exclude_unset=True))
    except AccountError as e:
        raise fail(e) from e
    return {**public(u), "note": u.note or ""}
