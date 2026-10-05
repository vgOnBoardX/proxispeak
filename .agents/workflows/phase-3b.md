Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phase 3A is complete.

PHASE 3B GOAL
Replace basic playback with the spatial audio mixer: distance-based volume and left/right panning driven by avatar positions.

DO
1. audio/attenuation.ts: pure functions `gainForDistance`, `panForOffset`, and `lowpassForOcclusion` exactly as in spec section 8, using shared constants. Fully unit-tested.
2. audio/mixer.ts: one AudioContext created/resumed inside a user gesture. For each peer build the chain MediaStreamAudioSourceNode -> BiquadFilterNode(lowpass) -> GainNode -> StereoPannerNode -> destination. Also attach the remote stream to a muted <audio> element (Chrome Web Audio workaround).
3. Update gain, pan, and filter at AUDIO_UPDATE_HZ from the avatar position store (refs, not React renders), smoothing every change with setTargetAtTime(value, ctx.currentTime, 0.05).
4. Clean teardown: disconnect and release all nodes when a peer leaves. No node or listener leaks.
5. A dev-only debug overlay showing per-peer distance, gain, pan, and filter values.
6. Remove the temporary Phase 2B volume handling so the mixer is the only audio path.

DO NOT
Implement wall occlusion (Phase 4A). Pass `occluded = false` for now but keep the API ready.

ACCEPTANCE (verify and attach evidence)
- Unit tests for attenuation and pan functions pass.
- A Vitest/Playwright test with a mocked AudioContext verifying gain changes at 10px, 60px, 99px, 130px.
- Playwright run with fake media proving the graph is created per peer and destroyed on leave.
- Manual test instructions in the Walkthrough: two real browsers with headphones.
- No React re-renders triggered by the audio update loop.

PROCESS
Plan first and wait for approval. Commit per task. Finish with a Walkthrough artifact.
