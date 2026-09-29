import mongoose, { Schema, model, type Model } from 'mongoose';

export interface IAdminUser {
  email: string;
  passwordHash: string;
  role: 'admin';
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminUserSchema.index({ email: 1 }, { unique: true });

export const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser ?? model<IAdminUser>('AdminUser', adminUserSchema);
