# Rebuild the ACR image and roll the Container App (PowerShell).
# Does not recreate infrastructure or rotate secrets.
$ErrorActionPreference = "Stop"

$RG = if ($env:RG) { $env:RG } else { "rg-invoice-review" }
$ACR = if ($env:ACR) { $env:ACR } else { "acrinvreview47c63" }
$APP = if ($env:APP) { $env:APP } else { "ca-invoice-review" }

# --no-logs avoids a Windows console encoding crash while streaming ACR build logs.
az acr build -r $ACR -g $RG -t invoice-review:latest -f Dockerfile . --no-logs
az containerapp update -g $RG -n $APP --image "$ACR.azurecr.io/invoice-review:latest"
az containerapp show -g $RG -n $APP --query properties.configuration.ingress.fqdn -o tsv
