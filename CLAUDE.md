# CLAUDE.md

Context for Claude Code working in this repository.

## Project

Distributed rate limiter, built as a portfolio project for backend SWE interviews. Three algorithms (token bucket, fixed window, sliding window log) run as atomic Lua scripts in Redis, shared by three Node.js instances behind an NGINX round robin load balancer. Includes fail-open mode, a circuit breaker and automatic Redis reconnect.

Repo: github.com/ahmed15886/distributed-rate-limiter
Local path: `~/Documents/Projects/rate-limiter` (macOS, Apple Silicon)

The core claim the project has to prove: one limit stays correct across several instances under concurrent load. That needs two things, shared state (Redis) and atomicity (Lua). Keep those two ideas separate in every explanation. They were blurred together earlier in development.

## How to work with me

I'm building this to learn, not just to finish it. Please:

- **Explain the concept before the code.** Why before how.
- **Explain every command** before I run it, including flags.
- **Go one step at a time.** Ask me to predict results before running tests.
- **Don't bundle extra changes.** If something is out of scope, list it as deferred instead of doing it. Respect what we've agreed to postpone.
- **Prefer small edits over full file rewrites,** unless I ask for the whole file.
- **Be consistent.** I push back when answers contradict earlier ones. If you were wrong, say so plainly.
- **Diagnose from evidence.** Check actual state (`docker ps`, file contents, logs) before guessing. Many past problems came from assuming state instead of checking it.
- **Keep it brief and direct.** No em dashes. Simplify when I say something is too complicated.
- I want to learn the **Git GUI in VS Code**, and the CLI alongside it.

## Stack

- Node.js 24.18 via nvm, Express 5, node-redis 6 (CommonJS, `require`)
- Redis 8 in Docker
- NGINX in Docker
- k6 via the `grafana/k6` Docker image
- nodemon for development

## Running it

```bash
docker-compose up -d          # Redis + NGINX
PORT=3001 npm run dev         # one terminal each
PORT=3002 npm run dev
PORT=3003 npm run dev
curl http://localhost/api/redis/token-bucket
```

The Node instances run on the host, not in Docker. NGINX reaches them via `host.docker.internal:3001-3003`.

Reset a limiter key before a test:
```bash
docker exec rate-limiter-redis-1 redis-cli DEL rate:global
```

k6 burst test (100 concurrent requests, limit 10). `TARGET` picks the route:
```bash
docker run --rm -i grafana/k6 run - < loadtests/concurrency.js
docker run --rm -i grafana/k6 run -e TARGET=/api/token-bucket - < loadtests/concurrency.js
```

## Files

| File | Purpose |
|---|---|
| `server.js` | Express app, six routes, `startServer()` listens even if Redis is down |
| `redisClient.js` | Client config, all options inside `socket`, reconnect strategy |
| `unsafeRateLimiter.js` | `unsafeTokenBucketAllow`: token bucket with separate `hmGet` / `hSet`, no Lua, no breaker. Deliberate atomicity demo |
| `redisRateLimiter.js` | `tokenBucketAllow`, `fixedWindowAllow`, `slidingWindowAllow`: breaker check, `withTimeout(..., 200)`, fail mode |
| `circuitBreaker.js` | `createCircuitBreaker(3, 10000)`, `canAttempt`, `recordSuccess`, `recordFailure` |
| `tokenBucket.js`, `fixedWindow.js`, `slidingWindow.js` | In-memory versions, kept for comparison |
| `lua/*.lua` | Atomic Redis versions. Token bucket and fixed window use hashes, sliding window uses a sorted set |
| `boundaryTest.js` | Shows the fixed window boundary exploit against sliding window |
| `loadtests/concurrency.js` | k6 burst test, reads `__ENV.TARGET` |
| `loadtests/steady.js` | k6 constant arrival rate, `TARGET`, `RATE` (200), `DURATION` (30s). 429 counted as expected, `errors` counter for anything else |
| `nginx.conf` | Upstream `nodejs_servers`, round robin |
| `docker-compose.yml` | Redis and NGINX services |

