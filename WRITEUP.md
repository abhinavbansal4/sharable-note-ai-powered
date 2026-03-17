# NoteShare — Project Writeup

## What Is This App?

NoteShare is a full-stack web app for creating, editing, and publicly sharing rich-text notes. Users sign up, write notes in a WYSIWYG editor, and can toggle any note to be publicly accessible via a unique URL — no login required to read a shared note. They can also share notes directly via email or SMS, and browse public notes shared by other users.

---

## What It Does

| Feature | Details |
|---|---|
| **Auth** | Email/password + Google OAuth. Sessions last 30 days. |
| **Note editor** | TipTap rich-text — bold, italic, H1–H3, bullet lists, code blocks, horizontal rules |
| **Auto-save** | Debounced 800ms after last keystroke. Shows Saving → Saved → Error states. |
| **Public sharing** | Toggle generates a unique 21-char nanoid slug at `/p/[slug]` |
| **Share via email/SMS** | Sends the public link via Resend (email) or Twilio (SMS) |
| **Discover** | Dashboard shows all public notes from other users |
| **Dark mode** | Default dark, persisted in localStorage, sun/moon toggle in header |
| **Timezone-aware timestamps** | All dates rendered in the user's local timezone via `Intl.DateTimeFormat` |

---

## Tech Stack — and Why

### Next.js (App Router)
The App Router gives us server components for fast SSR data fetching (dashboard, note editor) and client components only where needed (editor, header, share panel). No useEffect data fetching — pages load with data already present.

### Bun
Used as the runtime, package manager, and SQLite client. Bun's native `bun:sqlite` bindings are significantly faster than `better-sqlite3` and require zero native compilation. The lockfile (`bun.lock`) is text-based, making it readable in diffs and reliable in CI.

### SQLite via `bun:sqlite`
For a single-instance app, SQLite is the right call. No connection pool to manage, no separate database server, no network latency on queries. The database is a single file on a persistent volume. WAL mode is enabled for better concurrent read performance.

### better-auth
Handles the full auth lifecycle — sessions, email/password, OAuth. It writes directly to the SQLite database using the same connection, keeping the stack unified. Conditionally loads Google/GitHub OAuth only if those env vars are present, so the app works without them configured.

### TipTap
Stores content as structured JSON (not HTML), which means:
- No XSS risk from stored content
- Clean diffs in the database
- Portable — the same JSON can be rendered read-only on the public note viewer with zero transformation

### Tailwind CSS 4
Utility-first, zero runtime. Dark mode via the `dark:` variant with a class toggle on `<html>`. No CSS-in-JS overhead.

---

## Architecture Decisions That Worked Well

### Server components for data, client components for interaction
Pages like `/dashboard` and `/notes/[id]` are server components — they fetch data directly from SQLite and render HTML. Only the editor, header, and share panel are `'use client'`. This keeps the JS bundle small and pages fast on first load.

### Thin API layer
The API routes (`/api/notes/*`) are simple — they validate auth, call a repository function, and return JSON. All SQL lives in `lib/notes.ts` and `lib/shares.ts`. No ORM, just typed query functions with parameterized statements.

### Repository pattern without an ORM
```
lib/db.ts       → singleton SQLite connection + typed query/get/run helpers
lib/notes.ts    → all note SQL (createNote, getNotesByUser, setNotePublic, ...)
lib/shares.ts   → share history + rate limit queries
```
This keeps SQL readable, testable in isolation, and avoids ORM magic. Every query is visible and explicit.

### Nanoid for public slugs
21-character nanoid gives ~128 bits of entropy — equivalent to a UUID v4 but shorter in URLs. Indexed for O(log n) lookup. Slug is preserved when toggling public off and back on (the same URL is reused).

### UTC storage, local rendering
All timestamps stored as UTC ISO strings in SQLite. A `<LocalTime>` client component renders them in the user's browser timezone using `Intl.DateTimeFormat`. No timezone conversion bugs server-side.

---

## Deployment Configuration

### Docker — Multi-stage build

```
Stage 1 (oven/bun:1)      → install deps + build Next.js standalone output
Stage 2 (oven/bun:1-slim) → copy only the standalone output, static assets, scripts
```

The final image is ~82MB. Using `bun:1-slim` in the runner stage keeps it lean — no build tools, no source files.

Key detail: `NEXT_PUBLIC_APP_URL` is passed as a Docker build ARG because Next.js inlines `NEXT_PUBLIC_*` variables at build time. Without this, the auth client's `baseURL` would be `localhost:3000` in production.

