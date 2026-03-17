# Technical Specification – Note Taking Web App (v1)

---

## 1. Overview

A web application where authenticated users can create, view, edit, delete, and publicly share rich-text notes. Notes are created with TipTap, stored as JSON in a SQLite database, and rendered in the browser with full formatting.

### Core Features

- User authentication via **better-auth** — email/password + SSO (Google, GitHub)
- Authenticated note management (CRUD) with **auto-save**
- Rich text editor using **TipTap** — bold, italic, headings (H1–H3), inline code, code blocks, bullet lists, horizontal rules
- **Public sharing** via a unique public URL (toggle on/off)
- **Share via email or SMS** — send a note's public link to any recipient
- **Local time & date display** — all timestamps rendered in the user's local timezone
- **User preferences** — display name, avatar, theme (light/dark)

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | TailwindCSS + `@tailwindcss/typography` |
| Database | SQLite via Bun's native client (raw SQL) |
| Auth | better-auth (email/password + OAuth) |
| Email delivery | Resend |
| SMS delivery | Twilio |

---

## 2. Architecture

### 2.1 High-Level Architecture

**Frontend & Backend:** Next.js App Router
- Server components for data fetching and SSR
- Client components for TipTap editor and interactive UI
- Route Handlers (`app/api/.../route.ts`) for JSON APIs

**Runtime:** Bun (dev & production)

**Database:** Single SQLite file at `data/app.db`, accessed via Bun's SQLite client

**Auth:** better-auth with email/password + Google and GitHub OAuth providers

**External Services:**
- Resend — transactional email (share-by-email)
- Twilio — SMS delivery (share-by-phone)

### 2.2 Application Layers

**Presentation layer**
- Next.js pages and components
- TailwindCSS for styling
- TipTap editor with toolbar
- `<LocalTime>` client component for timezone-aware timestamp rendering

**API layer**
- REST-like JSON endpoints: notes CRUD, share toggle, share delivery
- better-auth catch-all route (`/api/auth/[...all]`)

**Data access layer**
- `lib/db.ts` — singleton DB connection + typed query helpers
- `lib/notes.ts` — note repository (all note SQL)
- `lib/shares.ts` — share history repository

**External integrations**
- `lib/email.ts` — Resend wrapper
- `lib/sms.ts` — Twilio wrapper

### 2.3 File Structure (Key Files)

```
app/
  layout.tsx                      # Global layout, header, theme
  page.tsx                        # Landing page
  dashboard/page.tsx              # Note list (auth-gated)
  notes/[id]/page.tsx             # Note editor (auth-gated)
  p/[slug]/page.tsx               # Public note viewer
  api/
    auth/[...all]/route.ts        # better-auth handler
    notes/
      route.ts                    # GET list, POST create
      [id]/
        route.ts                  # GET, PUT, DELETE
        share/route.ts            # POST toggle public
        send-share/route.ts       # POST send via email/SMS
    public-notes/[slug]/route.ts  # Optional REST endpoint
lib/
  auth.ts                         # better-auth config
  db.ts                           # SQLite singleton + helpers
  notes.ts                        # Note repository
  shares.ts                       # Share history repository
  email.ts                        # Resend wrapper
  sms.ts                          # Twilio wrapper
  ratelimit.ts                    # In-memory rate limiter
components/
  NoteList.tsx
  NoteEditor.tsx
  Toolbar.tsx
  SharePanel.tsx
  DeleteNoteButton.tsx
  PublicNoteViewer.tsx
  LocalTime.tsx
scripts/
  init-db.ts                      # DB schema creation
```

---

## 3. Functional Requirements

### 3.1 Authentication

Users can:
- Register with email + password (valid email format; password ≥ 8 characters)
- Sign in with **Google OAuth** or **GitHub OAuth**
- Log in / log out from any page

Authentication state is accessible server-side (via `auth.api.getSession()`) and client-side.

Unauthenticated users:
- Can access public shared note URLs at `/p/[slug]` (read-only)
- Are redirected to `/login` when attempting to access `/dashboard` or `/notes/*`

### 3.2 Notes Management (Authenticated)

**Create a new note:**
- Default title: `"Untitled note"`
- Default content: empty TipTap document (`{ "type": "doc", "content": [] }`)
- Redirect to `/notes/[id]` after creation

**View list of own notes:**
- Show title, last updated (local time, relative for recent), and share status badge
- Ordered by `updated_at DESC`