Redis keys: `rate:global` (token bucket), `rate:fixed:global`, `rate:sliding:global`, `rate:unsafe` (non-atomic demo).

Environment variables: `PORT` (default 3000), `FAIL_MODE` (`open` default, or `closed`), `LIMIT` (default 10, Redis + Lua routes only).

## Git workflow

- One feature branch per piece of work, named `feature/<name>`
- Small commits, one logical change each, clear messages
- Merge by standing on the destination: `git checkout main`, then `git merge feature/<name>`, then `git branch -d feature/<name>`
- Remote `origin` is set up. From now on, prefer merging through a pull request on GitHub to practise that flow
- Current branch: `feature/load-testing`

## Results so far

| Test | Result |
|---|---|
| 100 concurrent requests, Redis + Lua | 10 allowed, 90 limited, p95 19 ms |
| Same burst, in-memory route | 30 allowed (10 per instance) |
| Same burst, Redis without Lua | 57, 100, 94 allowed over three runs (Lua control in same session: 10) |
| Fixed window across a boundary | 10 allowed in about 0.3 s, limit 5 |
| Sliding window, same test | 5 allowed |
| Steady 200 req/s, limit 10 | p95 1.3 to 2.8 ms, ranking follows run order, not algorithm |
| Steady 200 req/s, limit 100,000 | p95 about 2.65 ms for all three. Memory: hashes about 100 bytes, sliding window 563 KB for 5,999 entries |
| Breaker with Redis paused, 3 s timeout | requests 1 to 9 about 3 s, 10 to 12 about 0.01 s |
| Breaker recovery | failed probe reopens, successful probe closes, both verified |

## Status and next steps

Phases 1 to 5 are done and merged. In Phase 6 (load testing).

Algorithm comparison is done: latency identical, memory is the difference. Redis without Lua is done: `/api/redis-unsafe/token-bucket` allowed 57, 100 and 94 of 100 (limit 10), confirming atomicity matters independently of shared state.

**Then, in order:**
1. Merge `feature/load-testing` via a pull request
2. Middleware to collapse the six near-identical route handlers
3. Cleanups: delete the obsolete `version` line in `docker-compose.yml`, rename the `window` variable in `server.js`
4. Per-user limits (key per user or API key)
5. Unit tests for the three algorithms
6. Full Docker Compose: Dockerfile, three app services, Redis host and NGINX upstreams switch to service names
7. TLA+ specification of the token bucket
8. Rerun benchmarks on the final setup, update README tables
9. Resume bullet and interview prep

Keep `README.md` in sync when results or structure change.

## Gotchas learned the hard way

- **node-redis options must be inside `socket`.** At the top level they are silently ignored. That once caused an infinite reconnect loop and a 5 second wait on every request.
- **Use `127.0.0.1`, not `localhost`,** for Redis. Otherwise the client tries IPv6 `::1` first.
- **Two Redis containers existed.** The old standalone `redis-rate-limiter` from Phase 1 is gone (checked 2026-10-10). `rate-limiter-redis-1` is the Compose one. If another Redis container ever appears, starting the wrong one silently invalidates tests.
- **`docker stop` vs `docker pause`.** Stop makes Redis disappear, so calls fail fast. Pause freezes it with the connection open, so calls hang. Use pause to test the circuit breaker.
- **The breaker is per instance.** With round robin, each instance sees a third of the requests, so it takes 3 failures per instance to trip. Breaker state only changes when a request arrives, not when Redis recovers.
- **NGINX passive health checks.** After a failed connection, NGINX marks an upstream down for 10 seconds (`max_fails=1`, `fail_timeout=10s`). After restarting servers, wait before load testing, or you get "no live upstreams" 502s.
- **k6 counts 429 as failed.** In the burst test, 90% failed is the correct result.
- **Sequential curl loops cannot produce race conditions.** Use k6 for concurrency.
- **Orphaned node processes.** Closing a terminal without `Ctrl + C` can leave servers running. Check with `ps aux | grep server.js`.
- **`Ctrl + C` in an attached `docker-compose up` stops every container.** Use `-d` to run detached.
