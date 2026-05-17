#!/usr/bin/env bash
# Arranca RNAseq Visualizer AI (después de la primera instalación)
set -e

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PORT=3000
OS="$(uname -s)"

echo ""
echo "▶  Arrancando RNAseq Visualizer AI..."

# Start Docker if not running
if ! docker info &>/dev/null 2>&1; then
  echo "   Docker no está en ejecución. Intentando iniciar..."
  [ "$OS" = "Darwin" ] && open -a Docker
  sleep 8
  if ! docker info &>/dev/null 2>&1; then
    echo "✗  Abre Docker Desktop manualmente y vuelve a ejecutar este script."
    exit 1
  fi
fi

cd "$INSTALL_DIR"
docker compose up -d

echo "   Esperando que la interfaz cargue..."
waited=0
until curl -s "http://localhost:${APP_PORT}" >/dev/null 2>&1; do
  sleep 2; waited=$((waited+2))
  [ $waited -ge 60 ] && break
done

echo ""
echo "✓  Listo → http://localhost:${APP_PORT}"
echo ""

[ "$OS" = "Darwin" ] && open "http://localhost:${APP_PORT}"
[ "$OS" = "Linux"  ] && xdg-open "http://localhost:${APP_PORT}" 2>/dev/null || true
