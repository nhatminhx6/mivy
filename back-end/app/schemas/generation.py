from datetime import datetime

from pydantic import BaseModel


class GenerationAccepted(BaseModel):
    job_id: str
    status: str


class GenerationStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    error: str | None
    output_url: str | None
    created_at: datetime
    updated_at: datetime
