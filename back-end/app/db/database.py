from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import Base


class Database:
    def __init__(self, url: str) -> None:
        self.engine: AsyncEngine = create_async_engine(url)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def create_tables(self) -> None:
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.run_sync(_add_missing_columns)

    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.sessions() as session:
            yield session

    async def close(self) -> None:
        await self.engine.dispose()


# create_all không thêm cột mới vào bảng đã có → tự ALTER cột còn thiếu (DB SQLite đang chạy thật)
def _add_missing_columns(conn) -> None:
    if conn.dialect.name != "sqlite":
        return
    for table in Base.metadata.sorted_tables:
        have = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table.name})"))}
        for col in table.columns:
            if col.name in have:
                continue
            arg = col.default.arg if col.default is not None else None
            default = ""
            if arg is not None and not callable(arg):
                default = f" DEFAULT '{arg}'" if isinstance(arg, str) else f" DEFAULT {arg}"
            kind = col.type.compile(conn.dialect)
            conn.execute(text(f"ALTER TABLE {table.name} ADD COLUMN {col.name} {kind}{default}"))
