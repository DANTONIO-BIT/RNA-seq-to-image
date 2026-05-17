@echo off
:: ─────────────────────────────────────────────────────────────
::  RNAseq Visualizer AI — Instalador Windows
::  Haz doble clic en este archivo para instalar.
:: ─────────────────────────────────────────────────────────────

echo.
echo  Iniciando instalacion de RNAseq Visualizer AI...
echo  Se abrira una ventana de PowerShell para completar la instalacion.
echo.

:: Ejecutar PowerShell como administrador con el script de instalacion
PowerShell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0install.ps1""' -Verb RunAs"

pause
