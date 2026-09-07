from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserRole


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    has_social_access: bool
    has_smart_class_access: bool
    created_at: datetime


class AdminUserCreateRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.editor
    has_social_access: bool = False
    has_smart_class_access: bool = False


class AdminUserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    has_social_access: bool | None = None
    has_smart_class_access: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=255)
