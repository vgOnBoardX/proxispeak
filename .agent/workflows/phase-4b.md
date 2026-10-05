Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phase 4A is complete.

PHASE 4B GOAL
Harden the app, prepare deployment, and produce the final review package.

DO
1. Hardening: audit every socket handler and HTTP route for zod validation, rate limits, auth checks, and error handling. Add client error toasts for mic denied, connection lost, reconnecting, and peer failed.
2. Resilience tests: server restart while clients connected, network drop and reconnect, tab close, duplicate login.
3. Deployment: production Dockerfiles (multi-stage), production docker-compose with Mongo, Redis, 2 server instances, Nginx serving built client and proxying WebSockets, coturn. HTTPS via documented Let's Encrypt/Caddy approach. DEPLOY.md with exact VPS steps and firewall ports.
4. CI: GitHub Actions workflow running install, typecheck, lint, unit tests, and Supertest tests.
5. Documentation: README (what it is, architecture diagram as Mermaid, quick start, scripts, env vars), docs/SOCKET_EVENTS.md, docs/DESIGN_DECISIONS.md, docs/BENCHMARKS.md.
6. Final full verification pass: run every test suite, proximity benchmark, and 50-bot load test.

ACCEPTANCE (verify and attach evidence)
- All suites green in CI-equivalent local run.
- Spec section 12 targets each marked pass/fail with evidence links.
- A one-command local demo (`npm run demo`).
- A checklist-style final REVIEW.md.

PROCESS
Plan first and wait for approval. Commit per task. Finish with a Walkthrough artifact with pass/fail table for every target.
