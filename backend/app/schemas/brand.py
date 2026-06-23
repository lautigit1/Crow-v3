from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BrandBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    logo_url: str | None = Field(default=None, max_length=500)


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(default=None, min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    logo_url: str | None = Field(default=None, max_length=500)


class BrandRead(BrandBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
