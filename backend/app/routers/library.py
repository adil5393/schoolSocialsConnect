import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.deps import get_current_smart_class_user, get_db
from app.models.curriculum import Chapter, ChapterPart, LearningMaterial, SchoolClass, Subject
from app.models.media_asset import MediaAsset, MediaAssetStatus, MediaType
from app.models.user import User, UserRole
from app.schemas.curriculum import (
    CategoryCoverageDetail,
    ChapterCoverageOut,
    ChapterOut,
    ChapterPartOut,
    ClassSubjectOverviewOut,
    CurriculumCoverageOut,
    SchoolClassOut,
    SubjectOut,
)
from app.schemas.library import (
    ChapterCreateRequest,
    ChapterUpdateRequest,
    ClassUpdateRequest,
    MaterialOut,
    MaterialUpdateRequest,
    PartCreateRequest,
    PartUpdateRequest,
    SaveVideoRequest,
    SaveVideoResponse,
    SubjectUpdateRequest,
)
from app.schemas.youtube import YouTubeInfoRequest, YouTubeInfoResponse
from app.services import curriculum_service, library_service, storage_service, youtube_service
from app.services.youtube_service import YouTubeError

router = APIRouter(prefix="/library", tags=["library"])

# Direct-upload counterpart to the paste-a-link flow.
UPLOAD_MEDIA_TYPES: dict[str, MediaType] = {
    "image/jpeg": MediaType.image,
    "image/png": MediaType.image,
    "image/webp": MediaType.image,
    "image/gif": MediaType.image,
    "image/svg+xml": MediaType.image,
    "video/mp4": MediaType.video,
    "video/quicktime": MediaType.video,
    "video/webm": MediaType.video,
    "video/x-matroska": MediaType.video,
    "application/pdf": MediaType.pdf,
    "application/vnd.ms-powerpoint": MediaType.document,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": MediaType.document,
    "application/msword": MediaType.document,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": MediaType.document,
}

CORE_CATEGORIES = [
    {"category": "learn", "label": "Learn & Concept Explanations"},
    {"category": "understand", "label": "Understand & Worked Examples"},
    {"category": "practice", "label": "Practice, NCERT & Worksheets"},
    {"category": "reference", "label": "Reference Notes & Diagrams"},
]


def _require_admin(user: User) -> None:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.post("/video-info", response_model=YouTubeInfoResponse)
def get_video_info(payload: YouTubeInfoRequest, _: User = Depends(get_current_smart_class_user)) -> YouTubeInfoResponse:
    try:
        return youtube_service.fetch_info(payload.url)
    except YouTubeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


# --- Classes & Subjects ---


@router.get("/classes", response_model=list[SchoolClassOut])
def list_classes(db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)) -> list[SchoolClassOut]:
    classes = db.query(SchoolClass).order_by(SchoolClass.order, SchoolClass.name).all()
    results = []
    for c in classes:
        chap_count = db.query(func.count(Chapter.id)).filter(Chapter.class_id == c.id).scalar() or 0
        mat_count = db.query(func.count(LearningMaterial.id)).filter(LearningMaterial.class_id == c.id).scalar() or 0
        results.append(
            SchoolClassOut(
                id=c.id,
                name=c.name,
                order=c.order,
                chapters_count=chap_count,
                resources_count=mat_count,
            )
        )
    return results


