Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phase 1A is complete and merged.

PHASE 1B GOAL
Build the React client with login, the canvas world, smooth movement, and remote avatar rendering.

DO
1. client/: Vite + React 18 + TypeScript + Zustand. Login/register screen, JWT in sessionStorage, dev-only quick-login buttons for the seeded users.
2. net/socket.ts: Socket.io client (websocket only) with handshake auth, join flow, reconnect handling, and typed events from shared/.
3. game/: requestAnimationFrame loop living outside React state (refs), two stacked canvases (static map layer, dynamic avatar layer), WASD/arrow movement with delta-time, click-to-move, world bounds, CLIENT_MOVE_HZ emit throttle with `seq`.
4. Render: office background, walls from the Office document, local avatar plus remote avatars with name labels and the hearing-radius ring on the local avatar. Remote avatars use interpolation between the two latest snapshots. Zero allocations per frame (reuse objects and arrays).
5. A small HUD showing connection status, my position, and number of users online.
6. README: how to run Mongo/Redis, seed, start server and client, and open two users in two tabs.

DO NOT
Add WebRTC, microphone access, audio, proximity logic, or layout editing.

ACCEPTANCE (verify and attach evidence)
- Use the browser sub-agent to open two tabs, quick-login as alice and bob, move one avatar, and record that the other tab sees smooth movement. Attach the recording or screenshots.
- Disconnect one tab and confirm the avatar disappears in the other tab within a second, and that the Presence document is deleted.
- Chrome DevTools Performance capture (or equivalent measurement script) with 10 simulated remote avatars showing no steady allocation growth and stable frame times. Report the numbers.
- typecheck, lint, and tests pass. Add unit tests for the interpolation function and input-to-velocity mapping.

PROCESS
Plan first, wait for approval, commit per task, finish with a Walkthrough artifact including a short list of known gaps.
