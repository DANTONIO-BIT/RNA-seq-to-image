from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import base64

from app.core.config import settings

router = APIRouter()

_ALLOWED_SCRIPTS = {"volcano.R", "ma_plot.R", "pca.R", "heatmap.R", "gsea.R"}


@router.post("/png")
async def export_png(image_base64: str):
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception:
        raise HTTPException(400, "Invalid base64 image data")
    return Response(content=image_bytes, media_type="image/png")


@router.get("/scripts/{script_name}")
async def download_r_script(script_name: str):
    if script_name not in _ALLOWED_SCRIPTS:
        raise HTTPException(404, "Script not found")
    path = settings.r_scripts_dir / script_name
    if not path.exists():
        raise HTTPException(404, "Script not found")
    return Response(
        content=path.read_text(),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{script_name}"'},
    )
