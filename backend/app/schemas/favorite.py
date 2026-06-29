from pydantic import BaseModel


class FavoriteList(BaseModel):
    product_ids: list[int]
    total: int
