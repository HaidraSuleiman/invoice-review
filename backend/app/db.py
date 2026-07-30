"""SQLAlchemy engine and session helpers for local SQLite."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATA_DIR, DATABASE_PATH


class Base(DeclarativeBase):
    pass


def _database_url() -> str:
    # Absolute path so the file location does not depend on the process cwd.
    return f"sqlite:///{DATABASE_PATH.resolve().as_posix()}"


engine = create_engine(
    _database_url(),
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    """Create the data directory and tables if they do not exist yet."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Import models so metadata is registered before create_all.
    import app.reviews.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
