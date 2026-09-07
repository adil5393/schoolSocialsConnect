from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.crypto import encrypt_token
from app.deps import get_current_social_user, get_db
from app.models.social_account import SocialAccount, SocialAccountStatus
from app.models.user import User
from app.schemas.social_account import SocialAccountCreate, SocialAccountOut

router = APIRouter(prefix="/social-accounts", tags=["social-accounts"])


@router.get("", response_model=list[SocialAccountOut])
def list_accounts(db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> list[SocialAccount]:
    return db.query(SocialAccount).order_by(SocialAccount.created_at.desc()).all()


@router.post("", response_model=SocialAccountOut, status_code=status.HTTP_201_CREATED)
def add_account(
    payload: SocialAccountCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_social_user)
) -> SocialAccount:
    account = SocialAccount(
        platform=payload.platform,
        display_name=payload.display_name,
        external_id=payload.external_id,
        access_token_encrypted=encrypt_token(payload.access_token),
        status=SocialAccountStatus.connected,
        connected_by_id=current_user.id,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.post("/{account_id}/reconnect", response_model=SocialAccountOut)
def reconnect_account(
    account_id: int, payload: SocialAccountCreate, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)
) -> SocialAccount:
    account = db.get(SocialAccount, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Social account not found")
    account.access_token_encrypted = encrypt_token(payload.access_token)
    account.external_id = payload.external_id
    account.display_name = payload.display_name
    account.status = SocialAccountStatus.connected
    account.last_error = None
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_account(account_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> None:
    account = db.get(SocialAccount, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Social account not found")
    account.status = SocialAccountStatus.disconnected
    db.commit()
