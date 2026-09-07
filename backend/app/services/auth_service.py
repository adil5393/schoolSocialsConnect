from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse


def issue_tokens(user: User, app: str) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), app),
        refresh_token=create_refresh_token(str(user.id), user.token_version, app),
    )


def ensure_seed_admin(db: Session) -> None:
    """There is no public registration at all -- only an existing admin can create further users
    (see routers/admin_users.py). Without this, a fresh database would have no way to log in at
    all. Idempotent: does nothing once ADMIN_EMAIL already exists as a user, so it's safe to leave
    the env vars set permanently. Not gated behind DEBUG/dev checks -- this is the one deliberate,
    documented exception to "admin-only user creation", not a backdoor.
    """
    if not settings.admin_email or not settings.admin_password:
        return
    if db.query(User).filter(User.email == settings.admin_email).first():
        return
    admin = User(
        email=settings.admin_email,
        hashed_password=hash_password(settings.admin_password),
        full_name=settings.admin_full_name,
        role=UserRole.admin,
        has_social_access=True,
        has_smart_class_access=True,
    )
    db.add(admin)
    db.commit()


def login_user(db: Session, email: str, password: str, app: str, access_flag: str) -> TokenResponse:
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(password, user.hashed_password) or not getattr(user, access_flag):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return issue_tokens(user, app)


def refresh_tokens(db: Session, refresh_token: str, app: str, access_flag: str) -> TokenResponse:
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    try:
        decoded = decode_token(refresh_token)
    except ValueError:
        raise invalid from None
    if decoded.get("type") != "refresh" or decoded.get("app") != app:
        raise invalid
    user = db.get(User, int(decoded["sub"]))
    if user is None or not user.is_active or not getattr(user, access_flag) or decoded.get("tv") != user.token_version:
        raise invalid
    return issue_tokens(user, app)