**View a single note:**
- Load editor pre-populated with stored TipTap JSON

**Update note:**
- Title: editable inline input at top of editor page
- Content: edited via TipTap
- **Auto-save**: debounce 800ms after last keystroke; show `"Saving…"` → `"Saved ✓"` → `"Error"` indicator
- `updated_at` is updated on every successful save

**Delete note:**
- Requires confirmation dialog
- Hard delete; cascades to `note_shares` via FK constraint

### 3.3 Note Sharing

**Public URL toggle:**
- Enabled: assigns a unique `public_slug` (nanoid, 21 chars); note accessible at `/p/{slug}`
- Disabled: sets `is_public = 0`, nullifies `public_slug`; `/p/{slug}` returns 404

**Public page rendering:**
- Resolves note by `public_slug` in a server component
- Shows title and TipTap content in read-only mode (`editable: false`)
- No owner information, no edit controls

**Share via email:**
- User enters one or more email addresses (comma-separated or multi-input)
- Optional personal message (max 500 chars)
- Server validates note is `is_public = 1` before sending
- Sends via Resend; records each send in `note_shares`
- Rate limit: 10 sends per user per hour (email + SMS combined)

**Share via SMS:**
- User enters a phone number; validated to E.164 format via `libphonenumber-js`
- Message: `"[Name] shared a note with you: {publicUrl}"`
- Same rate limit applies

**Share history:**
- Visible in `<SharePanel>` — a list of past sends (recipient, method, timestamp)

### 3.4 Local Time & Date Display

- All timestamps stored in DB as UTC ISO strings
- `<LocalTime iso={string} />` — client component that formats via `Intl.DateTimeFormat` using the browser's detected locale and timezone
- Dashboard list: relative time (`"2 hours ago"`) for notes updated within 7 days; absolute date beyond that, using `date-fns/formatDistanceToNow`
- Note editor: shows `"Last saved [time]"` in the auto-save indicator

---

## 4. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Performance | Notes list & note view load under ~300ms for typical DB sizes |
| Security | All note operations scoped to `user_id`; no private data in public API responses |
| Rate limiting | Share delivery: 10 sends/user/hour (email + SMS combined); HTTP 429 on breach |
| Reliability | DB errors and external service failures are caught and returned as clear API error responses; auto-save retries once on network error |
| Maintainability | Type-safe API responses and DB types; modularized repositories and service wrappers |
| UX | Auto-save indicator; keyboard-accessible editor and toolbar; relative timestamps in local timezone |
| Content size | `content_json` capped at 500,000 bytes; validated at API layer before DB write (HTTP 413) |
| Slug entropy | 21-character nanoid (~128 bits); indexed for O(log n) public note lookup |
| Accessibility | Toolbar buttons have `aria-label`; focus management on modal dialogs |

---

## 5. Data Model & Database Schema (SQLite)

### 5.1 better-auth Core Tables

#### `user`

