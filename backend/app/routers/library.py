from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_smart_class_user, get_db
from app.models.curriculum import Chapter, ChapterPart, LearningMaterial, SchoolClass, Subject
from app.models.media_asset import MediaAsset, MediaAssetStatus, MediaType
from app.models.user import User, UserRole
from app.schemas.curriculum import ChapterOut, SchoolClassOut, SubjectOut
from app.schemas.library import MaterialOut, MaterialUpdateRequest, SaveVideoRequest, SaveVideoResponse
from app.schemas.youtube import YouTubeInfoRequest, YouTubeInfoResponse
from app.services import curriculum_service, library_service, storage_service, youtube_service
from app.services.youtube_service import YouTubeError

router = APIRouter(prefix="/library", tags=["library"])


def _require_admin(user: User) -> None:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


# Smart Class's own metadata-fetch endpoint -- deliberately NOT reusing /youtube/info (that one is
# social-scoped, see routers/youtube_downloader.py). Reuses the underlying youtube_service function
# directly instead, so a smart-class token never needs to touch a social-scoped endpoint at all.
@router.post("/video-info", response_model=YouTubeInfoResponse)
def get_video_info(payload: YouTubeInfoRequest, _: User = Depends(get_current_smart_class_user)) -> YouTubeInfoResponse:
    try:
        return youtube_service.fetch_info(payload.url)
    except YouTubeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


# --- Classes & Subjects (structural setup -- admin only to create; anyone authenticated to read) ---


@router.get("/classes", response_model=list[SchoolClassOut])
def list_classes(db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)) -> list[SchoolClass]:
    return db.query(SchoolClass).order_by(SchoolClass.order, SchoolClass.name).all()


@router.post("/classes", response_model=SchoolClassOut, status_code=status.HTTP_201_CREATED)
def create_class(name: str, order: int = 0, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)) -> SchoolClass:
    _require_admin(current_user)
    existing = db.query(SchoolClass).filter(func.lower(SchoolClass.name) == name.strip().lower()).first()
    if existing:
        return existing
    school_class = SchoolClass(name=name.strip(), order=order)
    db.add(school_class)
    db.commit()
    db.refresh(school_class)
    return school_class


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)) -> list[Subject]:
    return db.query(Subject).order_by(Subject.name).all()


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)) -> Subject:
    _require_admin(current_user)
    existing = db.query(Subject).filter(func.lower(Subject.name) == name.strip().lower()).first()
    if existing:
        return existing
    subject = Subject(name=name.strip())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


# --- Chapters (read, for the wizard's autocomplete + the library browser's drill-down) ---


@router.get("/classes/{class_id}/subjects/{subject_id}/chapters", response_model=list[ChapterOut])
def list_chapters(
    class_id: int, subject_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)
) -> list[Chapter]:
    return (
        db.query(Chapter)
        .options(joinedload(Chapter.parts))
        .filter(Chapter.class_id == class_id, Chapter.subject_id == subject_id)
        .order_by(Chapter.order, Chapter.name)
        .all()
    )


# --- Materials ---


def _material_to_out(db: Session, material: LearningMaterial) -> MaterialOut:
    asset: MediaAsset = material.media_asset
    thumbnail_url = (
        storage_service.presigned_url(asset.thumbnail_object_key, audience="browser") if asset.thumbnail_object_key else None
    )
    video_url = (
        storage_service.presigned_url(
            asset.object_key, audience="browser", expires_minutes=library_service.LIBRARY_VIDEO_URL_EXPIRES_MINUTES
        )
        if asset.status == MediaAssetStatus.ready and asset.object_key
        else None
    )
    return MaterialOut(
        id=material.id,
        media_asset_id=asset.id,
        title=material.title,
        status=asset.status.value,
        processing_stage=asset.processing_stage,
        error_message=asset.error_message,
        class_id=material.class_id,
        class_name=material.school_class.name,
        subject_id=material.subject_id,
        subject_name=material.subject.name,
        chapter_id=material.chapter_id,
        chapter_name=material.chapter.name,
        part_id=material.part_id,
        part_title=material.part.title,
        order_in_part=material.order_in_part,
        duration_seconds=asset.duration_seconds,
        thumbnail_url=thumbnail_url,
        video_url=video_url,
        created_at=material.created_at,
    )


def _load_material(db: Session, material_id: int) -> LearningMaterial:
    material = (
        db.query(LearningMaterial)
        .options(
            joinedload(LearningMaterial.media_asset),
            joinedload(LearningMaterial.school_class),
            joinedload(LearningMaterial.subject),
            joinedload(LearningMaterial.chapter),
            joinedload(LearningMaterial.part),
        )
        .filter(LearningMaterial.id == material_id)
        .first()
    )
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return material


