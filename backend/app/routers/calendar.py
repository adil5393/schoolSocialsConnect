from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_social_user, get_db
from app.models.post import Post, PostMedia, PostTarget
from app.models.user import User
from app.routers.posts import to_out
from app.schemas.post import PostOut

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("", response_model=list[PostOut])
def get_calendar_posts(
    date_from: datetime = Query(..., alias="from"),
    date_to: datetime = Query(..., alias="to"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_social_user),
) -> list[PostOut]:
    posts = (
        db.query(Post)
        .options(
            joinedload(Post.media_items).joinedload(PostMedia.media_asset),
            joinedload(Post.targets).joinedload(PostTarget.social_account),
        )
        .filter(Post.scheduled_at.isnot(None), Post.scheduled_at >= date_from, Post.scheduled_at <= date_to)
        .order_by(Post.scheduled_at.asc())
        .all()
    )
    return [to_out(post) for post in posts]
