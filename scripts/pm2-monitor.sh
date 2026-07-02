#!/usr/bin/env bash
# PM2 Telegram alert — runs every minute via cron.
# Sends a message when any school-app instance restarts.

STATE_FILE="/tmp/pm2-school-restarts"
ENV_FILE="/var/www/school-app/.env.production"

BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
CHAT_ID=$(grep '^TELEGRAM_CHAT_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)

[ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ] && exit 0

# Sum of restart_time across all school-app instances
TOTAL=$(PM2_HOME=/home/deploy/.pm2 pm2 jlist 2>/dev/null | \
  python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    total = sum(p['pm2_env']['restart_time'] for p in data if p.get('name') == 'school-app')
    print(total)
except:
    print(0)
")

[ -z "$TOTAL" ] && exit 0

PREV=0
[ -f "$STATE_FILE" ] && PREV=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
echo "$TOTAL" > "$STATE_FILE"

if [ "$TOTAL" -gt "$PREV" ]; then
  DELTA=$((TOTAL - PREV))
  TEXT="🔄 PM2 Restart Alert

school-iraq.com — ${DELTA} restart(s)
Total restarts: ${TOTAL}
Time: $(date '+%Y-%m-%d %H:%M:%S UTC')"
  curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$TEXT")}" \
    > /dev/null
fi
