"""
AI layer — deterministic by default, optional Ollama enhancement.
Never receives raw data: only structured summaries.
"""
from __future__ import annotations
import json
import re
from app.core.config import settings

PLOT_LABELS = {
    "volcano": "Volcano plot",
    "ma":      "MA plot",
    "pca":     "PCA plot",
    "heatmap": "Heatmap",
    "gsea":    "Pathway enrichment plot",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean_pathway_name(pathway: str) -> str:
    for prefix in ["HALLMARK_", "KEGG_", "GOBP_", "GOCC_", "GOMF_", "REACTOME_", "WP_"]:
        pathway = pathway.replace(prefix, "")
    pathway = re.sub(r"_V\d+$", "", pathway)
    return pathway.replace("_", " ").title()


# ── Caption ───────────────────────────────────────────────────────────────────

def generate_caption(summary: dict, plot_type: str, enrichment_table: list | None = None) -> str:
    total = summary.get("total_genes", 0)
    up    = summary.get("significant_up", 0)
    down  = summary.get("significant_down", 0)
    sig   = up + down
    fmt   = summary.get("format", "").upper() or "differential expression"
    dups  = summary.get("duplicates", 0)
    label = PLOT_LABELS.get(plot_type, plot_type)

    parts: list[str] = []

    if plot_type == "gsea":
        parts.append(
            f"Pathway enrichment analysis of {fmt} results. "
            f"Over-representation analysis (ORA) was performed on {sig:,} significantly "
            f"regulated genes ({up:,} upregulated, {down:,} downregulated; |log2FC| > 1, "
            f"FDR < 0.05) from a background of {total:,} genes. "
            f"Bars represent -log10(adjusted p-value); the dashed line marks FDR = 0.05. "
            f"Gene overlap counts (hits / set size) are annotated. "
            f"Multiple testing correction: Benjamini-Hochberg procedure."
        )
        if enrichment_table:
            sig_paths = [r for r in enrichment_table if r.get("padj", 1) < 0.05]
            if sig_paths:
                names = [_clean_pathway_name(r["pathway"]) for r in sig_paths[:3]]
                parts.append(
                    f"Significantly enriched pathways (FDR < 0.05): {', '.join(names)}."
                )
        return " ".join(parts)

    # Standard DE plots
    if sig > 0:
        parts.append(
            f"{label} of {fmt} results. "
            f"Analysis of {total:,} genes identified {sig:,} significantly regulated "
            f"transcripts (|log2FC| > 1, FDR < 0.05): "
            f"{up:,} upregulated and {down:,} downregulated."
        )
    else:
        parts.append(
            f"{label} of {fmt} results. "
            f"Analysis of {total:,} genes detected no significant differential expression "
            f"at the applied thresholds (|log2FC| > 1, FDR < 0.05)."
        )

    if up > 0 and down > 0:
        ratio = up / down
        if ratio > 3:
            parts.append("The transcriptional response is predominantly upregulatory.")
        elif ratio < 0.33:
            parts.append("The transcriptional response is predominantly downregulatory.")

    if plot_type == "volcano":
        parts.append("Top genes by significance are labelled.")
    elif plot_type == "heatmap":
        parts.append("Genes are ordered by adjusted p-value; colour scale is capped at |log2FC| = 4.")
    elif plot_type == "pca":
        parts.append("Each point represents a gene projected onto the first two principal components.")
    elif plot_type == "ma":
        parts.append("The M-axis shows log2 fold change; the A-axis shows mean log2 expression.")

    if dups > 0:
        parts.append(
            f"Warning: {dups:,} duplicate gene identifier(s) detected — "
            f"verify input data before publication."
        )

    return " ".join(parts)


async def enhance_caption_ollama(base_caption: str, summary: dict, plot_type: str) -> str:
    """Try to enhance caption via Ollama. Returns base_caption on any failure."""
    if not settings.ollama_url:
        return base_caption
    try:
        import httpx
        prompt = (
            "You are a bioinformatics expert writing figure captions for scientific papers. "
            "Rewrite the following caption to be more concise and publication-ready. "
            "Keep all numbers exact. Output only the caption, no preamble.\n\n"
            f"Original: {base_caption}\n\n"
            f"Context: {json.dumps(summary)}\n\nCaption:"
        )
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
            )
            r.raise_for_status()
            enhanced = r.json().get("response", "").strip()
            return enhanced if len(enhanced) > 20 else base_caption
    except Exception:
        return base_caption


# ── Recommendations ───────────────────────────────────────────────────────────

def recommend(rows: int, columns: list[str], detected_format: str) -> dict:
    cols = set(columns)
    has_mean = bool(cols & {"baseMean", "AveExpr", "logCPM"})
    has_de   = bool(cols & {"log2FoldChange", "logFC", "padj", "adj.P.Val", "FDR"})

    if rows > 10_000 or not has_mean:
        plot_type   = "volcano"
        plot_reason = (
            f"Volcano recommended for large datasets ({rows:,} genes) — "
            "gives the best global overview of significance vs. magnitude."
        )
    elif has_mean and has_de:
        plot_type   = "ma"
        plot_reason = (
            "MA plot recommended — mean expression data available, "
            "ideal for spotting expression-dependent fold-change bias."
        )
    else:
        plot_type   = "volcano"
        plot_reason = "Volcano is the standard first view for DE results."

    if detected_format in ("deseq2", "edger", "limma"):
        style        = "nature"
        style_reason = "Nature style recommended for publication-ready figures with standard DE formats."
    else:
        style        = "default"
        style_reason = "Default style applied — switch to Nature or Cell for publication."

    return {
        "plot_type":    plot_type,
        "plot_reason":  plot_reason,
        "style":        style,
        "style_reason": style_reason,
    }
