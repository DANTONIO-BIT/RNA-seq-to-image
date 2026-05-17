import pandas as pd
from app.models.analysis import FileFormat


def compute_summary(df: pd.DataFrame, fmt: FileFormat) -> dict:
    """Derive plot-agnostic statistics from a normalized DataFrame."""
    fc_col = _find_col(df, ["log2FoldChange", "logFC"])
    padj_col = _find_col(df, ["padj", "adj.P.Val", "FDR"])

    total = len(df)
    sig_up = sig_down = 0

    if fc_col and padj_col:
        padj = pd.to_numeric(df[padj_col], errors="coerce")
        fc = pd.to_numeric(df[fc_col], errors="coerce")
        sig_up = int(((padj < 0.05) & (fc > 1)).sum())
        sig_down = int(((padj < 0.05) & (fc < -1)).sum())

    duplicates = _count_duplicates(df)

    return {
        "format": fmt.value,
        "total_genes": total,
        "significant_up": sig_up,
        "significant_down": sig_down,
        "duplicates": duplicates,
    }


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _count_duplicates(df: pd.DataFrame) -> int:
    gene_col = _find_col(df, ["gene", "Gene", "gene_id", "GeneID"])
    if gene_col is None:
        return 0
    return int(df[gene_col].duplicated().sum())
