import asyncio

import httpx

from app.core.config import settings
from app.core.crypto import decrypt_token
from app.models.media_asset import MediaAsset, MediaType
from app.models.post import Post, PostTarget
from app.services import storage_service
from app.services.publishing.base import PlatformPublisher, PublishResult

GRAPH_BASE = f"https://graph.facebook.com/{settings.graph_api_version}"

POLL_INTERVAL_SECONDS = 2
POLL_TIMEOUT_SECONDS = 60


class InstagramPublisher(PlatformPublisher):
    """Instagram Business publishing: a two-step, asynchronous container flow. Unlike Facebook,
    the /media container-creation endpoint has NO binary-upload alternative -- it only accepts
    image_url/video_url, which Meta's servers fetch themselves. That means PUBLIC_MEDIA_BASE_URL
    must be a real internet-reachable address (tunnel in dev, real domain in prod).
    """

    async def publish(self, target: PostTarget, post: Post, media: list[MediaAsset]) -> PublishResult:
        if not media:
            return PublishResult(status="failed", error="Instagram requires at least one media item")

        if not settings.public_media_base_url:
            return PublishResult(
                status="failed",
                error=(
                    "PUBLIC_MEDIA_BASE_URL is not configured. Instagram's Graph API fetches media "
                    "server-side and cannot reach a local/internal Minio -- set up a tunnel (e.g. "
                    "ngrok/Cloudflare Tunnel) pointed at Minio and set PUBLIC_MEDIA_BASE_URL."
                ),
            )

        account = target.social_account
        token = decrypt_token(account.access_token_encrypted)
        caption = target.caption_override or post.caption
        asset = media[0]
        media_url = storage_service.presigned_url(asset.object_key, audience="public")
        url_field = "video_url" if asset.media_type == MediaType.video else "image_url"

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                create_response = await client.post(
                    f"{GRAPH_BASE}/{account.external_id}/media",
                    params={
                        "access_token": token,
                        url_field: media_url,
                        "caption": caption,
                        **({"media_type": "REELS"} if asset.media_type == MediaType.video else {}),
                    },
                )
                create_response.raise_for_status()
                creation_id = create_response.json()["id"]

                if not await self._wait_until_ready(client, creation_id, token):
                    return PublishResult(
                        status="failed", error="Instagram media container did not finish processing in time"
                    )

                publish_response = await client.post(
                    f"{GRAPH_BASE}/{account.external_id}/media_publish",
                    params={"access_token": token, "creation_id": creation_id},
                )
                publish_response.raise_for_status()
                return PublishResult(status="published", external_id=str(publish_response.json().get("id")))
            except httpx.HTTPStatusError as exc:
                return PublishResult(status="failed", error=self._extract_error(exc))
            except httpx.HTTPError as exc:
                return PublishResult(status="failed", error=str(exc))

    async def _wait_until_ready(self, client: httpx.AsyncClient, creation_id: str, token: str) -> bool:
        elapsed = 0
        while elapsed < POLL_TIMEOUT_SECONDS:
            status_response = await client.get(
                f"{GRAPH_BASE}/{creation_id}", params={"access_token": token, "fields": "status_code"}
            )
            status_response.raise_for_status()
            status_code = status_response.json().get("status_code")
            if status_code == "FINISHED":
                return True
            if status_code in ("ERROR", "EXPIRED"):
                return False
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            elapsed += POLL_INTERVAL_SECONDS
        return False

    @staticmethod
    def _extract_error(exc: httpx.HTTPStatusError) -> str:
        try:
            payload = exc.response.json()
            return payload.get("error", {}).get("message", str(exc))
        except ValueError:
            return str(exc)