```sql
CREATE TABLE user (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image         TEXT,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique user identifier (primary key, generated by better-auth) |
| `name` | TEXT | User's display name |
| `email` | TEXT | User's email address — unique, used for login and share attribution |
| `emailVerified` | INTEGER | `1` if the email has been verified, `0` otherwise |
| `image` | TEXT | URL to the user's avatar image; null by default, populated by OAuth providers |
| `createdAt` | TEXT | UTC ISO timestamp of account creation |
| `updatedAt` | TEXT | UTC ISO timestamp of the last profile update |

---

#### `session`

```sql
CREATE TABLE session (
  id          TEXT PRIMARY KEY,
  userId      TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expiresAt   TEXT NOT NULL,
  ipAddress   TEXT,
  userAgent   TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique session identifier (primary key) |
| `userId` | TEXT | FK → `user.id`; the owner of this session; cascade-deleted when the user is deleted |
| `token` | TEXT | Unique opaque session token stored in an HTTP-only browser cookie |
| `expiresAt` | TEXT | UTC ISO timestamp after which the session is considered invalid |
| `ipAddress` | TEXT | Client IP address recorded at session creation (optional; used for audit trails) |
| `userAgent` | TEXT | Browser or device user-agent string at session creation (optional) |
| `createdAt` | TEXT | UTC ISO timestamp of when the session was created |
| `updatedAt` | TEXT | UTC ISO timestamp of the most recent session update (e.g. token refresh) |

---

#### `account`

```sql
CREATE TABLE account (
  id                    TEXT PRIMARY KEY,
  userId                TEXT NOT NULL,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  accessToken           TEXT,
  refreshToken          TEXT,
  accessTokenExpiresAt  TEXT,
  refreshTokenExpiresAt TEXT,
  scope                 TEXT,
  idToken               TEXT,
  password              TEXT,
  createdAt             TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique account record identifier (primary key) |
| `userId` | TEXT | FK → `user.id`; the user this linked account belongs to |
| `accountId` | TEXT | Provider-side account ID (e.g. Google `sub`, GitHub `id`); equals `userId` for credential accounts |
| `providerId` | TEXT | Auth provider identifier: `'credential'`, `'google'`, or `'github'` |
| `accessToken` | TEXT | OAuth access token returned by the provider; null for credential accounts |
| `refreshToken` | TEXT | OAuth refresh token used to renew the access token; null if not provided by the provider |
| `accessTokenExpiresAt` | TEXT | UTC ISO expiry timestamp for the access token; null if not applicable |
| `refreshTokenExpiresAt` | TEXT | UTC ISO expiry timestamp for the refresh token; null if not applicable |
| `scope` | TEXT | OAuth scopes granted (e.g. `'openid email profile'`); null for credential accounts |
| `idToken` | TEXT | OIDC ID token returned by the provider; null if the provider does not issue one |
| `password` | TEXT | Bcrypt-hashed password — set only when `providerId = 'credential'`; null for all SSO accounts |
| `createdAt` | TEXT | UTC ISO timestamp of when this account was linked to the user |
| `updatedAt` | TEXT | UTC ISO timestamp of the last account record update |

---

#### `verification`

```sql
CREATE TABLE verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  TEXT NOT NULL,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique verification record identifier (primary key) |
| `identifier` | TEXT | Subject of the verification request — typically an email address or user ID |
| `value` | TEXT | The token or OTP to be compared against the user's submitted input |
| `expiresAt` | TEXT | UTC ISO timestamp after which this verification record is invalid and should be rejected |
| `createdAt` | TEXT | UTC ISO timestamp of when the verification request was issued |
| `updatedAt` | TEXT | UTC ISO timestamp of the last update (e.g. on resend of verification email) |

---

### 5.2 Application Tables

#### `notes`

```sql
CREATE TABLE notes (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT 'Untitled note',
  content_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  is_public    INTEGER NOT NULL DEFAULT 0,
  public_slug  TEXT UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique note identifier (primary key; nanoid generated at creation) |
| `user_id` | TEXT | FK → `user.id`; the sole author and editor of this note; cascade-deleted with the user |
| `title` | TEXT | Note title shown in the dashboard list and editor header; defaults to `'Untitled note'` |
| `content_json` | TEXT | Stringified TipTap JSON document (`JSON.stringify(editor.getJSON())`); max 500,000 bytes enforced at API layer |
| `is_public` | INTEGER | `1` if the note is publicly accessible via its slug; `0` if private (default) |
| `public_slug` | TEXT | URL-safe nanoid (21 chars) used as the public URL path (`/p/{slug}`); null when `is_public = 0`; unique across all notes |
| `created_at` | TEXT | UTC ISO timestamp of when the note was first created |
| `updated_at` | TEXT | UTC ISO timestamp of the most recent save; updated on every auto-save |

---

#### `note_shares`

```sql
CREATE TABLE note_shares (
  id          TEXT PRIMARY KEY,
  note_id     TEXT NOT NULL,
  shared_by   TEXT NOT NULL,
  recipient   TEXT NOT NULL,
  method      TEXT NOT NULL CHECK(method IN ('email', 'sms')),
  sent_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id)   REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES user(id)  ON DELETE CASCADE
);
```

| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique share record identifier (primary key; nanoid generated at send time) |
| `note_id` | TEXT | FK → `notes.id`; the note whose public link was shared; record is removed if the note is deleted |
| `shared_by` | TEXT | FK → `user.id`; the authenticated user who initiated the share action |
| `recipient` | TEXT | Delivery address: an email address (for `method = 'email'`) or an E.164 phone number (for `method = 'sms'`) |
| `method` | TEXT | Delivery channel used: `'email'` or `'sms'`; enforced by CHECK constraint |
| `sent_at` | TEXT | UTC ISO timestamp of when the share message was successfully dispatched to the external provider |

---

### 5.3 Indexes

```sql
-- Note lookups
CREATE INDEX idx_notes_user_id     ON notes(user_id);
CREATE INDEX idx_notes_public_slug ON notes(public_slug);
CREATE INDEX idx_notes_is_public   ON notes(is_public);
CREATE INDEX idx_notes_updated_at  ON notes(user_id, updated_at DESC);

