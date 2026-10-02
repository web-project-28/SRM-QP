# SRM AP Question Paper Finder — standalone prototype

A separate frontend/backend prototype for finding publicly accessible SRM AP question-paper PDFs.

## Stack

- Frontend: Vite + vanilla JavaScript
- Backend: Node.js + Express
- Discovery/indexing: Cheerio + same-host crawler
- No OpenAI/API key required for the first prototype

## Run

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend: http://localhost:4000

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: Vite will print its local URL, normally http://localhost:5173

## Build the document index

The prototype has a manual refresh endpoint:

```bash
curl -X POST http://localhost:4000/api/admin/refresh
```

Set `MAX_PAGES` in the backend environment if you want a larger crawl.

## Important

The crawler is intentionally limited to publicly accessible pages on `intranet.srmap.edu.in`. It does not bypass authentication, CAPTCHA, permissions, robots/access controls, or other restrictions.

The sample `backend/data/papers.json` contains only a placeholder. Run the refresh endpoint and inspect the resulting index before using the search UI.

## Next production upgrades

1. Replace broad crawling with a controlled examination-document index.
2. Parse PDF filenames/page metadata into branch, subject, semester, year and exam type.
3. Add PostgreSQL/Supabase for the index.
4. Add semantic/AI query parsing after the basic search is reliable.
5. Cache verified PDF URLs and periodically refresh the index.
6. Add rate limiting, request logging and admin authentication.
7. Keep the original SRM source URL on every result.
