from pydantic import BaseModel, ConfigDict


class SchoolClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order: int


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ChapterPartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    part_number: int
    title: str


class ChapterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order: int
    parts: list[ChapterPartOut] = []
