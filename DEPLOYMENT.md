# Production Deployment Guide

Direct VPS deployment for school-app via SSH + rsync.

---

## Prerequisites

### Local Machine
- `ssh`, `rsync`, `scp`, `curl` installed
- SSH key configured for passwordless login to VPS
- `.env.production` file with production secrets

### VPS (159.203.120.28)
- Node.js 20+ installed
- npm installed
- PM2 installed globally: `npm install -g pm2`
- Deploy user created (e.g., `deploy` or `root`)
- `/var/www/school-app` directory accessible

---

## Setup Steps

### 1. Prepare SSH Key

If not already configured, add SSH key to VPS:

```bash
# Generate local SSH key (if needed)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Copy to VPS (replace user/host as needed)
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@159.203.120.28

# Test
ssh deploy@159.203.120.28 "echo Connected"
```

### 2. Create .env.production

```bash
# Copy example to template
cp .env.production.example .env.production

# Edit with your production secrets
nano .env.production
```

Required secrets:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `RBAC_COOKIE_SECRET` - Min 32 chars (generate: `openssl rand -base64 32`)
- `JWT_SECRET` - Min 32 chars (generate: `openssl rand -base64 32`)
- `HEALTHCHECK_TOKEN` - Min 32 chars (generate: `openssl rand -base64 32`)

**Generate secure tokens:**

```bash
# RBAC cookie secret (48 chars recommended)
openssl rand -base64 48

# JWT secret (32+ chars)
openssl rand -base64 32

# Health check token (32+ chars)
openssl rand -base64 32
```

### 3. Deploy

```bash
# Make script executable (first time only)
chmod +x deploy.sh

# Deploy to VPS
./deploy.sh deploy@159.203.120.28

# Or with custom URL
APP_URL=https://app.school-iraq.com ./deploy.sh deploy@159.203.120.28
```

**Example output:**
```
[deploy] Deployment Configuration:
[deploy]   Remote: deploy@159.203.120.28
[deploy]   Directory: /var/www/school-app
[deploy]   Port: 3001
[deploy]   URL: https://app.school-iraq.com
[deploy] Validating local tools...
[deploy] ✓ All required tools present
[deploy] Testing SSH connection...
[deploy] ✓ SSH connection successful
[deploy] Syncing project files...
[deploy] ✓ Files synced
[deploy] Building on server...
[deploy] ✓ Build successful
[deploy] Restarting PM2 app...
[deploy] ✓ PM2 restarted
[deploy] Running health checks...
[deploy] ✓ Health check passed
[deploy] ✓ DEPLOYMENT SUCCESSFUL
```

---

## Monitoring & Logs

### View live logs
```bash
ssh deploy@159.203.120.28 "pm2 logs school-app"
```

### Check PM2 status
```bash
ssh deploy@159.203.120.28 "pm2 status"
```

### Restart manually
```bash
ssh deploy@159.203.120.28 "pm2 restart school-app"
```

### Stop app
```bash
ssh deploy@159.203.120.28 "pm2 stop school-app"
```

### Start app
```bash
ssh deploy@159.203.120.28 "pm2 start ecosystem.config.cjs"
```

---

## Troubleshooting

### "Cannot connect to deploy@159.203.120.28 via SSH"

Check SSH key:
```bash
# List available keys
ls -la ~/.ssh/

# Test connection
ssh -v deploy@159.203.120.28 "echo test"

# If using custom key location
ssh -i ~/.ssh/custom_key deploy@159.203.120.28 "echo test"
```

### "Health check failed after 30 attempts"

App may need more time. Check logs:
```bash
ssh deploy@159.203.120.28 "pm2 logs school-app --lines 50"
```

Common issues:
- Missing secrets in `.env.production`
- Database connection failure
- Port 3001 already in use

### "npm ci failed" or "npm run build failed"

SSH into server and debug:
```bash
ssh deploy@159.203.120.28
cd /var/www/school-app
npm ci
npm run build
```

---

## Environment Variables

### Required (for functionality)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role
- `RBAC_COOKIE_SECRET` - RBAC session secret (≥32 chars)
- `JWT_SECRET` - JWT signing secret (≥32 chars)
- `HEALTHCHECK_TOKEN` - Health check auth token
- `SESSION_COOKIE_SECURE=true` - Enforce HTTPS-only cookies

### Optional (recommended for production)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `UPSTASH_REDIS_REST_URL` - Distributed rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Redis token

### Optional (for integrations)
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
- WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, etc.
- Email (Resend): `RESEND_API_KEY`, `OPS_ALERT_EMAIL_TO`

---

## Rollback

To rollback to previous version:

```bash
# SSH into server
ssh deploy@159.203.120.28

# List previous versions (if using git on server)
cd /var/www/school-app
git log --oneline -10

# Checkout previous commit
git checkout <commit-hash>
npm ci
npm run build

# Restart
pm2 restart school-app
```

---

## Security Checklist

- ✓ `.env.production` is **NOT** committed to git (verify in `.gitignore`)
- ✓ SSH keys use strong algorithms (ed25519, RSA 4096+)
- ✓ SSH key has passphrase (optional but recommended)
- ✓ Secrets are ≥32 characters (generated with `openssl rand`)
- ✓ `SESSION_COOKIE_SECURE=true` in production
- ✓ VPS firewall allows only SSH (22) and web (80/443) ports
- ✓ App runs on localhost:3001, reverse proxied via nginx/caddy
- ✓ HTTPS enforced via reverse proxy, not app

---

## CI/CD Integration

To run deployment from GitHub Actions or other CI:

1. Add `DEPLOY_SSH_KEY` as base64-encoded secret:
   ```bash
   cat ~/.ssh/id_ed25519 | base64 -w 0
   ```

2. In CI workflow:
   ```bash
   echo "$DEPLOY_SSH_KEY" | base64 -d > ~/.ssh/id_ed25519
   chmod 600 ~/.ssh/id_ed25519
   ssh-keyscan 159.203.120.28 >> ~/.ssh/known_hosts
   ./deploy.sh deploy@159.203.120.28
   ```

This project uses **local deployment** via `deploy.sh` for simplicity and security.

---

## Performance Notes

- Build time: ~60-90s (Next.js 16 with React 19 Compiler)
- Deploy time: ~2-5 minutes total
- Zero-downtime: PM2 restarts app gracefully
- Health check: Up to 60s for app to fully start

---

## Support

For issues, check:
1. `.env.production` has all required secrets
2. SSH access to VPS works
3. PM2 is installed: `ssh deploy@159.203.120.28 "pm2 -v"`
4. Node.js ≥20: `ssh deploy@159.203.120.28 "node -v"`
5. Recent logs: `ssh deploy@159.203.120.28 "pm2 logs school-app --lines 100"`
