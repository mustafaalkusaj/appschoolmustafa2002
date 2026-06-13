#!/usr/bin/env bash
#
# Production deployment script for school-app
# Deploys to VPS via SSH + rsync, restarts with PM2
#
# Usage:
#   ./deploy.sh deploy@159.203.120.28
#   APP_URL=https://school-iraq.com ./deploy.sh deploy@159.203.120.28
#
# Requirements:
#   - SSH key configured for passwordless login
#   - rsync, scp, curl available locally
#   - Node.js + npm on VPS
#   - PM2 installed globally on VPS
#   - .env.production file with secrets
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[deploy]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[deploy]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[deploy]${NC} $*" >&2
}

# Parse arguments
REMOTE="${1:-}"
if [[ -z "$REMOTE" ]]; then
  log_error "Usage: $0 <user@host>"
  log_error "Example: $0 deploy@159.203.120.28"
  exit 1
fi

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOST="${REMOTE##*@}"
APP_USER="${REMOTE%%@*}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/school-app}"
APP_PORT="${APP_PORT:-3001}"
APP_URL="${APP_URL:-https://school-iraq.com}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_DELAY="${HEALTH_DELAY:-2}"

log_info "Deployment Configuration:"
log_info "  Remote: $REMOTE"
log_info "  Directory: $REMOTE_DIR"
log_info "  Port: $APP_PORT"
log_info "  URL: $APP_URL"
echo ""

# Validate local tools
log_info "Validating local tools..."
for cmd in ssh rsync scp curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "Missing required command: $cmd"
    exit 1
  fi
done
log_info "✓ All required tools present"
echo ""

# Check .env.production exists
if [[ ! -f "$ROOT_DIR/.env.production" ]]; then
  log_error ".env.production not found in $ROOT_DIR"
  log_info "Create it from .env.production.example:"
  log_info "  cp .env.production.example .env.production"
  log_info "  nano .env.production  # Fill in your secrets"
  exit 1
fi
log_info "✓ .env.production found"
echo ""

# Test SSH connectivity
log_info "Testing SSH connection to $REMOTE..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE" "echo connected" >/dev/null 2>&1; then
  log_error "Cannot connect to $REMOTE via SSH"
  log_info "Check:"
  log_info "  - SSH key is configured (~/.ssh/config or -i <key>)"
  log_info "  - Host is reachable"
  log_info "  - User/port are correct"
  exit 1
fi
log_info "✓ SSH connection successful"
echo ""

# Create remote directory
log_info "Creating remote directory..."
ssh "$REMOTE" "mkdir -p '$REMOTE_DIR'"
log_info "✓ Remote directory ready"
echo ""

# Sync files
log_info "Syncing project files to $REMOTE:$REMOTE_DIR..."
rsync -az \
  --delete \
  --exclude ".env" \
  --exclude ".env.local" \
  --exclude ".env.*.local" \
  --exclude ".env.production" \
  --exclude ".git" \
  --exclude ".github" \
  --exclude ".next" \
  --exclude ".next*" \
  --exclude "node_modules" \
  --exclude ".playwright-cli" \
  --exclude ".augment" \
  --exclude ".claude" \
  --exclude ".codex" \
  --exclude ".continue" \
  --exclude ".vscode" \
  --exclude ".DS_Store" \
  --exclude "artifacts" \
  --exclude "coverage" \
  --exclude "tests" \
  --exclude "docs" \
  --exclude "*.md" \
  --exclude "*.txt" \
  -e ssh \
  "$ROOT_DIR/" "$REMOTE:$REMOTE_DIR/"

log_info "✓ Files synced"
echo ""

# Upload .env.production
log_info "Uploading .env.production..."
scp -q "$ROOT_DIR/.env.production" "$REMOTE:$REMOTE_DIR/.env.production.tmp"
ssh "$REMOTE" "chmod 600 '$REMOTE_DIR/.env.production.tmp' && mv '$REMOTE_DIR/.env.production.tmp' '$REMOTE_DIR/.env.production'"
log_info "✓ .env.production deployed (secrets protected)"
echo ""

# Build on server
log_info "Building on server..."
ssh "$REMOTE" "set -euo pipefail
  cd '$REMOTE_DIR'
  echo 'Installing dependencies...'
  npm ci
  echo 'Building...'
  npm run build
  echo 'Build complete'"
log_info "✓ Build successful"
echo ""

# Restart with PM2
log_info "Restarting PM2 app..."
ssh "$REMOTE" "set -euo pipefail
  if pm2 list | grep -q school-app; then
    pm2 restart school-app
  else
    pm2 start ecosystem.config.cjs
  fi
  pm2 save || true"
log_info "✓ PM2 restarted"
echo ""

# Health check
log_info "Running health checks... (max $HEALTH_RETRIES attempts)"
ATTEMPT=0
HEALTH_OK=0

while [[ $ATTEMPT -lt $HEALTH_RETRIES ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  if curl -fsS --max-time 5 "http://$APP_HOST:$APP_PORT/api/ping" >/dev/null 2>&1; then
    HEALTH_OK=1
    break
  fi
  echo "  Attempt $ATTEMPT/$HEALTH_RETRIES... waiting ${HEALTH_DELAY}s"
  sleep "$HEALTH_DELAY"
done

if [[ $HEALTH_OK -eq 1 ]]; then
  log_info "✓ Health check passed"
  echo ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "✓ DEPLOYMENT SUCCESSFUL"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "App running at: $APP_URL"
  log_info "Server: $REMOTE"
  log_info "Port: $APP_PORT"
  echo ""
  log_info "View logs:"
  log_info "  ssh $REMOTE 'pm2 logs school-app'"
  exit 0
else
  log_error "✗ Health check failed after $HEALTH_RETRIES attempts"
  log_warn "App may be starting. Check logs:"
  log_warn "  ssh $REMOTE 'pm2 logs school-app'"
  exit 1
fi
