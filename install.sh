#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  RNAseq Visualizer AI — One-click installer (macOS / Linux)
#  Usage:  bash install.sh
# ─────────────────────────────────────────────────────────────
set -e

# Colors
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'
BOLD='\033[1m'

REPO_URL="https://github.com/DANTONIO-BIT/rnaseq-visualizer-ai.git"
INSTALL_DIR="$HOME/rnaseq-visualizer-ai"
APP_PORT=3000

banner() {
  echo ""
  echo -e "${B}${BOLD}╔══════════════════════════════════════════╗${N}"
  echo -e "${B}${BOLD}║    RNAseq Visualizer AI — Instalador     ║${N}"
  echo -e "${B}${BOLD}╚══════════════════════════════════════════╝${N}"
  echo ""
}

step() { echo -e "${B}▶  $1${N}"; }
ok()   { echo -e "${G}✓  $1${N}"; }
warn() { echo -e "${Y}⚠  $1${N}"; }
err()  { echo -e "${R}✗  $1${N}"; exit 1; }

# ── Detect OS ────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

# ── Check prerequisites ──────────────────────────────────────
need_git() {
  command -v git &>/dev/null || err "Git no está instalado. Instálalo desde https://git-scm.com y vuelve a ejecutar este script."
}

# ── Docker helpers ───────────────────────────────────────────
docker_installed()  { command -v docker &>/dev/null; }
docker_running()    { docker info &>/dev/null 2>&1; }

start_docker_mac() {
  step "Iniciando Docker Desktop..."
  open -a Docker 2>/dev/null || warn "No se pudo abrir Docker automáticamente. Ábrelo desde Applications."
  echo "   Esperando que Docker arranque (puede tardar hasta 60 s)..."
  local waited=0
  while ! docker_running; do
    sleep 4; waited=$((waited+4))
    if [ $waited -ge 90 ]; then
      err "Docker no arrancó. Ábrelo manualmente desde Applications y vuelve a ejecutar el script."
    fi
    echo "   ... $waited s"
  done
}

install_docker_mac() {
  step "Docker no encontrado. Instalando Docker Desktop para Mac..."
  if command -v brew &>/dev/null; then
    brew install --cask docker
    ok "Docker Desktop instalado via Homebrew."
  else
    local url
    if [ "$ARCH" = "arm64" ]; then
      url="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
    else
      url="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
    fi
    echo "   Descargando Docker Desktop (~600 MB)..."
    curl -L "$url" -o /tmp/Docker.dmg --progress-bar
    echo "   Instalando..."
    hdiutil attach /tmp/Docker.dmg -quiet
    cp -R "/Volumes/Docker/Docker.app" /Applications/
    hdiutil detach "/Volumes/Docker" -quiet
    rm /tmp/Docker.dmg
    ok "Docker Desktop copiado a /Applications."
  fi
  warn "Debes aceptar los términos de Docker la primera vez que abras la app."
  start_docker_mac
}

install_docker_linux() {
  step "Docker no encontrado. Instalando..."
  curl -fsSL https://get.docker.com | sh
  # Add current user to docker group so sudo isn't needed
  sudo usermod -aG docker "$USER" 2>/dev/null || true
  sudo systemctl enable docker --now
  ok "Docker instalado."
  warn "Si ves errores de permisos, cierra sesión, vuelve a entrar y ejecuta el script de nuevo."
}

ensure_docker() {
  if ! docker_installed; then
    if   [ "$OS" = "Darwin" ]; then install_docker_mac
    elif [ "$OS" = "Linux"  ]; then install_docker_linux
    else err "Sistema no soportado. Instala Docker manualmente desde https://docs.docker.com/get-docker/"; fi
  fi

  if ! docker_running; then
    if [ "$OS" = "Darwin" ]; then
      start_docker_mac
    else
      sudo systemctl start docker 2>/dev/null || warn "Inicia Docker manualmente y vuelve a ejecutar el script."
      sleep 3
      docker_running || err "Docker no responde."
    fi
  fi
  ok "Docker está en ejecución."
}

# ── Clone or update repo ─────────────────────────────────────
get_project() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    step "Proyecto ya descargado — actualizando a la última versión..."
    git -C "$INSTALL_DIR" pull --quiet
    ok "Proyecto actualizado."
  else
    step "Descargando proyecto en $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR" --depth 1 --quiet
    ok "Proyecto descargado."
  fi
}

# ── Build & start ────────────────────────────────────────────
build_and_start() {
  cd "$INSTALL_DIR"
  step "Construyendo y arrancando la aplicación..."
  echo ""
  echo -e "   ${Y}La primera vez instala paquetes de R (Bioconductor).${N}"
  echo -e "   ${Y}Esto puede tardar 10-20 minutos. Las siguientes veces arranca en segundos.${N}"
  echo ""
  docker compose up --build -d
  ok "Contenedores en marcha."
}

# ── Wait for app ─────────────────────────────────────────────
wait_for_app() {
  step "Esperando que la interfaz esté lista..."
  local waited=0
  until curl -s "http://localhost:${APP_PORT}" >/dev/null 2>&1; do
    sleep 3; waited=$((waited+3))
    if [ $waited -ge 180 ]; then
      warn "La app tarda más de lo esperado. Comprueba el estado con:  docker compose logs -f"
      return
    fi
    echo "   ... $waited s"
  done
}

# ── Open browser ─────────────────────────────────────────────
open_browser() {
  if   [ "$OS" = "Darwin" ]; then open "http://localhost:${APP_PORT}"
  elif [ "$OS" = "Linux"  ]; then xdg-open "http://localhost:${APP_PORT}" 2>/dev/null || true
  fi
}

# ── Done ─────────────────────────────────────────────────────
print_done() {
  echo ""
  echo -e "${G}${BOLD}╔══════════════════════════════════════════╗${N}"
  echo -e "${G}${BOLD}║   ✓  RNAseq Visualizer AI está listo    ║${N}"
  echo -e "${G}${BOLD}║      http://localhost:${APP_PORT}               ║${N}"
  echo -e "${G}${BOLD}╚══════════════════════════════════════════╝${N}"
  echo ""
  echo "  Para parar la app:    bash $INSTALL_DIR/stop.sh"
  echo "  Para volver a abrir:  bash $INSTALL_DIR/start.sh"
  echo ""
}

# ── Main ─────────────────────────────────────────────────────
banner
need_git
ensure_docker
get_project
build_and_start
wait_for_app
open_browser
print_done
