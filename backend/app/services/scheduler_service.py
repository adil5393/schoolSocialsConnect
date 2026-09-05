import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.post import Post, PostStatus
from app.services.publish_orchestrator import publish_post

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _publish_due_posts() -> None:
    """Polls for scheduled posts whose time has come, rather than scheduling one APScheduler job
    per post -- this is driven entirely by DB state, so it survives backend restarts for free and
    stays correct if this service ever runs with more than one replica.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_post_ids = db.scalars(
            select(Post.id).where(Post.status == PostStatus.scheduled, Post.scheduled_at <= now)
        ).all()
        for post_id in due_post_ids:
            # Guard against double-publish if a slow run overlaps with the next tick.
            updated = db.execute(
                Post.__table__.update()
                .where(Post.id == post_id, Post.status == PostStatus.scheduled)
                .values(status=PostStatus.publishing)
            )
            db.commit()
            if updated.rowcount == 0:
                continue
            post = db.get(Post, post_id)
            try:
                await publish_post(db, post)
            except Exception:
                logger.exception("Failed to publish scheduled post %s", post_id)
    finally:
        db.close()


def start_scheduler() -> None:
    scheduler.add_job(_publish_due_posts, "interval", seconds=60, id="publish_due_posts", replace_existing=True)
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
