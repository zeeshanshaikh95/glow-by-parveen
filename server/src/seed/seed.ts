/**
 * Seed script — creates the first admin account, default settings and
 * [CLIENT DATA REQUIRED] placeholder data so the demo is fully browsable
 * without inventing any business information.
 *
 * Usage:
 *   npm run seed          (idempotent — skips what already exists)
 *   npm run seed:reset    (wipes catalogue data first, then seeds)
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
import { slugify } from '../validation/schemas.js';

const args = process.argv.slice(2);
const RESET = args.includes('--reset');

const CLIENT_DATA_REQUIRED = '[CLIENT DATA REQUIRED]';
const CLIENT_IMAGE_REQUIRED = '[CLIENT IMAGE REQUIRED]';

async function seedAdmin() {
  const existing = await AdminUser.findOne({ email: config.adminEmail });
  if (existing) {
    console.log(`• Admin already exists: ${config.adminEmail}`);
    return;
  }
  const passwordHash = await bcrypt.hash(config.adminPassword, 12);
  await AdminUser.create({ email: config.adminEmail, passwordHash, role: 'admin' });
  console.log(`✓ Admin created: ${config.adminEmail} (password from ADMIN_PASSWORD env)`);
}

async function seedSettings() {
  const existing = await SiteSettings.findOne();
  if (existing) {
    console.log('• Site settings already exist');
    return;
  }
  await SiteSettings.create({
    businessName: 'Glow by Parveen',
    whatsappNumber: '',
    instagramUrl: '',
    email: '',
    mapsUrl: '',
    hero: {
      headline: 'Natural herbal beauty, handcrafted with care',
      subheadline:
        'Discover handcrafted, natural skincare made in small batches. Explore our products and order directly on WhatsApp.',
      imageUrl: '',
    },
    about: {
      intro:
        'Glow by Parveen is a natural/herbal beauty brand offering handcrafted, small-batch personal care products.',
      story: CLIENT_DATA_REQUIRED,
      founderImageUrl: '',
    },
    announcements: { enabled: false, text: '' },
  });
  console.log('✓ Site settings created (WhatsApp number pending client data)');
}

async function seedCategories() {
  if ((await Category.countDocuments()) > 0) {
    console.log('• Categories already exist — skipping');
    return;
  }

  // NOTE: Category names are structural placeholders until the client confirms
  // the real catalogue. They are clearly editable from the admin panel.
  const placeholderCategories = [
    {
      name: `${CLIENT_DATA_REQUIRED} — Category 1`,
      slug: 'category-placeholder-1',
      description: 'Placeholder category. Replace with the real client category.',
      image: '',
      displayOrder: 1,
    },
    {
      name: `${CLIENT_DATA_REQUIRED} — Category 2`,
      slug: 'category-placeholder-2',
      description: 'Placeholder category. Replace with the real client category.',
      image: '',
      displayOrder: 2,
    },
    {
      name: `${CLIENT_DATA_REQUIRED} — Category 3`,
      slug: 'category-placeholder-3',
      description: 'Placeholder category. Replace with the real client category.',
      image: '',
      displayOrder: 3,
    },
  ];

  for (const c of placeholderCategories) {
    await Category.create(c);
  }
  console.log(`✓ Created ${placeholderCategories.length} placeholder categories`);
}

async function seedProducts() {
  if ((await Product.countDocuments()) > 0) {
    console.log('• Products already exist — skipping');
    return;
  }

  const categories = await Category.find().sort({ displayOrder: 1 });
  if (!categories.length) {
    console.log('! No categories — products will be uncategorised');
  }

  const mk = (
    n: number,
    name: string,
    catIdx: number | null,
    flags: { bestseller?: boolean; featured?: boolean; outOfStock?: boolean } = {}
  ) => ({
    name,
    slug: `product-placeholder-${n}`,
    description: CLIENT_DATA_REQUIRED,
    price: null,
    compareAtPrice: null,
    size: '',
    category: catIdx !== null && categories[catIdx] ? categories[catIdx]._id : null,
    images: [],
    ingredients: [] as string[],
    benefits: [] as string[],
    howToUse: '',
    warnings: '',
    variants: [] as { name: string; price: number | null; stockStatus: 'in_stock' | 'out_of_stock' }[],
    stockStatus: (flags.outOfStock ? 'out_of_stock' : 'in_stock') as 'in_stock' | 'out_of_stock',
    bestseller: flags.bestseller ?? false,
    featured: flags.featured ?? false,
    seoTitle: '',
    seoDescription: '',
    displayOrder: n,
    archived: false,
  });

  // Structural placeholders only — no invented names, prices, or claims.
  const products = [
    mk(1, `${CLIENT_DATA_REQUIRED} — Product 1`, 0, { bestseller: true }),
    mk(2, `${CLIENT_DATA_REQUIRED} — Product 2`, 0, { featured: true }),
    mk(3, `${CLIENT_DATA_REQUIRED} — Product 3`, 1),
    mk(4, `${CLIENT_DATA_REQUIRED} — Product 4`, 1, { bestseller: true, outOfStock: true }),
    mk(5, `${CLIENT_DATA_REQUIRED} — Product 5`, 2),
    mk(6, `${CLIENT_DATA_REQUIRED} — Product 6`, 2, { featured: true }),
  ];

  for (const p of products) {
    await Product.create(p);
  }
  console.log(`✓ Created ${products.length} placeholder products`);
}

async function seedReviews() {
  if ((await Review.countDocuments()) > 0) {
    console.log('• Reviews already exist — skipping');
    return;
  }
  await Review.create({
    customerName: CLIENT_DATA_REQUIRED,
    rating: 5,
    text: 'Placeholder review. Replace with approved client testimonials from the admin panel.',
    image: '',
    status: 'approved',
    displayOrder: 1,
  });
  console.log('✓ Created 1 placeholder review (approved)');
}

async function seedGallery() {
  if ((await GalleryItem.countDocuments()) > 0) {
    console.log('• Gallery already exists — skipping');
    return;
  }
  await GalleryItem.create({
    image: CLIENT_IMAGE_REQUIRED,
    caption: 'Placeholder gallery item — replace with client-approved Instagram content.',
    externalUrl: '',
    displayOrder: 1,
    active: true,
  });
  console.log('✓ Created 1 placeholder gallery item');
}

async function main() {
  await connectDatabase();

  if (RESET) {
    console.log('⟳ Resetting catalogue data…');
    await Promise.all([
      Product.deleteMany({}),
      Category.deleteMany({}),
      Review.deleteMany({}),
      GalleryItem.deleteMany({}),
      SiteSettings.deleteMany({}),
    ]);
    console.log('✓ Reset complete (admin user preserved)');
  }

  await seedAdmin();
  await seedSettings();
  await seedCategories();
  await seedProducts();
  await seedReviews();
  await seedGallery();

  console.log('\nSeed finished.');
  console.log(`Admin login: ${config.adminEmail}`);
  console.log(
    `Admin password: ${config.adminPassword === '[CHANGE_ME_BEFORE_PRODUCTION]' ? '(set ADMIN_PASSWORD in server/.env)' : '(from ADMIN_PASSWORD env)'}`
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
