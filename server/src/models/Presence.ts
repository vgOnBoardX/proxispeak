/**
 * Presence model – spec §5
 *
 * Indexes (exactly as spec §5):
 *   1. Compound 2d + officeId: { pos: '2d', officeId: 1 }
 *      - min: 0, max: INDEX_MAX (pixel coordinate space, NOT lon/lat)
 *      - pos field must come FIRST in compound 2d index
 *   2. TTL on updatedAt: expireAfterSeconds = PRESENCE_TTL_S
 *
 * Note: presenceSchema.index() calls match spec verbatim.
 * If explain() shows the planner ignoring the 2d index, report and do not silently change.
 */
import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import { INDEX_MAX, PRESENCE_TTL_S } from '@proxispeak/shared/constants';

export interface IPresence extends Document {
  userId: Types.ObjectId;
  officeId: Types.ObjectId;
  /** [x, y] pixel coordinates */
  pos: [number, number];
  socketId: string;
  instanceId: string;
  muted: boolean;
  updatedAt: Date;
}

const presenceSchema = new Schema<IPresence>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one presence per user
    },
    officeId: {
      type: Schema.Types.ObjectId,
      ref: 'Office',
      required: true,
    },
    pos: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v.every((n) => typeof n === 'number' && isFinite(n)),
        message: 'pos must be a [x, y] tuple of finite numbers',
      },
    },
    socketId: {
      type: String,
      required: true,
    },
    instanceId: {
      type: String,
      required: true,
    },
    muted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    // Mongoose manages updatedAt; we rely on it for the TTL index
    timestamps: true,
    // Store updatedAt so we can run the heartbeat update via updateMany
  },
);

/**
 * Compound 2d index (spec §5).
 * pos field MUST come first. min/max define the pixel coordinate bounds.
 * NOT 2dsphere — pixel coords are not lon/lat.
 */
presenceSchema.index({ pos: '2d', officeId: 1 }, { min: 0, max: INDEX_MAX });

/**
 * TTL index (spec §5).
 * MongoDB automatically deletes stale presence documents after PRESENCE_TTL_S.
 * The heartbeat loop touches updatedAt for connected users to prevent premature expiry.
 */
presenceSchema.index({ updatedAt: 1 }, { expireAfterSeconds: PRESENCE_TTL_S });

export const Presence: Model<IPresence> =
  (mongoose.models.Presence as Model<IPresence> | undefined) ??
  mongoose.model<IPresence>('Presence', presenceSchema);
