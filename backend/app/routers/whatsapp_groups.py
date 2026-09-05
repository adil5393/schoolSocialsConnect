from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db
from app.models.user import User
from app.models.whatsapp import WhatsAppContact, WhatsAppContactGroup, WhatsAppTemplate
from app.schemas.whatsapp import (
    WhatsAppContactCreate,
    WhatsAppContactOut,
    WhatsAppGroupCreate,
    WhatsAppGroupOut,
    WhatsAppTemplateCreate,
    WhatsAppTemplateOut,
)

router = APIRouter(tags=["whatsapp"])


@router.get("/whatsapp-groups", response_model=list[WhatsAppGroupOut])
def list_groups(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[WhatsAppContactGroup]:
    return db.query(WhatsAppContactGroup).options(joinedload(WhatsAppContactGroup.contacts)).all()


@router.post("/whatsapp-groups", response_model=WhatsAppGroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: WhatsAppGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> WhatsAppContactGroup:
    group = WhatsAppContactGroup(name=payload.name, created_by_id=current_user.id)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.post("/whatsapp-groups/{group_id}/contacts", response_model=WhatsAppContactOut, status_code=status.HTTP_201_CREATED)
def add_contact(
    group_id: int, payload: WhatsAppContactCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> WhatsAppContact:
    group = db.get(WhatsAppContactGroup, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    contact = WhatsAppContact(group_id=group.id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/whatsapp-templates", response_model=list[WhatsAppTemplateOut])
def list_templates(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[WhatsAppTemplate]:
    return db.query(WhatsAppTemplate).all()


@router.post("/whatsapp-templates", response_model=WhatsAppTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: WhatsAppTemplateCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> WhatsAppTemplate:
    template = WhatsAppTemplate(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template
