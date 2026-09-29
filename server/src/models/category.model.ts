import mongoose, { Schema, model, type Model } from 'mongoose';

export interface ICategory {
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ displayOrder: 1 });

export const Category: Model<ICategory> =
  mongoose.models.Category ?? model<ICategory>('Category', categorySchema);
