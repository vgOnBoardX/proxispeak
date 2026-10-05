/**
 * Seed script – spec §6, dev only
 *
 * Creates users: alice, bob, carol, dave
 * Creates one default Office with spawn points and wall layout
 *
 * Usage: npm run seed --workspace=scripts
 * Idempotent: skips if users/office already exist.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Inline minimal models to avoid server-side circular imports ────────────────
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/proxispeak_dev';
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'DevPassword123!';

interface UserDoc {
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
}

interface WallDoc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface FurnitureDoc {
  x: number;
  y: number;
  w: number;
  h: number;
  blocksSound: boolean;
}

const userSchema = new mongoose.Schema<UserDoc>(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    avatarColor: String,
  },
  { timestamps: true },
);

const officeSchema = new mongoose.Schema(
  {
    name: String,
    width: Number,
    height: Number,
    walls: Array,
    furniture: Array,
    spawnPoints: Array,
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);
const Office = mongoose.model('Office', officeSchema);

const SEED_USERS: Omit<UserDoc, 'passwordHash'>[] = [
  { name: 'Alice', email: 'alice@proxispeak.dev', avatarColor: '#6366f1' },
  { name: 'Bob', email: 'bob@proxispeak.dev', avatarColor: '#f59e0b' },
  { name: 'Carol', email: 'carol@proxispeak.dev', avatarColor: '#10b981' },
  { name: 'Dave', email: 'dave@proxispeak.dev', avatarColor: '#ef4444' },
];

/**
 * Default office layout:
 * 2000×1200 canvas with outer border walls, a central dividing wall,
 * a conference room partition, and 8 spawn points spread around the space.
 */
const DEFAULT_OFFICE = {
  name: 'Main Office',
  width: 2000,
  height: 1200,
  walls: [
    // Outer border (4 walls)
    { x1: 0, y1: 0, x2: 2000, y2: 0 }, // top
    { x1: 2000, y1: 0, x2: 2000, y2: 1200 }, // right
    { x1: 2000, y1: 1200, x2: 0, y2: 1200 }, // bottom
    { x1: 0, y1: 1200, x2: 0, y2: 0 }, // left
    // Central vertical divider (partial, with doorway gap at y=500..600)
    { x1: 1000, y1: 0, x2: 1000, y2: 500 },
    { x1: 1000, y1: 600, x2: 1000, y2: 1200 },
    // Small conference room in top-right corner (with doorway at x=1600..1700)
    { x1: 1600, y1: 0, x2: 1600, y2: 400 },
    { x1: 1600, y1: 400, x2: 2000, y2: 400 },
  ] satisfies WallDoc[],
  furniture: [
    // Desks (left wing)
    { x: 100, y: 100, w: 120, h: 60, blocksSound: false },
    { x: 300, y: 100, w: 120, h: 60, blocksSound: false },
    { x: 100, y: 300, w: 120, h: 60, blocksSound: false },
    { x: 300, y: 300, w: 120, h: 60, blocksSound: false },
    // Desks (right wing)
    { x: 1100, y: 100, w: 120, h: 60, blocksSound: false },
    { x: 1300, y: 100, w: 120, h: 60, blocksSound: false },
    // Conference table (blocks sound)
    { x: 1650, y: 100, w: 200, h: 200, blocksSound: true },
    // Lounge sofa (bottom center)
    { x: 800, y: 1000, w: 200, h: 80, blocksSound: false },
  ] satisfies FurnitureDoc[],
  spawnPoints: [
    [200, 200], // desk cluster left-top
    [400, 200],
    [200, 400],
    [400, 400],
    [1200, 200], // desk cluster right-top
    [1400, 200],
    [500, 900], // open area bottom-left
    [900, 600], // doorway / central area
  ] as [number, number][],
};

async function seed(): Promise<void> {
  console.log(`Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // ── Upsert users ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  let createdUsers = 0;

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email }).lean();
    if (existing) {
      console.log(`  [skip] User already exists: ${u.email}`);
      continue;
    }
    await User.create({ ...u, passwordHash });
    console.log(`  [created] User: ${u.email} (password: ${SEED_PASSWORD})`);
    createdUsers++;
  }
  console.log(`Users: ${createdUsers} created, ${SEED_USERS.length - createdUsers} skipped.`);

  // ── Upsert default office ───────────────────────────────────────────────────
  const existingOffice = await Office.findOne({ name: DEFAULT_OFFICE.name }).lean();
  if (existingOffice) {
    console.log(`  [skip] Office already exists: "${DEFAULT_OFFICE.name}"`);
  } else {
    const office = await Office.create(DEFAULT_OFFICE);
    console.log(`  [created] Office: "${DEFAULT_OFFICE.name}" (id: ${String(office._id)})`);
    console.log(`    Walls: ${DEFAULT_OFFICE.walls.length}`);
    console.log(`    Furniture: ${DEFAULT_OFFICE.furniture.length}`);
    console.log(`    Spawn points: ${DEFAULT_OFFICE.spawnPoints.length}`);
  }

  await mongoose.disconnect();
  console.log('\nSeed complete.');
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
