from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps import get_current_social_user, get_db
from app.models.media_asset import MediaAsset, MediaType
from app.models.user import User
from app.schemas.media_asset import MediaAssetOut
from app.services import storage_service

router = APIRouter(prefix="/media", tags=["media"])

_ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_ALLOWED_VIDEO = {"video/mp4", "video/quicktime"}


def _to_out(asset: MediaAsset) -> MediaAssetOut:
    return MediaAssetOut(
        id=asset.id,
        filename=asset.filename,
        media_type=asset.media_type,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
        url=storage_service.presigned_url(asset.object_key, audience="browser"),
        created_at=asset.created_at,
    )


@router.post("", response_model=MediaAssetOut, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile, db: Session = Depends(get_db), current_user: User = Depends(get_current_social_user)
) -> MediaAssetOut:
    if file.content_type in _ALLOWED_IMAGE:
        media_type = MediaType.image
    elif file.content_type in _ALLOWED_VIDEO:
        media_type = MediaType.video
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file type: {file.content_type}")

    data = await file.read()
    object_key = storage_service.build_object_key(file.filename or "upload")
    storage_service.ensure_bucket()
    storage_service.upload_bytes(object_key, data, file.content_type)

    asset = MediaAsset(
        object_key=object_key,
        bucket=settings.minio_bucket,
        filename=file.filename or object_key,
        media_type=media_type,
        mime_type=file.content_type,
        size_bytes=len(data),
        uploaded_by_id=current_user.id,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _to_out(asset)


@router.get("", response_model=list[MediaAssetOut])
def list_media(db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> list[MediaAssetOut]:
    # Excludes Smart Class Library ingestions (source_type set) -- those are a separate feature
    # with their own browser (see routers/library.py), not meant for the post composer's picker,
    # and a "pending" one wouldn't have an object_key yet to build a URL from anyway.
    assets = (
        db.query(MediaAsset)
        .filter(MediaAsset.source_type.is_(None))
        .order_by(MediaAsset.created_at.desc())
        .all()
    )
    return [_to_out(asset) for asset in assets]


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(asset_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_social_user)) -> None:
    asset = db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found")
    storage_service.delete_object(asset.object_key)
    db.delete(asset)
    db.commit()