-- Share history & rate limiting
CREATE INDEX idx_shares_note_id    ON note_shares(note_id);
CREATE INDEX idx_shares_shared_by  ON note_shares(shared_by);
CREATE INDEX idx_shares_sent_at    ON note_shares(shared_by, sent_at DESC);
```

> `idx_notes_updated_at` is a composite index that directly serves the dashboard query (`WHERE user_id = ? ORDER BY updated_at DESC`) without a separate sort step.
>
> `idx_shares_sent_at` supports the rate-limit check (`WHERE shared_by = ? AND sent_at > ?`) in a single index scan.

---

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

```ts
import { Database } from 'bun:sqlite';

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) _db = new Database(process.env.DATABASE_PATH ?? 'data/app.db');
  return _db;
}

export function query<T>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function get<T>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, params: unknown[] = []): void {
  getDb().prepare(sql).run(...params);
}
```

### 6.2 Note Repository

**File:** `lib/notes.ts`

```ts
export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string;       // stringified TipTap JSON
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;         // UTC ISO
  updatedAt: string;         // UTC ISO
};

// All functions enforce user_id = ? in SQL to prevent cross-user access.
export function createNote(userId: string, data?: { title?: string; contentJson?: string }): Promise<Note>
export function getNoteById(userId: string, noteId: string): Promise<Note | null>
export function getNotesByUser(userId: string): Promise<Note[]>                    // ordered by updated_at DESC
export function updateNote(userId: string, noteId: string, data: Partial<{ title: string; contentJson: string }>): Promise<Note | null>
export function deleteNote(userId: string, noteId: string): Promise<void>
export function setNotePublic(userId: string, noteId: string, isPublic: boolean): Promise<Note | null>
export function getNoteByPublicSlug(slug: string): Promise<Note | null>            // no user_id filter (public read)
```

### 6.3 Share Repository

**File:** `lib/shares.ts`

```ts
export type NoteShare = {
  id: string;
  noteId: string;
  sharedBy: string;
  recipient: string;
  method: 'email' | 'sms';
  sentAt: string;            // UTC ISO
};