@router.post("/classes", response_model=SchoolClassOut, status_code=status.HTTP_201_CREATED)
def create_class(
    name: str, order: int = 0, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> SchoolClassOut:
    _require_admin(current_user)
    existing = db.query(SchoolClass).filter(func.lower(SchoolClass.name) == name.strip().lower()).first()
    if existing:
        return SchoolClassOut(id=existing.id, name=existing.name, order=existing.order)
    school_class = SchoolClass(name=name.strip(), order=order)
    db.add(school_class)
    db.commit()
    db.refresh(school_class)
    return SchoolClassOut(id=school_class.id, name=school_class.name, order=school_class.order)


@router.patch("/classes/{class_id}", response_model=SchoolClassOut)
def update_class(
    class_id: int, payload: ClassUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> SchoolClassOut:
    _require_admin(current_user)
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if payload.name is not None:
        school_class.name = payload.name.strip()
    if payload.order is not None:
        school_class.order = payload.order
    db.commit()
    return SchoolClassOut(id=school_class.id, name=school_class.name, order=school_class.order)


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> None:
    _require_admin(current_user)
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    db.delete(school_class)
    db.commit()


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)) -> list[SubjectOut]:
    subjects = db.query(Subject).order_by(Subject.name).all()
    results = []
    for s in subjects:
        chap_count = db.query(func.count(Chapter.id)).filter(Chapter.subject_id == s.id).scalar() or 0
        mat_count = db.query(func.count(LearningMaterial.id)).filter(LearningMaterial.subject_id == s.id).scalar() or 0
        results.append(
            SubjectOut(
                id=s.id,
                name=s.name,
                chapters_count=chap_count,
                resources_count=mat_count,
            )
        )
    return results


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> SubjectOut:
    _require_admin(current_user)
    existing = db.query(Subject).filter(func.lower(Subject.name) == name.strip().lower()).first()
    if existing:
        return SubjectOut(id=existing.id, name=existing.name)
    subject = Subject(name=name.strip())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectOut(id=subject.id, name=subject.name)


@router.patch("/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int, payload: SubjectUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> SubjectOut:
    _require_admin(current_user)
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if payload.name is not None:
        subject.name = payload.name.strip()
    db.commit()
    return SubjectOut(id=subject.id, name=subject.name)


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> None:
    _require_admin(current_user)
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    db.delete(subject)
    db.commit()


# --- Chapters & Topics ---


@router.get("/classes/{class_id}/subjects/{subject_id}/chapters", response_model=list[ChapterOut])
def list_chapters(
    class_id: int, subject_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)
) -> list[ChapterOut]:
    chapters = (
        db.query(Chapter)
        .options(joinedload(Chapter.parts))
        .filter(Chapter.class_id == class_id, Chapter.subject_id == subject_id)
        .order_by(Chapter.order, Chapter.name)
        .all()
    )

    out = []
    for chap in chapters:
        # Count materials in this chapter
        chap_mat_count = (
            db.query(func.count(LearningMaterial.id)).filter(LearningMaterial.chapter_id == chap.id).scalar() or 0
        )
        parts_out = []
        categories_in_chap = set()
        for p in sorted(chap.parts, key=lambda x: x.part_number):
            p_mat_count = (
                db.query(func.count(LearningMaterial.id)).filter(LearningMaterial.part_id == p.id).scalar() or 0
            )
            # Find distinct categories in this part
            cats = (
                db.query(LearningMaterial.category)
                .filter(LearningMaterial.part_id == p.id)
                .distinct()
                .all()
            )
            p_cats = [c[0] for c in cats if c[0]]
            for c in p_cats:
                categories_in_chap.add(c.lower())
            parts_out.append(
                ChapterPartOut(
                    id=p.id,
                    part_number=p.part_number,
                    title=p.title,
                    resources_count=p_mat_count,
                    categories_present=p_cats,
                )
            )

        # Compute coverage score
        cat_count = len(categories_in_chap)
        score = min(100, int((cat_count / max(1, 4)) * 100)) if chap_mat_count > 0 else 0
        if score >= 75:
            label = "Excellent"
        elif score >= 50:
            label = "Good"
        elif chap_mat_count > 0:
            label = "Needs Material"
        else:
            label = "Limited"

        out.append(
            ChapterOut(
                id=chap.id,
                name=chap.name,
                order=chap.order,
                class_id=chap.class_id,
                subject_id=chap.subject_id,
                topics_count=len(chap.parts),
                resources_count=chap_mat_count,
                coverage_score=score,
                coverage_label=label,
                parts=parts_out,
            )
        )
    return out


