from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WhatsAppContactCreate(BaseModel):
    phone_number: str
    display_name: str | None = None
    opted_in: bool = True


class WhatsAppContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str
    display_name: str | None
    opted_in: bool


class WhatsAppGroupCreate(BaseModel):
    name: str


class WhatsAppGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    contacts: list[WhatsAppContactOut] = []


class WhatsAppTemplateCreate(BaseModel):
    name: str
    language_code: str = "en_US"
    has_media_header: bool = True


class WhatsAppTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    language_code: str
    has_media_header: bool
