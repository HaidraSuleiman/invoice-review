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

## Azure OpenAI spike

### Outcome

The backend reads `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` from `backend/.env`, calls the hardcoded `gpt-5-mini` deployment through the Responses API, and prints the model reply.

### Why

This confirms Foundry/OpenAI wiring and the provider boundary before document review and GL suggestion. SDK types stay in `app/providers/azure_openai.py`; settings stay in `app/config.py`.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app
uv run --locked --no-sync python -m app.services.openai_service
```

Optional custom prompt:

```bash
uv run --locked --no-sync python -m app.services.openai_service "Name one EU VAT checksum rule in one sentence."
```

### Observable result

- Terminal shows `deployment: gpt-5-mini`, the prompt, and a short natural-language answer.
- Token usage is billed against the Azure OpenAI deployment.

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app` passes.
- [ ] The command above completes without HTTP 401/403.
- [ ] The default prompt answer mentions Paris.

## Document classification (Pydantic AI)

### Outcome

`app/pipeline/classification.py` sends a PDF or image to Azure OpenAI through Pydantic AI structured output and returns `document_type` (`invoice` or `receipt`) plus a confidence score. This runs before choosing `prebuilt-invoice` or `prebuilt-receipt`.

### Why

Document Intelligence requires the model id up front. A small LLM classification step picks the correct extraction pipeline for unknown uploads. Uses `pydantic-ai-slim[openai]==2.19.0` (exclude-newer exception in `pyproject.toml` because that release is outside the default 7-day window).

### Commands

```bash
cd backend
uv sync --locked
uv run --locked --no-sync ruff check app
uv run --locked --no-sync python -m app.services.classification_service
uv run --locked --no-sync python -m app.services.classification_service ../samples/generated/13-nl-fuel-receipt.png
```

### Observable result

- Terminal prints `deployment: gpt-5-mini`, the filename, and JSON with `document_type` and `confidence`.
- The classic invoice sample classifies as `invoice`; the fuel receipt as `receipt`.

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app` passes.
- [ ] Both commands above complete without HTTP 401/403.
- [ ] Types match the expected document for each sample.

## Extraction pipeline chain

### Outcome

`app/pipeline/chain.py` defines a small `Pipeline.start(ctx).then(step).run(state)` pattern. Steps under `app/pipeline/steps/` classify the upload, call `prebuilt-invoice` or `prebuilt-receipt`, map into the Pydantic extraction models, and run offline EU VAT format checks plus subtotal/VAT/total reconciliation in pure `app/documents/validation.py`.

### Why

Document Intelligence needs the model id before analyze, but downstream review wants one orchestrated path. Chaining keeps each step testable in isolation while `run_document_pipeline` wires the full story for services and the future upload flow.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app
uv run --locked --no-sync python -m app.services.extraction_pipeline_service
uv run --locked --no-sync python -m app.services.extraction_pipeline_service ../samples/generated/13-nl-fuel-receipt.png
```

### Observable result

- Terminal prints classification, `model_id`, mapped extraction JSON (supplier/customer, VAT IDs, dates, PO, currency, totals, line items), and validation with VAT checksum results and totals reconciliation.
- The classic invoice sample uses `prebuilt-invoice` and reports reconciled totals; the fuel receipt uses `prebuilt-receipt`.

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app` passes.
- [ ] Both commands above complete without HTTP 401/403.
- [ ] Invoice sample shows populated line items and valid EU VAT checks where manifest expects them.

## GL account suggestion

### Outcome

After validation, `suggest_gl_step` calls `app/accounting/gl_suggestion.py`, which sends **normalized extraction JSON plus the fixed ten-account Northstar catalog** to Azure OpenAI with Pydantic AI structured output. Catalog codes and post-model validation live in `app/accounting/catalog.py` and `app/accounting/validation.py`. The playground JSON now includes `gl_suggestion` (code, name, confidence, rationale).

### Why

Maya needs a suggested GL account before approval, but the model must not define policy—only pick from the catalog. Running this as the final pipeline step keeps document-type gating (`invoice` or `receipt` only) and reuses the same `.then()` pattern.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app
uv run --locked --no-sync python -m app.services.extraction_pipeline_service
uv run --locked --no-sync python -m app.services.extraction_pipeline_service ../samples/generated/13-nl-fuel-receipt.png
```

### Observable result

