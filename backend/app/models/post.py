import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PostStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    partially_failed = "partially_failed"


class PostTargetStatus(str, enum.Enum):
    pending = "pending"
    publishing = "publishing"
    published = "published"
    failed = "failed"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    caption: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[PostStatus] = mapped_column(Enum(PostStatus), default=PostStatus.draft, nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    created_by: Mapped["User"] = relationship(back_populates="posts")
    media_items: Mapped[list["PostMedia"]] = relationship(
        back_populates="post", cascade="all, delete-orphan", order_by="PostMedia.position"
    )
    targets: Mapped[list["PostTarget"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class PostMedia(Base):
    __tablename__ = "post_media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False)
    media_asset_id: Mapped[int] = mapped_column(ForeignKey("media_assets.id"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    post: Mapped["Post"] = relationship(back_populates="media_items")
    media_asset: Mapped["MediaAsset"] = relationship()


class PostTarget(Base):
    __tablename__ = "post_targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False)
    social_account_id: Mapped[int] = mapped_column(ForeignKey("social_accounts.id"), nullable=False)
    caption_override: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PostTargetStatus] = mapped_column(Enum(PostTargetStatus), default=PostTargetStatus.pending, nullable=False)
    external_post_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Only set when social_account.platform == whatsapp: which broadcast list + approved template to send.
    whatsapp_group_id: Mapped[int | None] = mapped_column(ForeignKey("whatsapp_contact_groups.id"), nullable=True)
    whatsapp_template_id: Mapped[int | None] = mapped_column(ForeignKey("whatsapp_templates.id"), nullable=True)

    post: Mapped["Post"] = relationship(back_populates="targets")
    social_account: Mapped["SocialAccount"] = relationship(back_populates="post_targets")
