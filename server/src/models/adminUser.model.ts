import mongoose, { Schema, model, type Model } from 'mongoose';

export interface IAdminUser {
  email: string;
  passwordHash: string;
  role: 'admin';
  /** True while the admin still uses bootstrap credentials and must rotate them. */
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
    mustChangePassword: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser ?? model<IAdminUser>('AdminUser', adminUserSchema);
