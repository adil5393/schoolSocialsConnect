# Import every model here so Base.metadata is fully populated before create_all() runs in main.py.
from app.db.base_class import Base  # noqa: F401
from app.models.media_asset import MediaAsset  # noqa: F401
from app.models.post import Post, PostMedia, PostTarget  # noqa: F401
from app.models.social_account import SocialAccount  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.whatsapp import WhatsAppContact, WhatsAppContactGroup, WhatsAppTemplate  # noqa: F401
