from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.post import Post, PostStatus, PostTargetStatus
from app.services.publishing.registry import get_publisher


async def publish_post(db: Session, post: Post) -> None:
    """Fans a Post out to each of its PostTargets, publishing to each platform and recording a
    per-target result. Rolls the individual results up into the Post's overall status.
    """
    post.status = PostStatus.publishing
    db.commit()

    media = [item.media_asset for item in post.media_items]
    any_failed = False
    any_published = False

    for target in post.targets:
        target.status = PostTargetStatus.publishing
        target.attempt_count += 1
        db.commit()

        publisher = get_publisher(target.social_account.platform)
        result = await publisher.publish(target, post, media)

        target.external_post_id = result.external_id
        target.error_message = result.error
        if result.status == "published":
            target.status = PostTargetStatus.published
            target.published_at = datetime.now(timezone.utc)
            any_published = True
        else:
            target.status = PostTargetStatus.failed
            any_failed = True
        db.commit()

    if any_failed and any_published:
        post.status = PostStatus.partially_failed
    elif any_failed:
        post.status = PostStatus.failed
    else:
        post.status = PostStatus.published
    db.commit()
