from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal

from app.models.media_asset import MediaAsset
from app.models.post import Post, PostTarget


@dataclass
class PublishResult:
    status: Literal["published", "pending", "failed"]
    external_id: str | None = None
    error: str | None = None


class PlatformPublisher(ABC):
    @abstractmethod
    async def publish(self, target: PostTarget, post: Post, media: list[MediaAsset]) -> PublishResult: ...
