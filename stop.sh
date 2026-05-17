#!/usr/bin/env bash
# Para RNAseq Visualizer AI y libera los puertos
set -e

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR"

echo ""
echo "▶  Parando RNAseq Visualizer AI..."
docker compose down
echo "✓  Aplicación parada. Los datos y configuración se mantienen."
echo ""
