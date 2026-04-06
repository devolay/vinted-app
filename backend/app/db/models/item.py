from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.item_image import ItemImage


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text())
    price: Mapped[float] = mapped_column(Float())
    category: Mapped[str] = mapped_column(String(120))
    brand: Mapped[str] = mapped_column(String(120))
    condition: Mapped[str] = mapped_column(String(80))
    size: Mapped[str] = mapped_column(String(80))
    draft_content: Mapped[str] = mapped_column(Text())
    status: Mapped[str] = mapped_column(String(40), default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    images: Mapped[list["ItemImage"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )