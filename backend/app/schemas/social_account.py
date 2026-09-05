from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.social_account import Platform, SocialAccountStatus


class SocialAccountCreate(BaseModel):
    platform: Platform
    display_name: str
    external_id: str
    access_token: str


class SocialAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: Platform
    display_name: str
    external_id: str
    status: SocialAccountStatus
    last_error: str | None
    created_at: datetime
