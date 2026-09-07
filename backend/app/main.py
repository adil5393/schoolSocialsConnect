from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import SessionLocal
from app.routers import (
    admin_users,
    auth_smart_class,
    auth_social,
    calendar,
    dashboard,
    library,
    media,
    posts,
    social_accounts,
    whatsapp_groups,
    youtube_downloader,
)
from app.services import auth_service, storage_service
from app.services.scheduler_service import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic migrations now (see alembic/), run as part of the container's
    # start command -- not by create_all() here. See README/deploy notes for the one-time
    # `alembic stamp` step required on an existing database that predates Alembic.
    storage_service.ensure_bucket()
    db = SessionLocal()
    try:
        auth_service.ensure_seed_admin(db)
    finally:
        db.close()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="SchoolSocialsConnect API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_social.router)
app.include_router(auth_smart_class.router)
app.include_router(admin_users.router)
app.include_router(social_accounts.router)
app.include_router(media.router)
app.include_router(posts.router)
app.include_router(dashboard.router)
app.include_router(calendar.router)
app.include_router(whatsapp_groups.router)
app.include_router(youtube_downloader.router)
app.include_router(library.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
