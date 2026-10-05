# ProxiSpeak: Technical Spec

## 1. Goal
A virtual office where users move 2D avatars on a canvas map. Audio is peer-to-peer WebRTC. Users only hear peers within a hearing radius, with volume and stereo pan driven by distance and relative position. Supports 50+ concurrent users in one office, scalable across multiple Node instances.

Non-goals: video, screen share, text chat, mobile layout, user-generated avatars, a full layout editor UI.

## 2. Stack (fixed)

| Area | Choice |
|---|---|
| Language | TypeScript (strict) everywhere |
| Monorepo | npm workspaces: `shared/`, `server/`, `client/`, `scripts/` |
| Client | React 18, Vite, Zustand, raw HTML5 Canvas, `socket.io-client`, native WebRTC, Web Audio API |
| Server | Node.js current LTS, Express, Socket.io 4, Mongoose 8, zod, pino, jsonwebtoken, bcryptjs, helmet, express-rate-limit |
| Data | MongoDB 7 (Docker), Redis 7 (Docker), `@socket.io/redis-adapter` |
| Realtime transport | Socket.io with `transports: ['websocket']` only |
| TURN/STUN | Public Google STUN + self-hosted coturn |
| Tests | Vitest (unit), Supertest (HTTP), Playwright (e2e, fake media flags) |
| Ops | Docker Compose, Nginx |

## 3. Repo layout
```
proxispeak/
  .agents/rules/proxispeak.md
  docs/PROJECT_SPEC.md
  shared/src/        constants.ts, events.ts (zod schemas + types), geometry.ts
  server/src/
    config/ http/ (auth, offices routes) sockets/ (handlers)
    services/ (presence, proximity, signaling, layouts)
    models/ (User, Office, Presence)
    index.ts
  client/src/
    game/ (loop, renderer, input, world)
    net/ (socket, peerManager)
    audio/ (mixer, attenuation)
    store/ ui/
  scripts/             bench-proximity.ts, bots.ts, seed.ts
  infra/               docker-compose.yml, nginx.conf, coturn.conf
```

## 4. Constants (in `shared/src/constants.ts`)

| Name | Value | Meaning |
|---|---|---|
| DEFAULT_WORLD_W / H | 2000 / 1200 | Default office size in px |
| INDEX_MAX | 4096 | Upper bound for the `2d` index |
| HEARING_RADIUS | 100 | Connect to peers within this px distance |
| DISCONNECT_RADIUS | 120 | Disconnect only beyond this (hysteresis) |
| INNER_RADIUS | 20 | Full volume inside this distance |
| MAX_PEERS | 6 | Max simultaneous WebRTC peers per user (nearest first) |
| CLIENT_MOVE_HZ | 15 | Client movement emit rate |
| SERVER_BROADCAST_HZ | 20 | Server position broadcast rate |
| PRESENCE_FLUSH_MS | 100 | Batched Mongo flush for dirty positions |
| PRESENCE_HEARTBEAT_MS | 10000 | Touch `updatedAt` for ALL connected users |
| PRESENCE_TTL_S | 30 | TTL index expiry for stale presence |
| PROXIMITY_TICK_MS | 150 | Neighbor recalculation tick |
| AVATAR_SPEED | 220 | px/s |
| MAX_SPEED_TOLERANCE | 1.5 | Server rejects movement above AVATAR_SPEED x this |
| OCCLUDED_GAIN | 0.25 | Gain multiplier when a wall blocks the line |
| OCCLUDED_LOWPASS_HZ | 600 | Muffle filter cutoff when occluded |
| AUDIO_UPDATE_HZ | 30 | Gain/pan update rate on the client |

## 5. Data model (Mongoose)
- **User**: `name`, `email` (unique), `passwordHash`, `avatarColor`, timestamps.
- **Office**: `name`, `width`, `height`, `walls[] {x1,y1,x2,y2}`, `furniture[] {x,y,w,h,blocksSound}`, `spawnPoints[] [x,y]`.
- **Presence**: `userId` (unique), `officeId`, `pos: [x, y]`, `socketId`, `instanceId`, `muted`, `updatedAt`.

Indexes on Presence:
```js
// Legacy flat-plane geospatial index. NOT 2dsphere: pixel coords are not lon/lat.
presenceSchema.index({ pos: '2d', officeId: 1 }, { min: 0, max: INDEX_MAX });
presenceSchema.index({ updatedAt: 1 }, { expireAfterSeconds: PRESENCE_TTL_S });
```
In a compound `2d` index the location field must come first. Verify the planner uses the index with `explain()`. If it does not, report back and propose an alternative instead of silently changing the design.

Queries:
```js
// Neighbors within radius (cheap membership)
{ officeId, pos: { $geoWithin: { $center: [[x, y], HEARING_RADIUS] } } }
// Nearest-first with a cap
{ officeId, pos: { $near: [x, y], $maxDistance: HEARING_RADIUS } }  // .limit(MAX_PEERS)
```

## 6. Socket protocol (zod schemas in `shared/src/events.ts`)
Auth: JWT passed in the Socket.io handshake `auth.token`. One active session per user (a new login disconnects the old socket). Peer id = userId.

```
client -> server
  join            { officeId }                       ack -> { self, office, peers[], iceServers }
  move            { x, y, seq }
  signal:offer    { to, sdp }
  signal:answer   { to, sdp }
  signal:ice      { to, candidate }
  mute            { muted }

server -> client
  positions       [{ id, x, y, seq }]                 batched at SERVER_BROADCAST_HZ
  user:joined     { id, name, avatarColor, x, y }
  user:left       { id }
  peer:connect    { peerId, initiator }               initiator = this user's id < peerId
  peer:disconnect { peerId }
  signal:offer / signal:answer / signal:ice  { from, ... }
  position:correct { x, y }                           when a move is rejected
```