@router.post("/chapters", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def create_chapter(
    payload: ChapterCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> ChapterOut:
    chapter = curriculum_service.get_or_create_chapter(db, payload.class_id, payload.subject_id, payload.name)
    if payload.order:
        chapter.order = payload.order
        db.commit()
    return ChapterOut(
        id=chapter.id,
        name=chapter.name,
        order=chapter.order,
        class_id=chapter.class_id,
        subject_id=chapter.subject_id,
        topics_count=0,
        resources_count=0,
        parts=[],
    )


@router.patch("/chapters/{chapter_id}", response_model=ChapterOut)
def update_chapter(
    chapter_id: int, payload: ChapterUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> ChapterOut:
    chapter = db.query(Chapter).options(joinedload(Chapter.parts)).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    if payload.name is not None:
        chapter.name = payload.name.strip()
    if payload.order is not None:
        chapter.order = payload.order
    db.commit()
    return ChapterOut(
        id=chapter.id,
        name=chapter.name,
        order=chapter.order,
        class_id=chapter.class_id,
        subject_id=chapter.subject_id,
        topics_count=len(chapter.parts),
        resources_count=0,
        parts=[ChapterPartOut(id=p.id, part_number=p.part_number, title=p.title) for p in chapter.parts],
    )


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(
    chapter_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> None:
    _require_admin(current_user)
    chapter = db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    db.delete(chapter)
    db.commit()


@router.post("/parts", response_model=ChapterPartOut, status_code=status.HTTP_201_CREATED)
def create_part(
    payload: PartCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> ChapterPartOut:
    part = curriculum_service.get_or_create_part(db, payload.chapter_id, payload.title)
    if payload.part_number is not None:
        part.part_number = payload.part_number
        db.commit()
    return ChapterPartOut(id=part.id, part_number=part.part_number, title=part.title, resources_count=0)


@router.patch("/parts/{part_id}", response_model=ChapterPartOut)
def update_part(
    part_id: int, payload: PartUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> ChapterPartOut:
    part = db.get(ChapterPart, part_id)
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic / part not found")
    if payload.title is not None:
        part.title = payload.title.strip()
    if payload.part_number is not None:
        part.part_number = payload.part_number
    db.commit()
    return ChapterPartOut(id=part.id, part_number=part.part_number, title=part.title, resources_count=0)


@router.delete("/parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(
    part_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_smart_class_user)
) -> None:
    _require_admin(current_user)
    part = db.get(ChapterPart, part_id)
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic / part not found")
    db.delete(part)
    db.commit()


# --- Materials Helper ---


def _material_to_out(db: Session, material: LearningMaterial) -> MaterialOut:
    asset: MediaAsset = material.media_asset
    thumbnail_url = (
        storage_service.presigned_url(asset.thumbnail_object_key, audience="browser") if asset and asset.thumbnail_object_key else None
    )
    file_url = (
        storage_service.presigned_url(
            asset.object_key, audience="browser", expires_minutes=library_service.LIBRARY_VIDEO_URL_EXPIRES_MINUTES
        )
        if asset and asset.status == MediaAssetStatus.ready and asset.object_key
        else (asset.source_url if asset and asset.source_type == "link" else None)
    )
    
    category = getattr(material, "category", None) or "learn"
    resource_type = getattr(material, "resource_type", None) or (asset.media_type.value if asset else "video")
    description = getattr(material, "description", None)
    source = getattr(material, "source", None) or (asset.source_type if asset else None)
    tags = getattr(material, "tags", None)
    created_by_id = material.created_by_id
    created_by_name = material.created_by.full_name if material.created_by else None

    return MaterialOut(
        id=material.id,
        media_asset_id=asset.id if asset else 0,
        title=material.title,
        media_type=asset.media_type.value if asset else "video",
        status=asset.status.value if asset else "ready",
        processing_stage=asset.processing_stage if asset else None,
        error_message=asset.error_message if asset else None,
        class_id=material.class_id,
        class_name=material.school_class.name,
        subject_id=material.subject_id,
        subject_name=material.subject.name,
        chapter_id=material.chapter_id,
        chapter_name=material.chapter.name,
        part_id=material.part_id,
        part_title=material.part.title,
        order_in_part=material.order_in_part,
        category=category,
        resource_type=resource_type,
        description=description,
        source=source,
        tags=tags,
        created_by_id=created_by_id,
        created_by_name=created_by_name,
        duration_seconds=asset.duration_seconds if asset else None,
        thumbnail_url=thumbnail_url,
        file_url=file_url,
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
            joinedload(LearningMaterial.created_by),
        )
        .filter(LearningMaterial.id == material_id)
        .first()
    )
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return material


# --- Save & Ingest Material ---


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
            category=payload.category or "learn",
            resource_type=payload.resource_type or "video",
            description=payload.description,
            source=payload.source or "YouTube",
            tags=payload.tags,
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
        category=payload.category or "learn",
        resource_type=payload.resource_type or "video",
        description=payload.description,
        source=payload.source or "YouTube",
        tags=payload.tags,
        created_by_id=current_user.id,
    )
    db.add(material)
    db.commit()

    background_tasks.add_task(library_service.process_library_video, asset.id)

    return SaveVideoResponse(material=_material_to_out(db, _load_material(db, material.id)), reused_existing_asset=False)


@router.post("/materials/upload", response_model=SaveVideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_material(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=255),
    class_id: int = Form(...),
    subject_id: int = Form(...),
    chapter_name: str = Form(..., min_length=1, max_length=255),
    part_title: str = Form(..., min_length=1, max_length=255),
    category: str = Form(default="learn"),
    resource_type: str | None = Form(default=None),
    description: str | None = Form(default=None),
    source: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_smart_class_user),
) -> SaveVideoResponse:
    media_type = UPLOAD_MEDIA_TYPES.get(file.content_type)
    if media_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Supported: images, PDF, documents, and videos.",
        )

    if db.get(SchoolClass, class_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class not found")
    if db.get(Subject, subject_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject not found")

    data = await file.read()
    max_bytes = settings.youtube_download_max_file_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.youtube_download_max_file_mb}MB limit",
        )

    chapter = curriculum_service.get_or_create_chapter(db, class_id, subject_id, chapter_name)
    part = curriculum_service.get_or_create_part(db, chapter.id, part_title)

    is_video = media_type == MediaType.video
    asset = MediaAsset(
        filename=file.filename or title,
        media_type=media_type,
        mime_type=file.content_type,
        size_bytes=len(data),
        source_type="upload",
        uploaded_by_id=current_user.id,
        status=MediaAssetStatus.pending if is_video else MediaAssetStatus.ready,
    )
    db.add(asset)
    db.flush()

    res_type = resource_type or media_type.value
    next_order = db.query(func.max(LearningMaterial.order_in_part)).filter(LearningMaterial.part_id == part.id).scalar() or 0
    material = LearningMaterial(
        media_asset_id=asset.id,
        class_id=class_id,
        subject_id=subject_id,
        chapter_id=chapter.id,
        part_id=part.id,
        title=title,
        order_in_part=next_order + 1,
        category=category,
        resource_type=res_type,
        description=description,
        source=source or "Teacher Upload",
        tags=tags,
        created_by_id=current_user.id,
    )
    db.add(material)

    if is_video:
        db.commit()
        scratch_dir = library_service.create_scratch_dir()
        temp_path = scratch_dir / (file.filename or "upload.mp4")
        temp_path.write_bytes(data)
        background_tasks.add_task(library_service.process_uploaded_video, asset.id, str(temp_path), str(scratch_dir))
    else:
        object_key = f"materials/{asset.id}/{uuid.uuid4().hex}_{file.filename or 'file'}"
        storage_service.upload_bytes(object_key, data, file.content_type)
        asset.object_key = object_key
        asset.bucket = settings.minio_bucket
        db.commit()

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
    category: str | None = None,
    resource_type: str | None = None,
    teacher_id: int | None = None,
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
        joinedload(LearningMaterial.created_by),
    )
    if class_id is not None:
        query = query.filter(LearningMaterial.class_id == class_id)
    if subject_id is not None:
        query = query.filter(LearningMaterial.subject_id == subject_id)
    if chapter_id is not None:
        query = query.filter(LearningMaterial.chapter_id == chapter_id)
    if part_id is not None:
        query = query.filter(LearningMaterial.part_id == part_id)
    if category is not None and category != "all":
        query = query.filter(func.lower(LearningMaterial.category) == category.lower())
    if resource_type is not None and resource_type != "all":
        query = query.filter(func.lower(LearningMaterial.resource_type) == resource_type.lower())
    if teacher_id is not None:
        query = query.filter(LearningMaterial.created_by_id == teacher_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (LearningMaterial.title.ilike(s))
            | (LearningMaterial.description.ilike(s))
            | (LearningMaterial.tags.ilike(s))
            | (LearningMaterial.source.ilike(s))
        )
    materials = query.order_by(LearningMaterial.part_id, LearningMaterial.order_in_part, LearningMaterial.created_at.desc()).all()
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
    if payload.category is not None:
        material.category = payload.category
    if payload.resource_type is not None:
        material.resource_type = payload.resource_type
    if payload.description is not None:
        material.description = payload.description
    if payload.source is not None:
        material.source = payload.source
    if payload.tags is not None:
        material.tags = payload.tags

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


