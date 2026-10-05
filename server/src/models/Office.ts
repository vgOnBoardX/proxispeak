/**
 * Office model – spec §5
 * name, width, height, walls[], furniture[], spawnPoints[]
 */
import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface IWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface IFurniture {
  x: number;
  y: number;
  w: number;
  h: number;
  blocksSound: boolean;
}

export interface IOffice extends Document {
  name: string;
  width: number;
  height: number;
  walls: IWall[];
  furniture: IFurniture[];
  /** Array of [x, y] tuples */
  spawnPoints: [number, number][];
  createdAt: Date;
  updatedAt: Date;
}

const wallSchema = new Schema<IWall>(
  {
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
  },
  { _id: false },
);

const furnitureSchema = new Schema<IFurniture>(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true, min: 1 },
    h: { type: Number, required: true, min: 1 },
    blocksSound: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const officeSchema = new Schema<IOffice>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    width: {
      type: Number,
      required: true,
      min: 100,
      default: 2000, // DEFAULT_WORLD_W
    },
    height: {
      type: Number,
      required: true,
      min: 100,
      default: 1200, // DEFAULT_WORLD_H
    },
    walls: {
      type: [wallSchema],
      default: [],
    },
    furniture: {
      type: [furnitureSchema],
      default: [],
    },
    spawnPoints: {
      type: [[Number]],
      default: [[100, 100]],
    },
  },
  {
    timestamps: true,
  },
);

export const Office: Model<IOffice> =
  (mongoose.models.Office as Model<IOffice> | undefined) ??
  mongoose.model<IOffice>('Office', officeSchema);
