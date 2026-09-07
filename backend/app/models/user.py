import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    editor = "editor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.editor, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Two completely separate apps share this users table but must not share access: a token
    # issued by /auth/social/login only works against social-media endpoints, and one from
    # /auth/smart-class/login only against library endpoints (enforced in deps.py). These flags
    # gate registration/login per app, independent of `role` (which is an in-app permission level).
    has_social_access: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_smart_class_access: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    social_accounts: Mapped[list["SocialAccount"]] = relationship(back_populates="connected_by", cascade="all, delete-orphan")
    media_assets: Mapped[list["MediaAsset"]] = relationship(back_populates="uploaded_by", cascade="all, delete-orphan")
    posts: Mapped[list["Post"]] = relationship(back_populates="created_by", cascade="all, delete-orphan")
