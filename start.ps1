# Arranca RNAseq Visualizer AI (Windows)
$INSTALL_DIR = $PSScriptRoot
$APP_PORT = 3000

Write-Host ""
Write-Host "▶  Arrancando RNAseq Visualizer AI..." -ForegroundColor Cyan

if (-not (docker info 2>&1 | Select-String "Server Version")) {
    Write-Host "   Docker no está en ejecución. Ábrelo manualmente y vuelve a ejecutar start.ps1." -ForegroundColor Yellow
    exit 1
}

Set-Location $INSTALL_DIR
docker compose up -d

Write-Host "   Esperando que la interfaz cargue..."
$waited = 0
while ($true) {
    try { Invoke-WebRequest "http://localhost:$APP_PORT" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; break }
    catch {}
    Start-Sleep 2; $waited += 2
    if ($waited -ge 60) { break }
}

Write-Host ""
Write-Host "✓  Listo → http://localhost:$APP_PORT" -ForegroundColor Green
Write-Host ""
Start-Process "http://localhost:$APP_PORT"
