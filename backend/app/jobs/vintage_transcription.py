from backend.app.services.draft.service import transcribe_image_using_vlm


async def run_vintage_transcription_job(image_bytes: bytes, mime_type: str) -> str:
    """Job wrapper for image transcription so route logic stays thin."""
    return await transcribe_image_using_vlm(image_bytes=image_bytes, mime_type=mime_type)
