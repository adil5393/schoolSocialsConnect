from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.curriculum import Chapter, ChapterPart


def _find_chapter(db: Session, class_id: int, subject_id: int, name: str) -> Chapter | None:
    return (
        db.query(Chapter)
        .filter(
            Chapter.class_id == class_id,
            Chapter.subject_id == subject_id,
            func.lower(Chapter.name) == name.lower(),
        )
        .first()
    )


def get_or_create_chapter(db: Session, class_id: int, subject_id: int, name: str) -> Chapter:
    """Case-insensitive get-or-create within a (class, subject) -- so "Motion"/"motion"/"MOTION"
    typed by different teachers all resolve to the same Chapter row instead of duplicating it.

    Race-safe: two concurrent requests creating the same brand-new chapter will both initially see
    "doesn't exist yet" (ordinary READ COMMITTED visibility), so the second INSERT hits the unique
    index and fails -- caught here via a savepoint (so only this insert is undone, not the caller's
    whole transaction) and resolved by just re-fetching the row the other request created.
    """
    name = name.strip()
    existing = _find_chapter(db, class_id, subject_id, name)
    if existing:
        return existing
    try:
        with db.begin_nested():
            chapter = Chapter(class_id=class_id, subject_id=subject_id, name=name, order=0)
            db.add(chapter)
            db.flush()
    except IntegrityError:
        chapter = _find_chapter(db, class_id, subject_id, name)
        if chapter is None:
            raise
    return chapter


def _find_part(db: Session, chapter_id: int, title: str) -> ChapterPart | None:
    return (
        db.query(ChapterPart)
        .filter(ChapterPart.chapter_id == chapter_id, func.lower(ChapterPart.title) == title.lower())
        .first()
    )


def get_or_create_part(db: Session, chapter_id: int, title: str, _max_attempts: int = 5) -> ChapterPart:
    """Same get-or-create + race-safety pattern as chapters, plus one extra wrinkle: two
    concurrent requests creating two DIFFERENT new parts in the same chapter can both compute the
    same next part_number (auto-numbered from the current max) and collide on
    uq_chapter_part_number even though neither title already existed. A title re-fetch alone
    wouldn't resolve that case, so it retries the number computation a few times instead.
    """
    title = title.strip()
    existing = _find_part(db, chapter_id, title)
    if existing:
        return existing

    for _ in range(_max_attempts):
        try:
            with db.begin_nested():
                max_number = (
                    db.query(func.max(ChapterPart.part_number)).filter(ChapterPart.chapter_id == chapter_id).scalar() or 0
                )
                part = ChapterPart(chapter_id=chapter_id, part_number=max_number + 1, title=title)
                db.add(part)
                db.flush()
            return part
        except IntegrityError:
            part = _find_part(db, chapter_id, title)
            if part is not None:
                return part
            # Otherwise it was a part_number collision (not a duplicate title) -- retry with a
            # freshly recomputed max_number.
    raise RuntimeError(f"Could not create part {title!r} after {_max_attempts} attempts")


def describe_location(learning_material) -> str:
    return (
        f"Class {learning_material.school_class.name} → {learning_material.subject.name} → "
        f"{learning_material.chapter.name} → {learning_material.part.title}"
    )
