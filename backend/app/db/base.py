# Import every model here so Base.metadata (and Alembic's autogenerate) sees the full schema.
from app.db.base_class import Base  # noqa: F401
from app.models.curriculum import Chapter, ChapterPart, LearningMaterial, SchoolClass, Subject  # noqa: F401
from app.models.media_asset import MediaAsset  # noqa: F401
from app.models.post import Post, PostMedia, PostTarget  # noqa: F401
from app.models.social_account import SocialAccount  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.whatsapp import WhatsAppContact, WhatsAppContactGroup, WhatsAppTemplate  # noqa: F401