export function recordShare(data: Omit<NoteShare, 'id' | 'sentAt'>): Promise<NoteShare>
export function getSharesByNote(userId: string, noteId: string): Promise<NoteShare[]>
export function countSharesSince(userId: string, sinceIso: string): Promise<number>  // used for rate limiting
```

### 6.4 Rate Limiter

**File:** `lib/ratelimit.ts`

In-memory implementation (sufficient for single-process Bun deployments). Replace with a Redis-backed store for multi-instance deployments.

```ts
// Returns true if the action is permitted, false if the limit has been reached.
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean
```

Usage in share endpoint: `checkRateLimit(`share:${userId}`, 10, 60 * 60 * 1000)`

### 6.5 External Service Wrappers

**File:** `lib/email.ts`
```ts
export async function sendShareEmail(opts: {
  to: string[];              // validated email addresses
  senderName: string;
  noteTitle: string;
  publicUrl: string;
  message?: string;          // max 500 chars
}): Promise<void>
// Uses Resend Node.js SDK. Throws ResendError on delivery failure.
```

**File:** `lib/sms.ts`
```ts
export async function sendShareSms(opts: {
  to: string;                // E.164 format, pre-validated by libphonenumber-js
  senderName: string;
  publicUrl: string;
}): Promise<void>
// Uses Twilio REST API. Throws TwilioError on delivery failure.
```

---

## 7. API Design

### 7.1 Auth Guard

All `/api/notes/*` handlers call `auth.api.getSession({ headers: request.headers })` and return HTTP `401` if no valid session is present.

### 7.2 Notes Endpoints

#### `GET /api/notes`
List notes for the current user. `contentJson` is excluded for performance.

**Response 200:**
```json
[
  {
    "id": "abc123",
    "title": "My Note",
    "isPublic": true,
    "updatedAt": "2025-06-01T10:30:00Z"
  }
]
```

---

#### `POST /api/notes`
Create a new note.

**Request body** (all fields optional):
```json
{ "title": "My Note", "contentJson": { "type": "doc", "content": [] } }
```

**Response 201:** Full created `Note` object.

---

#### `GET /api/notes/:id`
Get a single note owned by the current user, including `contentJson`.

**Response:** `200` with full note, `404` if not found or not owned by the current user.

---

#### `PUT /api/notes/:id`
Update note title and/or content.

**Request body:**
```json
{ "title": "Updated title", "contentJson": { "type": "doc", ... } }
```

**Validation:**
- `contentJson` size must be ≤ 500,000 bytes; returns `413` if exceeded
- At least one of `title` or `contentJson` must be present; returns `400` otherwise

**Response:** `200` with updated note, `404` if not found.

---

#### `DELETE /api/notes/:id`
Hard delete. Cascades to `note_shares`.

**Response:** `204` on success, `404` if not found.

---

#### `POST /api/notes/:id/share`
Toggle public sharing on or off.

**Request body:**
```json
{ "isPublic": true }
```

**Behavior:**
- `isPublic = true` with no existing slug → generate slug via `nanoid(21)`
- `isPublic = false` → set `is_public = 0`, clear `public_slug`

**Response 200:**
```json
{ "id": "abc123", "isPublic": true, "publicSlug": "V1StGXR8_Z5jdHi6B-myT" }
```

---

#### `POST /api/notes/:id/send-share`
Send the note's public link to one or more recipients.

**Request body — email:**
```json
{
  "method": "email",
  "recipients": ["alice@example.com", "bob@example.com"],
  "message": "Thought you'd find this useful!"
}
```

**Request body — SMS:**
```json
{
  "method": "sms",
  "recipients": ["+15551234567"]
}
```

**Server-side steps:**
1. Verify note exists and belongs to the current user
2. Verify `is_public = 1` — return `400` if not
3. Check rate limit — return `429` if exceeded
4. Validate recipients (email format or E.164 via `libphonenumber-js`)
5. Call `sendShareEmail` or `sendShareSms`
6. Record each successful send in `note_shares`

**Response 200:**
```json
{ "sent": 2 }
```

**Error responses:**

| Status | Condition |
|---|---|
| `400` | Note is not public, or recipient validation failed |
| `401` | Not authenticated |
| `404` | Note not found or not owned by user |
| `413` | Message field exceeds 500 characters |
| `429` | Rate limit exceeded (10 sends/hour) |
| `502` | External service (Resend / Twilio) returned an error |

---

### 7.3 Public Note Endpoint

#### `GET /api/public-notes/:slug`
Read-only. No authentication required.

**Response 200:**
```json
{ "title": "My Public Note", "contentJson": { "type": "doc", ... } }
```

**Response 404:** Slug not found or `is_public = 0`.

> In practice, `/p/[slug]` is a server component that resolves the note directly via `getNoteByPublicSlug()`, making this REST endpoint optional.

---

### 7.4 Auth Endpoints (better-auth)

#### `GET|POST /api/auth/[...all]`
better-auth catch-all handler, covering:
- Email/password sign-up and sign-in
- Google OAuth authorize & callback
- GitHub OAuth authorize & callback
- Session refresh and logout

---

## 8. Frontend – Pages & Components

### 8.1 Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page — app intro, login/signup CTA |
| `/login` | Public | Sign in: email/password form + Google/GitHub SSO buttons |
| `/register` | Public | Sign up: email/password form + Google/GitHub SSO buttons |
| `/dashboard` | Auth | Note list, "New note" button, sort/filter controls |
| `/notes/[id]` | Auth | Note editor — title input, TipTap, toolbar, share panel, delete |
| `/p/[slug]` | Public | Read-only note viewer — rendered TipTap content |

### 8.2 Layout & Navigation

`app/layout.tsx` renders a persistent header:
- App name / logo (links to `/` or `/dashboard`)
- User avatar dropdown: profile, theme toggle, logout
- Login / register links when unauthenticated

`app/(auth)/login` and `app/(auth)/register`:
- Email/password form
- SSO buttons: `auth.signIn.social({ provider: 'google' })` and `auth.signIn.social({ provider: 'github' })`
- Redirect to `/dashboard` on success

### 8.3 Components

#### `components/NoteList.tsx`
- Props: `notes: { id, title, updatedAt, isPublic }[]`
- Renders clickable cards linking to `/notes/[id]`
- Badge for shared status; relative timestamp via `<LocalTime relative>`
- Empty state: "No notes yet. Create your first one."

#### `components/NoteEditor.tsx`
- TipTap editor, `editable: true`
- `onUpdate` → debounce 800ms → `PUT /api/notes/:id`
- Save state machine: `idle | saving | saved | error`
- On network error: retries once automatically, then shows `"Error saving"` with a manual save button

#### `components/Toolbar.tsx`
- Buttons with `aria-label`: Bold, Italic, H1, H2, H3, Paragraph, Bullet list, Inline code, Code block, Horizontal rule
- Active state highlighted via `editor.isActive(...)`

#### `components/SharePanel.tsx`
- Toggle switch for `isPublic` (calls `POST /api/notes/:id/share`)
- When public: shows full URL with one-click copy button
- Tabs: **Copy link** | **Email** | **SMS**
  - Email tab: multi-address input, optional message field (500 char limit with counter), send button
  - SMS tab: phone number input (E.164 validation), send button
- Share history: table of past sends (recipient, method, local timestamp)
- Rate limit feedback: disables send button and shows time-until-reset when 429 is returned

#### `components/DeleteNoteButton.tsx`
- Trigger button → confirmation dialog ("Delete this note? This cannot be undone.")
- On confirm: `DELETE /api/notes/:id` → redirect to `/dashboard`

#### `components/PublicNoteViewer.tsx`
- `EditorContent` with `editable: false`
- Wrapped in Tailwind `prose` class for typography
- No author info, no action buttons

#### `components/LocalTime.tsx`
```tsx
'use client';
import { formatDistanceToNow } from 'date-fns';

export function LocalTime({ iso, relative = false }: { iso: string; relative?: boolean }) {
  const date = new Date(iso);
  const isRecent = Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;

  if (relative && isRecent) {
    return <time dateTime={iso}>{formatDistanceToNow(date, { addSuffix: true })}</time>;
  }

  const formatted = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(date);

  return <time dateTime={iso}>{formatted}</time>;
}
```

---

## 9. TipTap Integration

### 9.1 Editor Setup

```ts
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';

const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Code,
    CodeBlock,
  ],
  content: JSON.parse(note.contentJson),    // hydrate from DB
  editable: true,
  onUpdate: ({ editor }) => {
    debouncedSave(editor.getJSON());         // 800ms debounce → PUT /api/notes/:id
  },
});
```

**Saving:** `JSON.stringify(editor.getJSON())` → stored in `content_json`

**Loading:** `JSON.parse(note.contentJson)` → passed as `content` to the editor

### 9.2 Toolbar Commands

| Button | TipTap chain |
|---|---|
| Bold | `editor.chain().focus().toggleBold().run()` |
| Italic | `editor.chain().focus().toggleItalic().run()` |
| H1 / H2 / H3 | `editor.chain().focus().toggleHeading({ level: N }).run()` |
| Paragraph | `editor.chain().focus().setParagraph().run()` |
| Bullet list | `editor.chain().focus().toggleBulletList().run()` |
| Inline code | `editor.chain().focus().toggleCode().run()` |
| Code block | `editor.chain().focus().toggleCodeBlock().run()` |
| Horizontal rule | `editor.chain().focus().setHorizontalRule().run()` |

### 9.3 Read-Only Mode

For `/p/[slug]`, initialize the editor with `editable: false` and no `onUpdate` handler. Wrap `<EditorContent>` in the `prose` class.

### 9.4 Error Boundary

Wrap `<NoteEditor>` in a React error boundary. If `content_json` fails to parse (malformed DB value), render:
- `"This note's content could not be loaded."`
- A **Reset content** button that PUTs an empty TipTap document to the API

---

## 10. Auth Configuration (better-auth + SSO)

**File:** `lib/auth.ts`

```ts
import { betterAuth } from 'better-auth';
import { socialProviders } from 'better-auth/plugins';
import { getDb } from './db';

export const auth = betterAuth({
  database: getDb(),
  plugins: [
    socialProviders({
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    }),
  ],
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 30,    // 30 days
    updateAge: 60 * 60 * 24,         // refresh if older than 1 day
  },
});
```

**File:** `app/api/auth/[...all]/route.ts`

```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(auth.handler);
```

**File:** `middleware.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/notes');

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/notes/:path*'] };
```

---

## 11. Styling (TailwindCSS)

- `tailwind.config.ts` — enable `@tailwindcss/typography` plugin
- Light/dark mode via `dark:` variant and a theme toggle (persisted in `localStorage`)
- Neutral backgrounds, card-style note containers, consistent spacing scale
- `prose` class applied to `<PublicNoteViewer>` for typographic defaults on rendered note content
- Toolbar buttons use consistent icon sizing with active-state highlighting

---

## 12. Environment Variables

```env
# ── Database ──────────────────────────────────────
DATABASE_PATH=data/app.db

# ── better-auth ───────────────────────────────────
BETTER_AUTH_SECRET=<min-32-char-random-string>

# ── Google OAuth ──────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── GitHub OAuth ──────────────────────────────────
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── Resend (email delivery) ───────────────────────
RESEND_API_KEY=
RESEND_FROM_ADDRESS=notes@yourdomain.com

# ── Twilio (SMS delivery) ─────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+15551234567

# ── App ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

---

## 13. Security Considerations

| Area | Measure |
|---|---|
| Auth enforcement | `/dashboard` and `/notes/*` protected at middleware level; all API handlers verify session independently as a second layer |
| Authorization | Every note SQL query includes `AND user_id = ?`; cross-user data access is structurally impossible |
| Public notes | 21-char nanoid (~128 bits entropy); `is_public` flag checked before serving any content |
| XSS | TipTap stores structured JSON, not HTML; rendering via `EditorContent` avoids `dangerouslySetInnerHTML` |
| Share delivery | Note must be `is_public = 1` before email/SMS is dispatched; only the public URL is shared (never note content) |
| Rate limiting | 10 share sends per user per hour (combined email + SMS); HTTP 429 with retry metadata |
| Content size | `content_json` capped at 500,000 bytes at the API layer; HTTP 413 on breach |
| SSO account linking | better-auth merges accounts that share a verified email address across providers |
| Session security | Tokens are opaque, stored as HTTP-only cookies; 30-day expiry; refreshed every 24 hours |
| CSRF | better-auth enforces same-site cookie policy and origin validation on POST endpoints |

---

## 14. Development Workflow

1. Initialize Next.js project with Bun & TypeScript: `bun create next-app`
2. Set up TailwindCSS + `@tailwindcss/typography`
3. Create `scripts/init-db.ts` — runs all `CREATE TABLE` and `CREATE INDEX` statements on first run
4. Implement `lib/db.ts`, `lib/notes.ts`, `lib/shares.ts`, `lib/ratelimit.ts`
5. Configure better-auth: `lib/auth.ts`, `.env`, OAuth app credentials
6. Build `/api/auth/[...all]` catch-all and `middleware.ts`
7. Build `/api/notes` (list + create) and `/api/notes/[id]` (get, update, delete)
8. Build `/api/notes/[id]/share` (toggle) and `/api/notes/[id]/send-share` (deliver)
9. Integrate Resend (`lib/email.ts`) and Twilio (`lib/sms.ts`)
10. Build `/dashboard` page and `<NoteList>` component
11. Build `/notes/[id]` page: `<NoteEditor>`, `<Toolbar>`, auto-save, `<SharePanel>`
12. Build `/p/[slug]` public page with `<PublicNoteViewer>`
13. Implement `<LocalTime>` and wire relative timestamps across all views
14. Build `/login` and `/register` pages with SSO buttons
15. Polish: loading skeletons, toast notifications, error states, dark mode, accessibility audit

---

## 15. External Service Setup

### Resend (email)
- Create account at [resend.com](https://resend.com)
- Add and verify your sending domain (adds DNS TXT/MX records)
- Generate API key → `RESEND_API_KEY`
- Set `RESEND_FROM_ADDRESS` to a verified address on your domain
- Free tier: 3,000 emails/month, 100/day

### Twilio (SMS)
- Create account at [twilio.com](https://twilio.com)
- Purchase a phone number → `TWILIO_FROM_NUMBER`
- Copy Account SID and Auth Token from the console → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- Free trial includes test credits; production requires account verification

### Google OAuth
- Go to [console.cloud.google.com](https://console.cloud.google.com)
- Create a project → enable the "Google+ API" or "People API"
- Create OAuth 2.0 credentials (Web application type)
- Add authorized redirect URI: `https://yourapp.com/api/auth/callback/google`
- Copy Client ID and Client Secret

### GitHub OAuth
- Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
- Set **Authorization callback URL**: `https://yourapp.com/api/auth/callback/github`
- Copy Client ID → generate and copy Client Secret
