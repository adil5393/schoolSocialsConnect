import json
import logging
import os
import subprocess
import threading
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.media_asset import MediaAsset, MediaAssetStatus
from app.services import storage_service, youtube_service

logger = logging.getLogger(__name__)

LIBRARY_VIDEO_URL_EXPIRES_MINUTES = 240  # long-lived so pausing/rewatching doesn't hit an expired URL

# Bounds how many videos can be downloading/transcoding at once across the whole process (see
# VIDEO_PROCESSING_MAX_CONCURRENT). A background task blocked on this semaphore simply leaves its
# MediaAsset in "pending" -- which already reads correctly as "queued" in the UI -- rather than
# needing a separate queued state.
_PROCESSING_SEMAPHORE = threading.Semaphore(settings.video_processing_max_concurrent)


def _with_lowered_priority(fn, *args, **kwargs):
    """Runs fn with this worker thread's OS scheduling priority turned down, so a heavy in-process
    call (yt-dlp's download) yields CPU to the API's request-handling threads under contention.
    Linux-only and best-effort: setpriority on a thread id works via PRIO_PROCESS on Linux, but
    silently does nothing (rather than failing) anywhere it doesn't apply.
    """
    tid = threading.get_native_id()
    try:
        os.setpriority(os.PRIO_PROCESS, tid, 10)
    except (AttributeError, OSError):
        pass
    try:
        return fn(*args, **kwargs)
    finally:
        try:
            os.setpriority(os.PRIO_PROCESS, tid, 0)
        except (AttributeError, OSError):
            pass


def extract_youtube_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host == "youtu.be":
        return parsed.path.strip("/").split("/")[0] or None
    if "youtube.com" in host:
        if parsed.path.startswith("/shorts/"):
            return parsed.path.split("/shorts/")[1].split("/")[0] or None
        query = parse_qs(parsed.query)
        if "v" in query:
            return query["v"][0]
    return None


def _probe_streams(file_path: Path) -> tuple[str | None, str | None, int | None, float | None]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name,height:format=duration",
            "-of",
            "json",
            str(file_path),
        ],
        capture_output=True,
        text=True,
        timeout=30,
        check=True,
    )
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = data.get("format", {}).get("duration")
    return (
        video.get("codec_name") if video else None,
        audio.get("codec_name") if audio else None,
        video.get("height") if video else None,
        float(duration) if duration else None,
    )


def probe_duration_seconds(file_path: Path) -> int | None:
    """Public helper for callers that just want duration (e.g. a directly uploaded video, which
    has no yt-dlp metadata to supply it)."""
    try:
        _, _, _, duration = _probe_streams(file_path)
        return int(duration) if duration else None
    except (subprocess.SubprocessError, OSError):
        return None


def _ensure_browser_compatible(file_path: Path, request_dir: Path) -> Path:
    """Only re-encodes when the source isn't already H.264/AAC/<=720p -- avoids unnecessary
    transcoding for sources that are already browser/Android compatible.
    """
    video_codec, audio_codec, height, _duration = _probe_streams(file_path)
    needs_transcode = video_codec != "h264" or audio_codec != "aac" or (height is not None and height > 720)
    if not needs_transcode:
        return file_path

    output_path = request_dir / f"{file_path.stem}_normalized.mp4"
    subprocess.run(
        [
            "nice",
            "-n",
            "10",  # yields CPU to the API's own processes under contention -- see module docstring
            "ffmpeg",
            "-y",
            "-i",
            str(file_path),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",  # speed over compression ratio -- this runs on modest server hardware
            "-crf",
            "23",
            "-vf",
            "scale='min(1280,iw)':-2",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",  # moves the MOOV atom to the front -- required for good streaming/seek UX
            str(output_path),
        ],
        capture_output=True,
        timeout=settings.video_processing_timeout,
        check=True,
    )
    return output_path


def _set_stage(db, asset: MediaAsset, stage: str) -> None:
    asset.processing_stage = stage
    db.commit()


def create_scratch_dir() -> Path:
    """A fresh per-upload scratch directory under the same temp root the YouTube pipeline uses --
    shared purely as scratch space for media processing, not YouTube-specific in itself."""
    base = Path(settings.youtube_temp_dir)
    base.mkdir(parents=True, exist_ok=True)
    scratch_dir = base / uuid.uuid4().hex
    scratch_dir.mkdir(parents=True, exist_ok=False)
    return scratch_dir


