"""Đơn in: khách gửi yêu cầu kèm file in → admin báo giá, cập nhật trạng thái tới lúc giao.

Có đơn mới thì báo Telegram cho admin (nếu đã cấu hình bot). File in + ảnh xem trước lưu ở print_dir/<id>/.
"""

import json
import logging
import re
from datetime import datetime
from pathlib import Path

import httpx
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import OrderStatus, PrintOrder, User
from app.services.account_service import AccountError, normalize_phone

log = logging.getLogger(__name__)

PRODUCTS = {"card": "Thiệp", "sticker": "Sticker", "keychain": "Móc khoá", "hashtag": "Hashtag cầm tay", "custom": "Đặt theo yêu cầu"}
STATUS_LABEL = {
    OrderStatus.NEW: "Mới gửi",
    OrderStatus.QUOTED: "Đã báo giá",
    OrderStatus.DEPOSITED: "Đã cọc",
    OrderStatus.SAMPLE: "Đang in mẫu",
    OrderStatus.PRINTING: "Đang in",
    OrderStatus.DELIVERED: "Đã giao",
    OrderStatus.CANCELLED: "Đã huỷ",
}
FILE_EXT = {".pdf", ".svg"}
# Đơn custom: khách gửi file của họ hoặc ảnh tham khảo → nhận rộng hơn (ảnh, file thiết kế, nén).
CUSTOM_EXT = FILE_EXT | {
    ".png", ".jpg", ".jpeg", ".webp", ".heic",
    ".ai", ".psd", ".cdr", ".eps", ".tif", ".tiff", ".zip",
}
MAX_FILE = 40 * 1024 * 1024
MAX_PREVIEW = 6 * 1024 * 1024
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def order_code(order_id: int) -> str:
    return f"IN{order_id:05d}"


