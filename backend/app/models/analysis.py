from pydantic import BaseModel
from enum import Enum


class PlotType(str, Enum):
    volcano = "volcano"
    ma = "ma"
    pca = "pca"
    heatmap = "heatmap"
    boxplot = "boxplot"
    gsea = "gsea"


class FileFormat(str, Enum):
    deseq2 = "deseq2"
    edger = "edger"
    limma = "limma"
    generic = "generic"


class AnalysisRequest(BaseModel):
    file_id: str
    plot_type: PlotType = PlotType.volcano
    params: dict = {}


class AnalysisResult(BaseModel):
    job_id: str
    plot_type: PlotType
    image_base64: str | None = None
    summary: dict = {}
    error: str | None = None
