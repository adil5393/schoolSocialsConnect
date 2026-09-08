from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class SchoolClass(Base):
    __tablename__ = "school_classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="school_class")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Global, reusable name (e.g. "Science") -- the same subject name is shared across classes;
    # what's actually class-specific is the Chapter, not the Subject.
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="subject")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("school_classes.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        # Case-insensitive uniqueness within a (class, subject) -- prevents "Motion"/"motion"/
        # "MOTION" duplicates regardless of what a teacher types.
        Index("uq_chapter_class_subject_lower_name", "class_id", "subject_id", func.lower(name), unique=True),
    )

    school_class: Mapped["SchoolClass"] = relationship(back_populates="chapters")
    subject: Mapped["Subject"] = relationship(back_populates="chapters")
    parts: Mapped[list["ChapterPart"]] = relationship(back_populates="chapter", cascade="all, delete-orphan")


class ChapterPart(Base):
    __tablename__ = "chapter_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), nullable=False)
    part_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    __table_args__ = (UniqueConstraint("chapter_id", "part_number", name="uq_chapter_part_number"),)

    chapter: Mapped["Chapter"] = relationship(back_populates="parts")


class LearningMaterial(Base):
    """Join between a physical MediaAsset and one place it appears in the curriculum. Deliberately
    separate from MediaAsset: the same downloaded video can be assigned into multiple
    class/subject/chapter/part combinations without re-downloading or duplicating the MinIO object.
    """

    __tablename__ = "learning_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    media_asset_id: Mapped[int] = mapped_column(ForeignKey("media_assets.id"), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("school_classes.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), nullable=False)
    part_id: Mapped[int] = mapped_column(ForeignKey("chapter_parts.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_in_part: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Educational category: learn | understand | practice | reference (or specific subcategory like teacher_explanation, concept, example, practice, book_material, reference)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True, default="learn")
    # Resource type: video | pdf | audio | image | presentation | link | interactive | worksheet | question_set | teacher_explanation | book_extract
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    media_asset: Mapped["MediaAsset"] = relationship()
    school_class: Mapped["SchoolClass"] = relationship()
    subject: Mapped["Subject"] = relationship()
    chapter: Mapped["Chapter"] = relationship()
    part: Mapped["ChapterPart"] = relationship()
    created_by: Mapped["User"] = relationship()
