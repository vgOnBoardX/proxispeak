/**
 * ProxiSpeak – Socket Event Schemas
 * Source: docs/PROJECT_SPEC.md §6
 *
 * All socket payloads are validated with these zod schemas.
 * Types are inferred from schemas — never duplicated manually.
 */
import { z } from 'zod';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Finite number (rejects NaN / ±Infinity) */
const finiteNumber = () => z.number().finite();

// ─── Client → Server ─────────────────────────────────────────────────────────

/**
 * `join` – client requests to join an office.
 * Server acks with { self, office, peers[], iceServers }.
 */
export const JoinPayloadSchema = z.object({
  officeId: z.string().min(1).max(64),
});
export type JoinPayload = z.infer<typeof JoinPayloadSchema>;

/**
 * `move` – client sends a new position.
 * Server validates, clamps, speed-checks, marks dirty.
 */
export const MovePayloadSchema = z.object({
  x: finiteNumber(),
  y: finiteNumber(),
  /** Monotonically incrementing sequence number (u32) */
  seq: z.number().int().nonnegative(),
});
export type MovePayload = z.infer<typeof MovePayloadSchema>;

/**
 * `signal:offer` – WebRTC offer relay (server validates `to`)
 */
export const SignalOfferSchema = z.object({
  to: z.string().min(1).max(64),
  sdp: z.string().min(1),
});
export type SignalOffer = z.infer<typeof SignalOfferSchema>;

/**
 * `signal:answer` – WebRTC answer relay
 */
export const SignalAnswerSchema = z.object({
  to: z.string().min(1).max(64),
  sdp: z.string().min(1),
});
export type SignalAnswer = z.infer<typeof SignalAnswerSchema>;

/**
 * `signal:ice` – ICE candidate relay
 */
export const SignalIceSchema = z.object({
  to: z.string().min(1).max(64),
  candidate: z.unknown(), // RTCIceCandidateInit – opaque, forwarded as-is
});
export type SignalIce = z.infer<typeof SignalIceSchema>;

/**
 * `mute` – toggle local audio mute state
 */
export const MutePayloadSchema = z.object({
  muted: z.boolean(),
});
export type MutePayload = z.infer<typeof MutePayloadSchema>;

// ─── Server → Client ─────────────────────────────────────────────────────────

/**
 * One entry in a `positions` batch broadcast.
 */
export const PositionEntrySchema = z.object({
  id: z.string().min(1).max(64),
  x: finiteNumber(),
  y: finiteNumber(),
  seq: z.number().int().nonnegative(),
});
export type PositionEntry = z.infer<typeof PositionEntrySchema>;

/**
 * `positions` – batched broadcast from server at SERVER_BROADCAST_HZ
 */
export const PositionsBroadcastSchema = z.array(PositionEntrySchema);
export type PositionsBroadcast = z.infer<typeof PositionsBroadcastSchema>;

/**
 * `user:joined` – a new user joined the office
 */
export const UserJoinedSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  avatarColor: z.string().min(1).max(32),
  x: finiteNumber(),
  y: finiteNumber(),
});
export type UserJoined = z.infer<typeof UserJoinedSchema>;

/**
 * `user:left` – a user disconnected
 */
export const UserLeftSchema = z.object({
  id: z.string().min(1).max(64),
});
export type UserLeft = z.infer<typeof UserLeftSchema>;

/**
 * `peer:connect` – proximity engine instructs client to open a WebRTC peer connection.
 * initiator = this user's userId < peerId (lexicographic)
 */
export const PeerConnectSchema = z.object({
  peerId: z.string().min(1).max(64),
  initiator: z.boolean(),
});
export type PeerConnect = z.infer<typeof PeerConnectSchema>;

/**
 * `peer:disconnect` – proximity engine instructs client to close a WebRTC peer connection.
 */
export const PeerDisconnectSchema = z.object({
  peerId: z.string().min(1).max(64),
});
export type PeerDisconnect = z.infer<typeof PeerDisconnectSchema>;

/**
 * `position:correct` – server rejects an out-of-bounds or speed-cheating move.
 * Client must snap its avatar to these coordinates.
 */
export const PositionCorrectSchema = z.object({
  x: finiteNumber(),
  y: finiteNumber(),
});
export type PositionCorrect = z.infer<typeof PositionCorrectSchema>;

// ─── Join ACK (server → client, as ack callback) ─────────────────────────────

/** ICE server descriptor */
export const IceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});
export type IceServer = z.infer<typeof IceServerSchema>;

/** Peer summary included in join ack */
export const PeerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarColor: z.string(),
  x: finiteNumber(),
  y: finiteNumber(),
  muted: z.boolean(),
});
export type PeerSummary = z.infer<typeof PeerSummarySchema>;

/** Office summary included in join ack */
export const OfficeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  walls: z.array(
    z.object({ x1: finiteNumber(), y1: finiteNumber(), x2: finiteNumber(), y2: finiteNumber() }),
  ),
  furniture: z.array(
    z.object({
      x: finiteNumber(),
      y: finiteNumber(),
      w: z.number().positive(),
      h: z.number().positive(),
      blocksSound: z.boolean(),
    }),
  ),
  spawnPoints: z.array(z.tuple([finiteNumber(), finiteNumber()])),
});
export type OfficeSummary = z.infer<typeof OfficeSummarySchema>;

/** Self summary included in join ack */
export const SelfSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarColor: z.string(),
  x: finiteNumber(),
  y: finiteNumber(),
  muted: z.boolean(),
});
export type SelfSummary = z.infer<typeof SelfSummarySchema>;

/** Full join ack payload */
export const JoinAckSchema = z.object({
  self: SelfSummarySchema,
  office: OfficeSummarySchema,
  peers: z.array(PeerSummarySchema),
  iceServers: z.array(IceServerSchema),
});
export type JoinAck = z.infer<typeof JoinAckSchema>;

// ─── Auth HTTP schemas (used in server http routes) ──────────────────────────

export const RegisterBodySchema = z.object({
  name: z.string().min(1).max(64).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default('#6366f1'),
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const LoginBodySchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;
