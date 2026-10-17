# EasyStudy recorder
Small separate Cloudflare Worker (name `easystudy-recorder`, root directory `recorder`). Serves the Arabic recording page from `public/` and keeps recordings in a KV namespace (binding `REC`, auto-created on first deploy).
- Password: whoever opens the page first chooses it (stored hashed in KV).
- `public/items.json` = word/question list (tools/ar-library/build_data.py, written with `--worker`); `public/needed.json` = empty slots Claude adds for Ahmed to record (list at the top of the page).
- Pull recordings: `GET /api/export` with header `x-pw: <password>` -> JSON that tools/ar-library/import_recordings.py reads (`audio`/`splits`).
