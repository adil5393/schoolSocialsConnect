import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Platform(str, enum.Enum):
    facebook = "facebook"
    instagram = "instagram"
    whatsapp = "whatsapp"


class SocialAccountStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SocialAccountStatus] = mapped_column(
        Enum(SocialAccountStatus), default=SocialAccountStatus.connected, nullable=False
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    connected_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    connected_by: Mapped["User"] = relationship(back_populates="social_accounts")
    post_targets: Mapped[list["PostTarget"]] = relationship(back_populates="social_account")
