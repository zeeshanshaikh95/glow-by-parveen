/**
 * Local development database.
 *
 * Downloads and runs a real `mongod` process on 127.0.0.1:27017 with a
 * PERSISTENT data directory (server/.data/mongo), so the demo behaves like a
 * normal MongoDB install — data survives restarts.
 *
 * This is a DEV-ONLY convenience so the project can run without a system-wide
 * MongoDB installation. Production uses MongoDB Atlas (see docs/DEPLOYMENT.md).
 *
 *   npm run dev:db        (keep this running, then: npm run dev)
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../.data/mongo');
const PORT = Number(process.env.DEV_DB_PORT ?? 27017);

fs.mkdirSync(dbPath, { recursive: true });

async function main() {
  const server = await MongoMemoryServer.create({
    instance: {
      port: PORT,
      dbName: 'glow-by-parveen',
      storageEngine: 'wiredTiger',
      dbPath,
    },
    binary: {
      // Version 7.0 has the widest prebuilt-binary coverage.
      version: process.env.DEV_MONGOD_VERSION ?? '7.0.14',
    },
  });

  console.log(`[db:dev] MongoDB running at ${server.getUri()}`);
  console.log(`[db:dev] Data directory: ${dbPath}`);
  console.log('[db:dev] Press Ctrl+C to stop. MONGODB_URI in server/.env points here.');

  const shutdown = async () => {
    console.log('\n[db:dev] Stopping MongoDB…');
    await server.stop({ doCleanup: false });
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the process alive.
  await new Promise(() => undefined);
}

main().catch((err) => {
  console.error('[db:dev] Failed to start local MongoDB:', err);
  process.exit(1);
});
