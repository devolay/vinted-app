from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ItemCreateResponse(BaseModel):
    id: int
    title: str
    description: str
    price: float
    category: str
    brand: str
    condition: str
    size: str
    image_url: str
    vlm_summary: str | None
    draft_content: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemListResponse(ItemCreateResponse):
    pass
