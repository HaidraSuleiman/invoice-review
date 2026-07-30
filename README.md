# Invoice Review

End-to-end invoice and receipt review for a fictional EU facilities company (**Northstar Facilities B.V.**). Upload a multilingual PDF or image, combine Azure Document Intelligence with Azure OpenAI, run deterministic finance rules, get a suggested GL account, then approve, reject, or draft a supplier correction.

---

## Features

- Upload one PDF / PNG / JPEG (max 4 MB)
- Automatic invoice vs receipt classification (Azure OpenAI, structured output)
- Primary extraction via Azure AI Document Intelligence (`prebuilt-invoice` / `prebuilt-receipt`)
- Independent LLM extraction with deterministic merge (Document Intelligence wins; LLM only fills missing fields)
- Offline EU VAT format/checksum checks (`python-stdnum`) plus totals reconciliation
- Fixed Northstar GL catalog with an Azure OpenAI suggestion (reviewer can override)
- Human review UI: welcome → upload → process → review → history
- SQLite persistence for accept/reject history; on-demand correction-email draft (copy only — never sent)
- 13-document fictional multilingual corpus for demos and evaluation

---

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, SQLite, uv |
| Frontend | Vite, React, TypeScript (strict), Tailwind CSS, pnpm |
| Extraction | Azure AI Document Intelligence |
| Review / GL / classification | Azure OpenAI (Responses API, structured output) |
| VAT | Local EU validation via `python-stdnum` (no live VIES) |
| Deploy | Docker (single container), Azure Container Registry, Azure Container Apps, Azure Files |

---

## Architecture

```text
Browser (React)
    │
    ▼
FastAPI (optional static SPA + API)
    │
    ├── Azure Document Intelligence  → primary fields
    ├── Azure OpenAI                 → classify, fill gaps, GL suggestion
    ├── Deterministic rules          → VAT, totals, policy (pure Python)
    └── SQLite + uploads             → backend/data/ (Azure Files in production)
```

**Boundaries that matter:**

- Azure SDK types stop in `backend/app/providers/`
- Business rules live in validation modules (not in the model)
- HTTP → `routes.py` · orchestration → `service.py` · SQLite → `repository.py`
- Settings only through `backend/app/config.py` and `frontend/src/lib/env.ts`

---

## Repository layout

```text
invoice-review/
├── backend/                 # FastAPI app (uv)
│   ├── app/
│   │   ├── main.py          # App wiring, optional SPA mount
│   │   ├── config.py        # Settings + fixed policy
│   │   ├── documents/       # Upload + process pipeline HTTP
│   │   ├── reviews/         # History CRUD
│   │   ├── pipeline/        # Classify → extract → validate → GL
│   │   ├── providers/       # Azure adapters
│   │   ├── accounting/      # GL catalog + validation
│   │   └── schemas/         # Provider-independent models
│   └── .env.example
├── frontend/                # React UI (pnpm)
│   ├── src/components/      # Welcome, upload, process, review, history
│   └── .env.example
├── samples/generated/       # Fictional invoices + receipt
├── docs/                    # Brief, architecture, build-along, pricing
├── Dockerfile               # Single-container production image
└── scripts/                 # Dev helpers + Container Apps image roll
```

---

## Prerequisites

- Python **3.12+**
- [uv](https://github.com/astral-sh/uv)
- Node.js **22+**
- [pnpm](https://pnpm.io/) **11**
- An Azure subscription with:
  - Document Intelligence endpoint + key
  - Azure OpenAI endpoint + key (deployment name must match the app, currently `gpt-5-mini`)

---

## Local setup

### 1. Install dependencies

```bash
cd backend
uv sync --locked

cd ../frontend
pnpm install --frozen-lockfile
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in Azure values in `backend/.env`:

```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
```

Keep `frontend/.env` pointing at the local API:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run (two terminals)

**Backend**

```bash
cd backend
uv run --locked --no-sync uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
pnpm dev
```

- API health: http://localhost:8000/health  
- UI: http://localhost:5173  

### 4. Optional checks

```bash
cd backend
uv run --locked --no-sync ruff check app

cd ../frontend
pnpm exec tsc -b --pretty false
pnpm lint
pnpm build
```

---

## How to use the app

1. Open the UI and choose **Upload document** (or open **View history**).
2. Select a sample from `samples/generated/` (e.g. `01-en-happy-classic.pdf`).
3. Wait for processing (Document Intelligence + OpenAI + rules + GL suggestion).
4. Review fields, provenance, validation issues, and the suggested GL account.
5. **Accept** or **Reject** to save to SQLite history, or draft a correction email and copy it.
6. Use history to reopen or delete a review (delete also removes the stored upload file).

---

## Azure deployment (overview)

The production image serves **UI + API from one container**. SQLite and uploads live on an **Azure Files** share mounted at `/app/data` (still SQLite — not Azure SQL).

High-level flow:

1. Build/push with `az acr build` (see `docs/build-along.md`).
2. Run on Azure Container Apps with secrets for the four Azure env vars and `STATIC_DIR=/app/static`.
3. Roll a new image later with `scripts/deploy-containerapp.ps1` or `scripts/deploy-containerapp.sh`.

Same-origin production builds use an empty `VITE_API_BASE_URL` so the browser calls relative API paths.

---

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/client-brief.md](docs/client-brief.md) | Product brief and Northstar policy |
| [docs/architecture.md](docs/architecture.md) | Intended boundaries and flow |
| [docs/build-along.md](docs/build-along.md) | Build checkpoints, commands, deploy notes |
| [docs/pricing.md](docs/pricing.md) | Rough Azure usage cost |

---

## Notes

- Generated samples and demos use **fictional** data only.
- Do not commit `.env`, uploaded files, or `*.db`.
- The public demo has **no authentication**; treat it as a short-lived showcase, not a production finance system.

---

## License / attribution

Built as a learning project following the [Datalumina Invoice Review](https://learn.datalumina.com/docs/invoice-review) tutorial, with a full-stack Azure Container Apps deployment on top.
