# RNAseq Visualizer AI

> Upload your DESeq2, edgeR, or limma results — get publication-ready figures in seconds.

Biologists spend hours reformatting differential expression tables and tweaking ggplot2 parameters to produce figures that reviewers will accept. This tool automates that step: drag-and-drop your results file, choose a plot type and style, and get a properly labelled, exportable figure — with an AI-generated caption and optional pathway enrichment summary.

No R environment to configure. No Python dependencies to install. Just Docker.

---

## Features

- **Auto-detects format** — DESeq2, edgeR, and limma output files are recognized automatically; columns are normalized internally before any R script runs
- **5 plot types** — Volcano, MA, PCA, Heatmap, GSEA
- **4 style presets** — `default`, `nature`, `cell`, `dark` (journal-matched palettes and themes)
- **3 export formats** — PNG, SVG, PDF
- **AI captions** — Deterministic scientific captions + optional Ollama/Llama 3 enhancement; no data ever leaves your machine
- **GSEA pathway enrichment** — enrichment table with automatic PubMed reference lookup for top pathways
- **Significant genes export** — downloadable CSV of up/downregulated genes filtered by your thresholds
- **Async job queue** — large datasets (e.g. GO:BP GSEA) run in the background with live status polling

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                             │
│  Next.js 16 (App Router) · TypeScript · Tailwind 4  │
│  shadcn/ui · Framer Motion                           │
└────────────────────┬────────────────────────────────┘
                     │ REST + polling
┌────────────────────▼────────────────────────────────┐
│  FastAPI (Python 3.12)                               │
│  ├── /api/upload   → format detection + normalizer   │
│  ├── /api/analyze  → async job dispatch              │
│  ├── /api/jobs     → status polling                  │
│  └── /api/export   → figure download                 │
└────────────────────┬────────────────────────────────┘
                     │ subprocess
┌────────────────────▼────────────────────────────────┐
│  R Engine (Bioconductor)                             │
│  volcano.R · ma_plot.R · pca.R · heatmap.R · gsea.R │
│  ggplot2 · ggrepel · clusterProfiler · ComplexHeatmap│
└─────────────────────────────────────────────────────┘
```

The R layer runs in its own Docker container. The Python backend calls it via subprocess, passing a normalized CSV and returning a base64-encoded figure. This keeps R dependencies isolated and the API thin.

---

## Installation

The only requirement is **Docker Desktop**. The installer handles everything else automatically — R packages, Python dependencies, and the web server.

### macOS / Linux — one command

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/DANTONIO-BIT/RNA-seq-to-image/main/install.sh)
```

Or download the repo and run locally:

```bash
git clone https://github.com/DANTONIO-BIT/RNA-seq-to-image.git
bash RNA-seq-to-image/install.sh
```

### Windows — double-click install

1. Download the repo as a ZIP from GitHub (green **Code** button → **Download ZIP**)
2. Extract the folder
3. Double-click **`install.bat`**

A PowerShell window will open and handle everything, including installing Docker if needed.

---

**First run takes 10–20 minutes** — the R container downloads and compiles Bioconductor packages. Subsequent launches take a few seconds.

### After installation

| Action | macOS / Linux | Windows |
|--------|--------------|---------|
| Start the app | `bash start.sh` | double-click `start.bat` or run `start.ps1` |
| Stop the app  | `bash stop.sh`  | run `stop.ps1` |

### Manual setup (developers)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000
```

Set `R_EXECUTABLE` in `backend/.env` if `Rscript` is not in your PATH.

---

## Input Format

Upload a CSV or TSV file — the tool figures out the rest.

| Tool    | Required columns                                          |
|---------|-----------------------------------------------------------|
| DESeq2  | `baseMean`, `log2FoldChange`, `lfcSE`, `pvalue`, `padj`  |
| edgeR   | `logFC`, `logCPM`, `F`, `PValue`, `FDR`                  |
| limma   | `logFC`, `AveExpr`, `t`, `P.Value`, `adj.P.Val`, `B`     |
| Generic | Any table with gene identifiers — best-effort parsing     |

Row names or a `gene` column are used as gene identifiers.

---

## Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Frontend  | Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui, Framer Motion |
| Backend   | FastAPI, Python 3.12, Pydantic v2, aiofiles, httpx      |
| R engine  | ggplot2, ggrepel, clusterProfiler, ComplexHeatmap, svglite |
| AI        | Deterministic caption engine + Ollama/Llama 3 (optional, local) |
| Infra     | Docker, Docker Compose                                  |

---

## Roadmap

- [x] **Phase 1** — Upload + Volcano plot end-to-end (MVP)
- [ ] **Phase 2** — Full Scientific Engine + Celery async queue
- [ ] **Phase 3** — Open-source AI captions with style presets (Ollama/Llama 3, no external API)
- [ ] **Phase 4** — GSEA deep integration, GO enrichment, GEO accession input, conversational plot editing

---

## Notes on AI captions

All AI interpretation runs locally. The tool uses a deterministic summary engine (counts, thresholds, pathway names) to generate a base caption, then optionally enhances it with a locally-running Llama 3 model via Ollama. No raw data is ever sent to an external API.

Every figure includes the disclaimer: *"AI-generated interpretation — review before publication."*

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built by [Diego Pedraza](https://github.com/DANTONIO-BIT) · predoctoral researcher in bacterial pathogenesis & bioinformatics at Universidad de Sevilla.*
