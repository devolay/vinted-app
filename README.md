# Vinted Post Automation Foundation

This repository contains a full-stack starter app:
- Backend: FastAPI + SQLAlchemy + Pydantic
- Frontend: React (Vite)
- Feature: upload image of a vintage item and generate a **dummy VLM-based** Vinted post draft

## Quick Start With Docker Compose

```bash
docker compose up --build
```

App URLs:
- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`

Stop containers:

```bash
docker compose down
```

For a clean reset including persisted DB/uploads volumes:

```bash
docker compose down -v
```

In Docker Compose mode:
- PostgreSQL data is persisted in `postgres_data`
- uploaded images are persisted in `backend_data` under `/data/uploads` inside the backend container

## 1) Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend API runs at `http://127.0.0.1:8000`.

Useful endpoints:
- `GET /health`
- `POST /api/items/draft` (multipart form with fields + image)
- `GET /api/items`
- `GET /api/items/{item_id}/image`
- `POST /api/items/{item_id}/regenerate`

## 2) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173` and talks to backend on port `8000`.

## 3) Notes on VLM integration

The backend now includes an OpenAI-based image transcription flow specialized for vintage clothing context.
Transcription job entrypoint: `backend/app/jobs/vintage_transcription.py`.
Core service: `backend/app/services/vlm.py`.

Set OpenAI variables before running backend:

```bash
export OPENAI_API_KEY=your_key_here
export OPENAI_VISION_MODEL=gpt-4.1-mini
```

Set database URL for local backend runs (outside Docker Compose):

```bash
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/vinted_app
```

If `OPENAI_API_KEY` is not set (or model call fails), the app uses a safe fallback transcription string so draft generation still works.

The first draft generation stores the VLM summary in the `items` table (`vlm_summary`).
When you call regenerate, the backend reuses this stored summary and does not call OpenAI again unless the summary is missing.

## 4) Data model

Each draft item stores:
- listing metadata (`title`, `description`, `price`, `category`, `brand`, `condition`, `size`)
- uploaded image bytes (`image_data`) and MIME type (`image_mime_type`)
- cached VLM summary (`vlm_summary`)
- generated draft content
- status and timestamp

PostgreSQL is used as the primary datastore.
