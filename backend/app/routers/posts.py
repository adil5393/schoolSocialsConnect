import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import SessionLocal
from app.deps import get_current_social_user, get_db
from app.models.media_asset import MediaAsset
from app.models.post import Post, PostMedia, PostStatus, PostTarget
from app.models.social_account import SocialAccount
from app.models.user import User
from app.schemas.post import MediaRef, PostCreate, PostOut, PostTargetCreate, PostTargetOut, PostUpdate, ScheduleRequest
from app.services import storage_service
from app.services.publish_orchestrator import publish_post

router = APIRouter(prefix="/posts", tags=["posts"])


def _load(db: Session, post_id: int) -> Post:
    post = (
        db.query(Post)
        .options(
            joinedload(Post.media_items).joinedload(PostMedia.media_asset),
            joinedload(Post.targets).joinedload(PostTarget.social_account),
        )
        .filter(Post.id == post_id)
        .first()
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def to_out(post: Post) -> PostOut:
    return PostOut(
        id=post.id,
        caption=post.caption,
        status=post.status,
        scheduled_at=post.scheduled_at,
        created_at=post.created_at,
        updated_at=post.updated_at,
        media=[
            MediaRef(
                id=item.media_asset.id,
                url=storage_service.presigned_url(item.media_asset.object_key, audience="browser"),
                media_type=item.media_asset.media_type.value,
            )
            for item in post.media_items
        ],
        targets=[PostTargetOut.from_orm_target(target) for target in post.targets],
    )


def _apply_media_and_targets(
    db: Session, post: Post, media_asset_ids: list[int] | None, targets_payload: list[PostTargetCreate] | None
) -> None:
    if media_asset_ids is not None:
        post.media_items.clear()
        for position, asset_id in enumerate(media_asset_ids):
            asset = db.get(MediaAsset, asset_id)
            if asset is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Media asset {asset_id} not found")
            post.media_items.append(PostMedia(media_asset_id=asset.id, position=position))

    if targets_payload is not None:
        post.targets.clear()
        for target_in in targets_payload:
            account = db.get(SocialAccount, target_in.social_account_id)
            if account is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=f"Social account {target_in.social_account_id} not found"
                )
            post.targets.append(
                PostTarget(
                    social_account_id=account.id,
                    caption_override=target_in.caption_override,
                    whatsapp_group_id=target_in.whatsapp_group_id,
                    whatsapp_template_id=target_in.whatsapp_template_id,
                )
            )


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_social_user)) -> PostOut:
    post = Post(
        caption=payload.caption,
        status=PostStatus.scheduled if payload.scheduled_at else PostStatus.draft,
        scheduled_at=payload.scheduled_at,
        created_by_id=current_user.id,
    )
    db.add(post)
    db.flush()
    _apply_media_and_targets(db, post, payload.media_asset_ids, payload.targets)
    db.commit()
    return to_out(_load(db, post.id))


@router.get("", response_model=list[PostOut])
def list_posts(status_filter: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> list[PostOut]:
    query = db.query(Post).options(
        joinedload(Post.media_items).joinedload(PostMedia.media_asset),
        joinedload(Post.targets).joinedload(PostTarget.social_account),
    )
    if status_filter and status_filter != "all":
        query = query.filter(Post.status == status_filter)
    posts = query.order_by(Post.created_at.desc()).all()
    return [to_out(post) for post in posts]


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> PostOut:
    return to_out(_load(db, post_id))


@router.patch("/{post_id}", response_model=PostOut)
def update_post(post_id: int, payload: PostUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> PostOut:
    post = _load(db, post_id)
    if payload.caption is not None:
        post.caption = payload.caption
    if payload.scheduled_at is not None:
        post.scheduled_at = payload.scheduled_at
        post.status = PostStatus.scheduled
    _apply_media_and_targets(db, post, payload.media_asset_ids, payload.targets)
    db.commit()
    return to_out(_load(db, post_id))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> None:
    post = _load(db, post_id)
    db.delete(post)
    db.commit()


@router.post("/{post_id}/schedule", response_model=PostOut)
def schedule_post(
    post_id: int, payload: ScheduleRequest, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)
) -> PostOut:
    post = _load(db, post_id)
    if not post.targets:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one platform before scheduling")
    post.scheduled_at = payload.scheduled_at
    post.status = PostStatus.scheduled
    db.commit()
    return to_out(_load(db, post_id))


def _publish_in_background(post_id: int) -> None:
    db = SessionLocal()
    try:
        post = _load(db, post_id)
        asyncio.run(publish_post(db, post))
    finally:
        db.close()


@router.post("/{post_id}/publish-now", response_model=PostOut)
def publish_now(
    post_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)
) -> PostOut:
    post = _load(db, post_id)
    if not post.targets:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one platform before publishing")

    post.status = PostStatus.publishing
    db.commit()
    background_tasks.add_task(_publish_in_background, post_id)
    return to_out(_load(db, post_id))
