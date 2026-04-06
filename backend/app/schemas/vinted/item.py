from typing import Literal

from pydantic import BaseModel, Field

ItemCondition = Literal["New", "Like new", "Very good", "Good", "Satisfactory"]


class ItemFieldsResponse(BaseModel):
    title: str = Field(
        description="Short marketplace-ready title with key attributes (type, style, and notable detail) without unsupported claims."
    )
    description: str = Field(
        description="Concise listing description based only on visible evidence, including style cues, material clues, and visible flaws when present."
    )
    price: float = Field(
        description="Numeric asking price in local currency units as a plain number only (no currency symbol).",
        ge=0,
    )
    category: str = Field(
        description="Best-fit Vinted category label for the item, chosen conservatively from visible evidence."
    )
    brand: str = Field(
        description="Brand name visible in labels or recognizable marks; use 'Unknown' when not visible or uncertain."
    )
    condition: ItemCondition = Field(
        description=(
            "Item condition limited to one of: New, Like new, Very good, Good, Satisfactory. "
            "Choose the most conservative option based on visible wear."
        )
    )
    size: str = Field(
        description="Visible labeled size if present; otherwise a cautious estimate such as S, M, L or 'Unknown'."
    )