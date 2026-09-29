import mongoose, { Schema, model, type Model } from 'mongoose';

export const WHATSAPP_TEMPLATE_DEFAULT =
  'Hi Glow by Parveen! 🌸\n' +
  'I would like to order the following:\n' +
  '{{ITEMS}}\n' +
  'Estimated total: {{TOTAL}}\n\n' +
  'Please share availability and delivery details.';

export const WHATSAPP_TEMPLATE_SINGLE_DEFAULT =
  'Hi Glow by Parveen! 🌸\n' +
  'I would like to order:\n' +
  '• {{PRODUCT}}\n' +
  '{{VARIANT_LINE}}{{QTY_LINE}}Price: {{PRICE}}\n\n' +
  'Please share availability and delivery details.';

export interface ISiteSettings {
  businessName: string;
  whatsappNumber: string;
  instagramUrl: string;
  email: string;
  mapsUrl: string;
  whatsappTemplate: string;
  whatsappSingleProductTemplate: string;
  hero: {
    headline: string;
    subheadline: string;
    imageUrl: string;
  };
  about: {
    intro: string;
    story: string;
    founderImageUrl: string;
  };
  announcements: {
    enabled: boolean;
    text: string;
  };
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    businessName: { type: String, default: 'Glow by Parveen' },
    whatsappNumber: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    email: { type: String, default: '' },
    mapsUrl: { type: String, default: '' },
    whatsappTemplate: { type: String, default: WHATSAPP_TEMPLATE_DEFAULT },
    whatsappSingleProductTemplate: { type: String, default: WHATSAPP_TEMPLATE_SINGLE_DEFAULT },
    hero: {
      headline: { type: String, default: '' },
      subheadline: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
    },
    about: {
      intro: { type: String, default: '' },
      story: { type: String, default: '' },
      founderImageUrl: { type: String, default: '' },
    },
    announcements: {
      enabled: { type: Boolean, default: false },
      text: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings ?? model<ISiteSettings>('SiteSettings', siteSettingsSchema);