# --- Content Coverage & Overview ---


@router.get("/coverage", response_model=CurriculumCoverageOut)
def get_curriculum_coverage(
    class_id: int, subject_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)
) -> CurriculumCoverageOut:
    school_class = db.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    chapters = (
        db.query(Chapter)
        .options(joinedload(Chapter.parts))
        .filter(Chapter.class_id == class_id, Chapter.subject_id == subject_id)
        .order_by(Chapter.order, Chapter.name)
        .all()
    )

    chapters_coverage = []
    total_resources = 0
    total_topics = 0
    scores = []

    for chap in chapters:
        topics_count = len(chap.parts)
        total_topics += topics_count
        mat_count = (
            db.query(func.count(LearningMaterial.id)).filter(LearningMaterial.chapter_id == chap.id).scalar() or 0
        )
        total_resources += mat_count

        cat_details = []
        present_count = 0
        for cat in CORE_CATEGORIES:
            c_count = (
                db.query(func.count(LearningMaterial.id))
                .filter(
                    LearningMaterial.chapter_id == chap.id,
                    func.lower(LearningMaterial.category) == cat["category"].lower(),
                )
                .scalar()
                or 0
            )
            has_mat = c_count > 0
            if has_mat:
                present_count += 1
            cat_details.append(
                CategoryCoverageDetail(
                    category=cat["category"],
                    label=cat["label"],
                    has_material=has_mat,
                    count=c_count,
                )
            )

        chap_score = min(100, int((present_count / len(CORE_CATEGORIES)) * 100)) if mat_count > 0 else 0
        scores.append(chap_score)

        if chap_score >= 80:
            status_text = "Excellent"
        elif chap_score >= 60:
            status_text = "Good"
        elif mat_count > 0:
            status_text = "Needs Material"
        else:
            status_text = "Limited"

        chapters_coverage.append(
            ChapterCoverageOut(
                chapter_id=chap.id,
                chapter_name=chap.name,
                order=chap.order,
                topics_count=topics_count,
                resources_count=mat_count,
                score=chap_score,
                status=status_text,
                categories=cat_details,
            )
        )

    avg_score = int(sum(scores) / len(scores)) if scores else 0

    return CurriculumCoverageOut(
        class_id=school_class.id,
        class_name=school_class.name,
        subject_id=subject.id,
        subject_name=subject.name,
        total_chapters=len(chapters),
        total_topics=total_topics,
        total_resources=total_resources,
        average_score=avg_score,
        chapters=chapters_coverage,
    )


