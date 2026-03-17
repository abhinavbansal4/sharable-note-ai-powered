# Deployment Guide — Fly.io (Free Tier)
 
No credit card required. SQLite persists on a Fly.io volume.
 
---
 
### Accounts you need first (all free)
 
| Service | URL | Free allowance |
|---|---|---|
| Fly.io | fly.io | 3 VMs, 3 GB storage |
| Resend | resend.com | 3,000 emails/month |
| Twilio | twilio.com | ~$15 trial credit |
| Google OAuth | console.cloud.google.com | Free |
| GitHub OAuth | github.com/settings/developers | Free |
 
---
 
### Step 1 — `next.config.ts`
 
```ts
const nextConfig = {
  output: 'standalone',
};
export default nextConfig;
```
 
---
 
### Step 2 — `Dockerfile`
 
```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
 
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/scripts ./scripts
RUN mkdir -p /data
EXPOSE 3000
CMD ["/bin/sh", "-c", "bun scripts/init-db.ts && bun server.js"]
```
 
---
 
### Step 3 — Install flyctl and log in
 
```bash
curl -L https://fly.io/install.sh | sh
fly auth signup    # or: fly auth login
```
 
---
 
### Step 4 — Create the app and volume
 
```bash
fly launch --name noteshare --region ord --no-deploy
fly volumes create noteshare_data --region ord --size 1
```
 
---
 
### Step 5 — `fly.toml`
 
Replace the generated file with this:
 
```toml
app            = "noteshare"
primary_region = "ord"
 
[build]
  dockerfile = "Dockerfile"
 
[env]
  PORT         = "3000"
  NODE_ENV     = "production"
  DATABASE_PATH = "/data/app.db"
 
[[mounts]]
  source      = "noteshare_data"
  destination = "/data"
 
[http_service]
  internal_port        = 3000
  force_https          = true
  auto_stop_machines   = true
  auto_start_machines  = true
  min_machines_running = 0
 
[[vm]]
  memory   = "256mb"
  cpu_kind = "shared"
  cpus     = 1
```
 
---
 
### Step 6 — Set secrets
 
```bash
fly secrets set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
fly secrets set NEXT_PUBLIC_APP_URL="https://noteshare.fly.dev"
fly secrets set GOOGLE_CLIENT_ID="..."
fly secrets set GOOGLE_CLIENT_SECRET="..."
fly secrets set GITHUB_CLIENT_ID="..."
fly secrets set GITHUB_CLIENT_SECRET="..."
fly secrets set RESEND_API_KEY="re_..."
fly secrets set RESEND_FROM_ADDRESS="notes@yourdomain.com"
fly secrets set TWILIO_ACCOUNT_SID="AC..."
fly secrets set TWILIO_AUTH_TOKEN="..."
fly secrets set TWILIO_FROM_NUMBER="+15551234567"
```
 
---
 
### Step 7 — Deploy
 
```bash
fly deploy
```
 
App is live at `https://noteshare.fly.dev`. Every future deploy is this same command.
 
---
 
### Step 8 — Paste callback URLs into Google and GitHub
 
**Google** — `console.cloud.google.com` → Credentials → your OAuth app:
```
Authorised redirect URI: https://noteshare.fly.dev/api/auth/callback/google
```
 
**GitHub** — `github.com/settings/developers` → your OAuth app:
```
Callback URL: https://noteshare.fly.dev/api/auth/callback/github
```
 
---
 
### Useful commands
 
```bash
fly logs          # live logs
fly status        # is it running?
fly ssh console   # shell inside the container
fly deploy        # redeploy after code changes
```
 
---