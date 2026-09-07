import enum
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class MediaType(str, enum.Enum):
    image = "image"
    video = "video"


class MediaAssetStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Nullable: a Smart Class Library video starts as status="pending" before it has a file at all
    # (see library_service.py) -- these are always set by the time status becomes "ready", and are
    # always set immediately for regular composer uploads (which never pass through "pending").
    object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(127), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Processing lifecycle -- defaults to "ready" so existing/regular composer uploads (which are
    # already complete the moment the row is created) are unaffected. Only the Smart Class Library
    # ingestion path (see library_service.py) creates a row as "pending" and progresses it.
    status: Mapped[MediaAssetStatus] = mapped_column(Enum(MediaAssetStatus), default=MediaAssetStatus.ready, nullable=False)
    processing_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)  # fetching|processing|uploading
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Provenance for library ingestion -- null for regular composer uploads.
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(32), nullable=True)  # e.g. "youtube"
    source_video_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # dedup key
    thumbnail_object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    uploaded_by: Mapped["User"] = relationship(back_populates="media_assets")