- JSON includes `gl_suggestion.account_code` between `6100` and `7000`, plus `account_name`, `confidence`, and `rationale`.
- Fuel receipt samples often suggest `6700` (Fuel and travel); cleaning invoices often land in `6100`–`6400`.

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app` passes.
- [ ] Pipeline commands complete without HTTP 401/403.
- [ ] `gl_suggestion` appears for both invoice and receipt samples.

## Process-only FastAPI layer

### Outcome

`app/main.py` exposes `GET /health` and mounts `POST /documents/process`. The upload route validates PDF/PNG/JPEG up to 4 MB, stores the file under `backend/data/uploads/` with a UUID name, runs `run_document_pipeline`, and returns `DocumentPipelineResult` JSON. HTTP lives in `app/documents/routes.py`; orchestration lives in `app/documents/service.py`. SQLite persistence is not introduced yet.

### Why

The CLI playground already proves classify → extract → validate → GL. The frontend needs the same path over HTTP. Keeping routes thin and orchestration in the service leaves a clear place to add `repository.py` later without rewriting the pipeline.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app scripts
uv run --locked --no-sync uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/documents/process \
  -F "file=@../samples/generated/01-en-happy-classic.pdf"
```

Optional rejection checks:

```bash
curl -X POST http://localhost:8000/documents/process -F "file=@../docs/client-brief.md"
```

### Observable result

- `GET /health` returns `{"status":"ok"}` without Azure credentials.
- A successful upload returns classification, extraction, validation, and `gl_suggestion` (Azure calls are billed like the CLI pipeline).
- Unsupported types return HTTP 400 with a clear detail message.
- Interactive OpenAPI docs are at `http://localhost:8000/docs`.

### Checkpoint

- [ ] `uv run --locked --no-sync ruff check app scripts` passes.
- [ ] Health endpoint responds with `{"status":"ok"}`.
- [ ] Sample PDF upload returns pipeline JSON including `gl_suggestion`.
- [ ] Non-PDF/PNG/JPEG upload returns HTTP 400.

## Frontend welcome → process scaffold

### Outcome

The React app mounts a welcome screen, file picker (PDF/PNG/JPEG ≤ 4 MB), processing state, and a compact pipeline result view. `src/lib/env.ts` validates `VITE_API_BASE_URL`; `src/lib/api.ts` posts multipart `file` to `POST /documents/process` and types the `DocumentPipelineResult` response.

### Why

The process-only API is ready for the browser. This slice wires the first user story steps without SQLite, approval, or correction email—so Maya can pick a sample and see the live pipeline in the UI.

### Commands

```bash
cd frontend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm exec tsc -b --pretty false
pnpm lint
pnpm build
pnpm run dev
```

Backend (separate terminal):

```bash
cd backend
uv run --locked --no-sync uvicorn app.main:app --reload --port 8000
```

### Observable result

- `http://localhost:5173` shows **Document Review** with **Select a document**.
- Choosing a sample under `samples/generated/` and clicking **Start pipeline** shows a processing state, then classification, totals validation, and GL suggestion.
- On the result screen, Maya sees a document-style summary (party + total hero, grouped fact rows, GL strip) and can edit headline fields and the GL account, then **Accept review** or discard.
- API failures (backend down, 400) surface as an error on the select screen.

### Checkpoint

- [ ] Frontend type-check, lint, and production build pass.
- [ ] Welcome → select → process works against a running backend.
- [ ] Result screen shows `gl_suggestion` for a happy-path sample.

## Result screen visual polish

### Outcome

The pipeline result view no longer packs every extracted field into a dense two-column card grid. It uses a document-review layout: validation status, a party/total summary, grouped fact rows, a soft GL suggestion strip, then the editable human-review form.

### Why

The card grid made the last step feel like a dashboard of tiles instead of a finance review. Grouped rows and a clear total hierarchy match how Maya scans an invoice.

### Commands

```bash
cd frontend
pnpm exec tsc -b --pretty false
pnpm lint
pnpm build
```

### Observable result

- Result screen opens with vendor/merchant and total as the primary signals.
- Related fields appear as labeled rows under Parties / Document / Amounts.
- Suggested GL sits in a teal soft strip with rationale.
- Accept and discard still work as before.

### Checkpoint

- [ ] Frontend type-check, lint, and production build pass.
- [ ] Manual walkthrough: process a sample and confirm the result layout reads clearly.

## Block accept on empty required fields

### Outcome

Human review disables **Accept review** while any Northstar policy-required draft field is blank (invoice: vendor/customer names and VAT IDs, invoice number/date, currency, total; receipt: merchant, transaction date, currency, VAT/tax, total). Due date and purchase order stay optional. Empty required inputs are marked; a status line lists what still needs filling.

