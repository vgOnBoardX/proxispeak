Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phases 1 and 2A are complete.

PHASE 2B GOAL
Establish real peer-to-peer audio between browsers using the signaling server, ready for the mid-project review.

DO
1. Local media: getUserMedia on the "Join Office" click with echoCancellation/noiseSuppression/autoGainControl. UI for permission states (prompt, granted, denied, no device) and a mute toggle that also emits `mute`.
2. net/peerManager.ts: one RTCPeerConnection per peer, deterministic initiator from `peer:connect`, offer/answer/ICE exchange via the signaling events, ICE candidate queueing until the remote description exists, ICE restart on `failed`, full cleanup on `peer:disconnect` or user:left. ICE servers from the `join` ack. Only audio, Opus.
3. Basic playback: attach each remote stream to an <audio> element (volume handling comes in Phase 3B). Show per-peer connection state (connecting, connected, failed) in the HUD.
4. infra/coturn.conf and a coturn service in docker-compose (UDP, documented relay port range, static long-term credentials from env). Document that TURN should be verified on a Linux VPS and from a mobile hotspot.
5. Playwright e2e test using Chromium with --use-fake-device-for-media-stream and --use-fake-ui-for-media-stream: two browser contexts log in as alice and bob, walk within 100px, and assert that both RTCPeerConnections reach `connected` and that an inbound audio track exists. Then move bob beyond 120px and assert both connections close.
6. docs/MIDREVIEW.md summarizing the benchmark numbers from Phase 2A, the e2e result, and manual demo steps.

DO NOT
Implement gain, pan, Web Audio graphs, Redis, or layouts yet.

ACCEPTANCE (verify and attach evidence)
- Playwright test passes consistently (run it 3 times).
- Use the browser sub-agent to run the two-user walk-together/walk-apart flow and record it.
- Add a test that a connection attempt to a non-neighbor produces no offer on the wire.
- In the Walkthrough, list the exact manual steps to demo this with two real browsers and headphones.

PROCESS
Plan first and wait for approval. Commit per task. Finish with a Walkthrough artifact.
