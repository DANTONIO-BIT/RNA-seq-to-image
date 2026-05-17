import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings
from app.services.file_parser import parse_file
from app.services.ai_service import recommend

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv", ".tsv", ".txt"}


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {suffix} not supported. Use CSV or TSV.")

    file_id = str(uuid.uuid4())
    dest = settings.upload_dir / f"{file_id}{suffix}"

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        df, fmt = parse_file(dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(422, f"Could not parse file: {e}")

    return {
        "file_id": file_id,
        "filename": file.filename,
        "detected_format": fmt.value,
        "rows": len(df),
        "columns": list(df.columns),
        "preview": df.head(5).to_dict(orient="records"),
        "recommendations": recommend(len(df), list(df.columns), fmt.value),
    }
