from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.deps import get_current_social_user
from app.models.user import User
from app.schemas.youtube import YouTubeDownloadRequest, YouTubeInfoRequest, YouTubeInfoResponse
from app.services import youtube_service
from app.services.youtube_service import YouTubeError

router = APIRouter(prefix="/youtube", tags=["youtube"])

_AUDIO_MEDIA_TYPES = {"mp3": "audio/mpeg", "m4a": "audio/mp4"}


@router.post("/info", response_model=YouTubeInfoResponse)
def get_info(payload: YouTubeInfoRequest, _: User = Depends(get_current_social_user)) -> YouTubeInfoResponse:
    try:
        return youtube_service.fetch_info(payload.url)
    except YouTubeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch video information") from exc


@router.post("/download")
def download(payload: YouTubeDownloadRequest, _: User = Depends(get_current_social_user)) -> FileResponse:
    try:
        file_path, download_filename, request_dir = youtube_service.download_media(
            payload.url, payload.media_type, payload.format, payload.quality
        )
    except YouTubeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Download failed") from exc

    media_type = "video/mp4" if payload.media_type == "video" else _AUDIO_MEDIA_TYPES.get(payload.format, "application/octet-stream")

    return FileResponse(
        path=file_path,
        filename=download_filename,
        media_type=media_type,
        background=BackgroundTask(youtube_service.cleanup_dir, request_dir),
    )
