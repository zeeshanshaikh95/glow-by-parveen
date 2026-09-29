import mongoose, { Schema, model, type Model } from 'mongoose';

export interface IGalleryItem {
  image: string;
  caption: string;
  externalUrl: string;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const galleryItemSchema = new Schema<IGalleryItem>(
  {
    image: { type: String, required: true },
    caption: { type: String, default: '' },
    externalUrl: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

galleryItemSchema.index({ active: 1, displayOrder: 1 });

export const GalleryItem: Model<IGalleryItem> =
  mongoose.models.GalleryItem ?? model<IGalleryItem>('GalleryItem', galleryItemSchema);