```dockerfile
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN bun run build
```

`mkdir -p data` runs before `bun run build` because `lib/auth.ts` calls `getDb()` at module load time during Next.js's static analysis phase — SQLite needs the directory to exist even if the DB file itself isn't used at build time.

### Fly.io

- **Persistent volume** at `/data` — SQLite database survives redeploys
- **`min_machines_running = 1`** — machine stays warm, no cold starts. With `min_machines_running = 0` the machine slept between requests and took ~10 seconds to wake up.
- **`auto_stop_machines = false`** — paired with the above, keeps the instance always live
- **512MB RAM** — 256MB caused memory pressure under Next.js standalone + Bun
- **`grace_period = "30s"`** on health checks — gives the server time to boot (init-db + Next.js startup takes ~8–9s) before health checks start failing

### `fly.toml` build args
Passing `NEXT_PUBLIC_APP_URL` as a build arg in `fly.toml` means it's baked into the image at deploy time without needing it as a runtime secret:

```toml
[build.args]
  NEXT_PUBLIC_APP_URL = "https://noteshare.fly.dev"
```

---

## CI/CD Pipeline

GitHub Actions workflow at `.github/workflows/deploy.yml`:

```
Push or merge to main
        ↓
actions/checkout@v4
        ↓
superfly/flyctl-actions/setup-flyctl@master
        ↓
flyctl deploy --remote-only   ← build happens on Fly.io's remote builder, not the runner
```

`--remote-only` means the GitHub Actions runner doesn't need Docker installed or significant compute — it just ships the source to Fly.io's depot builder and streams the logs. Build time is ~20 seconds thanks to layer caching.

`concurrency: deploy-production` ensures only one deploy runs at a time — if two PRs merge in quick succession, the second waits for the first to finish rather than racing.

`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` opts into Node.js 24 for the runner to stay ahead of GitHub's deprecation of Node.js 20 actions.

**One required secret:** `FLY_API_TOKEN` — a scoped deploy token (not the full user token) with 1-year expiry, set in GitHub repo secrets.

---

## What Works Best — Configuration Lessons

**1. Keep the machine always on**
`min_machines_running = 1` + `auto_stop_machines = false` is the single biggest UX improvement. Cold starts on a free-tier Fly.io machine are ~10 seconds — unacceptable for a real app.

**2. SQLite is enough**
For a single-instance deployment, SQLite outperforms a networked database on latency (no round trips) and operational simplicity (no connection strings, no managed DB cost). WAL mode handles concurrent reads. The only limitation is single-writer, which is fine here.

**3. Standalone output for Docker**
`output: "standalone"` in `next.config.ts` produces a self-contained `server.js` + bundled dependencies. The final image has no `node_modules` directory — just the compiled output. This is what keeps the image at 82MB instead of 500MB+.

**4. Build args for public env vars**
Any `NEXT_PUBLIC_*` variable that needs to be correct in production must be a Docker build arg, not a runtime secret. Next.js replaces these at compile time — a runtime env var is too late.

**5. Grace period on health checks**
The startup sequence (volume mount → init-db → Next.js boot) takes ~8–9 seconds. Without `grace_period = "30s"`, Fly.io's proxy declares the machine unhealthy before it's ready and starts refusing connections.

**6. `.dockerignore` matters**
Excluding `data/`, `node_modules/`, `.next/`, and `.env*` from the build context keeps the context transfer fast and prevents accidentally baking secrets or the local database into the image.

---

## Secrets — What Goes Where

| Variable | Where | Why |
|---|---|---|
| `BETTER_AUTH_SECRET` | Fly.io secret | Sensitive — signs session tokens |
| `GOOGLE_CLIENT_ID/SECRET` | Fly.io secret | Sensitive — OAuth credentials |
| `RESEND_API_KEY` | Fly.io secret | Sensitive — API key |
| `TWILIO_*` | Fly.io secret | Sensitive — API credentials |
| `NEXT_PUBLIC_APP_URL` | `fly.toml` build arg | Public — needs to be available at build time |
| `DATABASE_PATH` | `fly.toml` env | Non-sensitive path, same on every deploy |
| `NODE_ENV` | `fly.toml` env | Non-sensitive, same on every deploy |
| `FLY_API_TOKEN` | GitHub repo secret | Scoped deploy token for CI/CD only |
