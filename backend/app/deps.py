from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole

# Two separate schemes -- distinct tokenUrl per app, purely so Swagger UI points at the right
# login endpoint for each. The actual enforcement happens in _get_current_user_for_app below.
oauth2_scheme_social = OAuth2PasswordBearer(tokenUrl="/auth/social/login")
oauth2_scheme_smart_class = OAuth2PasswordBearer(tokenUrl="/auth/smart-class/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_current_user_for_app(token: str, db: Session, expected_app: str, access_flag: str) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError:
        raise credentials_error from None
    if payload.get("type") != "access" or payload.get("app") != expected_app:
        # Deliberately the same generic error as any other invalid token -- a smart-class token
        # presented to a social endpoint (or vice versa) must look exactly like "not logged in",
        # not leak which app it belonged to.
        raise credentials_error
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_error
    user = db.get(User, int(user_id))
    if user is None or not user.is_active or not getattr(user, access_flag):
        raise credentials_error
    return user


def get_current_social_user(token: str = Depends(oauth2_scheme_social), db: Session = Depends(get_db)) -> User:
    return _get_current_user_for_app(token, db, expected_app="social", access_flag="has_social_access")


def get_current_smart_class_user(token: str = Depends(oauth2_scheme_smart_class), db: Session = Depends(get_db)) -> User:
    return _get_current_user_for_app(token, db, expected_app="smart_class", access_flag="has_smart_class_access")


def get_current_admin_user(token: str = Depends(oauth2_scheme_social), db: Session = Depends(get_db)) -> User:
    """User administration is the one deliberately shared capability -- a single admin account is
    meant to manage both otherwise-isolated apps (see auth_service.ensure_seed_admin). Accepts a
    valid token from EITHER app, as long as it's valid for that app and the user's role is admin.
    (Reuses oauth2_scheme_social purely for Swagger UI's "Authorize" button; token validity is
    actually checked against whichever app the token itself claims.)
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError:
        raise credentials_error from None
    app = payload.get("app")
    if payload.get("type") != "access" or app not in ("social", "smart_class"):
        raise credentials_error
    access_flag = "has_social_access" if app == "social" else "has_smart_class_access"
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_error
    user = db.get(User, int(user_id))
    if user is None or not user.is_active or not getattr(user, access_flag):
        raise credentials_error
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
