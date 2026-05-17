from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    allowed_origins: list[str] = ["http://localhost:3000"]
    upload_dir: Path = Path("/tmp/rnaseq_uploads")
    r_scripts_dir: Path = Path("/r-engine/scripts")
    r_executable: str = "Rscript"
    ollama_url: str = ""
    ollama_model: str = "llama3"

    model_config = {"env_file": ".env"}


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