### Why

Extraction often leaves VAT IDs or other required values empty. Maya must complete them before the document can be treated as accepted.

### Commands

```bash
cd frontend
pnpm exec tsc -b --pretty false
pnpm lint
pnpm build
```

### Observable result

- Process a sample with a missing customer VAT: Accept stays disabled until that field (and any other required blanks) are filled.
- Filling the blanks re-enables Accept; discard still works while disabled.

### Checkpoint

- [ ] Frontend type-check, lint, and production build pass.
- [ ] Manual check: incomplete draft cannot be accepted.

## Review draft date and amount formats

### Outcome

Human-review date fields use `<input type="date">` and store ISO `YYYY-MM-DD` values that match backend `datetime.date`. Currency is forced to a 3-letter code; money fields must be Decimal-like numbers. Accept stays disabled while formats are invalid (including due date before invoice date).

### Why

Pipeline JSON already serializes Python `date` and `Decimal`. Free-text date strings would not round-trip cleanly into SQLite later; the review step must keep the same shapes.

### Commands

```bash
cd frontend
pnpm exec tsc -b --pretty false
pnpm lint
pnpm build
```

### Observable result

- Invoice/receipt/due date pickers only accept calendar dates.
- Typing `EU` for currency or `12,5` for total keeps Accept disabled with a format message.
- Valid ISO dates and decimal amounts allow Accept when required fields are complete.

### Checkpoint

- [ ] Frontend type-check, lint, and production build pass.
- [ ] Manual check: date pickers and amount/currency format rules behave as above.

## SQLite review history

### Outcome

Accept and Reject persist Maya's edited draft to a local SQLite database (`backend/data/reviews.db`) with status `accepted` or `rejected`. `POST /documents/process` now returns `original_filename`, `stored_filename`, and nested `result`. The UI has a History screen with list + delete (delete also removes the uploaded file).

### Why

Decisions must survive app restarts for demos and teaching. SQLite matches the brief and keeps routes → service → repository boundaries. Explicit delete lets the same sample invoice be processed again.

### Commands

```bash
cd backend
uv run --locked --no-sync ruff check app scripts

cd ../frontend
pnpm exec tsc -b --pretty false
pnpm lint
pnpm build
```

Backend (separate terminal):

```bash
cd backend
uv run --locked --no-sync uvicorn app.main:app --reload --port 8000
```

### Observable result

- Welcome shows **View history**.
- After processing, **Accept review** / **Reject** write a row; confirmation offers history.
- History lists status, party, total, and decided time; **Delete** removes the row and upload file.
- Closing and reopening the app still shows saved decisions.

### Checkpoint

- [ ] Backend ruff passes.
- [ ] Frontend type-check, lint, and production build pass.
- [ ] Manual walkthrough: accept one sample, reject one, refresh history, delete one.

## Azure Container Apps single-container deploy

### Outcome

Invoice Review runs as one container on Azure Container Apps: FastAPI serves the built React SPA and the API from the same HTTPS origin. SQLite and uploads persist on an Azure Files share. Document Intelligence and Azure OpenAI stay in the existing resource group; only hosting pieces (ACR, storage, Container Apps) are added.

### Why

A single public URL matches a demo deploy without splitting UI and API hosts. Same-origin removes CORS for production. Empty `VITE_API_BASE_URL` makes the browser call relative API paths. `STATIC_DIR` mounts the Vite `dist` only when set, so local split-stack (`pnpm dev` + uvicorn) stays unchanged.

### Prerequisites

- Azure CLI logged in (`az login`) with access to resource group `rg-invoice-review`
- Local `backend/.env` with the four Azure provider values
- Confirm the Azure OpenAI deployment name matches the hardcoded `gpt-5-mini` in `backend/app/providers/azure_openai.py`

### Commands

Discover the resource group and existing AI resources:

```bash
az account show
az group list -o table
az resource list -g rg-invoice-review -o table
```

Register providers once (if needed):

```bash
az provider register -n Microsoft.App --wait
az provider register -n Microsoft.ContainerRegistry --wait
az provider register -n Microsoft.OperationalInsights --wait
```

Create ACR, storage share, and Container Apps environment (West Europe):

