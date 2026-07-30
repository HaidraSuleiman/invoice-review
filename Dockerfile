# syntax=docker/dockerfile:1

# --- Frontend: production SPA with same-origin API base ---
FROM node:22-bookworm AS frontend
WORKDIR /src/frontend
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
ENV VITE_API_BASE_URL=
RUN pnpm build

# --- Backend runtime: FastAPI + static SPA ---
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.11.15 /uv /usr/local/bin/uv

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/app ./app
COPY --from=frontend /src/frontend/dist ./static

ENV PATH="/app/.venv/bin:$PATH" \
    STATIC_DIR=/app/static \
    PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
