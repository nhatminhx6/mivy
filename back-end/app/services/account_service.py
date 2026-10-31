"""Tài khoản (email + mật khẩu) và ví đồng Mivy. Mọi thay đổi số dư đều ghi WalletTx."""

import hashlib
import hmac
import re
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import AuthSession, User, WalletKind, WalletTx

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AccountError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


class InsufficientBalance(AccountError):
    def __init__(self, balance: int, price: int) -> None:
        super().__init__("insufficient_balance", f"Không đủ tiền: cần {price} đồng, còn {balance} đồng.", 402)


# scrypt có sẵn trong Python, không cần thư viện ngoài
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt, digest = stored.split("$")
    except ValueError:
        return False
    check = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1)
    return hmac.compare_digest(check.hex(), digest)


class AccountService:
    def __init__(
        self, sessions: async_sessionmaker[AsyncSession], signup_bonus: int, admin_emails: str, session_days: int
    ) -> None:
        self.sessions = sessions
        self.signup_bonus = signup_bonus
        self.admins = {e.strip().lower() for e in admin_emails.split(",") if e.strip()}
        self.session_days = session_days

    async def register(self, email: str, password: str, name: str = "") -> User:
        email = email.strip().lower()
        if not EMAIL_RE.match(email):
            raise AccountError("bad_email", "Email không hợp lệ.")
        if len(password) < 6:
            raise AccountError("weak_password", "Mật khẩu cần ít nhất 6 ký tự.")
        async with self.sessions() as s, s.begin():
            if await s.scalar(select(User).where(User.email == email)):
                raise AccountError("email_taken", "Email này đã có tài khoản, đăng nhập nhé.", 409)
            user = User(
                email=email, name=name.strip()[:120], password_hash=hash_password(password),
                balance=self.signup_bonus, is_admin=email in self.admins,
            )
            s.add(user)
            await s.flush()
            if self.signup_bonus:
                s.add(WalletTx(user_id=user.id, amount=self.signup_bonus, kind=WalletKind.SIGNUP,
                               note="Quà đăng ký", balance_after=user.balance))
        return user

    async def login(self, email: str, password: str) -> tuple[User, str]:
        async with self.sessions() as s, s.begin():
            user = await s.scalar(select(User).where(User.email == email.strip().lower()))
            if not user or not verify_password(password, user.password_hash):
                raise AccountError("bad_login", "Sai email hoặc mật khẩu.", 401)
            if user.email in self.admins and not user.is_admin:
                user.is_admin = True
            token = secrets.token_urlsafe(32)
            s.add(AuthSession(token=token, user_id=user.id,
                              expires_at=datetime.now(UTC) + timedelta(days=self.session_days)))
        return user, token

    async def logout(self, token: str) -> None:
        async with self.sessions() as s, s.begin():
            if sess := await s.get(AuthSession, token):
                await s.delete(sess)

    async def user_by_token(self, token: str) -> User | None:
        async with self.sessions() as s:
            sess = await s.get(AuthSession, token)
            if not sess or sess.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
                return None
            return await s.get(User, sess.user_id)

    async def get(self, user_id: int) -> User | None:
        async with self.sessions() as s:
            return await s.get(User, user_id)

    # ---- ví ----
    async def charge(self, user_id: int, amount: int, note: str) -> int:
        """Trừ tiền nguyên tử (không âm). Trả số dư mới."""
        async with self.sessions() as s, s.begin():
            res = await s.execute(
                update(User).where(User.id == user_id, User.balance >= amount)
                .values(balance=User.balance - amount).returning(User.balance)
            )
            after = res.scalar()
            if after is None:
                user = await s.get(User, user_id)
                raise InsufficientBalance(user.balance if user else 0, amount)
            s.add(WalletTx(user_id=user_id, amount=-amount, kind=WalletKind.CHARGE, note=note, balance_after=after))
        return after

    async def credit(self, user_id: int, amount: int, kind: str, note: str) -> int:
        async with self.sessions() as s, s.begin():
            res = await s.execute(
                update(User).where(User.id == user_id).values(balance=User.balance + amount).returning(User.balance)
            )
            after = res.scalar()
            if after is None:
                raise AccountError("no_user", "Không tìm thấy tài khoản.", 404)
            s.add(WalletTx(user_id=user_id, amount=amount, kind=kind, note=note, balance_after=after))
        return after

    async def topup(self, email: str, amount: int, note: str, by: str) -> tuple[User, int]:
        if amount == 0 or abs(amount) > 100_000:
            raise AccountError("bad_amount", "Số tiền không hợp lệ.")
        async with self.sessions() as s:
            user = await s.scalar(select(User).where(User.email == email.strip().lower()))
        if not user:
            raise AccountError("no_user", "Không tìm thấy tài khoản với email này.", 404)
        after = await self.credit(user.id, amount, WalletKind.TOPUP, (note or "Nạp tiền")[:200] + f" · {by}")
        return user, after

    async def transactions(self, user_id: int | None = None, limit: int = 50) -> list[tuple[WalletTx, str]]:
        async with self.sessions() as s:
            q = select(WalletTx, User.email).join(User, User.id == WalletTx.user_id)
            if user_id is not None:
                q = q.where(WalletTx.user_id == user_id)
            rows = await s.execute(q.order_by(WalletTx.id.desc()).limit(limit))
            return [(tx, email) for tx, email in rows.all()]

    async def search_users(self, q: str, limit: int = 30) -> list[User]:
        async with self.sessions() as s:
            stmt = select(User).order_by(User.id.desc()).limit(limit)
            if q.strip():
                stmt = stmt.where(User.email.contains(q.strip().lower()))
            return list((await s.scalars(stmt)).all())
