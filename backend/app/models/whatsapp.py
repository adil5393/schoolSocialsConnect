from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class WhatsAppContactGroup(Base):
    __tablename__ = "whatsapp_contact_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    contacts: Mapped[list["WhatsAppContact"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class WhatsAppContact(Base):
    __tablename__ = "whatsapp_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("whatsapp_contact_groups.id"), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opted_in: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group: Mapped["WhatsAppContactGroup"] = relationship(back_populates="contacts")


class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    language_code: Mapped[str] = mapped_column(String(16), default="en_US", nullable=False)
    has_media_header: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
