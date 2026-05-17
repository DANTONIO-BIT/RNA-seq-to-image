from fastapi import APIRouter, HTTPException
from app.services.job_store import JobStatus, job_store

router = APIRouter()


@router.get("/{job_id}")
async def get_job(job_id: str):
    job = await job_store.get(job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")

    response = {"job_id": job.job_id, "status": job.status}

    if job.status == JobStatus.done:
        response.update(job.result)
    elif job.status == JobStatus.failed:
        response["error"] = job.error

    return response
