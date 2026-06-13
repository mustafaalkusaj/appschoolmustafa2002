# School App Ops Runbook

## Current Production Topology

- App path: `/var/www/school-app`
- Runtime: `Next.js` behind `PM2`
- PM2 systemd unit: `pm2-deploy.service`
- Internal app bind: `127.0.0.1:3001`
- Nginx vhost: `/etc/nginx/sites-available/school-app.conf`
- Public URL: `https://school-iraq.com`
- Health endpoint: `/api/ping`
- Offsite backup env: `/root/.config/school-app/offsite-backup.env`

## Restart

Restart application only:

```bash
ssh deploy@159.203.120.28 "sudo -n systemctl restart pm2-deploy"
```

Restart after validating Nginx config:

```bash
ssh deploy@159.203.120.28 "sudo -n nginx -t && sudo -n systemctl reload nginx"
```

## Status Checks

Quick app status:

```bash
ssh deploy@159.203.120.28 "systemctl is-active pm2-deploy && systemctl is-enabled pm2-deploy"
```

PM2 process status:

```bash
ssh deploy@159.203.120.28 "sudo -u deploy -H env PM2_HOME=/home/deploy/.pm2 pm2 ls"
```

Local health check:

```bash
ssh deploy@159.203.120.28 "curl -fsS http://127.0.0.1:3001/api/ping"
```

Public health check:

```bash
curl -fsS https://school-iraq.com/api/ping
```

Port check:

```bash
ssh deploy@159.203.120.28 "sudo -n ss -ltnp | grep ':3001 '"
```

## Logs

PM2 application logs:

```bash
ssh deploy@159.203.120.28 "sudo -u deploy -H env PM2_HOME=/home/deploy/.pm2 pm2 logs school-app --lines 100 --nostream"
```

PM2 service journal:

```bash
ssh deploy@159.203.120.28 "sudo -n journalctl -u pm2-deploy -n 100 --no-pager"
```

Nginx error log:

```bash
ssh deploy@159.203.120.28 "sudo -n tail -n 100 /var/log/nginx/error.log"
```

Nginx access log:

```bash
ssh deploy@159.203.120.28 "sudo -n tail -n 100 /var/log/nginx/access.log"
```

Combined operational summary:

```bash
ssh deploy@159.203.120.28 "sudo -n /usr/local/bin/school-app-ops-summary.sh"
```

## Backups

Local backup cron:

- file: `/etc/cron.d/school-app-backup`
- log: `/var/log/school-app-backup.log`
- script: `/usr/local/bin/school-app-backup.sh`

Offsite backup cron:

- file: `/etc/cron.d/school-app-offsite-backup`
- log: `/var/log/school-app-offsite-backup.log`
- runner: `/usr/local/bin/school-app-offsite-backup-runner.sh`

Offsite restore check cron:

- file: `/etc/cron.d/school-app-offsite-restore`
- log: `/var/log/school-app-offsite-restore.log`
- runner: `/usr/local/bin/school-app-offsite-restore-runner.sh`

Latest backup status:

```bash
ssh deploy@159.203.120.28 "sudo -n cat /var/lib/school-app/monitoring/offsite-backup.status"
```

Latest restore-check status:

```bash
ssh deploy@159.203.120.28 "sudo -n cat /var/lib/school-app/monitoring/offsite-restore.status"
```

Recent backup alerts:

```bash
ssh deploy@159.203.120.28 "sudo -n tail -n 50 /var/log/school-app-alerts.log"
```

Manual offsite backup run:

```bash
ssh deploy@159.203.120.28 "sudo -n /usr/local/bin/school-app-offsite-backup-runner.sh"
```

Manual offsite restore check:

```bash
ssh deploy@159.203.120.28 "sudo -n /usr/local/bin/school-app-offsite-restore-runner.sh"
```

## Restore Check

The current restore check restores the latest offsite snapshot into:

- `/tmp/restic-restore-check`

Review restored files:

```bash
ssh deploy@159.203.120.28 "find /tmp/restic-restore-check -type f | sort | head -n 50"
```

Inspect recent alert events from syslog:

```bash
ssh deploy@159.203.120.28 "sudo -n journalctl -t school-app-alert -n 50 --no-pager"
```

## Phase 2: Safe Staging Restore

Do not restore into production.

Required staging secrets:

- `STAGING_NEXT_PUBLIC_SUPABASE_URL`
- `STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_SUPABASE_DB_URL`

Recommended path:

1. Create a separate Supabase staging project.
2. Restore the latest SQL dump into staging only.
3. Validate schema, RLS, policies, and critical table counts.
4. If needed, run a separate staging app instance on port `3002`.

Restore command:

```bash
psql "$STAGING_SUPABASE_DB_URL" -f /opt/backups/school-app/2026-04-16-031501/supabase.sql | tee /var/log/school-app-staging-restore.log
```

Schema verification:

```bash
psql "$STAGING_SUPABASE_DB_URL" -f /Users/musatafa/school-app/scripts/verify-production-db.sql
```

Basic table counts:

```bash
psql "$STAGING_SUPABASE_DB_URL" <<'SQL'
SELECT 'user_profiles' AS table_name, count(*) FROM public.user_profiles
UNION ALL
SELECT 'subscriptions', count(*) FROM public.subscriptions
UNION ALL
SELECT 'notifications', count(*) FROM public.notifications
UNION ALL
SELECT 'managed_user_profiles', count(*) FROM public.managed_user_profiles
ORDER BY table_name;
SQL
```

## Important Paths

- App: `/var/www/school-app`
- PM2 config: `/var/www/school-app/ecosystem.config.cjs`
- Production env: `/var/www/school-app/.env.production`
- Nginx vhost: `/etc/nginx/sites-available/school-app.conf`
- PM2 logs: `/home/deploy/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- Local backups: `/opt/backups/school-app`
- Offsite monitoring state: `/var/lib/school-app/monitoring`
- Offsite secrets: `/root/.config/school-app/offsite-backup.env`

## Emergency Commands

Tail live PM2 service logs:

```bash
ssh deploy@159.203.120.28 "sudo -n journalctl -u pm2-deploy -f"
```

Tail live Nginx error log:

```bash
ssh deploy@159.203.120.28 "sudo -n tail -f /var/log/nginx/error.log"
```

Confirm Nginx still points to the expected upstream:

```bash
ssh deploy@159.203.120.28 "sudo -n grep -n 'proxy_pass' /etc/nginx/sites-available/school-app.conf"
```

Confirm application port and listener:

```bash
ssh deploy@159.203.120.28 "sudo -n awk -F= '/^PORT=/{print}' /var/www/school-app/.env.production && sudo -n ss -ltnp | grep ':3001 '"
```

Run a safe full operational summary:

```bash
ssh deploy@159.203.120.28 "sudo -n /usr/local/bin/school-app-ops-summary.sh"
```

## Safety Rules

- Do not run `psql -f` against `SUPABASE_DB_URL` for production.
- Do not edit `/root/.config/school-app/offsite-backup.env` without preserving mode `600`.
- Do not restart Nginx without `nginx -t`.
- Do not change the application port unless `.env.production`, `ecosystem.config.cjs`, and Nginx are updated together.
