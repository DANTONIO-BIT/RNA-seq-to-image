import asyncio
import base64
import json
import re
import uuid
from pathlib import Path

from app.core.config import settings


def _translate_r_error(stderr: str) -> str:
    patterns = [
        (r"Only \d+ significant gene",
         "Too few significant genes with current thresholds. Try lowering padj or |log2FC| cutoffs."),
        (r"No enriched pathways found",
         "No enriched pathways found. Try a different gene set collection or relaxing thresholds."),
        (r"org\.(Hs|Mm)\.eg\.db is not installed",
         "Missing R annotation package for Ensembl ID mapping. Use gene symbols (e.g. BRCA1) instead, "
         "or install the package: BiocManager::install('org.Hs.eg.db')."),
        (r"msigdbr",
         "Gene set database error. The selected collection may not be available for this organism."),
        (r"subscript out of bounds|undefined columns selected",
         "Input file is malformed. Verify columns: gene, log2FoldChange (or logFC), padj (or adj.P.Val)."),
        (r"cannot open file|No such file or directory",
         "Could not read the input file. Please re-upload your data."),
        (r"object .* not found",
         "Unexpected R error: a required variable was missing. Check your input file format."),
    ]
    for pattern, message in patterns:
        if re.search(pattern, stderr, re.IGNORECASE):
            return message
    for line in stderr.splitlines():
        line = line.strip()
        if line.startswith("Error") or ("stop" in line.lower() and "Error" in line):
            return f"R error: {line[:240]}"
    return "Analysis failed. Ensure your file has columns: gene, log2FoldChange, padj."


async def run_r_script(script_name: str, input_csv: Path, params: dict) -> dict:
    output_dir = settings.upload_dir / "outputs"
    output_dir.mkdir(exist_ok=True)
    job_id = str(uuid.uuid4())

    out_format = str(params.get("out_format", "png"))
    output_file = output_dir / f"{job_id}.{out_format}"

    script_path = settings.r_scripts_dir / script_name

    args = [
        settings.r_executable,
        str(script_path),
        "--input", str(input_csv),
        "--output", str(output_file),
    ]
    for key, val in params.items():
        args += [f"--{key}", str(val)]

    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)

    if proc.returncode != 0:
        raise RuntimeError(_translate_r_error(stderr.decode()))

    image_b64 = base64.b64encode(output_file.read_bytes()).decode()
    output_file.unlink(missing_ok=True)

    # Read optional enrichment table sidecar (produced by gsea.R)
    sidecar = output_dir / f"{job_id}.enrichment.json"
    enrichment_table = None
    if sidecar.exists():
        enrichment_table = json.loads(sidecar.read_text())
        sidecar.unlink(missing_ok=True)

    return {
        "job_id": job_id,
        "image_base64": image_b64,
        "image_format": out_format,
        "enrichment_table": enrichment_table,
    }
