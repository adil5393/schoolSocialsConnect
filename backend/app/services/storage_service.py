import io
import uuid
from datetime import timedelta
from functools import lru_cache
from urllib.parse import urlsplit

from minio import Minio
from minio.error import S3Error

from app.core.config import settings


@lru_cache
def _client_for(endpoint: str, secure: bool) -> Minio:
    # region is pinned explicitly so presigning never triggers a network round-trip to look it
    # up -- required for the browser/public clients, whose endpoints (e.g. localhost:9010) are not
    # reachable from inside this container.
    return Minio(
        endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=secure,
        region="us-east-1",
    )


def _internal_client() -> Minio:
    return _client_for(settings.minio_endpoint, settings.minio_secure)


def _browser_client() -> Minio:
    return _client_for(settings.minio_browser_endpoint, settings.minio_browser_secure)


def _public_client() -> Minio:
    if not settings.public_media_base_url:
        return _browser_client()
    parts = urlsplit(settings.public_media_base_url)
    return _client_for(parts.netloc, parts.scheme == "https")


def ensure_bucket() -> None:
    client = _internal_client()
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)


def build_object_key(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"media/{uuid.uuid4().hex}.{ext}"


def upload_bytes(object_key: str, data: bytes, content_type: str) -> None:
    _internal_client().put_object(
        settings.minio_bucket, object_key, io.BytesIO(data), length=len(data), content_type=content_type
    )


def upload_file(object_key: str, file_path: str, content_type: str) -> None:
    """Like upload_bytes, but streams directly from disk (Minio's fput_object) instead of loading
    the whole file into memory first -- used for library videos, which can be large (up to
    YOUTUBE_DOWNLOAD_MAX_FILE_MB).
    """
    _internal_client().fput_object(settings.minio_bucket, object_key, file_path, content_type=content_type)


def get_bytes(object_key: str) -> bytes:
    response = _internal_client().get_object(settings.minio_bucket, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def delete_object(object_key: str) -> None:
    try:
        _internal_client().remove_object(settings.minio_bucket, object_key)
    except S3Error:
        pass


def presigned_url(object_key: str, audience: str = "browser", expires_minutes: int = 10) -> str:
    """Presigning is a local crypto operation: the URL's host and its signature are computed
    together for whichever client signs it, so rewriting the host afterwards would invalidate the
    signature. A dedicated client per audience is used instead:

    - audience="browser" signs against MINIO_BROWSER_ENDPOINT (e.g. localhost:9010, reachable via
      the docker-compose port mapping) -- used for thumbnails/previews shown in the app UI, and for
      Smart Class Library video playback (with a longer expiry -- see library_service.py).
    - audience="public" signs against PUBLIC_MEDIA_BASE_URL (an internet-reachable tunnel/domain) --
      required for Instagram's Graph API, which fetches image_url/video_url server-side and cannot
      reach a local Minio instance.

    Minio's presigned GET URLs natively support HTTP Range requests, which is what lets a plain
    <video> tag seek/buffer without downloading the whole file first -- no separate streaming
    endpoint is needed.
    """
    client = _public_client() if audience == "public" else _browser_client()
    return client.presigned_get_object(settings.minio_bucket, object_key, expires=timedelta(minutes=expires_minutes))
