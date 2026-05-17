# Para RNAseq Visualizer AI (Windows)
$INSTALL_DIR = $PSScriptRoot
Set-Location $INSTALL_DIR

Write-Host ""
Write-Host "▶  Parando RNAseq Visualizer AI..." -ForegroundColor Cyan
docker compose down
Write-Host "✓  Aplicación parada. Los datos y configuración se mantienen." -ForegroundColor Green
Write-Host ""
