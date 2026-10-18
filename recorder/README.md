# EasyStudy recorder
Small separate Cloudflare Worker (name `easystudy-recorder`, root directory `recorder`). Serves the Arabic recording page from `public/` and keeps recordings in a KV namespace (binding `REC`, auto-created on first deploy).
- Password: whoever opens the page first chooses it (stored hashed in KV).
- `public/items.json` = word/question list (tools/ar-library/build_data.py, written with `--worker`); `public/needed.json` = empty slots Claude adds for Ahmed to record (list at the top of the page).
- Pull recordings: `GET /api/export` with header `x-pw: <password>` -> JSON that tools/ar-library/import_recordings.py reads (`audio`/`splits`).
- English library: page `en.html` (items from `public/en-items.json`, built by tools/en-library/build_items.py; rerun it when English lessons change). Recordings use the same KV/password/`/pub/*` live read as Arabic (meta.lang='en'); the "regenerate" button stores a request in KV (`g:` keys, API `/api/regen/<id>`), and `python3 tools/en-library/regen.py` (needs `--setup` once for Kokoro) speaks them and uploads the result. A new sound a lesson needs: `regen.py --text T --path <file under app/data>`.

## Pictures
pics.html = picture library (same password). Worker keeps replaced pictures in KV (`j:`/`i:`), public `/pub/pics` + `/pub/p/<id>`; the app's `sw.js` shows them. Rebuild the list with `python3 tools/pics/build_library.py`.
