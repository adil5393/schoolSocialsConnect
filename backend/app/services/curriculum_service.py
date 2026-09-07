from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.curriculum import Chapter, ChapterPart


def get_or_create_chapter(db: Session, class_id: int, subject_id: int, name: str) -> Chapter:
    """Case-insensitive get-or-create within a (class, subject) -- so "Motion"/"motion"/"MOTION"
    typed by different teachers all resolve to the same Chapter row instead of duplicating it.
    """
    name = name.strip()
    existing = (
        db.query(Chapter)
        .filter(
            Chapter.class_id == class_id,
            Chapter.subject_id == subject_id,
            func.lower(Chapter.name) == name.lower(),
        )
        .first()
    )
    if existing:
        return existing
    chapter = Chapter(class_id=class_id, subject_id=subject_id, name=name, order=0)
    db.add(chapter)
    db.flush()
    return chapter


def get_or_create_part(db: Session, chapter_id: int, title: str) -> ChapterPart:
    """Same get-or-create pattern as chapters. New parts are auto-numbered (next after the
    highest existing part_number in this chapter) so ordering stays consistent without the
    teacher having to manage numbers by hand.
    """
    title = title.strip()
    existing = (
        db.query(ChapterPart)
        .filter(ChapterPart.chapter_id == chapter_id, func.lower(ChapterPart.title) == title.lower())
        .first()
    )
    if existing:
        return existing
    max_number = db.query(func.max(ChapterPart.part_number)).filter(ChapterPart.chapter_id == chapter_id).scalar() or 0
    part = ChapterPart(chapter_id=chapter_id, part_number=max_number + 1, title=title)
    db.add(part)
    db.flush()
    return part


def describe_location(learning_material) -> str:
    return (
        f"Class {learning_material.school_class.name} → {learning_material.subject.name} → "
        f"{learning_material.chapter.name} → {learning_material.part.title}"
    )
