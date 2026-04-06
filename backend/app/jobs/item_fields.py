from backend.app.services.draft.service import infer_item_fields_from_summaries


async def run_item_field_extraction_job(
    summaries: list[str],
    preferred_fields: dict[str, str | float | None] | None = None,
) -> dict[str, str | float]:
    """Job wrapper for extracting structured item fields from image summaries."""
    return await infer_item_fields_from_summaries(
        summaries=summaries,
        preferred_fields=preferred_fields,
    )
