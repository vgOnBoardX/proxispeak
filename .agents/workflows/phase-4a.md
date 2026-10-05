Read .agents/rules/proxispeak.md and docs/PROJECT_SPEC.md completely. Phase 3 is complete.

PHASE 4A GOAL
Persist office layouts, render them efficiently, and make walls and furniture physically block avatars and muffle sound.

DO
1. Office layout API: GET /offices, GET /offices/:id, POST/PUT/DELETE for authenticated admin users (add an `isAdmin` flag on User). Zod-validated walls, furniture, spawn points within world bounds. Seed 2 layouts.
2. Client: render the layout on the static canvas layer (offscreen cache, redrawn only on layout change or resize).
3. shared/src/geometry.ts: segment-segment intersection and circle-vs-rect/segment collision, pure and unit-tested.
4. Wall collision: avatars cannot walk through walls or blocking furniture. Enforce on client for feel and on server for authority.
5. Sound occlusion: in the mixer, raycast listener -> speaker against wall/blocking-furniture segments each audio update. If blocked, apply OCCLUDED_GAIN and OCCLUDED_LOWPASS_HZ filter via smoothing.
6. 3D panning polish: keep StereoPannerNode by default. Add optional HRTF PannerNode mode behind a settings toggle ONLY if everything above is done.
7. Profile with 25 avatars. Fix frame spikes until frame scripting time is under 8ms.

ACCEPTANCE (verify and attach evidence)
- Unit tests for geometry (intersection edge cases).
- Integration test: a move through a wall is rejected by the server.
- Test: two avatars on opposite sides of a wall have occluded gain/low-pass; same pair without wall does not.
- Performance report with FPS and scripting-time numbers before and after optimization.
- Browser sub-agent recording of walking into a wall, then through a doorway.

PROCESS
Plan first and wait for approval. Follow the cut list if behind schedule. Commit per task. Finish with a Walkthrough artifact.