@router.get("/overview", response_model=list[ClassSubjectOverviewOut])
def get_classes_overview(
    db: Session = Depends(get_db), _: User = Depends(get_current_smart_class_user)
) -> list[ClassSubjectOverviewOut]:
    classes = db.query(SchoolClass).order_by(SchoolClass.order).all()
    subjects = db.query(Subject).order_by(Subject.name).all()

    overview = []
    for c in classes:
        for s in subjects:
            chap_count = (
                db.query(func.count(Chapter.id))
                .filter(Chapter.class_id == c.id, Chapter.subject_id == s.id)
                .scalar()
                or 0
            )
            mat_count = (
                db.query(func.count(LearningMaterial.id))
                .filter(LearningMaterial.class_id == c.id, LearningMaterial.subject_id == s.id)
                .scalar()
                or 0
            )
            latest = (
                db.query(LearningMaterial)
                .filter(LearningMaterial.class_id == c.id, LearningMaterial.subject_id == s.id)
                .order_by(LearningMaterial.created_at.desc())
                .first()
            )
            # Only include cards where either chapters or materials exist, or standard pairs
            if chap_count > 0 or mat_count > 0 or c.order < 5:
                overview.append(
                    ClassSubjectOverviewOut(
                        class_id=c.id,
                        class_name=c.name,
                        subject_id=s.id,
                        subject_name=s.name,
                        chapters_count=chap_count,
                        resources_count=mat_count,
                        recent_material_title=latest.title if latest else None,
                        recent_material_date=latest.created_at.isoformat() if latest else None,
                    )
                )

    return overview

