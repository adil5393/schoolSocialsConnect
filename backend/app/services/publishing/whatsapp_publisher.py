import httpx

from app.core.config import settings
from app.core.crypto import decrypt_token
from app.models.media_asset import MediaAsset, MediaType
from app.models.post import Post, PostTarget
from app.services import storage_service
from app.services.publishing.base import PlatformPublisher, PublishResult

GRAPH_BASE = f"https://graph.facebook.com/{settings.graph_api_version}"


class WhatsAppPublisher(PlatformPublisher):
    """Broadcasts to a saved contact group via the WhatsApp Cloud API. WhatsApp has no public-feed
    concept and no native "broadcast" primitive -- this loops one `messages` call per contact.
    Outbound business-initiated messages outside a user's 24h session window MUST use an
    approved Message Template, so free-form captions are not supported here by design.
    """

    async def publish(self, target: PostTarget, post: Post, media: list[MediaAsset]) -> PublishResult:
        account = target.social_account
        token = decrypt_token(account.access_token_encrypted)

        if target.whatsapp_group_id is None:
            return PublishResult(status="failed", error="No WhatsApp broadcast group selected for this target")
        if target.whatsapp_template_id is None:
            return PublishResult(
                status="failed",
                error=(
                    "WhatsApp requires an approved message template -- free-form messages only reach "
                    "contacts inside an active 24h session window"
                ),
            )

        # Deferred import: keeps a DB session dependency out of module import time.
        from app.db.session import SessionLocal
        from app.models.whatsapp import WhatsAppContactGroup, WhatsAppTemplate

        db = SessionLocal()
        try:
            group = db.get(WhatsAppContactGroup, target.whatsapp_group_id)
            template = db.get(WhatsAppTemplate, target.whatsapp_template_id)
            contacts = list(group.contacts) if group else []
        finally:
            db.close()

        if group is None or template is None:
            return PublishResult(status="failed", error="WhatsApp group or template not found")

        async with httpx.AsyncClient(timeout=60) as client:
            media_id = None
            if media:
                asset = media[0]
                file_bytes = storage_service.get_bytes(asset.object_key)
                try:
                    upload_response = await client.post(
                        f"{GRAPH_BASE}/{account.external_id}/media",
                        params={"access_token": token},
                        data={"messaging_product": "whatsapp"},
                        files={"file": (asset.filename, file_bytes, asset.mime_type)},
                    )
                    upload_response.raise_for_status()
                    media_id = upload_response.json()["id"]
                except httpx.HTTPStatusError as exc:
                    return PublishResult(status="failed", error=self._extract_error(exc))
                except httpx.HTTPError as exc:
                    return PublishResult(status="failed", error=str(exc))

            header_media_type = "video" if media and media[0].media_type == MediaType.video else "image"
            components = []
            if template.has_media_header and media_id:
                components.append(
                    {"type": "header", "parameters": [{"type": header_media_type, header_media_type: {"id": media_id}}]}
                )

            failures: list[str] = []
            last_message_id = None
            for contact in contacts:
                if not contact.opted_in:
                    continue
                try:
                    send_response = await client.post(
                        f"{GRAPH_BASE}/{account.external_id}/messages",
                        params={"access_token": token},
                        json={
                            "messaging_product": "whatsapp",
                            "to": contact.phone_number,
                            "type": "template",
                            "template": {
                                "name": template.name,
                                "language": {"code": template.language_code},
                                "components": components,
                            },
                        },
                    )
                    send_response.raise_for_status()
                    last_message_id = send_response.json().get("messages", [{}])[0].get("id")
                except httpx.HTTPStatusError as exc:
                    failures.append(f"{contact.phone_number}: {self._extract_error(exc)}")
                except httpx.HTTPError as exc:
                    failures.append(f"{contact.phone_number}: {exc}")

            if failures and last_message_id is None:
                return PublishResult(status="failed", error="; ".join(failures[:5]))
            if failures:
                return PublishResult(
                    status="published",
                    external_id=last_message_id,
                    error=f"Sent with {len(failures)} failure(s): " + "; ".join(failures[:5]),
                )
            return PublishResult(status="published", external_id=last_message_id)

    @staticmethod
    def _extract_error(exc: httpx.HTTPStatusError) -> str:
        try:
            payload = exc.response.json()
            return payload.get("error", {}).get("message", str(exc))
        except ValueError:
            return str(exc)
