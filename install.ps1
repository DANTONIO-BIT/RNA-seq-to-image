# ─────────────────────────────────────────────────────────────
#  RNAseq Visualizer AI — One-click installer (Windows)
#  Run in PowerShell as Administrator:
#    Set-ExecutionPolicy Bypass -Scope Process -Force
#    .\install.ps1
# ─────────────────────────────────────────────────────────────

$REPO_URL   = "https://github.com/DANTONIO-BIT/rnaseq-visualizer-ai.git"
$INSTALL_DIR = "$env:USERPROFILE\rnaseq-visualizer-ai"
$APP_PORT   = 3000
$ErrorActionPreference = "Stop"

function Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║    RNAseq Visualizer AI — Instalador     ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Step($msg)  { Write-Host "▶  $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "✓  $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "⚠  $msg" -ForegroundColor Yellow }
function Err($msg)   { Write-Host "✗  $msg" -ForegroundColor Red; exit 1 }

# ── Check Git ────────────────────────────────────────────────
function Ensure-Git {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Step "Git no encontrado. Instalando via winget..."
        winget install --id Git.Git -e --source winget --silent
        # Reload PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
        Ok "Git instalado."
    }
}

# ── Check Docker ─────────────────────────────────────────────
function Docker-Installed {
    return (Get-Command docker -ErrorAction SilentlyContinue) -ne $null
}

function Docker-Running {
    try { docker info 2>&1 | Out-Null; return $true } catch { return $false }
}

function Install-Docker {
    Step "Docker no encontrado. Descargando Docker Desktop..."
    $installer = "$env:TEMP\DockerDesktopInstaller.exe"
    $url = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
    Step "Instalando Docker Desktop (puede tardar varios minutos)..."
    Start-Process -FilePath $installer -ArgumentList "install --quiet" -Wait
    Remove-Item $installer -Force
    Ok "Docker Desktop instalado."
    Warn "Docker Desktop se abrirá. Acepta los términos y espera a que el icono de ballena esté estable en la barra de tareas."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
}

function Wait-Docker {
    Step "Esperando que Docker arranque..."
    $waited = 0
    while (-not (Docker-Running)) {
        Start-Sleep 5; $waited += 5
        if ($waited -ge 120) { Err "Docker no arrancó. Ábrelo manualmente y vuelve a ejecutar install.ps1." }
        Write-Host "   ... $waited s"
    }
    Ok "Docker está en ejecución."
}

function Ensure-Docker {
    if (-not (Docker-Installed)) { Install-Docker }
    if (-not (Docker-Running))   { Wait-Docker }
    else                         { Ok "Docker está en ejecución." }
}

# ── Clone or update ──────────────────────────────────────────
function Get-Project {
    if (Test-Path "$INSTALL_DIR\.git") {
        Step "Proyecto ya descargado — actualizando..."
        git -C $INSTALL_DIR pull --quiet
        Ok "Proyecto actualizado."
    } else {
        Step "Descargando proyecto en $INSTALL_DIR ..."
        git clone $REPO_URL $INSTALL_DIR --depth 1 --quiet
        Ok "Proyecto descargado."
    }
}

# ── Build & start ────────────────────────────────────────────
function Build-And-Start {
    Set-Location $INSTALL_DIR
    Step "Construyendo y arrancando la aplicación..."
    Write-Host ""
    Warn "La primera vez instala paquetes de R (Bioconductor). Puede tardar 10-20 min."
    Write-Host ""
    docker compose up --build -d
    Ok "Contenedores en marcha."
}

# ── Wait for app ─────────────────────────────────────────────
function Wait-App {
    Step "Esperando que la interfaz esté lista..."
    $waited = 0
    while ($true) {
        try {
            $r = Invoke-WebRequest "http://localhost:$APP_PORT" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { break }
        } catch {}
        Start-Sleep 3; $waited += 3
        if ($waited -ge 180) { Warn "Tardando más de lo esperado. Comprueba: docker compose logs"; break }
        Write-Host "   ... $waited s"
    }
}

# ── Done ─────────────────────────────────────────────────────
function Print-Done {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   ✓  RNAseq Visualizer AI está listo    ║" -ForegroundColor Green
    Write-Host "║      http://localhost:$APP_PORT               ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Para parar:       .\stop.ps1"
    Write-Host "  Para volver a abrir: .\start.ps1"
    Write-Host ""
}

# ── Main ─────────────────────────────────────────────────────
Banner
Ensure-Git
Ensure-Docker
Get-Project
Build-And-Start
Wait-App
Start-Process "http://localhost:$APP_PORT"
Print-Done
