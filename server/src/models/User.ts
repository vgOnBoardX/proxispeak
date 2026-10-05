/**
 * User model – spec §5
 * name, email (unique), passwordHash, avatarColor, timestamps
 */
import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarColor: {
      type: String,
      required: true,
      default: '#6366f1',
      match: /^#[0-9a-fA-F]{6}$/,
    },
  },
  {
    timestamps: true,
  },
);

// Never leak the password hash in JSON responses
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as unknown as Record<string, unknown>).passwordHash;
    return ret;
  },
});

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ?? mongoose.model<IUser>('User', userSchema);
