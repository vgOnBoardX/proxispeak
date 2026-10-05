/**
 * join handler – spec §6, §7
 *
 * When a client emits `join { officeId }`:
 * 1. Validate officeId with zod
 * 2. Look up office in MongoDB
 * 3. Pick a spawn point
 * 4. Upsert Presence doc in MongoDB
 * 5. Insert into presenceMap
 * 6. Join socket rooms: office:{officeId} and user:{userId}
 * 7. Notify others in the office
 * 8. Ack with { self, office, peers, iceServers }
 */
import mongoose from 'mongoose';
import { JoinPayloadSchema } from '@proxispeak/shared/events';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { Office } from '../../models/Office.js';
import { Presence } from '../../models/Presence.js';
import { presenceMap, getOfficePresences } from '../presenceMap.js';
import type { AuthenticatedSocket } from '../io.js';

export function registerJoinHandler(socket: AuthenticatedSocket): void {
  socket.on('join', async (payload: unknown, ack: (response: unknown) => void) => {
    // ── 1. Validate ──────────────────────────────────────────────────────────
    const parsed = JoinPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      if (typeof ack === 'function') {
        ack({ error: 'Invalid payload', details: parsed.error.flatten() });
      }
      return;
    }
    const { officeId } = parsed.data;

    // ── 2. Fetch office ───────────────────────────────────────────────────────
    const office = await Office.findById(officeId).lean();
    if (!office) {
      if (typeof ack === 'function') ack({ error: 'Office not found' });
      return;
    }

    // ── 3. Pick spawn point ───────────────────────────────────────────────────
    const spawnPoints = office.spawnPoints;
    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)] ?? [100, 100];
    const [spawnX, spawnY] = spawn;

    // ── 4. Upsert Presence in MongoDB ─────────────────────────────────────────
    await Presence.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(socket.data.userId) },
      {
        $set: {
          officeId: office._id,
          pos: [spawnX, spawnY] as [number, number],
          socketId: socket.id,
          instanceId: env.INSTANCE_ID,
          muted: false,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // ── 5. Add to in-memory presenceMap ───────────────────────────────────────
    presenceMap.set(socket.data.userId, {
      userId: socket.data.userId,
      officeId: officeId,
      socketId: socket.id,
      instanceId: env.INSTANCE_ID,
      x: spawnX,
      y: spawnY,
      seq: 0,
      muted: false,
      dirty: false,
      lastMovedAt: Date.now(),
    });

    // ── 6. Join socket rooms ──────────────────────────────────────────────────
    await socket.join(`office:${officeId}`);
    await socket.join(`user:${socket.data.userId}`);

    // ── 7. Notify existing peers ──────────────────────────────────────────────
    socket.to(`office:${officeId}`).emit('user:joined', {
      id: socket.data.userId,
      name: socket.data.name,
      avatarColor: socket.data.avatarColor,
      x: spawnX,
      y: spawnY,
    });

    // ── 8. Build and send ack ─────────────────────────────────────────────────
    const officePresences = getOfficePresences(officeId);
    const peers = officePresences
      .filter((p) => p.userId !== socket.data.userId)
      .map((p) => ({
        id: p.userId,
        name: 'unknown', // populated by proximity service in later phases
        avatarColor: '#6366f1',
        x: p.x,
        y: p.y,
        muted: p.muted,
      }));

    const iceServers = buildIceServers();

    const ack_payload = {
      self: {
        id: socket.data.userId,
        name: socket.data.name,
        avatarColor: socket.data.avatarColor,
        x: spawnX,
        y: spawnY,
        muted: false,
      },
      office: {
        id: (office._id as { toString(): string }).toString(),
        name: office.name,
        width: office.width,
        height: office.height,
        walls: office.walls,
        furniture: office.furniture,
        spawnPoints: office.spawnPoints,
      },
      peers,
      iceServers,
    };

    if (typeof ack === 'function') ack(ack_payload);

    logger.info(
      { userId: socket.data.userId, officeId, x: spawnX, y: spawnY },
      'User joined office',
    );
  });
}

function buildIceServers(): object[] {
  const servers: object[] = [{ urls: env.STUN_URLS.split(',') }];
  if (env.TURN_URL && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    servers.push({
      urls: env.TURN_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_CREDENTIAL,
    });
  }
  return servers;
}
