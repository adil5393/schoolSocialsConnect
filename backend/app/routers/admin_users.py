from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.deps import get_current_admin_user, get_db
from app.models.user import User
from app.schemas.admin import AdminUserCreateRequest, AdminUserOut, AdminUserUpdateRequest

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin_user)) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreateRequest, db: Session = Depends(get_db), _: User = Depends(get_current_admin_user)
) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That email/username is already in use")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        has_social_access=payload.has_social_access,
        has_smart_class_access=payload.has_smart_class_access,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int, payload: AdminUserUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == current_user.id and not payload.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't deactivate your own account")
        user.is_active = payload.is_active
    if payload.has_social_access is not None:
        user.has_social_access = payload.has_social_access
    if payload.has_smart_class_access is not None:
        user.has_smart_class_access = payload.has_smart_class_access
    if payload.password:
        user.hashed_password = hash_password(payload.password)
        user.token_version += 1  # invalidate any outstanding refresh tokens for this user

    db.commit()
    db.refresh(user)
    return user
