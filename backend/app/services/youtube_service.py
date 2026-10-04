import json
import logging
import random
import re
import shutil
import threading
import time
import urllib.request
import uuid
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp

from app.core.config import settings
from app.schemas.youtube import YouTubeFormatOut, YouTubeInfoResponse

logger = logging.getLogger(__name__)

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


_PROXY_CACHE_TTL = 600  # seconds
_proxy_cache: dict = {"fetched_at": 0.0, "proxies": []}
_proxy_lock = threading.Lock()


def _webshare_proxies(force: bool = False) -> list[str]:
    with _proxy_lock:
        fresh = time.time() - _proxy_cache["fetched_at"] < _PROXY_CACHE_TTL
        if _proxy_cache["proxies"] and fresh and not force:
            return _proxy_cache["proxies"]
        try:
            req = urllib.request.Request(
                "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=100",
                headers={"Authorization": f"Token {settings.webshare_api_key}"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.load(resp)
            _proxy_cache["proxies"] = [
                f"http://{p['username']}:{p['password']}@{p['proxy_address']}:{p['port']}"
                for p in data.get("results", [])
                if p.get("valid")
            ]
            _proxy_cache["fetched_at"] = time.time()
        except Exception:
            logger.exception("Failed to fetch Webshare proxy list")
        return _proxy_cache["proxies"]


def _pick_proxy() -> str:
    if settings.webshare_api_key:
        proxies = _webshare_proxies()
        if proxies:
            return random.choice(proxies)
    return settings.youtube_proxy


def _attempts() -> int:
    # Only worth retrying when each attempt can land on a different proxy.
    return max(1, settings.youtube_proxy_retries) if settings.webshare_api_key else 1


def _is_retryable(raw: str) -> bool:
    lowered = raw.lower()
    return any(s in lowered for s in ("not a bot", "confirm you", "proxy", "connection", "timed out", "http error 4", "http error 5"))


def _network_opts() -> dict:
    opts: dict = {}
    proxy = _pick_proxy()
    if proxy:
        opts["proxy"] = proxy
    if settings.youtube_cookies_file and Path(settings.youtube_cookies_file).is_file():
        opts["cookiefile"] = settings.youtube_cookies_file
    return opts


def _friendly_error(raw: str) -> str:
    logger.error("yt-dlp failed: %s", raw)
    lowered = raw.lower()
    if "not a bot" in lowered or "confirm you" in lowered:
        return "YouTube is blocking this server's IP address. Configure YOUTUBE_PROXY or YOUTUBE_COOKIES_FILE."
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
    last_exc: Exception | None = None
    for _ in range(_attempts()):
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 30,
            **_network_opts(),
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        except Exception as exc:
            last_exc = exc
            if not _is_retryable(str(exc)):
                break
    raise YouTubeError(_friendly_error(str(last_exc)), 502) from last_exc


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
            **_network_opts(),
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

        last_exc: Exception | None = None
        for _ in range(_attempts()):
            ydl_opts.update(_network_opts())
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
                last_exc = None
                break
            except yt_dlp.utils.DownloadError as exc:
                last_exc = exc
                if not _is_retryable(str(exc)):
                    break
        if last_exc is not None:
            raise YouTubeError(_friendly_error(str(last_exc)), 502) from last_exc

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