## 7. Server behavior

**Movement.** Handle `move` by validating with zod, clamping to world bounds, and checking speed against the previous accepted position and time delta (reject above AVATAR_SPEED x MAX_SPEED_TOLERANCE, reply with `position:correct`). Update an in-memory presence map and mark the user dirty. Never touch MongoDB here.

**Persistence.** Every PRESENCE_FLUSH_MS, one `bulkWrite` of dirty users. Every PRESENCE_HEARTBEAT_MS, touch `updatedAt` for all connected users (otherwise idle users would expire from the TTL index). Delete the presence document on disconnect.

**Broadcast.** Every 1/SERVER_BROADCAST_HZ, each instance emits a batched `positions` event for its own locally connected movers to the room `office:{officeId}`. The Redis adapter fans it out across instances.

**Proximity tick.** Every PROXIMITY_TICK_MS, for each locally connected user who moved since the last tick:
1. Query MongoDB for neighbors within HEARING_RADIUS (limit MAX_PEERS, nearest first).
2. Diff against that user's stored neighbor set.
3. Emit `peer:connect` for additions. Emit `peer:disconnect` only when an existing neighbor is beyond DISCONNECT_RADIUS or no longer in the nearest MAX_PEERS.
4. Log tick duration with pino. Warn if a query exceeds 20ms.
Because the query reads MongoDB, proximity works across instances (state is eventually consistent within about PRESENCE_FLUSH_MS).

**Signaling relay.** Relay `signal:*` only if `to` is in the sender's current neighbor set. Otherwise drop and log. Deliver by emitting to the target user's room `user:{userId}` (every socket joins its own user room, so it works across instances through the Redis adapter).

## 8. Client behavior

**Game loop.** One `requestAnimationFrame` loop reading mutable refs. Two stacked canvases: a static layer (map, walls, furniture, redrawn only on change or resize) and a dynamic layer (avatars, labels, hearing-radius ring). Delta-time movement with WASD/arrows and click-to-move. Emit `move` at CLIENT_MOVE_HZ with an incrementing `seq`. Remote avatars are interpolated (lerp between the two latest snapshots). No per-frame allocations.

**Auth storage.** Store the JWT in `sessionStorage` (not `localStorage`) so different tabs can log in as different users during development. In development only, show quick-login buttons for seeded users (alice, bob, carol, dave).

**PeerManager.** One `RTCPeerConnection` per peer. On `peer:connect`, the initiator creates the offer. Queue ICE candidates until the remote description is set. Add the local mic track (audio only, Opus). Use ICE restart on `failed`. Close and clean up fully on `peer:disconnect`. ICE servers come from the `join` ack.

**Local media.** `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`. Request it on the "Join Office" click and show clear permission states (prompt, granted, denied, no device).

**Audio chain per peer.** `MediaStreamAudioSourceNode -> BiquadFilterNode (lowpass) -> GainNode -> StereoPannerNode -> ctx.destination`.
```
d       = distance(me, peer)
gain(d) = d <= INNER ? 1 : d >= HEARING_RADIUS ? 0
          : (1 - (d - INNER) / (HEARING_RADIUS - INNER)) ** 2
pan     = clamp((peer.x - me.x) / HEARING_RADIUS, -1, 1)
occluded (any wall/furniture segment intersects me->peer):
          gain *= OCCLUDED_GAIN; lowpass = OCCLUDED_LOWPASS_HZ  (else 20000)
```
Apply every change with `param.setTargetAtTime(value, ctx.currentTime, 0.05)` to avoid zipper noise. Update at AUDIO_UPDATE_HZ from avatar positions, never from React renders. Create/resume the `AudioContext` inside a user gesture. Chrome has historically needed remote streams to also be attached to a muted `<audio>` element before a Web Audio graph produces output. Implement it and verify whether it is still required.

`attenuation.ts` and the segment-intersection function are pure and fully unit-tested.

## 9. Security
JWT auth on HTTP and sockets, zod on all inputs, helmet, CORS from env, `express-rate-limit` on auth routes, per-socket token-bucket limits (move <= 30/s, signal <= 50/s), bcrypt hashing, server-authoritative bounds and speed checks, never log tokens or SDP bodies.

## 10. Environment variables (`.env.example`)
`PORT`, `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `INSTANCE_ID`, `STUN_URLS`, `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`, `LOG_LEVEL`, `VITE_SERVER_URL`.

## 11. Infrastructure notes
- Local dev: Docker Compose runs Mongo and Redis. Run server and client with npm scripts.
- Scale profile: two server containers (server1, server2) behind Nginx with WebSocket upgrade headers.
- coturn needs UDP and a wide relay port range. Use host networking on a Linux VPS. On Docker Desktop (Mac/Windows) host networking is limited, so test TURN on the VPS, not locally.

## 12. Performance targets (must be demonstrated with evidence)
- Proximity query p95 < 20ms with 200 seeded presences, `explain()` output captured.
- Full proximity tick < 100ms with 50 active users.
- Event-loop delay p99 < 50ms under 50 bot clients across 2 instances.
- Client holds 60 FPS with 25+ avatars (frame scripting time < 8ms).
- Two real browsers establish two-way audio and drop it when walking apart.

## 13. Cut list (if behind schedule, cut in this order)
1. HRTF `PannerNode` upgrade (keep `StereoPannerNode`)
2. Wall collision for avatars
3. Layout editor UI (keep API + seed layouts)
4. Sound occlusion
Never cut: proximity audio, distance gain, Redis scaling, benchmarks.

## 14. Definition of done (every task)
Typecheck, lint, and tests pass. Behavior verified with evidence. Docs updated. One clean commit.
