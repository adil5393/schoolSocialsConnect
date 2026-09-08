import re
import shutil
import uuid
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp

from app.core.config import settings
from app.schemas.youtube import YouTubeFormatOut, YouTubeInfoResponse

_ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}

_CANONICAL_VIDEO_HEIGHTS = [1080, 720, 480, 360]

_AUDIO_QUALITY_MAP = {
    "best": "0",  # yt-dlp treats 0-9 as a VBR quality scale for FFmpegExtractAudio (0 = best)
    "320": "320",
    "256": "256",
    "192": "192",
    "128": "128",
}


class YouTubeError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def validate_youtube_url(url: str) -> None:
    if len(url) > 2048:
        raise YouTubeError("URL is too long", 400)
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise YouTubeError("That doesn't look like a valid URL", 400)
    host = (parsed.hostname or "").lower()
    if host not in _ALLOWED_HOSTS:
        raise YouTubeError("Only youtube.com and youtu.be links are supported", 400)


def _friendly_error(raw: str) -> str:
    lowered = raw.lower()
    if "private video" in lowered:
        return "This video is private and cannot be downloaded."
    if "video unavailable" in lowered:
        return "This video is unavailable."
    if "sign in to confirm your age" in lowered or ("age" in lowered and "restrict" in lowered):
        return "This video is age-restricted and cannot be downloaded."
    if "not available in your country" in lowered or "region" in lowered:
        return "This video is not available in this region."
    if "requested format is not available" in lowered:
        return "The requested quality is not available for this video."
    if "ffmpeg not found" in lowered or "ffprobe" in lowered:
        return "Server is missing FFmpeg -- video/audio conversion is unavailable."
    if "timed out" in lowered or "timeout" in lowered:
        return "The download timed out. Try again or pick a lower quality."
    return "Failed to process this video. It may be restricted or unavailable."


def _extract_info(url: str) -> dict:
    validate_youtube_url(url)
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "socket_timeout": 30,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=False)
    except (yt_dlp.utils.DownloadError, Exception) as exc:
        raise YouTubeError(_friendly_error(str(exc)), 502) from exc


def _available_video_heights(info: dict) -> list[int]:
    actual = {fmt.get("height") for fmt in info.get("formats") or [] if fmt.get("vcodec") not in (None, "none") and fmt.get("height")}
    return [h for h in _CANONICAL_VIDEO_HEIGHTS if any(abs(h - a) <= 20 for a in actual)]


def _has_audio_stream(info: dict) -> bool:
    return any(fmt.get("acodec") not in (None, "none") for fmt in info.get("formats") or [])


def _check_duration(info: dict) -> None:
    duration = info.get("duration") or 0
    if duration > settings.youtube_download_max_duration:
        max_minutes = settings.youtube_download_max_duration // 60
        raise YouTubeError(f"Video is too long ({duration // 60} min). Maximum allowed is {max_minutes} min.", 413)


def fetch_info(url: str) -> YouTubeInfoResponse:
    info = _extract_info(url)
    _check_duration(info)

    formats: list[YouTubeFormatOut] = [
        YouTubeFormatOut(type="video", quality=str(height), extension="mp4", height=height, has_audio=True)
        for height in _available_video_heights(info)
    ]
    if _has_audio_stream(info):
        formats.append(YouTubeFormatOut(type="audio", quality="best", extension="m4a", has_audio=True))

    return YouTubeInfoResponse(
        title=info.get("title") or "Untitled",
        thumbnail=info.get("thumbnail"),
        duration=info.get("duration"),
        uploader=info.get("uploader"),
        upload_date=info.get("upload_date"),
        view_count=info.get("view_count"),
        formats=formats,
    )


def _sanitize_filename(title: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title, flags=re.UNICODE).strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return cleaned[:150] or "download"


def _create_request_dir() -> Path:
    base = Path(settings.youtube_temp_dir)
    base.mkdir(parents=True, exist_ok=True)
    request_dir = base / uuid.uuid4().hex
    request_dir.mkdir(parents=True, exist_ok=False)
    return request_dir


def cleanup_dir(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)


def download_media(url: str, media_type: str, fmt: str, quality: str) -> tuple[Path, str, Path]:
    """Downloads (and, if needed, converts/merges via ffmpeg) the requested media into a fresh
    per-request temp directory. Returns (file_path, download_filename, request_dir) -- the caller
    is responsible for deleting request_dir once the response has been sent.
    """
    info = _extract_info(url)
    _check_duration(info)

    title = info.get("title") or "video"
    filename_base = _sanitize_filename(title)
    request_dir = _create_request_dir()

    try:
        output_template = str(request_dir / f"{filename_base}.%(ext)s")
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "outtmpl": output_template,
            "socket_timeout": settings.youtube_download_timeout,
        }

        if media_type == "video":
            height = None if quality == "best" else int(quality)
            if height:
                format_selector = (
                    f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/"
                    f"best[height<={height}][ext=mp4]/best[height<={height}]"
                )
            else:
                format_selector = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
            ydl_opts.update({"format": format_selector, "merge_output_format": "mp4"})
        else:
            ydl_opts.update(
                {
                    "format": "bestaudio/best",
                    "postprocessors": [
                        {
                            "key": "FFmpegExtractAudio",
                            "preferredcodec": fmt,
                            "preferredquality": _AUDIO_QUALITY_MAP.get(quality, "5"),
                        }
                    ],
                }
            )

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except yt_dlp.utils.DownloadError as exc:
            raise YouTubeError(_friendly_error(str(exc)), 502) from exc

        produced = [p for p in request_dir.glob("*") if p.suffix not in (".part", ".ytdl") and p.is_file()]
        if not produced:
            raise YouTubeError("Download produced no file", 500)
        file_path = max(produced, key=lambda p: p.stat().st_size)

        max_bytes = settings.youtube_download_max_file_mb * 1024 * 1024
        if file_path.stat().st_size > max_bytes:
            raise YouTubeError(f"File exceeds the {settings.youtube_download_max_file_mb}MB limit", 413)

        extension = "mp4" if media_type == "video" else fmt
        download_filename = f"{filename_base}.{extension}"
        return file_path, download_filename, request_dir
    except Exception:
        cleanup_dir(request_dir)
        raise
