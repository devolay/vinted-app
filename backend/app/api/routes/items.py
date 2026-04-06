from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.item import Item
from app.db.models.item_image import ItemImage
from app.db.session import get_db
from app.jobs.item_fields import run_item_field_extraction_job
from app.jobs.vintage_transcription import run_vintage_transcription_job
from app.schemas.item import ItemCreateResponse, ItemListResponse
from app.services.posting import mark_item_sold, schedule_item_post

router = APIRouter()


def _combined_summary(images: list[ItemImage]) -> str | None:
    summaries = [image.summary.strip() for image in images if image.summary and image.summary.strip()]
    if not summaries:
        return None
    return "\n\n".join(f"Image {index}: {summary}" for index, summary in enumerate(summaries, start=1))


def _to_response(item: Item, images: list[ItemImage] | None = None) -> ItemCreateResponse:
    linked_images = images if images is not None else item.images
    primary_image = linked_images[0] if linked_images else None

    if primary_image and primary_image.image_data:
        image_url = f"/api/items/{item.id}/image"
    else:
        image_name = "placeholder.jpg"
        if primary_image and primary_image.image_path:
            image_name = Path(primary_image.image_path).name
        image_url = f"/uploads/{image_name}"

    return ItemCreateResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        price=item.price,
        category=item.category,
        brand=item.brand,
        condition=item.condition,
        size=item.size,
        image_url=image_url,
        vlm_summary=_combined_summary(linked_images),
        draft_content=item.draft_content,
        status=item.status,
        created_at=item.created_at,
    )


@router.post("/draft", response_model=ItemCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_item_draft(
    images: list[UploadFile] | None = File(None),
    db: AsyncSession = Depends(get_db),
) -> ItemCreateResponse:
    if not images:
        raise HTTPException(status_code=400, detail="At least one image file is required.")

    image_payloads: list[dict[str, str | bytes]] = []
    for uploaded_image in images:
        if not uploaded_image.content_type or not uploaded_image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed.")

        image_bytes = await uploaded_image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")

        image_payloads.append(
            {
                "bytes": image_bytes,
                "name": uploaded_image.filename or "upload.jpg",
                "mime_type": uploaded_image.content_type or "image/jpeg",
            }
        )

    created_images: list[ItemImage] = []
    image_summaries: list[str] = []
    for payload in image_payloads:
        image_name = str(payload["name"])
        image_mime_type = str(payload["mime_type"])
        image_bytes = bytes(payload["bytes"])
        visual_transcription = await run_vintage_transcription_job(image_bytes, image_mime_type)
        image_summaries.append(visual_transcription)

        created_images.append(
            ItemImage(
                image_path=image_name,
                image_data=image_bytes,
                image_mime_type=image_mime_type,
                image_filename=image_name,
                summary=visual_transcription,
            )
        )

    resolved = await run_item_field_extraction_job(image_summaries)

    draft_content = str(resolved["draft_content"])

    item = Item(
        title=str(resolved["title"]),
        description=str(resolved["description"]),
        price=float(resolved["price"]),
        category=str(resolved["category"]),
        brand=str(resolved["brand"]),
        condition=str(resolved["condition"]),
        size=str(resolved["size"]),
        draft_content=draft_content,
        status="draft",
    )

    db.add(item)
    await db.flush()

    for item_image in created_images:
        item_image.item_id = item.id
        db.add(item_image)

    await db.commit()
    await db.refresh(item)

    return _to_response(item, created_images)


@router.get("", response_model=list[ItemListResponse])
async def list_items(db: AsyncSession = Depends(get_db)) -> list[ItemListResponse]:
    result = await db.execute(select(Item).options(selectinload(Item.images)).order_by(desc(Item.created_at)))
    items = result.scalars().all()
    return [_to_response(item) for item in items]


@router.get("/{item_id}/image")
async def get_item_image(item_id: int, db: AsyncSession = Depends(get_db)) -> Response:
    item_image_result = await db.execute(
        select(ItemImage).where(ItemImage.item_id == item_id).order_by(ItemImage.id)
    )
    item_image = item_image_result.scalars().first()
    if item_image is None:
        raise HTTPException(status_code=404, detail="Item not found.")
    if not item_image.image_data:
        raise HTTPException(status_code=404, detail="Image not found for item.")

    return Response(content=item_image.image_data, media_type=item_image.image_mime_type or "image/jpeg")


@router.post("/{item_id}/regenerate", response_model=ItemCreateResponse)
async def regenerate_item_draft(item_id: int, db: AsyncSession = Depends(get_db)) -> ItemCreateResponse:
    item = await db.get(Item, item_id, options=(selectinload(Item.images),))
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")

    item_images = item.images
    if not item_images:
        raise HTTPException(status_code=404, detail="Image not found for item.")

    image_summaries: list[str] = []
    for item_image in item_images:
        if not item_image.summary:
            if item_image.image_data:
                item_image.summary = await run_vintage_transcription_job(
                    item_image.image_data,
                    item_image.image_mime_type or "image/jpeg",
                )
            else:
                item_image.summary = (
                    "No stored VLM summary and image bytes are unavailable for this image. "
                    "Please upload a new image to regenerate with vision context."
                )

        image_summaries.append(item_image.summary)

    resolved = await run_item_field_extraction_job(image_summaries)

    item.title = str(resolved["title"])
    item.description = str(resolved["description"])
    item.price = float(resolved["price"])
    item.category = str(resolved["category"])
    item.brand = str(resolved["brand"])
    item.condition = str(resolved["condition"])
    item.size = str(resolved["size"])
    item.draft_content = str(resolved["draft_content"])

    await db.commit()
    await db.refresh(item)
    return _to_response(item, item_images)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int, db: AsyncSession = Depends(get_db)) -> None:
    item = await db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")

    await db.delete(item)
    await db.commit()


@router.post("/{item_id}/schedule", response_model=ItemCreateResponse)
async def schedule_item(item_id: int, db: AsyncSession = Depends(get_db)) -> ItemCreateResponse:
    item = await db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")

    scheduled = schedule_item_post(item)
    item_images_result = await db.execute(
        select(ItemImage).where(ItemImage.item_id == item_id).order_by(ItemImage.id)
    )
    item_images = item_images_result.scalars().all()
    await db.commit()
    await db.refresh(scheduled)

    return _to_response(scheduled, item_images)


@router.post("/{item_id}/sold", response_model=ItemCreateResponse)
async def sell_item(item_id: int, db: AsyncSession = Depends(get_db)) -> ItemCreateResponse:
    item = await db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")

    sold = mark_item_sold(item)
    item_images_result = await db.execute(
        select(ItemImage).where(ItemImage.item_id == item_id).order_by(ItemImage.id)
    )
    item_images = item_images_result.scalars().all()
    await db.commit()
    await db.refresh(sold)

    return _to_response(sold, item_images)
