import mongoose, { Schema, model, type Model } from 'mongoose';

export type StockStatus = 'in_stock' | 'out_of_stock';

export type ProductVariant = {
  name: string;
  price: number | null;
  stockStatus: StockStatus;
};

export interface IProduct {
  name: string;
  slug: string;
  description: string;
  price: number | null;
  compareAtPrice: number | null;
  size: string;
  category: mongoose.Types.ObjectId | null;
  images: string[];
  ingredients: string[];
  benefits: string[];
  howToUse: string;
  warnings: string;
  variants: ProductVariant[];
  stockStatus: StockStatus;
  bestseller: boolean;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  displayOrder: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ProductVariant>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: null, min: 0 },
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock'], default: 'in_stock' },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, default: null, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    size: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    images: { type: [String], default: [] },
    ingredients: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    howToUse: { type: String, default: '' },
    warnings: { type: String, default: '' },
    variants: { type: [variantSchema], default: [] },
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock'], default: 'in_stock' },
    bestseller: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Text index to power public search by name/description.
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ bestseller: 1, featured: 1 });

export const Product: Model<IProduct> =
  mongoose.models.Product ?? model<IProduct>('Product', productSchema);
