Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phase 1 is complete.

PHASE 2A GOAL
Implement the server-side proximity engine and the neighbor-validated signaling relay, then prove the 20ms requirement with a benchmark.

DO
1. services/proximity.ts: the proximity tick exactly as in spec section 7. Use MongoDB $geoWithin/$near against the 2d index, neighbor-set diffing, hysteresis (connect at HEARING_RADIUS, disconnect beyond DISCONNECT_RADIUS or when pushed out of the nearest MAX_PEERS). Emit `peer:connect` (with deterministic `initiator`: lower userId initiates) and `peer:disconnect`. Log tick duration with pino.
2. services/signaling.ts: relay `signal:offer`, `signal:answer`, `signal:ice` only if `to` is in the sender's current neighbor set. Deliver through the `user:{userId}` room. Drop and log violations. Add per-socket token-bucket rate limits (move <= 30/s, signal <= 50/s).
3. scripts/bench-proximity.ts: seed 200 fake presences in a test office (random positions plus several dense clusters), run 1,000 neighbor queries with both $geoWithin and $near, and print p50/p95/p99/max latency. Also capture and save `explain("executionStats")` output to docs/bench/proximity-explain.json.
4. Unit tests for neighbor diffing and hysteresis (including a peer oscillating between 95px and 125px must not flap), and integration tests proving a signal to a non-neighbor is dropped.

DO NOT
Touch the client WebRTC code, Redis, or audio.

ACCEPTANCE (verify and attach evidence)
- Benchmark output table showing p95 < 20ms for the 200-presence dataset. Include totalDocsExamined and the index used. If the target is missed, diagnose and fix (index, query shape, projection, lean) and re-run. Do not weaken the target.
- Integration test with 3 socket clients: A and B within 100px receive peer:connect with exactly one initiator, C far away receives nothing, A moves away past 120px and both receive peer:disconnect.
- All tests, lint, and typecheck pass.

PROCESS
Plan first and wait for approval. Commit per task. Save the benchmark report to docs/bench/ and include it in the Walkthrough.
