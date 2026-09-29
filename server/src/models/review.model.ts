import mongoose, { Schema, model, type Model } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface IReview {
  customerName: string;
  rating: number;
  text: string;
  image: string;
  status: ReviewStatus;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    customerName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'hidden'], default: 'pending' },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, displayOrder: 1 });

export const Review: Model<IReview> =
  mongoose.models.Review ?? model<IReview>('Review', reviewSchema);
