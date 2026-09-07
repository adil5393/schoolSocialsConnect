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

    # Bootstrap admin: there is no public registration at all (see routers/auth_social.py /
    # auth_smart_class.py) -- only an admin can create further users, via /admin/users. This
    # account is auto-created on startup (idempotent -- skipped if it already exists) so there's
    # always at least one way in. It's granted BOTH has_social_access and has_smart_class_access,
    # so the same login works on both otherwise-isolated portals.
    admin_email: str | None = None
    admin_password: str | None = None
    admin_full_name: str = "Admin"

    # YouTube Downloader (isolated feature -- see app/services/youtube_service.py)
    youtube_temp_dir: str = "/tmp/school-socials-youtube"
    youtube_download_max_duration: int = 7200  # seconds
    youtube_download_max_file_mb: int = 1000
    youtube_download_timeout: int = 600  # seconds, per network operation
    # Separate from youtube_download_timeout on purpose: that one bounds a single socket
    # operation during download, while transcoding a long video can legitimately take much
    # longer on a modest server -- conflating the two caused real timeouts in production.
    video_processing_timeout: int = 2700  # seconds (45 min) for the ffmpeg normalize step
    # Caps how many videos can be downloading/transcoding at once -- ffmpeg is CPU-heavy and this
    # runs on the same modest server as the rest of the API, so unbounded concurrency here can
    # starve everything else (logins, dashboard, publishing) under load. Extra requests queue
    # (stay "pending") rather than piling on and fighting for the same CPU.
    video_processing_max_concurrent: int = 2

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
