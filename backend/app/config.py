from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or `backend/.env`."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://smartfocus:smartfocus@localhost:5432/smartfocus"

    # Browser origins allowed to call the API. Native apps don't need CORS;
    # this is for `expo start --web` during development.
    cors_origins: list[str] = ["http://localhost:8081"]

    # There is no sign-in yet, so every request acts as this one user.
    # See `app/deps.py:get_current_user`.
    demo_user_id: str = "demo"
    # IANA time zone for the demo user. Decides what "today" means.
    demo_user_timezone: str = "America/New_York"


@lru_cache
def get_settings() -> Settings:
    return Settings()
