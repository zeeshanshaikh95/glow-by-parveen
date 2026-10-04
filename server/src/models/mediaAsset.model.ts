import mongoose, { Schema, model, type Model } from 'mongoose';

/**
 * Registry of uploaded media assets.
 *
 * The catalogue keeps using plain URL strings (the existing schema), while this
 * collection is the authoritative `secure_url` ↔ `public_id` map. That mapping
 * is what makes safe deletion possible: before a Cloudinary asset is destroyed
 * we resolve its public_id here and then confirm no document references the URL.
 */
export interface IMediaAsset {
  provider: 'cloudinary';
  /** Delivery URL as stored in the content documents (product.images, …). */
  secureUrl: string;
  /** Cloudinary public_id — required to destroy the asset later. */
  publicId: string;
  folder: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    provider: { type: String, enum: ['cloudinary'], default: 'cloudinary' },
    secureUrl: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    folder: { type: String, default: '' },
    format: { type: String, default: '' },
    bytes: { type: Number, default: 0, min: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
  { timestamps: true }
);

// One row per asset: uploads upsert on either identifier.
mediaAssetSchema.index({ secureUrl: 1 }, { unique: true });
mediaAssetSchema.index({ publicId: 1 }, { unique: true });

export const MediaAsset: Model<IMediaAsset> =
  mongoose.models.MediaAsset ?? model<IMediaAsset>('MediaAsset', mediaAssetSchema);
