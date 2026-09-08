from pydantic import BaseModel, ConfigDict


class SchoolClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order: int
    subjects_count: int = 0
    chapters_count: int = 0
    resources_count: int = 0


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    chapters_count: int = 0
    resources_count: int = 0


class ChapterPartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    part_number: int
    title: str
    resources_count: int = 0
    categories_present: list[str] = []


class ChapterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order: int
    class_id: int | None = None
    subject_id: int | None = None
    topics_count: int = 0
    resources_count: int = 0
    coverage_score: int = 0
    coverage_label: str = "Needs Material"
    parts: list[ChapterPartOut] = []


class CategoryCoverageDetail(BaseModel):
    category: str
    label: str
    has_material: bool
    count: int = 0


class ChapterCoverageOut(BaseModel):
    chapter_id: int
    chapter_name: str
    order: int
    topics_count: int
    resources_count: int
    score: int  # 0 to 100
    status: str  # Excellent | Good | Needs Material | Limited
    categories: list[CategoryCoverageDetail] = []


class CurriculumCoverageOut(BaseModel):
    class_id: int
    class_name: str
    subject_id: int
    subject_name: str
    total_chapters: int
    total_topics: int
    total_resources: int
    average_score: int
    chapters: list[ChapterCoverageOut] = []


class ClassSubjectOverviewOut(BaseModel):
    class_id: int
    class_name: str
    subject_id: int
    subject_name: str
    chapters_count: int
    resources_count: int
    recent_material_title: str | None = None
    recent_material_date: str | None = None

