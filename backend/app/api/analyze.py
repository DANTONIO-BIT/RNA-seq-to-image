import asyncio
import io
import uuid
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.config import settings
from app.models.analysis import AnalysisRequest, PlotType
from app.services.file_parser import parse_file
from app.services.job_store import JobStatus, job_store
from app.services.r_runner import run_r_script
from app.services.scientific_summary import compute_summary, _find_col
from app.services.ai_service import generate_caption, enhance_caption_ollama
from app.services.pubmed_service import fetch_refs_for_pathways


def _compute_sig_genes_csv(df: pd.DataFrame, params: dict) -> str | None:
    padj_thr = float(params.get("pval_threshold", 0.05))
    fc_thr   = float(params.get("fc_threshold",   1.0))

    gene_col = _find_col(df, ["gene", "Gene", "gene_id", "GeneID"])
    fc_col   = _find_col(df, ["log2FoldChange", "logFC"])
    padj_col = _find_col(df, ["padj", "adj.P.Val", "FDR"])

    if not (gene_col and fc_col and padj_col):
        return None

    padj = pd.to_numeric(df[padj_col], errors="coerce")
    fc   = pd.to_numeric(df[fc_col],   errors="coerce")
    mask = (padj < padj_thr) & (fc.abs() >= fc_thr)

    sig = df[mask][[gene_col, fc_col, padj_col]].copy()
    sig.columns = ["gene", "log2FoldChange", "padj"]
    sig["direction"] = sig["log2FoldChange"].apply(lambda x: "up" if x > 0 else "down")
    sig = sig.sort_values("log2FoldChange", ascending=False)

    buf = io.StringIO()
    sig.to_csv(buf, index=False)
    return buf.getvalue()

router = APIRouter()

PLOT_SCRIPTS: dict[PlotType, str] = {
    PlotType.volcano: "volcano.R",
    PlotType.ma: "ma_plot.R",
    PlotType.pca: "pca.R",
    PlotType.heatmap: "heatmap.R",
    PlotType.gsea: "gsea.R",
}


def _find_uploaded_file(file_id: str) -> Path:
    matches = list(settings.upload_dir.glob(f"{file_id}.*"))
    if not matches:
        raise HTTPException(404, f"File {file_id} not found")
    return matches[0]


async def _run_analysis_job(job_id: str, plot_type: str, script: str, normalized_csv: Path, params: dict, df, fmt) -> None:
    await job_store.set_running(job_id)
    try:
        result = await run_r_script(script, normalized_csv, params)
        summary = compute_summary(df, fmt)
        enrichment_table = result.get("enrichment_table")

        caption = generate_caption(summary, plot_type, enrichment_table)
        caption = await enhance_caption_ollama(caption, summary, plot_type)

        pubmed_refs = None
        if plot_type == "gsea" and enrichment_table:
            pubmed_refs = await fetch_refs_for_pathways(enrichment_table)

        sig_genes_csv = _compute_sig_genes_csv(df, params)

        await job_store.set_done(job_id, {
            "plot_type": plot_type,
            "image_base64": result["image_base64"],
            "image_format": result.get("image_format", "png"),
            "summary": summary,
            "caption": caption,
            "enrichment_table": enrichment_table,
            "pubmed_refs": pubmed_refs,
            "sig_genes_csv": sig_genes_csv,
            "script_name": script,
        })
    except Exception as e:
        await job_store.set_failed(job_id, str(e))


@router.post("/")
async def start_analysis(req: AnalysisRequest, background_tasks: BackgroundTasks):
    file_path = _find_uploaded_file(req.file_id)

    script = PLOT_SCRIPTS.get(req.plot_type)
    if not script:
        raise HTTPException(400, f"Plot type {req.plot_type} not yet supported")

    df, fmt = parse_file(file_path)
    normalized_csv = settings.upload_dir / f"{req.file_id}_normalized.csv"
    df.to_csv(normalized_csv, index=False)

    job_id = str(uuid.uuid4())
    await job_store.create(job_id)

    background_tasks.add_task(
        _run_analysis_job,
        job_id,
        req.plot_type.value,
        script,
        normalized_csv,
        req.params,
        df,
        fmt,
    )

    return {"job_id": job_id, "status": JobStatus.pending}
