# Build-along guide

The complete guided build lives at <https://learn.datalumina.com/docs/invoice-review>. This local guide records the first checkpoint represented by the `main` branch.

## Starter outcome

The repository installs reproducibly, starts a minimal FastAPI service and React interface, and includes the business brief plus fictional source documents.

## Why this boundary exists

The starter removes the completed workflow while preserving every prerequisite needed to build it. You begin with the user, the source documents, and explicit service boundaries instead of reverse-engineering a finished application.

## Commands

```bash
cd backend
uv sync --locked

cd ../frontend
pnpm install --frozen-lockfile

cd ..
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
./scripts/dev.sh --check
./scripts/dev.sh
```

## Important locations

- `docs/client-brief.md`: the recurring finance problem and definition of done
- `docs/architecture.md`: the intended boundaries and data flow
- `samples/`: the fictional evaluation corpus and manifest
- `backend/app/main.py`: the initial API boundary
- `frontend/src/App.tsx`: the initial interface boundary

## What you should observe

- `GET http://localhost:8000/health` returns `{"status":"ok"}`.
- `http://localhost:5173` shows the Invoice Review starter screen.
- No Azure request occurs at this checkpoint.

## Checkpoint

- [ ] Locked backend and frontend installs succeed.
- [ ] Backend lint passes.
- [ ] Frontend type-check, lint, and production build pass.
- [ ] `./scripts/dev.sh --check` reports that Invoice Review is ready to start.
- [ ] The health endpoint and starter screen load locally.

Continue with the [online tutorial](https://learn.datalumina.com/docs/invoice-review).

## Document Intelligence spike

### Outcome

The backend reads Azure credentials from `backend/.env`, sends `samples/generated/01-en-happy-classic.pdf` to the `prebuilt-invoice` model, and prints a field summary plus the full analyze JSON.

### Why

This confirms the Azure resource, SDK wiring, and provider boundary before building the FastAPI upload flow. SDK types stay in `app/providers/azure_document_intelligence.py`; settings stay in `app/config.py`.

### Commands

```bash
cd backend
uv sync --locked
uv run --locked --no-sync ruff check app
uv run --locked --no-sync python -m app.services.document_intelligence_service
```

Optional explicit sample path:

```bash
uv run --locked --no-sync python -m app.services.document_intelligence_service ../samples/generated/01-en-happy-classic.pdf
```

### Observable result

- Terminal shows `doc_type='invoice'` and fields such as `InvoiceId`, `VendorName`, `InvoiceTotal`, and line `Items`.
- A JSON block follows with `modelId: prebuilt-invoice` and nested `documents`, `pages`, and `tables`.
- One analyzed page is billed against the Document Intelligence F0 allowance.

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app` passes.
- [ ] The command above completes without HTTP 401/403.
- [ ] Extracted totals match the fictional sample (subtotal EUR 100.00, total EUR 121.00).

## Extraction schemas

### Outcome

Pydantic models under `app/schemas/invoice/` and `app/schemas/receipt/` map Document Intelligence field dictionaries into typed invoice and receipt extractions, including line items when Azure returns them.

### Why

The review workflow needs provider-independent shapes that match the fictional corpus in `samples/manifest.json`. SDK serialization stays in the provider; parsing and mapping stay pure under `app/schemas/`.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app scripts
uv run --locked --no-sync python -m scripts.map_schema_samples
```

Optional explicit filenames:

```bash
uv run --locked --no-sync python -m scripts.map_schema_samples 01-en-happy-classic.pdf 13-nl-fuel-receipt.png
```

### Observable result

- Each sample prints a JSON `InvoiceExtraction` or `ReceiptExtraction` model.
- The script reports `OK` when mapped headline fields match `samples/manifest.json` (case-insensitive names).
- Three default runs consume three Azure analyze transactions (two invoices, one receipt).

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app scripts` passes.
- [ ] `map_schema_samples.py` exits 0 on the default trio of samples.
- [ ] Invoice line items are populated for `01-en-happy-classic.pdf`.
