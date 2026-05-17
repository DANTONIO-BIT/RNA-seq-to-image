import pandas as pd
from pathlib import Path
from app.models.analysis import FileFormat


DESEQ2_COLS = {"baseMean", "log2FoldChange", "lfcSE", "stat", "pvalue", "padj"}
EDGER_COLS = {"logFC", "logCPM", "F", "PValue", "FDR"}
LIMMA_COLS = {"logFC", "AveExpr", "t", "P.Value", "adj.P.Val", "B"}


def detect_format(df: pd.DataFrame) -> FileFormat:
    cols = set(df.columns)
    if DESEQ2_COLS.issubset(cols):
        return FileFormat.deseq2
    if EDGER_COLS.issubset(cols):
        return FileFormat.edger
    if LIMMA_COLS.issubset(cols):
        return FileFormat.limma
    return FileFormat.generic


def normalize_to_standard(df: pd.DataFrame, fmt: FileFormat) -> pd.DataFrame:
    """Normalize any format to: gene, log2FC, pvalue, padj, baseMean."""
    if fmt == FileFormat.deseq2:
        df = df.copy()
        if df.index.name or not df.index.dtype == object:
            df = df.reset_index()
            df = df.rename(columns={df.columns[0]: "gene"})
        return df

    if fmt == FileFormat.edger:
        df = df.copy().reset_index()
        df = df.rename(columns={
            df.columns[0]: "gene",
            "logFC": "log2FoldChange",
            "PValue": "pvalue",
            "FDR": "padj",
            "logCPM": "baseMean",
        })
        return df

    if fmt == FileFormat.limma:
        df = df.copy().reset_index()
        df = df.rename(columns={
            df.columns[0]: "gene",
            "logFC": "log2FoldChange",
            "P.Value": "pvalue",
            "adj.P.Val": "padj",
            "AveExpr": "baseMean",
        })
        return df

    # generic: return as-is, best-effort
    df = df.copy().reset_index()
    return df


def parse_file(path: Path) -> tuple[pd.DataFrame, FileFormat]:
    sep = "\t" if path.suffix in (".tsv", ".txt") else ","
    df = pd.read_csv(path, sep=sep, index_col=0)
    fmt = detect_format(df)
    normalized = normalize_to_standard(df, fmt)
    return normalized, fmt
