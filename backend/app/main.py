"""FastAPI application construction and dependency wiring."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, RuntimePaths
from app.db import init_db
from app.documents.routes import router as documents_router
from app.reviews.routes import router as reviews_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Document Review", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(reviews_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _mount_spa(static_root: Path) -> None:
    assets_dir = static_root / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        if full_path:
            candidate = static_root / full_path
            if candidate.is_file():
                return FileResponse(candidate)
        return FileResponse(static_root / "index.html")


_static_dir = RuntimePaths().static_dir
if _static_dir is not None and _static_dir.is_dir():
    _mount_spa(_static_dir)
