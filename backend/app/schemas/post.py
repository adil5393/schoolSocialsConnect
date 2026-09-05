from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.post import PostStatus, PostTargetStatus
from app.models.social_account import Platform


class PostTargetCreate(BaseModel):
    social_account_id: int
    caption_override: str | None = None
    whatsapp_group_id: int | None = None
    whatsapp_template_id: int | None = None


class PostCreate(BaseModel):
    caption: str = ""
    media_asset_ids: list[int] = []
    targets: list[PostTargetCreate] = []
    scheduled_at: datetime | None = None


class PostUpdate(BaseModel):
    caption: str | None = None
    media_asset_ids: list[int] | None = None
    targets: list[PostTargetCreate] | None = None
    scheduled_at: datetime | None = None


class ScheduleRequest(BaseModel):
    scheduled_at: datetime


class PostTargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    social_account_id: int
    platform: Platform
    caption_override: str | None
    status: PostTargetStatus
    external_post_id: str | None
    error_message: str | None
    published_at: datetime | None

    @classmethod
    def from_orm_target(cls, target) -> "PostTargetOut":
        return cls(
            id=target.id,
            social_account_id=target.social_account_id,
            platform=target.social_account.platform,
            caption_override=target.caption_override,
            status=target.status,
            external_post_id=target.external_post_id,
            error_message=target.error_message,
            published_at=target.published_at,
        )


class MediaRef(BaseModel):
    id: int
    url: str
    media_type: str


class PostOut(BaseModel):
    id: int
    caption: str
    status: PostStatus
    scheduled_at: datetime | None
    created_at: datetime
    updated_at: datetime
    media: list[MediaRef]
    targets: list[PostTargetOut]