```bash
RG=rg-invoice-review
LOC=westeurope
ACR=acrinvreview47c63
STG=stinvreview47c63
SHARE=invoicedata
ENV_NAME=cae-invoice-review
APP=ca-invoice-review

az acr create -g "$RG" -n "$ACR" --sku Basic --location "$LOC"
az storage account create -g "$RG" -n "$STG" -l "$LOC" --sku Standard_LRS --kind StorageV2
STORAGE_KEY=$(az storage account keys list -g "$RG" -n "$STG" --query "[0].value" -o tsv)
az storage share-rm create --resource-group "$RG" --storage-account "$STG" --name "$SHARE" --quota 5
az containerapp env create -g "$RG" -n "$ENV_NAME" -l "$LOC"
az containerapp env storage set \
  -g "$RG" -n "$ENV_NAME" \
  --storage-name invoicedata \
  --azure-file-account-name "$STG" \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$SHARE" \
  --access-mode ReadWrite
```

Build the multi-stage image in ACR from the repo root. On Windows, prefer `--no-logs` to avoid an Azure CLI console encoding crash while streaming build output; check status with `az acr task list-runs`:

```bash
az acr build -r "$ACR" -g "$RG" -t invoice-review:latest -f Dockerfile . --no-logs
az acr task list-runs -r "$ACR" -o table
```

Create the Container App with secrets and a system-assigned identity for ACR pull. Load provider values from `backend/.env` into the shell first (do not commit them). PowerShell:

```powershell
Get-Content backend\.env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
    Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}

az containerapp create `
  -g $RG -n $APP `
  --environment $ENV_NAME `
  --image "$ACR.azurecr.io/invoice-review:latest" `
  --registry-server "$ACR.azurecr.io" `
  --system-assigned `
  --registry-identity system `
  --target-port 8000 `
  --ingress external `
  --cpu 0.5 --memory 1.0Gi `
  --min-replicas 1 --max-replicas 1 `
  --secrets `
    "di-endpoint=$env:AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT" `
    "di-key=$env:AZURE_DOCUMENT_INTELLIGENCE_KEY" `
    "aoai-endpoint=$env:AZURE_OPENAI_ENDPOINT" `
    "aoai-key=$env:AZURE_OPENAI_API_KEY" `
  --env-vars `
    "STATIC_DIR=/app/static" `
    "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=secretref:di-endpoint" `
    "AZURE_DOCUMENT_INTELLIGENCE_KEY=secretref:di-key" `
    "AZURE_OPENAI_ENDPOINT=secretref:aoai-endpoint" `
    "AZURE_OPENAI_API_KEY=secretref:aoai-key"
```

Grant ACR pull:

```bash
PRINCIPAL_ID=$(az containerapp show -g "$RG" -n "$APP" --query identity.principalId -o tsv)
ACR_ID=$(az acr show -g "$RG" -n "$ACR" --query id -o tsv)
az role assignment create --assignee "$PRINCIPAL_ID" --role AcrPull --scope "$ACR_ID"
```

Mount Azure Files at `/app/data` by exporting the app YAML, adding `volumeMounts` / `volumes`, and updating:

```yaml
# under properties.template.containers[0]:
volumeMounts:
- mountPath: /app/data
  volumeName: invoicedata
# under properties.template:
volumes:
- name: invoicedata
  storageName: invoicedata
  storageType: AzureFile
```

```bash
az containerapp update -g "$RG" -n "$APP" --yaml path/to/patched.yaml
az containerapp show -g "$RG" -n "$APP" --query properties.configuration.ingress.fqdn -o tsv
```

Later image rolls (no infra recreate): `scripts/deploy-containerapp.ps1` or `scripts/deploy-containerapp.sh`.

### Observable result

- Live app: `https://ca-invoice-review.redforest-407253c0.westeurope.azurecontainerapps.io/`
- `GET https://<fqdn>/health` returns `{"status":"ok"}`.
- The HTTPS root loads the Invoice Review UI.
- Uploading a sample under `samples/generated/` runs the full review pipeline against the existing Azure AI resources.
- Reviews survive a container revision restart because `/app/data` is on Azure Files.

### Cleanup (hosting only; keep Document Intelligence and OpenAI)

```bash
az containerapp delete -g rg-invoice-review -n ca-invoice-review --yes
az containerapp env delete -g rg-invoice-review -n cae-invoice-review --yes
az acr delete -g rg-invoice-review -n acrinvreview47c63 --yes
az storage account delete -g rg-invoice-review -n stinvreview47c63 --yes
```

### Checkpoint

- [ ] Backend ruff and frontend type-check/lint/build (empty `VITE_API_BASE_URL`) pass.
- [ ] Image builds with `az acr build` (Succeeded in `az acr task list-runs`).
- [ ] Container App FQDN serves `/health` and the UI.
- [ ] One sample upload completes end-to-end on Azure.
