import mongoose, { Schema, model, type Model } from 'mongoose';

export type AnalyticsEventType =
  | 'page_view'
  | 'product_view'
  | 'whatsapp_click'
  | 'cart_add'
  | 'order_whatsapp_click';

export interface IAnalyticsEvent {
  type: AnalyticsEventType;
  productId: mongoose.Types.ObjectId | null;
  productSlug: string;
  path: string;
  referrer: string;
  sessionId: string;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: {
      type: String,
      required: true,
      enum: ['page_view', 'product_view', 'whatsapp_click', 'cart_add', 'order_whatsapp_click'],
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    productSlug: { type: String, default: '' },
    path: { type: String, default: '' },
    referrer: { type: String, default: '' },
    sessionId: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsEventSchema.index({ type: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });
// Events auto-expire after 180 days — privacy-conscious, keeps the DB small.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

export const AnalyticsEvent: Model<IAnalyticsEvent> =
  mongoose.models.AnalyticsEvent ?? model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);
