#!/usr/bin/env bash
# Rebuild image and roll the Container App (bash). Secrets are not changed.
set -euo pipefail

RG="${RG:-rg-invoice-review}"
ACR="${ACR:-acrinvreview47c63}"
APP="${APP:-ca-invoice-review}"

az acr build -r "$ACR" -g "$RG" -t invoice-review:latest -f Dockerfile . --no-logs
az containerapp update -g "$RG" -n "$APP" --image "${ACR}.azurecr.io/invoice-review:latest"
az containerapp show -g "$RG" -n "$APP" --query properties.configuration.ingress.fqdn -o tsv
