from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@postgres:5432/postgres"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    # Internal: how the backend container reaches Minio.
    minio_endpoint: str = "minio:9000"
    minio_secure: bool = False
    # Browser-facing: how a viewer's browser reaches Minio, via the docker-compose port mapping.
    minio_browser_endpoint: str = "localhost:9010"
    minio_browser_secure: bool = False

    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_bucket: str = "school-socials-media"

    # Internet-reachable base (tunnel/domain) required only for Instagram's Graph API media fetch.
    public_media_base_url: str | None = None

    meta_app_id: str | None = None
    meta_app_secret: str | None = None
    graph_api_version: str = "v19.0"

    cors_origins: str = "http://localhost:5174"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
