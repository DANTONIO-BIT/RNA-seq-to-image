from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, analyze, export, jobs
from app.core.config import settings

app = FastAPI(title="RNAseq Visualizer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(export.router, prefix="/api/export", tags=["export"])


@app.get("/health")
async def health():
    return {"status": "ok"}