class PrintOrderService:
    def __init__(
        self,
        sessions: async_sessionmaker[AsyncSession],
        root: Path,
        telegram_token: str = "",
        telegram_chat: str = "",
        site_url: str = "",
    ) -> None:
        self.sessions = sessions
        self.root = root
        self.telegram_token, self.telegram_chat, self.site_url = (
            telegram_token,
            telegram_chat,
            site_url,
        )

    def folder(self, order_id: int) -> Path:
        return self.root / str(order_id)

    def file_path(self, o: PrintOrder) -> Path:
        return self.folder(o.id) / f"print{Path(o.file_name).suffix.lower()}"

    def preview_path(self, o: PrintOrder) -> Path:
        return self.folder(o.id) / "preview.jpg"

    async def create(
        self,
        user: User,
        *,
        product: str,
        title: str,
        quantity: int,
        material: str,
        contact_name: str,
        phone: str,
        address: str,
        need_by: str,
        note: str,
        design: str,
        file_name: str,
        file_bytes: bytes,
        preview: bytes | None,
    ) -> PrintOrder:
        if product not in PRODUCTS:
            raise AccountError("bad_product", "Loại sản phẩm không hợp lệ.")
        if not 1 <= quantity <= 100_000:
            raise AccountError("bad_quantity", "Số lượng cần từ 1 đến 100.000.")
        phone = normalize_phone(phone)
        if not phone:
            raise AccountError("bad_phone", "Cần số điện thoại / Zalo để báo giá.")
        if need_by and not DATE_RE.match(need_by):
            raise AccountError("bad_date", "Ngày cần nhận không hợp lệ.")
        ext = Path(file_name or "").suffix.lower()
        allowed = CUSTOM_EXT if product == "custom" else FILE_EXT
        if ext not in allowed or not file_bytes or len(file_bytes) > MAX_FILE:
            kinds = "PDF/SVG/ảnh/AI/PSD/CDR/EPS/ZIP" if product == "custom" else "PDF/SVG"
            raise AccountError("bad_file", f"File phải là {kinds}, tối đa 40MB.")
        if preview and len(preview) > MAX_PREVIEW:
            preview = None
        try:
            json.loads(design or "{}")
        except ValueError:
            design = ""
        async with self.sessions() as s, s.begin():
            o = PrintOrder(
                user_id=user.id,
                product=product,
                title=title.strip()[:200] or PRODUCTS[product],
                quantity=quantity,
                material=material.strip()[:120],
                contact_name=contact_name.strip()[:120],
                phone=phone,
                address=address.strip()[:300],
                need_by=need_by,
                note=note.strip()[:2000],
                design=design[:200_000],
                file_name=Path(file_name).name[:200],
                status=OrderStatus.NEW,
            )
            s.add(o)
            await s.flush()
            # lần đầu đặt in → lưu SĐT/tên vào tài khoản để chăm sóc sau
            u = await s.get(User, user.id)
            if u and not u.phone:
                u.phone = phone
            if u and not u.name and o.contact_name:
                u.name = o.contact_name
            folder = self.folder(o.id)
            folder.mkdir(parents=True, exist_ok=True)
            self.file_path(o).write_bytes(file_bytes)
            if preview:
                self.preview_path(o).write_bytes(preview)
        return o

    async def mine(self, user_id: int) -> list[PrintOrder]:
        async with self.sessions() as s:
            q = (
                select(PrintOrder)
                .where(PrintOrder.user_id == user_id)
                .order_by(PrintOrder.id.desc())
            )
            return list((await s.scalars(q)).all())

    async def get(self, order_id: int) -> PrintOrder | None:
        async with self.sessions() as s:
            return await s.get(PrintOrder, order_id)

    async def admin_list(
        self, status: str = "", q: str = "", limit: int = 200
    ) -> list[tuple[PrintOrder, str]]:
        async with self.sessions() as s:
            stmt = select(PrintOrder, User.email).join(User, User.id == PrintOrder.user_id)
            if status:
                stmt = stmt.where(PrintOrder.status == status)
            if q.strip():
                k = f"%{q.strip().lower()}%"
                code = re.sub(r"\D", "", q)
                conds = [
                    User.email.ilike(k),
                    PrintOrder.phone.ilike(k),
                    PrintOrder.contact_name.ilike(k),
                    PrintOrder.title.ilike(k),
                ]
                if code:
                    conds.append(PrintOrder.id == int(code))
                stmt = stmt.where(or_(*conds))
            rows = await s.execute(stmt.order_by(PrintOrder.id.desc()).limit(limit))
            return [(o, e) for o, e in rows.all()]

    async def admin_update(self, order_id: int, changes: dict) -> PrintOrder:
        async with self.sessions() as s, s.begin():
            o = await s.get(PrintOrder, order_id)
            if not o:
                raise AccountError("no_order", "Không tìm thấy đơn.", 404)
            if "status" in changes:
                if changes["status"] not in set(OrderStatus):
                    raise AccountError("bad_status", "Trạng thái không hợp lệ.")
                o.status = changes["status"]
            for k in ("price", "deposit"):
                if k in changes:
                    v = changes[k]
                    if v is not None and not 0 <= int(v) <= 10_000_000_000:
                        raise AccountError("bad_amount", "Số tiền không hợp lệ.")
                    setattr(o, k, None if v is None else int(v))
            if "admin_note" in changes:
                o.admin_note = str(changes["admin_note"] or "")[:4000]
        return o

    async def customers(self, q: str = "", limit: int = 200) -> list[dict]:
        async with self.sessions() as s:
            agg = (
                select(
                    PrintOrder.user_id,
                    func.count(PrintOrder.id).label("orders"),
                    func.max(PrintOrder.created_at).label("last"),
                    func.coalesce(
                        func.sum(PrintOrder.price).filter(
                            PrintOrder.status != OrderStatus.CANCELLED
                        ),
                        0,
                    ).label("total"),
                )
                .group_by(PrintOrder.user_id)
                .subquery()
            )
            stmt = select(User, agg.c.orders, agg.c.last, agg.c.total).outerjoin(
                agg, agg.c.user_id == User.id
            )
            if q.strip():
                k = f"%{q.strip().lower()}%"
                stmt = stmt.where(or_(User.email.ilike(k), User.phone.ilike(k), User.name.ilike(k)))
            stmt = stmt.order_by(agg.c.last.desc().nulls_last(), User.id.desc()).limit(limit)
            rows = (await s.execute(stmt)).all()
        return [
            {
                "user": u,
                "orders": n or 0,
                "last_order_at": last.isoformat() if isinstance(last, datetime) else last,
                "total": int(total or 0),
            }
            for u, n, last, total in rows
        ]

    async def update_customer(self, user_id: int, changes: dict) -> User:
        async with self.sessions() as s, s.begin():
            u = await s.get(User, user_id)
            if not u:
                raise AccountError("no_user", "Không tìm thấy tài khoản.", 404)
            if "phone" in changes:
                u.phone = normalize_phone(str(changes["phone"] or ""))
            if "note" in changes:
                u.note = str(changes["note"] or "")[:4000]
            if "name" in changes:
                u.name = str(changes["name"] or "").strip()[:120]
        return u

    # ---- báo admin qua Telegram (không cấu hình thì bỏ qua, lỗi mạng cũng bỏ qua) ----
    async def notify_new(self, o: PrintOrder, email: str) -> None:
        if not self.telegram_token or not self.telegram_chat:
            return
        lines = [
            f"🆕 Đơn in {order_code(o.id)}",
            f"{o.title} · {o.quantity} cái" + (f" · {o.material}" if o.material else ""),
            f"Khách: {o.contact_name or email} · {o.phone}",
        ]
        if o.need_by:
            lines.append(f"Cần trước: {o.need_by}")
        if o.address:
            lines.append(f"Giao: {o.address}")
        if o.note:
            lines.append(f"Ghi chú: {o.note[:300]}")
        if self.site_url:
            lines.append(f"{self.site_url.rstrip('/')}/studio/admin")
        text = "\n".join(lines)
        base = f"https://api.telegram.org/bot{self.telegram_token}"
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                pv = self.preview_path(o)
                if pv.exists():
                    r = await c.post(
                        f"{base}/sendPhoto",
                        data={"chat_id": self.telegram_chat, "caption": text[:1000]},
                        files={"photo": ("preview.jpg", pv.read_bytes(), "image/jpeg")},
                    )
                else:
                    r = await c.post(
                        f"{base}/sendMessage", data={"chat_id": self.telegram_chat, "text": text}
                    )
                if r.status_code >= 400:
                    log.warning("telegram notify failed: %s %s", r.status_code, r.text[:200])
        except httpx.HTTPError as e:
            log.warning("telegram notify error: %s", e)