def _upload_thumbnail(source_url: str, media_asset_id: int) -> str | None:
    """Re-hosts the source thumbnail into our own MinIO bucket, so the library stays viewable
    independent of the source site's CDN over the long term.
    """
    try:
        response = httpx.get(source_url, timeout=15, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError:
        return None
    content_type = response.headers.get("content-type", "image/jpeg")
    ext = "png" if "png" in content_type else "jpg"
    object_key = f"videos/{media_asset_id}/thumbnail.{ext}"
    storage_service.upload_bytes(object_key, response.content, content_type)
    return object_key


def process_library_video(media_asset_id: int) -> None:
    """Background task (kicked off from routers/library.py, same BackgroundTasks pattern as
    posts.publish_now): downloads via the existing youtube_service, normalizes for browser/Android
    compatibility only if needed, uploads to MinIO, and marks the MediaAsset ready or failed.
    Never leaves a raw traceback in error_message.

    Blocks on _PROCESSING_SEMAPHORE before doing any real work, so at most
    VIDEO_PROCESSING_MAX_CONCURRENT of these run at once -- extra ones simply wait (their
    MediaAsset stays "pending", not yet "processing") instead of piling onto the CPU together.
    """
    db = SessionLocal()
    request_dir: Path | None = None
    try:
        asset = db.get(MediaAsset, media_asset_id)
        if asset is None:
            return

        with _PROCESSING_SEMAPHORE:
            asset.status = MediaAssetStatus.processing
            db.commit()

            try:
                _set_stage(db, asset, "fetching")
                file_path, _filename, request_dir = _with_lowered_priority(
                    youtube_service.download_media, asset.source_url, "video", "mp4", "720"
                )
            except youtube_service.YouTubeError as exc:
                asset.status = MediaAssetStatus.failed
                asset.error_message = exc.message
                db.commit()
                return

            try:
                _set_stage(db, asset, "processing")
                final_path = _ensure_browser_compatible(file_path, request_dir)

                _set_stage(db, asset, "uploading")
                video_object_key = f"videos/{asset.id}/{uuid.uuid4().hex}.mp4"
                storage_service.upload_file(video_object_key, str(final_path), "video/mp4")

                info = youtube_service.fetch_info(asset.source_url)
                thumbnail_key = _upload_thumbnail(info.thumbnail, asset.id) if info.thumbnail else None

                asset.object_key = video_object_key
                asset.bucket = settings.minio_bucket
                asset.mime_type = "video/mp4"
                asset.size_bytes = final_path.stat().st_size
                asset.duration_seconds = info.duration or asset.duration_seconds
                asset.thumbnail_object_key = thumbnail_key
                asset.status = MediaAssetStatus.ready
                asset.processing_stage = None
                asset.error_message = None
                db.commit()
            except Exception:
                logger.exception("Failed to process library video %s", media_asset_id)
                asset.status = MediaAssetStatus.failed
                asset.processing_stage = None
                asset.error_message = "Failed to process this video. Please try again."
                db.commit()
    finally:
        if request_dir is not None:
            youtube_service.cleanup_dir(request_dir)
        db.close()


def process_uploaded_video(media_asset_id: int, file_path: str, scratch_dir: str) -> None:
    """Same normalize -> upload pipeline as process_library_video, minus the download step (the
    file's already local, written by the upload endpoint before this background task starts) --
    shares the same concurrency semaphore, since it's just as CPU-heavy once transcoding.
    """
    db = SessionLocal()
    request_dir = Path(scratch_dir)
    try:
        asset = db.get(MediaAsset, media_asset_id)
        if asset is None:
            return

        with _PROCESSING_SEMAPHORE:
            asset.status = MediaAssetStatus.processing
            db.commit()

            try:
                _set_stage(db, asset, "processing")
                final_path = _ensure_browser_compatible(Path(file_path), request_dir)

                _set_stage(db, asset, "uploading")
                video_object_key = f"videos/{asset.id}/{uuid.uuid4().hex}.mp4"
                storage_service.upload_file(video_object_key, str(final_path), "video/mp4")

                asset.object_key = video_object_key
                asset.bucket = settings.minio_bucket
                asset.mime_type = "video/mp4"
                asset.size_bytes = final_path.stat().st_size
                asset.duration_seconds = probe_duration_seconds(final_path)
                asset.status = MediaAssetStatus.ready
                asset.processing_stage = None
                asset.error_message = None
                db.commit()
            except Exception:
                logger.exception("Failed to process uploaded video %s", media_asset_id)
                asset.status = MediaAssetStatus.failed
                asset.processing_stage = None
                asset.error_message = "Failed to process this video. Please try again."
                db.commit()
    finally:
        youtube_service.cleanup_dir(request_dir)
        db.close()
