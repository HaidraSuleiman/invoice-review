"""HTTP boundary for review history."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.reviews.schemas import ReviewCreate, ReviewRecord, ReviewSummary
from app.reviews.service import (
    ReviewValidationError,
    create_review,
    delete_review_record,
    get_review_record,
    list_review_summaries,
)

router = APIRouter(tags=["reviews"])


@router.post(
    "/reviews",
    response_model=ReviewRecord,
    status_code=status.HTTP_201_CREATED,
)
def post_review(payload: ReviewCreate) -> ReviewRecord:
    try:
        return create_review(payload)
    except ReviewValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/reviews", response_model=list[ReviewSummary])
def get_reviews() -> list[ReviewSummary]:
    return list_review_summaries()


@router.get("/reviews/{review_id}", response_model=ReviewRecord)
def get_review(review_id: str) -> ReviewRecord:
    record = get_review_record(review_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    return record


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: str) -> None:
    deleted = delete_review_record(review_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
