import httpx

from app.core.config import settings
from app.core.crypto import decrypt_token
from app.models.media_asset import MediaAsset, MediaType
from app.models.post import Post, PostTarget
from app.services import storage_service
from app.services.publishing.base import PlatformPublisher, PublishResult

GRAPH_BASE = f"https://graph.facebook.com/{settings.graph_api_version}"


class FacebookPublisher(PlatformPublisher):
    """Publishes to a Facebook Page. Uses direct binary upload (multipart) rather than the `url`
    param, so it works even when Minio is only reachable inside the docker network -- no public
    tunnel needed for Facebook, unlike Instagram.
    """

    async def publish(self, target: PostTarget, post: Post, media: list[MediaAsset]) -> PublishResult:
        account = target.social_account
        token = decrypt_token(account.access_token_encrypted)
        caption = target.caption_override or post.caption

        if not media:
            return await self._publish_text_only(account.external_id, token, caption)

        asset = media[0]
        endpoint = "videos" if asset.media_type == MediaType.video else "photos"
        file_bytes = storage_service.get_bytes(asset.object_key)
        data = {"description": caption} if endpoint == "videos" else {"caption": caption}

        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(
                    f"{GRAPH_BASE}/{account.external_id}/{endpoint}",
                    params={"access_token": token},
                    data=data,
                    files={"source": (asset.filename, file_bytes, asset.mime_type)},
                )
                response.raise_for_status()
                payload = response.json()
                return PublishResult(status="published", external_id=str(payload.get("id") or payload.get("post_id")))
            except httpx.HTTPStatusError as exc:
                return PublishResult(status="failed", error=self._extract_error(exc))
            except httpx.HTTPError as exc:
                return PublishResult(status="failed", error=str(exc))

    async def _publish_text_only(self, page_id: str, token: str, caption: str) -> PublishResult:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.post(
                    f"{GRAPH_BASE}/{page_id}/feed", params={"access_token": token}, data={"message": caption}
                )
                response.raise_for_status()
                return PublishResult(status="published", external_id=str(response.json().get("id")))
            except httpx.HTTPStatusError as exc:
                return PublishResult(status="failed", error=self._extract_error(exc))
            except httpx.HTTPError as exc:
                return PublishResult(status="failed", error=str(exc))

    @staticmethod
    def _extract_error(exc: httpx.HTTPStatusError) -> str:
        try:
            payload = exc.response.json()
            return payload.get("error", {}).get("message", str(exc))
        except ValueError:
            return str(exc)
