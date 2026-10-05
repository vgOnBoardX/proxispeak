You are building ProxiSpeak. First read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely.

PHASE 1A GOAL
Create the monorepo foundation, auth, the Socket.io server with in-memory presence, and the MongoDB schemas with batched persistence.

DO
1. Scaffold npm workspaces: shared/, server/, client/, scripts/. TypeScript strict everywhere, ESLint + Prettier, Vitest configured. Put all constants from spec section 4 in shared/src/constants.ts and all zod event schemas from section 6 in shared/src/events.ts.
2. infra/docker-compose.yml with mongo:7 and redis:7 (named volumes, healthchecks). .env.example per spec section 10.
3. Express server: config loader (zod-validated env), pino logger, helmet, CORS from env, Mongo connection, GET /health.
4. Models: User, Office, Presence exactly as spec section 5, including the compound 2d index and the TTL index.
5. Auth: POST /auth/register, POST /auth/login (bcryptjs, JWT, rate limited), GET /auth/me.
6. scripts/seed.ts: create users alice, bob, carol, dave (password in .env.example, dev only) and one default Office with spawn points and a few walls.
7. Socket.io server (websocket transport only) with JWT handshake auth, single-session-per-user enforcement, `join` handler (ack with self, office, peers, iceServers), `move` handler (zod, bounds clamp, speed check, position:correct), in-memory presence map with dirty flags, batched `positions` broadcast at SERVER_BROADCAST_HZ, presence bulkWrite flush every PRESENCE_FLUSH_MS, heartbeat touch every PRESENCE_HEARTBEAT_MS, presence deletion on disconnect.

DO NOT
Build any client UI, WebRTC, proximity queries, Redis adapter, or audio. Those are later phases.

ACCEPTANCE (verify and attach evidence)
- `npm run typecheck`, `npm run lint`, `npm test` all pass.
- Unit tests: speed-check and bounds clamping, zod schema rejection of malformed payloads.
- Supertest tests for register/login/me including wrong-password and duplicate-email cases.
- An integration test using two socket.io-client instances that join, move, and receive each other's `positions`.
- A script or test proving that after moving, the Presence document in MongoDB updates within about 200ms and that MongoDB write count is batched (log the number of bulkWrite calls versus the number of move events).
- `db.presences.getIndexes()` output showing the 2d and TTL indexes.

PROCESS
Produce the Implementation Plan and Task List first and wait for my approval before writing code. Commit per task. End with a Walkthrough artifact.
