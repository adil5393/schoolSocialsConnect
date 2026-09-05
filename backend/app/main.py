from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import base as db_base  # noqa: F401  (registers all models on Base.metadata)
from app.db.base_class import Base
from app.db.session import engine
from app.routers import auth, calendar, dashboard, media, posts, social_accounts, whatsapp_groups
from app.services import storage_service
from app.services.scheduler_service import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    storage_service.ensure_bucket()
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

app.include_router(auth.router)
app.include_router(social_accounts.router)
app.include_router(media.router)
app.include_router(posts.router)
app.include_router(dashboard.router)
app.include_router(calendar.router)
app.include_router(whatsapp_groups.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
