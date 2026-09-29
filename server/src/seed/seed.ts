/**
 * Database bootstrap.
 *
 * Creates ONLY what the application needs to run:
 *   • the first admin account (from ADMIN_EMAIL / ADMIN_PASSWORD)
 *   • the singleton SiteSettings document with default WhatsApp templates
 *
 * The catalogue is deliberately left EMPTY. No products, categories, reviews,
 * gallery items, prices, ingredients, testimonials or business claims are ever
 * inserted — that content must come from the client, entered through the admin
 * panel. The storefront renders clean empty states until then.
 *
 * Usage:
 *   npm run seed          idempotent — skips whatever already exists
 *   npm run seed:reset    deletes all catalogue content first, then re-bootstraps
 *                         (use to clear test records; the admin account is kept)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  AdminUser,
  Category,
  GalleryItem,
  Product,
  Review,
  SiteSettings,
} from '../models/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { config } from '../config/env.js';

const RESET = process.argv.slice(2).includes('--reset');

const CLIENT_DATA_REQUIRED = '[CLIENT DATA REQUIRED]';

async function seedAdmin() {
  const existing = await AdminUser.findOne({ email: config.adminEmail });
  if (existing) {
    console.log(`• Admin already exists: ${config.adminEmail}`);
    return;
  }

  if (config.adminPassword === '[CHANGE_ME_BEFORE_PRODUCTION]') {
    console.log(
      '! ADMIN_PASSWORD is still the placeholder from .env.example — set a real password in server/.env first.'
    );
  }

  const passwordHash = await bcrypt.hash(config.adminPassword, 12);
  await AdminUser.create({ email: config.adminEmail, passwordHash, role: 'admin' });
  console.log(`✓ Admin created: ${config.adminEmail}`);
}

async function seedSettings() {
  const existing = await SiteSettings.findOne();
  if (existing) {
    console.log('• Site settings already exist');
    return;
  }

  await SiteSettings.create({
    businessName: 'Glow by Parveen',
    // Business contact details and brand copy are supplied by the client.
    whatsappNumber: '',
    instagramUrl: '',
    email: '',
    mapsUrl: '',
    hero: { headline: '', subheadline: '', imageUrl: '' },
    about: { intro: '', story: CLIENT_DATA_REQUIRED, founderImageUrl: '' },
    announcements: { enabled: false, text: '' },
  });
  console.log('✓ Site settings created (contact details pending client data)');
}

/** Removes all catalogue content — never touches AdminUser. */
async function resetCatalogue() {
  const [products, categories, reviews, gallery] = await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Review.deleteMany({}),
    GalleryItem.deleteMany({}),
  ]);

  console.log(
    `⟳ Cleared catalogue: ${products.deletedCount} products, ${categories.deletedCount} categories, ` +
      `${reviews.deletedCount} reviews, ${gallery.deletedCount} gallery items`
  );
}

async function main() {
  await connectDatabase();

  if (RESET) {
    await resetCatalogue();
  }

  await seedAdmin();
  await seedSettings();

  const [products, categories, reviews, gallery] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Review.countDocuments(),
    GalleryItem.countDocuments(),
  ]);

  console.log('\nCatalogue state:');
  console.log(`  products: ${products}`);
  console.log(`  categories: ${categories}`);
  console.log(`  reviews: ${reviews}`);
  console.log(`  gallery items: ${gallery}`);
  console.log(
    '\nThe catalogue is intentionally empty — add real client content from /admin.\n'
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    await mongoose.disconnect();
  });
