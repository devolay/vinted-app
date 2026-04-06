from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import OPENAI_API_KEY, OPENAI_VISION_MODEL
from app.services.draft.utils import image_bytes_to_data_url, mime_type_from_suffix
from app.schemas.vinted.item import ItemFieldsResponse
from app.services.draft.prompts import (
    ITEM_FIELDS_SYSTEM_PROMPT,
    ITEM_FIELDS_USER_PROMPT,
    VINTAGE_SYSTEM_PROMPT,
    VINTAGE_USER_PROMPT,
)


async def transcribe_image_using_vlm(image_path: Path) -> str:
    """Transcribe vintage clothing details from raw image bytes."""
    if not OPENAI_API_KEY:
        return (
            "OpenAI transcription fallback: API key missing. "
            "Image appears to contain a vintage clothing item; verify era, measurements, and flaws manually."
        )

    try:
        image_bytes=image_path.read_bytes()
        mime_type = mime_type_from_suffix(image_path.suffix.lower())

        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        image_data_url = image_bytes_to_data_url(image_bytes, mime_type)

        response = await client.responses.create(
            model=OPENAI_VISION_MODEL,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": VINTAGE_SYSTEM_PROMPT}],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": VINTAGE_USER_PROMPT},
                        {"type": "input_image", "image_url": image_data_url},
                    ],
                },
            ],
        )

        summary = (response.output_text or "").strip()
        if summary:
            return summary
    except Exception as e:
        print(f"Error during OpenAI transcription: {e}")

    return (
        "OpenAI transcription fallback: could not complete model call. "
        "Review garment shape, material, labels, and visible flaws manually."
    )


async def infer_item_fields_from_summaries(
    summaries: list[str],
    preferred_fields: dict[str, str | float | None] | None = None,
) -> dict[str, str | float]:
    summary_text = "\n\n".join(summary.strip() for summary in summaries if summary and summary.strip())
    if not summary_text:
        raise ValueError("No valid summaries provided for item field inference.")

    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is missing for item field inference.")

    preferred_fields = preferred_fields or {}
    preferred_text = "\n".join(
        f"- {key}: {value}"
        for key, value in preferred_fields.items()
        if value is not None and str(value).strip() != ""
    )
    if not preferred_text:
        preferred_text = "- none"

    try:
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.responses.parse(
            model=OPENAI_VISION_MODEL,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": ITEM_FIELDS_SYSTEM_PROMPT}],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                f"{ITEM_FIELDS_USER_PROMPT}\n\n"
                                f"Preferred fields:\n{preferred_text}\n\n"
                                f"Summaries:\n{summary_text}"
                            ),
                        }
                    ],
                },
            ],
            text_format=ItemFieldsResponse,
        )
        parsed = response.output_parsed

        if isinstance(parsed, ItemFieldsResponse):
            return parsed.model_dump()
        raise ValueError("Model did not return expected structured fields.")
    except Exception as e:
        raise ValueError("Failed to infer item fields from summaries.")
