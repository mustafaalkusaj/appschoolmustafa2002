#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_HOST="${APP_HOST:-46.224.6.136}"
APP_USER="${APP_USER:-deploy}"
APP_DIR="${APP_DIR:-/var/www/school-app}"
APP_URL="${APP_URL:-https://school-iraq.com}"
APP_PORT="${APP_PORT:-3001}"
SSH_KEY="${SSH_KEY:-/Users/musatafa/.ssh/school_deploy}"
REMOTE="${APP_USER}@${APP_HOST}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[deploy:direct] Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd rsync
require_cmd ssh
require_cmd scp
require_cmd curl

SSH_ARGS=(
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=10
)

if [[ -n "$SSH_KEY" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY")
fi

RSYNC_SSH="ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
if [[ -n "$SSH_KEY" ]]; then
  RSYNC_SSH="$RSYNC_SSH -i $SSH_KEY"
fi

TMP_ENV_FILE="$(mktemp)"
GENERATED_ENV=0

cleanup() {
  rm -f "$TMP_ENV_FILE"
}

trap cleanup EXIT

if node "$ROOT_DIR/scripts/render-production-env.mjs" "$TMP_ENV_FILE" >/dev/null 2>&1; then
  GENERATED_ENV=1
  echo "[deploy:direct] Prepared local production env payload."
else
  : > "$TMP_ENV_FILE"
  echo "[deploy:direct] WARN local production env is incomplete; will preserve existing remote secrets."
fi

# Gate: the remote build skips its own type-check to stay inside the host's
# memory budget, so this run is the only thing standing between a type error
# and production. Failing here must abort the deploy.
echo "[deploy:direct] Type-checking locally before shipping..."
if ! (cd "$ROOT_DIR" && npm run typecheck); then
  echo "[deploy:direct] Type-check failed; refusing to deploy." >&2
  exit 1
fi

echo "[deploy:direct] Checking SSH reachability for $REMOTE..."
ssh "${SSH_ARGS[@]}" "$REMOTE" "printf '%s\n' connected" >/dev/null

echo "[deploy:direct] Ensuring remote app directory exists..."
ssh "${SSH_ARGS[@]}" "$REMOTE" "mkdir -p '$APP_DIR'"

echo "[deploy:direct] Syncing repository to $APP_DIR..."
rsync -az --delete \
  -e "$RSYNC_SSH" \
  --exclude ".env" \
  --exclude ".env.*" \
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
  --exclude ".qoder" \
  --exclude ".vscode" \
  --exclude ".DS_Store" \
  --exclude "00990090" \
  --exclude "artifacts" \
  --exclude "logs" \
  --exclude "output" \
  --exclude "school-acc-system" \
  --exclude "school-saas-next" \
  "$ROOT_DIR"/ "$REMOTE:$APP_DIR"/

# rsync excludes .git, so the checkout on the server stays frozen at whatever
# commit it was cloned at and `git log` there reports a version that has not
# run in months. Stamp what was actually shipped instead.
DEPLOYED_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
DEPLOYED_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
DEPLOYED_DIRTY="$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo "[deploy:direct] Shipping $DEPLOYED_BRANCH @ ${DEPLOYED_COMMIT:0:8} (${DEPLOYED_DIRTY} uncommitted files)..."
# DEPLOYED_VERSION is written after the swap, not here: stamping up front
# claimed a revision that a failed build never actually put into service.

if [[ "$GENERATED_ENV" -eq 1 ]]; then
  echo "[deploy:direct] Uploading regenerated production env file..."
  scp "${SSH_ARGS[@]}" "$TMP_ENV_FILE" "$REMOTE:$APP_DIR/.env.production.tmp" >/dev/null
  # Merge, never replace. Some secrets only ever existed on the server
  # (CRON_SECRET, for one), so overwriting wholesale silently strips them and
  # every endpoint authenticating with them starts returning 401. Rendered
  # values win; remote-only keys are carried forward and their names logged.
  ssh "${SSH_ARGS[@]}" "$REMOTE" "set -euo pipefail
    cd '$APP_DIR'
    chmod 600 .env.production.tmp

    if [ -f .env.production ]; then
      PRESERVED=\$(awk -F= '
        /^[A-Za-z_][A-Za-z0-9_]*=/ {
          key = substr(\$0, 1, index(\$0, \"=\") - 1)
          if (NR == FNR) { rendered[key] = 1; next }
          if (!(key in rendered)) print key
        }
      ' .env.production.tmp .env.production)

      if [ -n \"\$PRESERVED\" ]; then
        echo \"[deploy:direct] Preserving server-only env keys: \$(echo \$PRESERVED | tr '\\n' ' ')\"
        awk -F= '
          /^[A-Za-z_][A-Za-z0-9_]*=/ {
            key = substr(\$0, 1, index(\$0, \"=\") - 1)
            if (NR == FNR) { rendered[key] = 1; next }
            if (!(key in rendered)) print
          }
        ' .env.production.tmp .env.production >> .env.production.tmp
      fi
    fi

    mv .env.production.tmp .env.production
    chmod 600 .env.production"
else
  echo "[deploy:direct] Rewriting runtime keys in the existing remote env file..."
  ssh "${SSH_ARGS[@]}" "$REMOTE" "set -euo pipefail
    ENV_FILE='$APP_DIR/.env.production'
    mkdir -p '$APP_DIR'
    touch \"\$ENV_FILE\"
    chmod 600 \"\$ENV_FILE\"
    TMP_ENV_FILE=\$(mktemp)
    grep -Ev '^(NODE_ENV|HOSTNAME|PORT|APP_URL|SESSION_COOKIE_SECURE)=' \"\$ENV_FILE\" > \"\$TMP_ENV_FILE\" || true
    {
      cat \"\$TMP_ENV_FILE\"
      printf '%s\n' 'NODE_ENV=production'
      printf '%s\n' 'HOSTNAME=127.0.0.1'
      printf '%s\n' 'PORT=$APP_PORT'
      printf '%s\n' 'APP_URL=$APP_URL'
      printf '%s\n' 'SESSION_COOKIE_SECURE=true'
    } > \"\$ENV_FILE\"
    rm -f \"\$TMP_ENV_FILE\""
fi

echo "[deploy:direct] Installing dependencies and building remotely..."
# Build into a staging dir and swap it in only on success. Building straight
# into the served .next means a build that dies midway (the 7.7 GB host has
# been OOM-killed during the type-check phase) leaves the running app pointing
# at a half-written directory with no BUILD_ID — fine until the next restart,
# then fatal. SKIP_BUILD_TYPECHECK is safe here because the local typecheck
# gate above already passed; it just avoids running tsc twice on the small host.
ssh "${SSH_ARGS[@]}" "$REMOTE" "set -euo pipefail
  cd '$APP_DIR'
  npm install
  rm -rf .next-build
  mkdir -p .next-build

  # Memory budget for a 4-core / 7 GB host. The default build reached 7.4 GB
  # resident and was OOM-killed four deploys running; capping the workers and
  # the heap was not enough on its own, because webpack assembles its
  # filesystem cache in memory before serialising it. DISABLE_BUILD_CACHE
  # removes that peak at the cost of a slower, always-cold compile.
  if ! NEXT_DIST_DIR=.next-build \
       SKIP_BUILD_TYPECHECK=1 \
       BUILD_CPUS=2 \
       DISABLE_BUILD_CACHE=1 \
       NODE_OPTIONS='--max-old-space-size=3072' npm run build; then
    echo 'Remote build failed; leaving the running build untouched.' >&2
    rm -rf .next-build
    exit 1
  fi

  if [ ! -s .next-build/BUILD_ID ]; then
    echo 'Build produced no BUILD_ID; refusing to swap it in.' >&2
    rm -rf .next-build
    exit 1
  fi

  rm -rf .next.previous
  [ -d .next ] && mv .next .next.previous
  mv .next-build .next
  echo \"[deploy:direct] Swapped in build \$(cat .next/BUILD_ID)\"

  # Only now is this revision actually in service, so only now is it true.
  cat > DEPLOYED_VERSION <<STAMP
commit=$DEPLOYED_COMMIT
branch=$DEPLOYED_BRANCH
uncommitted_files_at_deploy=$DEPLOYED_DIRTY
build_id=\$(cat .next/BUILD_ID)
deployed_at=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
STAMP"

echo "[deploy:direct] Restarting the application..."
ssh "${SSH_ARGS[@]}" "$REMOTE" "set -euo pipefail
  if sudo -n systemctl restart pm2-deploy; then
    exit 0
  fi

  if command -v pm2 >/dev/null 2>&1; then
    # Use the committed ecosystem config (fork mode, single instance, fixed port).
    # Do NOT use cluster mode (-i N): 'next start' binds one fixed port, so multiple
    # cluster workers all fight for it -> EADDRINUSE crash loop.
    cd '$APP_DIR'
    PM2_HOME=/home/deploy/.pm2 pm2 startOrReload ecosystem.config.cjs --update-env
    PM2_HOME=/home/deploy/.pm2 pm2 save
    exit 0
  fi

  echo 'PM2 restart path unavailable.' >&2
  exit 1"

echo "[deploy:direct] Waiting for local runtime health..."
ssh "${SSH_ARGS[@]}" "$REMOTE" "set -euo pipefail
  ATTEMPT=1
  MAX_ATTEMPTS=30
  while [ \"\$ATTEMPT\" -le \"\$MAX_ATTEMPTS\" ]; do
    if curl -fsS --max-time 5 'http://127.0.0.1:$APP_PORT/api/ping' >/dev/null 2>&1; then
      exit 0
    fi
    ATTEMPT=\$((ATTEMPT + 1))
    sleep 2
  done

  echo 'Health check failed. Collecting diagnostics...' >&2
  sudo -n ss -ltnp | grep ':$APP_PORT ' || true
  sudo -u deploy -H env PM2_HOME=/home/deploy/.pm2 pm2 logs school-app --lines 100 --nostream || true
  sudo -n journalctl -u pm2-deploy -n 100 --no-pager || true
  exit 1"

if [[ "$GENERATED_ENV" -eq 1 ]]; then
  export HEALTHCHECK_TOKEN
  HEALTHCHECK_TOKEN="$(awk -F= '/^HEALTHCHECK_TOKEN=/{sub(/^HEALTHCHECK_TOKEN=/, ""); print}' "$TMP_ENV_FILE")"
fi

echo "[deploy:direct] Running post-deploy smoke checks against $APP_URL..."
APP_URL="$APP_URL" node "$ROOT_DIR/scripts/postdeploy-smoke.mjs" "$APP_URL"
APP_URL="$APP_URL" node "$ROOT_DIR/scripts/uptime-check.mjs" "$APP_URL"

echo "[deploy:direct] Deployment completed successfully."
