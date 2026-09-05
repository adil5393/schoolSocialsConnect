from datetime import datetime

from pydantic import BaseModel

from app.models.media_asset import MediaType


class MediaAssetOut(BaseModel):
    id: int
    filename: str
    media_type: MediaType
    mime_type: str
    size_bytes: int
    url: str
    created_at: datetime
