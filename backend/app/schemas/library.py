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
    category: str | None = Field(default="learn", max_length=64)
    resource_type: str | None = Field(default="video", max_length=64)
    description: str | None = Field(default=None, max_length=1024)
    source: str | None = Field(default=None, max_length=255)
    tags: str | None = Field(default=None, max_length=512)


class MaterialUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    class_id: int | None = None
    subject_id: int | None = None
    chapter_name: str | None = None
    part_title: str | None = None
    order_in_part: int | None = None
    category: str | None = None
    resource_type: str | None = None
    description: str | None = None
    source: str | None = None
    tags: str | None = None


class MaterialOut(BaseModel):
    id: int
    media_asset_id: int
    title: str
    media_type: str  # image | video | pdf | document
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
    category: str | None = "learn"
    resource_type: str | None = None
    description: str | None = None
    source: str | None = None
    tags: str | None = None
    created_by_id: int | None = None
    created_by_name: str | None = None
    duration_seconds: int | None
    thumbnail_url: str | None
    # The material's own content -- a streamable video URL, a viewable image URL, or a
    # downloadable/openable PDF or PowerPoint URL, depending on media_type.
    file_url: str | None
    created_at: datetime


class SaveVideoResponse(BaseModel):
    material: MaterialOut
    reused_existing_asset: bool
    other_locations: list[str] = []


class ChapterCreateRequest(BaseModel):
    class_id: int
    subject_id: int
    name: str = Field(min_length=1, max_length=255)
    order: int = 0


class ChapterUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    order: int | None = None


class PartCreateRequest(BaseModel):
    chapter_id: int
    title: str = Field(min_length=1, max_length=255)
    part_number: int | None = None


class PartUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    part_number: int | None = None


class ClassUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    order: int | None = None


class SubjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)

