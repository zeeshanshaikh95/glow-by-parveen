/**
 * Database bootstrap CLI.
 *
 * Usage:
 *   npm run seed          idempotent — skips whatever already exists
 *   npm run seed:reset    deletes all catalogue content first, then re-bootstraps
 *                         (use to clear test records; the admin account is kept)
 *
 * The catalogue is deliberately left EMPTY. No products, categories, reviews,
 * gallery items, prices, ingredients, testimonials or business claims are ever
 * inserted — that content must come from the client, entered through the admin
 * panel. The storefront renders clean empty states until then.
 */
import mongoose from 'mongoose';
import { Category, GalleryItem, Product, Review } from '../models/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { bootstrapAdmin, bootstrapSettings } from './bootstrap.js';

const RESET = process.argv.slice(2).includes('--reset');

/** Removes all catalogue content — never touches AdminUser or SiteSettings. */
async function resetCatalogue(): Promise<void> {
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

async function main(): Promise<void> {
  await connectDatabase();

  if (RESET) {
    await resetCatalogue();
  }

  await bootstrapAdmin();
  await bootstrapSettings();

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
  console.log('\nThe catalogue is intentionally empty — add real client content from /admin.\n');
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    await mongoose.disconnect();
  });
