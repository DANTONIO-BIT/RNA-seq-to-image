import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


@dataclass
class Job:
    job_id: str
    status: JobStatus = JobStatus.pending
    result: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = asyncio.Lock()

    async def create(self, job_id: str) -> Job:
        async with self._lock:
            job = Job(job_id=job_id)
            self._jobs[job_id] = job
            return job

    async def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    async def set_running(self, job_id: str) -> None:
        async with self._lock:
            if job := self._jobs.get(job_id):
                job.status = JobStatus.running

    async def set_done(self, job_id: str, result: dict[str, Any]) -> None:
        async with self._lock:
            if job := self._jobs.get(job_id):
                job.status = JobStatus.done
                job.result = result

    async def set_failed(self, job_id: str, error: str) -> None:
        async with self._lock:
            if job := self._jobs.get(job_id):
                job.status = JobStatus.failed
                job.error = error


# Singleton — shared across the FastAPI process lifetime
job_store = JobStore()