@router.post("/materials", response_model=SaveVideoResponse, status_code=status.HTTP_201_CREATED)
def save_video(
    payload: SaveVideoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_smart_class_user),
) -> SaveVideoResponse:
    try:
        youtube_service.validate_youtube_url(payload.url)
    except YouTubeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    if db.get(SchoolClass, payload.class_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class not found")
    if db.get(Subject, payload.subject_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject not found")

    chapter = curriculum_service.get_or_create_chapter(db, payload.class_id, payload.subject_id, payload.chapter_name)
    part = curriculum_service.get_or_create_part(db, chapter.id, payload.part_title)

    video_id = library_service.extract_youtube_video_id(payload.url)
    existing_asset = None
    if video_id:
        existing_asset = (
            db.query(MediaAsset)
            .filter(
                MediaAsset.source_type == "youtube",
                MediaAsset.source_video_id == video_id,
                MediaAsset.status == MediaAssetStatus.ready,
            )
            .first()
        )

    other_locations: list[str] = []
    if existing_asset:
        prior_materials = (
            db.query(LearningMaterial)
            .options(
                joinedload(LearningMaterial.school_class),
                joinedload(LearningMaterial.subject),
                joinedload(LearningMaterial.chapter),
                joinedload(LearningMaterial.part),
            )
            .filter(LearningMaterial.media_asset_id == existing_asset.id)
            .all()
        )
        other_locations = [curriculum_service.describe_location(m) for m in prior_materials]

        next_order = (
            db.query(func.max(LearningMaterial.order_in_part)).filter(LearningMaterial.part_id == part.id).scalar() or 0
        )
        material = LearningMaterial(
            media_asset_id=existing_asset.id,
            class_id=payload.class_id,
            subject_id=payload.subject_id,
            chapter_id=chapter.id,
            part_id=part.id,
            title=payload.title,
            order_in_part=next_order + 1,
            created_by_id=current_user.id,
        )
        db.add(material)
        db.commit()
        return SaveVideoResponse(material=_material_to_out(db, _load_material(db, material.id)), reused_existing_asset=True, other_locations=other_locations)

    try:
        info = youtube_service.fetch_info(payload.url)
    except YouTubeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    asset = MediaAsset(
        filename=f"{payload.title}.mp4",
        media_type=MediaType.video,
        status=MediaAssetStatus.pending,
        duration_seconds=info.duration,
        source_url=payload.url,
        source_type="youtube",
        source_video_id=video_id,
        uploaded_by_id=current_user.id,
    )
    db.add(asset)
    db.flush()

    next_order = db.query(func.max(LearningMaterial.order_in_part)).filter(LearningMaterial.part_id == part.id).scalar() or 0
    material = LearningMaterial(
        media_asset_id=asset.id,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        chapter_id=chapter.id,
        part_id=part.id,
        title=payload.title,
        order_in_part=next_order + 1,
        created_by_id=current_user.id,
    )
    db.add(material)
    db.commit()

    background_tasks.add_task(library_service.process_library_video, asset.id)

    return SaveVideoResponse(material=_material_to_out(db, _load_material(db, material.id)), reused_existing_asset=False)


@router.get("/materials/{material_id}", response_model=MaterialOut)
def get_material(material_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)) -> MaterialOut:
    return _material_to_out(db, _load_material(db, material_id))


@router.get("/materials", response_model=list[MaterialOut])
def list_materials(
    class_id: int | None = None,
    subject_id: int | None = None,
    chapter_id: int | None = None,
    part_id: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_smart_class_user),
) -> list[MaterialOut]:
    query = db.query(LearningMaterial).options(
        joinedload(LearningMaterial.media_asset),
        joinedload(LearningMaterial.school_class),
        joinedload(LearningMaterial.subject),
        joinedload(LearningMaterial.chapter),
        joinedload(LearningMaterial.part),
    )
    if class_id is not None:
        query = query.filter(LearningMaterial.class_id == class_id)
    if subject_id is not None:
        query = query.filter(LearningMaterial.subject_id == subject_id)
    if chapter_id is not None:
        query = query.filter(LearningMaterial.chapter_id == chapter_id)
    if part_id is not None:
        query = query.filter(LearningMaterial.part_id == part_id)
    if search:
        query = query.filter(LearningMaterial.title.ilike(f"%{search}%"))
    materials = query.order_by(LearningMaterial.part_id, LearningMaterial.order_in_part).all()
    return [_material_to_out(db, m) for m in materials]


@router.patch("/materials/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: int, payload: MaterialUpdateRequest, db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)
) -> MaterialOut:
    material = _load_material(db, material_id)

    if payload.title is not None:
        material.title = payload.title
    if payload.order_in_part is not None:
        material.order_in_part = payload.order_in_part

    class_id = payload.class_id if payload.class_id is not None else material.class_id
    subject_id = payload.subject_id if payload.subject_id is not None else material.subject_id

    if payload.class_id is not None or payload.subject_id is not None:
        if db.get(SchoolClass, class_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class not found")
        if db.get(Subject, subject_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject not found")
        material.class_id = class_id
        material.subject_id = subject_id

    if payload.chapter_name is not None:
        chapter = curriculum_service.get_or_create_chapter(db, class_id, subject_id, payload.chapter_name)
        material.chapter_id = chapter.id
        if payload.part_title is not None:
            part = curriculum_service.get_or_create_part(db, chapter.id, payload.part_title)
            material.part_id = part.id
    elif payload.part_title is not None:
        part = curriculum_service.get_or_create_part(db, material.chapter_id, payload.part_title)
        material.part_id = part.id

    db.commit()
    return _material_to_out(db, _load_material(db, material_id))


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(material_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)) -> None:
    material = _load_material(db, material_id)
    media_asset_id = material.media_asset_id
    db.delete(material)
    db.commit()

    remaining = db.query(LearningMaterial).filter(LearningMaterial.media_asset_id == media_asset_id).count()
    if remaining == 0:
        asset = db.get(MediaAsset, media_asset_id)
        if asset is not None:
            if asset.object_key:
                storage_service.delete_object(asset.object_key)
            if asset.thumbnail_object_key:
                storage_service.delete_object(asset.thumbnail_object_key)
            db.delete(asset)
            db.commit()
