# RNAseq Visualizer AI

## Stack
- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Framer Motion
- Backend: FastAPI (Python 3.12) + subprocess → R
- R Engine: Bioconductor (DESeq2, edgeR, EnhancedVolcano, ComplexHeatmap)
- AI Layer (Fase 3): Open source LLM (Ollama/Llama 3 o lógica determinista) — sin Claude API, sin Anthropic

## Estructura
```
frontend/   → Next.js app
backend/    → FastAPI
r-engine/   → Scripts R + Dockerfile
docker-compose.yml
```

## Dev local
```bash
# Frontend
cd frontend && npm run dev        # :3000

# Backend (necesita Python 3.12 + R instalado)
cd backend && uvicorn app.main:app --reload --port 8000

# Con Docker (incluye R)
docker-compose up --build
```

## Reglas
- Comentarios siempre en inglés
- Arrow functions siempre
- No asumir que R está en PATH — usar settings.r_executable
- Toda figura generada lleva el aviso: "AI-generated interpretation — review before publication"
- AI NUNCA recibe datos crudos: solo el structured JSON summary del Scientific Engine

## Fases
- [x] Fase 1: Upload + Volcano Plot end-to-end (MVP)
- [ ] Fase 2: Scientific Engine completo + Celery async
- [ ] Fase 3: Open source AI captions + style presets (Ollama/Llama 3, sin Claude API)
- [ ] Fase 4: GSEA, GO enrichment, GEO accession, chat plotting
