# Rate limiting: Redis backend

`lib/rate-limit.ts` talks to Redis through `@upstash/redis`, which is a REST
client. That choice is deliberate: `proxy.ts` (the middleware) imports the
limiter and middleware runs on the edge runtime, where a TCP client such as
`ioredis` cannot load.

Production does **not** use Upstash cloud. The app host runs:

- `redis-server` bound to `127.0.0.1` only, with `requirepass`, `maxmemory
  128mb`, `allkeys-lru`, and persistence disabled (rate-limit counters are
  ephemeral, and the box has 7.7 GB shared with `next build`).
- a `hiett/serverless-redis-http` container (`--network host`, port 8079) that
  exposes the Upstash REST protocol in front of it.

Both ports are closed to the internet by ufw (default-deny INPUT, with explicit
`deny 6379` and `deny 8079`). Secrets live in root-owned files on the host:

| File | Contents |
| --- | --- |
| `/etc/redis/redis-app-password` | Redis `requirepass` value |
| `/etc/redis/srh-token` | Bearer token SRH accepts, also `UPSTASH_REDIS_REST_TOKEN` |
| `/etc/redis/redis.conf.d-app.conf` | the app-specific Redis config, included from `redis.conf` |

## Verify it is actually in use

Hitting the limiter must create keys in Redis. From the app host:

```bash
for i in $(seq 1 24); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://127.0.0.1:3001/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"ratelimit-probe@example.invalid","password":"wrong"}'
done; echo
redis-cli -a "$(sudo cat /etc/redis/redis-app-password)" --no-auth-warning \
  --scan --pattern 'school-app:rate-limit:*'
```

Expect twenty `401`s then `429`s, **and at least one key**. Twenty `401`s
followed by `429`s with *no* Redis key means the limiter fell back to its
in-process bucket and the configuration is not reaching the app.

## The trap that hid this once already

Next.js ranks `.env.local` above `.env.production`. The server's `.env.local`
declared `UPSTASH_REDIS_REST_URL=""` and `UPSTASH_REDIS_REST_TOKEN=""`, so the
correctly-populated `.env.production` was overridden by empty strings and the
limiter ran in memory while looking configured. Check `.env.local` first when
an env var "is set" but the app disagrees.

## Failure behaviour

If Redis is unreachable, `enforceRateLimit` defaults to `memory-fallback`: the
in-process token bucket still limits, and the failure is logged once per
namespace. It does not fail open, and it does not take the site down.
