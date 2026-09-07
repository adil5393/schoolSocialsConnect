from datetime import datetime

from pydantic import BaseModel, Field


class SaveVideoRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    title: str = Field(min_length=1, max_length=255)
    class_id: int
    subject_id: int
    # Free text; get-or-create (case-insensitive) on the backend -- see curriculum_service.py.
    chapter_name: str = Field(min_length=1, max_length=255)
    part_title: str = Field(min_length=1, max_length=255)


class MaterialUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    class_id: int | None = None
    subject_id: int | None = None
    chapter_name: str | None = None
    part_title: str | None = None
    order_in_part: int | None = None


class MaterialOut(BaseModel):
    id: int
    media_asset_id: int
    title: str
    status: str
    processing_stage: str | None
    error_message: str | None
    class_id: int
    class_name: str
    subject_id: int
    subject_name: str
    chapter_id: int
    chapter_name: str
    part_id: int
    part_title: str
    order_in_part: int
    duration_seconds: int | None
    thumbnail_url: str | None
    video_url: str | None
    created_at: datetime


class SaveVideoResponse(BaseModel):
    material: MaterialOut
    reused_existing_asset: bool
    other_locations: list[str] = []
