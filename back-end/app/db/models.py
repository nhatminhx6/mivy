from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class JobStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    aspect_ratio: Mapped[str] = mapped_column(String(20), default="1:1")
    input_path: Mapped[str] = mapped_column(Text)
    output_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    comfyui_prompt_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


# ---------- Tài khoản + ví (1 đồng Mivy = 1.000đ) ----------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    balance: Mapped[int] = mapped_column(Integer, default=0)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    # chăm sóc khách: SĐT/Zalo + ghi chú riêng của admin
    phone: Mapped[str] = mapped_column(String(20), default="")
    note: Mapped[str] = mapped_column(Text, default="")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class WalletKind(StrEnum):
    SIGNUP = "signup"  # quà đăng ký
    TOPUP = "topup"  # nạp tiền (admin cộng tay)
    CHARGE = "charge"  # trừ tiền khi gen AI
    REFUND = "refund"  # gen lỗi → hoàn


class WalletTx(Base):
    __tablename__ = "wallet_txs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    note: Mapped[str] = mapped_column(String(255), default="")
    balance_after: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)


# ---------- Đơn in (khách gửi yêu cầu → admin báo giá, theo dõi tới lúc giao) ----------
class OrderStatus(StrEnum):
    NEW = "new"  # khách vừa gửi
    QUOTED = "quoted"  # đã báo giá, chờ cọc
    DEPOSITED = "deposited"  # đã cọc
    SAMPLE = "sample"  # đang in mẫu cho khách duyệt
    PRINTING = "printing"  # khách duyệt mẫu, đang in lô
    DELIVERED = "delivered"  # đã giao xong
    CANCELLED = "cancelled"


class PrintOrder(Base):
    __tablename__ = "print_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product: Mapped[str] = mapped_column(String(20))  # card | sticker | keychain
    title: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer)
    material: Mapped[str] = mapped_column(String(120), default="")
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(20))
    address: Mapped[str] = mapped_column(String(300), default="")
    need_by: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    note: Mapped[str] = mapped_column(Text, default="")
    design: Mapped[str] = mapped_column(Text, default="")  # JSON thiết kế để mở lại/sửa
    file_name: Mapped[str] = mapped_column(String(200))  # file in gửi xưởng
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.NEW, index=True)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # tổng tiền (VNĐ)
    deposit: Mapped[int | None] = mapped_column(Integer, nullable=True)  # tiền cọc (VNĐ)
    admin_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
