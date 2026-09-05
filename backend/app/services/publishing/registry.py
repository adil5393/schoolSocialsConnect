from app.models.social_account import Platform
from app.services.publishing.base import PlatformPublisher
from app.services.publishing.facebook_publisher import FacebookPublisher
from app.services.publishing.instagram_publisher import InstagramPublisher
from app.services.publishing.whatsapp_publisher import WhatsAppPublisher

_PUBLISHERS: dict[Platform, PlatformPublisher] = {
    Platform.facebook: FacebookPublisher(),
    Platform.instagram: InstagramPublisher(),
    Platform.whatsapp: WhatsAppPublisher(),
}


def get_publisher(platform: Platform) -> PlatformPublisher:
    return _PUBLISHERS[platform]
