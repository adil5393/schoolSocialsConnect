from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # Plain str, not EmailStr: admin-created logins aren't required to be real email addresses
    # (see schemas/admin.py) -- the seeded bootstrap admin ("Admin_user") is a real example.
    email: str
    full_name: str
    role: UserRole
    is_active: bool
