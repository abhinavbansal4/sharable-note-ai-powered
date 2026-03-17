# NoteShare

A web application where authenticated users can create, view, edit, delete, and publicly share rich-text notes. Built with Next.js App Router, Bun, TipTap, and SQLite.

## Features

- **Authentication** — email/password sign-up + Google & GitHub OAuth via better-auth
- **Rich-text editor** — TipTap with bold, italic, headings (H1–H3), bullet lists, inline code, code blocks, and horizontal rules
- **Auto-save** — debounced 800ms after last keystroke with saving/saved/error indicator
- **Public sharing** — toggle a unique public URL (`/p/[slug]`) on or off per note
- **Share via email or SMS** — send the public link to any recipient (Resend + Twilio)
- **Discover public notes** — browse public notes shared by other users from the dashboard
- **Local timestamps** — all dates rendered in the user's local timezone
- **Light / dark mode** — persisted in `localStorage`, default dark

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + `@tailwindcss/typography` |
| Database | SQLite via `bun:sqlite` (raw SQL) |
| Auth | better-auth (email/password + OAuth) |
| Editor | TipTap |
| Email | Resend |
| SMS | Twilio |

## How to Use

### 1. Create an account
Go to `/authenticate`, sign up with email + password or continue with Google. You'll land on your dashboard.

### 2. Create a note
Click **New note** on the dashboard. You're taken to the editor — start typing. The note auto-saves every 800ms after your last keystroke. You'll see a **Saving… → Saved ✓** indicator at the top.

### 3. Format your note
Use the toolbar above the editor:
- **B** / *I* — bold / italic
- **H1 H2 H3** — headings
- **¶** — paragraph (reset heading)
- **•** — bullet list
- **`code`** — inline code
- **```** — code block
- **—** — horizontal rule

### 4. Share a note publicly
Open a note → scroll to the **Share** panel → toggle **Make public**. A unique URL is generated (`/p/[slug]`). Copy and share it with anyone — no login needed to read it.

### 5. Send via email or SMS
With the note set to public, use the **Email** or **SMS** tab in the Share panel to send the link directly to a recipient. Rate limited to 10 sends per hour.

### 6. Discover public notes
On the dashboard, scroll below **My Notes** to see the **Discover Public Notes** section — all notes shared publicly by other users, with their author name and timestamp.

### 7. Switch theme
Click the **sun** (dark mode) or **moon** (light mode) icon in the top-right header to toggle. Preference is saved in `localStorage`.

---

## URL Reference

| URL | Access | What it does |
|---|---|---|
| `/` | Public | Landing page |
| `/authenticate` | Public | Sign in or sign up (email/password + Google + GitHub) |
| `/dashboard` | Auth required | Your notes list + Discover public notes from other users |
| `/notes/[id]` | Auth required | Note editor — write, format, auto-save, share, delete |
| `/p/[slug]` | Public | Read-only view of a publicly shared note |

### API endpoints

| Method | URL | What it does |
|---|---|---|
| `GET` | `/api/notes` | List all notes for the logged-in user |
| `POST` | `/api/notes` | Create a new note |
| `GET` | `/api/notes/[id]` | Get a single note (owner only) |
| `PUT` | `/api/notes/[id]` | Update title or content |
| `DELETE` | `/api/notes/[id]` | Delete a note |
| `POST` | `/api/notes/[id]/share` | Toggle public sharing on/off |
| `POST` | `/api/notes/[id]/send-share` | Send the public link via email or SMS |
| `GET` | `/api/public-notes/[slug]` | Get a public note by slug (no auth) |
| `GET/POST` | `/api/auth/[...all]` | better-auth handler (login, signup, OAuth, logout) |

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Copy the example below into a `.env.local` file and fill in the values:

```env
# Database
DATABASE_PATH=data/app.db

# better-auth (min 32-char random string)
BETTER_AUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Resend (email delivery)
RESEND_API_KEY=
RESEND_FROM_ADDRESS=notes@yourdomain.com

# Twilio (SMS delivery)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+15551234567

# App public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Initialize the database

Run once to create all tables and indexes:

```bash
bun run scripts/init-db.ts
```

### 4. Start the development server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Commands

```bash
bun dev              # Start development server
bun run build        # Build for production
bun start            # Start production server
bun run lint         # Run ESLint
bun run scripts/init-db.ts  # Initialize SQLite schema (run once)
```

## Project Structure

```
app/
  layout.tsx                    # Global layout and header
  page.tsx                      # Landing page
  dashboard/page.tsx            # Note list + public notes discovery
  notes/[id]/page.tsx           # Note editor
  p/[slug]/page.tsx             # Public read-only note viewer
  api/
    auth/[...all]/route.ts      # better-auth handler
    notes/route.ts              # GET list, POST create
    notes/[id]/route.ts         # GET, PUT, DELETE
    notes/[id]/share/route.ts   # POST toggle public
    notes/[id]/send-share/route.ts  # POST send via email/SMS
components/
  Header.tsx                    # Navigation, theme toggle
  NoteList.tsx                  # Note list with grouping
  NoteEditor.tsx                # TipTap editor with auto-save
  Toolbar.tsx                   # Editor formatting toolbar
  SharePanel.tsx                # Share toggle, copy link, email/SMS
  PublicNoteViewer.tsx          # Read-only TipTap renderer
  LocalTime.tsx                 # Timezone-aware timestamp
lib/
  auth.ts                       # better-auth config
  db.ts                         # SQLite singleton + query helpers
  notes.ts                      # Note repository
  shares.ts                     # Share history repository
  email.ts                      # Resend wrapper
  sms.ts                        # Twilio wrapper
  ratelimit.ts                  # In-memory rate limiter
scripts/
  init-db.ts                    # Database schema creation
```

## External Service Setup

**Resend (email)** — [resend.com](https://resend.com)
- Create an account, verify your sending domain, and generate an API key

**Twilio (SMS)** — [twilio.com](https://twilio.com)
- Purchase a phone number and copy your Account SID and Auth Token

**Google OAuth** — [console.cloud.google.com](https://console.cloud.google.com)
- Create OAuth 2.0 credentials and add the callback URL: `/api/auth/callback/google`

**GitHub OAuth** — GitHub → Settings → Developer settings → OAuth Apps
- Set the callback URL to `/api/auth/callback/github`
