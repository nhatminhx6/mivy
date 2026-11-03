"""Đơn in: khách (đã đăng nhập) gửi yêu cầu + file in; xem đơn của mình. Admin: danh sách đơn, báo giá,
đổi trạng thái, danh sách khách hàng + ghi chú chăm sóc."""

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

from app.api.account import admin_user, current_user, fail, public
from app.db.models import PrintOrder, User
from app.services.account_service import AccountError
from app.services.print_order_service import STATUS_LABEL, PrintOrderService, order_code

router = APIRouter(prefix="/v1", tags=["print-orders"])


def orders(request: Request) -> PrintOrderService:
    return request.app.state.print_orders


def out(o: PrintOrder, admin: bool = False, email: str = "") -> dict:
    d = {
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
        "created_at": o.created_at.isoformat(),
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }
    if admin:
        d.update({"user_id": o.user_id, "email": email, "admin_note": o.admin_note})
    return d


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
    file: UploadFile = File(...),
    preview: UploadFile | None = File(None),
    user: User = Depends(current_user),
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
            file_name=file.filename or "",
            file_bytes=await file.read(),
            preview=await preview.read() if preview else None,
        )
    except AccountError as e:
        raise fail(e) from e
    background.add_task(svc.notify_new, o, user.email)
    return out(o)


@router.get("/me/print-orders")
async def my_orders(request: Request, user: User = Depends(current_user)) -> list[dict]:
    return [out(o) for o in await orders(request).mine(user.id)]


async def owned(request: Request, order_id: int, user: User) -> PrintOrder:
    o = await orders(request).get(order_id)
    if not o or (o.user_id != user.id and not user.is_admin):
        raise HTTPException(404, {"code": "no_order", "message": "Không tìm thấy đơn."})
    return o


@router.get("/print-orders/{order_id}/file")
async def order_file(
    order_id: int, request: Request, user: User = Depends(current_user)
) -> FileResponse:
    o = await owned(request, order_id, user)
    p = orders(request).file_path(o)
    if not p.exists():
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
    return [out(o, True, e) for o, e in await orders(request).admin_list(status, q)]


@router.patch("/admin/print-orders/{order_id}")
async def admin_update_order(
    order_id: int, body: OrderPatch, request: Request, _: User = Depends(admin_user)
) -> dict:
    try:
        o = await orders(request).admin_update(order_id, body.model_dump(exclude_unset=True))
    except AccountError as e:
        raise fail(e) from e
    return out(o, True)


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
