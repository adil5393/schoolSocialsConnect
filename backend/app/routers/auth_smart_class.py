from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.deps import get_current_smart_class_user, get_db
from app.models.user import User
from app.schemas.auth import RefreshRequest, TokenResponse
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth/smart-class", tags=["auth-smart-class"])

APP = "smart_class"
ACCESS_FLAG = "has_smart_class_access"

# No public registration -- accounts are created by an admin via /admin/users (see
# routers/admin_users.py). The bootstrap admin is auto-seeded from ADMIN_EMAIL/ADMIN_PASSWORD
# (see auth_service.ensure_seed_admin), called once at app startup.


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.login_user(db, form_data.username, form_data.password, APP, ACCESS_FLAG)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.refresh_tokens(db, payload.refresh_token, APP, ACCESS_FLAG)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_smart_class_user)) -> User:
    return current_user
