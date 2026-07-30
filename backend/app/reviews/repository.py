"""SQLite access for review history."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.reviews.models import ReviewRow


def insert_review(session: Session, row: ReviewRow) -> ReviewRow:
    session.add(row)
    session.flush()
    return row


def list_reviews(session: Session) -> list[ReviewRow]:
    statement = select(ReviewRow).order_by(ReviewRow.decided_at.desc())
    return list(session.scalars(statement))


def get_review(session: Session, review_id: str) -> ReviewRow | None:
    return session.get(ReviewRow, review_id)


def delete_review(session: Session, review_id: str) -> ReviewRow | None:
    row = session.get(ReviewRow, review_id)
    if row is None:
        return None
    session.delete(row)
    session.flush()
    return row
