Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phases 1 and 2 are complete.

PHASE 3A GOAL
Make the server horizontally scalable across Node instances and optimize the WebRTC mesh, then prove it with a 50-bot load test.

DO
1. Integrate @socket.io/redis-adapter. Add INSTANCE_ID to presence documents and logs.
2. Update infra/docker-compose.yml with a `scale` profile: server1, server2, and Nginx with WebSocket upgrade headers. Websocket-only transport means sticky sessions are not required, but document why.
3. Verify and fix cross-instance correctness: positions broadcast across instances, signaling relay across instances via the `user:{userId}` room, single-session-per-user enforcement across instances (use the adapter or a Redis key), presence cleanup when an instance dies (TTL), and proximity running correctly when neighbors are on different instances.
4. Mesh limits: enforce MAX_PEERS nearest peers on the server (spec section 7) and handle the client side gracefully when a peer is dropped for capacity.
5. Reconnect behavior: if a socket drops and reconnects, rejoin the office and re-establish peer connections without a page reload.
6. scripts/bots.ts: N bot clients (default 50) that log in, join, and random-walk with some clustering, split evenly across both instances. Report per-minute: server CPU, event-loop delay p50/p99, proximity tick duration p50/p95/max, messages/sec.

DO NOT
Change client audio handling or the layout model.

ACCEPTANCE (verify and attach evidence)
- Test: user on instance 1 and user on instance 2 within 100px get peer:connect and complete a signaling exchange.
- Test: killing one instance and restarting it leaves the other users functional, and stale presence expires.
- Load test with 50 bots for 3 minutes meeting the spec section 12 targets, with the numbers in docs/bench/load-test.md.
- typecheck, lint, and tests pass.

PROCESS
Plan first and wait for approval. Commit per task. Walkthrough artifact must include the load test report and any bottlenecks found.
