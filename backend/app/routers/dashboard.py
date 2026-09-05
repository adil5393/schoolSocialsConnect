from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.post import Post, PostStatus, PostTarget, PostTargetStatus
from app.models.social_account import SocialAccount, SocialAccountStatus
from app.models.user import User
from app.schemas.dashboard import ActivityItem, ChannelOverview, DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> DashboardStats:
    now = datetime.now(timezone.utc)
    connected_accounts = db.query(SocialAccount).filter(SocialAccount.status == SocialAccountStatus.connected).count()
    scheduled_posts = db.query(Post).filter(Post.status == PostStatus.scheduled).count()
    posts_this_month = (
        db.query(Post)
        .filter(extract("year", Post.created_at) == now.year, extract("month", Post.created_at) == now.month)
        .count()
    )
    failed_posts = db.query(PostTarget).filter(PostTarget.status == PostTargetStatus.failed).count()
    return DashboardStats(
        connected_accounts=connected_accounts,
        scheduled_posts=scheduled_posts,
        posts_this_month=posts_this_month,
        failed_posts=failed_posts,
    )


@router.get("/activity", response_model=list[ActivityItem])
def get_activity(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ActivityItem]:
    targets = (
        db.query(PostTarget)
        .filter(PostTarget.status.in_([PostTargetStatus.published, PostTargetStatus.failed]))
        .order_by(PostTarget.published_at.desc().nullslast())
        .limit(10)
        .all()
    )
    items = []
    for target in targets:
        platform = target.social_account.platform.value.capitalize()
        if target.status == PostTargetStatus.published:
            items.append(
                ActivityItem(
                    message=f"Published to {platform}",
                    timestamp=(target.published_at or target.post.updated_at).isoformat(),
                    level="success",
                )
            )
        else:
            items.append(
                ActivityItem(
                    message=f"Failed to publish to {platform}: {target.error_message or 'unknown error'}",
                    timestamp=target.post.updated_at.isoformat(),
                    level="error",
                )
            )
    return items


@router.get("/channels", response_model=list[ChannelOverview])
def get_channels(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ChannelOverview]:
    accounts = db.query(SocialAccount).all()
    return [
        ChannelOverview(
            platform=account.platform.value,
            display_name=account.display_name,
            status=account.status.value,
            follower_count=None,
        )
        for account in accounts
    ]
