from typing import Literal

from pydantic import BaseModel, Field

QualityValue = Literal["best", "1080", "720", "480", "360", "320", "256", "192", "128"]


class YouTubeInfoRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class YouTubeFormatOut(BaseModel):
    type: Literal["video", "audio"]
    quality: str
    extension: str
    height: int | None = None
    has_audio: bool


class YouTubeInfoResponse(BaseModel):
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    uploader: str | None = None
    upload_date: str | None = None
    view_count: int | None = None
    formats: list[YouTubeFormatOut]


class YouTubeDownloadRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    media_type: Literal["video", "audio"]
    format: Literal["mp4", "mp3", "m4a"]
    quality: QualityValue
