from pathlib import Path

from pydantic import Field
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
	data_dir: Path = Field(default=BACKEND_DIR)
	upload_dir: Path | None = None
	database_url: str | None = None
	postgres_db: str = "vinted_app"
	postgres_user: str = "postgres"
	postgres_password: str = "postgres"
	postgres_host: str = "localhost"
	postgres_host_port: int = 5432
	openai_api_key: str = ""
	openai_vision_model: str = "gpt-4.1-mini"

	model_config = SettingsConfigDict(
		env_file=(ROOT_DIR / ".env", BACKEND_DIR / ".env"),
		env_file_encoding="utf-8",
		case_sensitive=False,
		extra="ignore",
	)

	@model_validator(mode="after")
	def finalize_database_url(self) -> "Settings":
		if self.database_url:
			return self

		self.database_url = (
			"postgresql+asyncpg://"
			f"{self.postgres_user}:{self.postgres_password}@"
			f"{self.postgres_host}:{self.postgres_host_port}/{self.postgres_db}"
		)
		return self


settings = Settings()

DATA_DIR = settings.data_dir
UPLOAD_DIR = settings.upload_dir or (DATA_DIR / "uploads")
DATABASE_URL = settings.database_url
OPENAI_API_KEY = settings.openai_api_key
OPENAI_VISION_MODEL = settings.openai_vision_model

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
