# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `SPEC.md` for the full architecture, database schema, API design, and component details.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information. Use the DocsExplorer subagent for efficient documentation lookup.

## Instructions

- Keep replies extremely concise.
- When working with any third-party library, look up the official documentation to ensure you're using up-to-date APIs.

## Commands

```bash
bun dev              # Start development server (http://localhost:3000)
bun run build        # Build for production
bun run lint         # Run ESLint
bun start            # Start production server
bun run scripts/init-db.ts  # Initialize SQLite database schema (run once)
```

## Stack

Next.js 16 (App Router) · Bun · TypeScript · Tailwind CSS 4 · SQLite via `bun:sqlite` · better-auth · TipTap · Resend · Twilio
