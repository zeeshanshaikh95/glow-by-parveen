import { createApp } from './app.js';
import { config } from './config/env.js';
import { redactMongoSecrets } from './config/database.js';
import { cloudinaryStatusLine } from './services/cloudinaryService.js';

/**
 * Optional bootstrap seeding on boot (AUTO_SEED=true — used on managed hosts
 * where running the seed CLI manually is not practical). Reuses the exact
 * idempotent logic of the CLI: creates the admin from env vars and the
 * settings singleton; never touches the catalogue.
 */
async function autoSeed(): Promise<void> {
  const { bootstrapAdmin, bootstrapSettings } = await import('./seed/bootstrap.js');
  await bootstrapAdmin();
  await bootstrapSettings();
}

async function main(): Promise<void> {
  const app = await createApp();

  if (config.autoSeed) {
    try {
      console.log('[seed] AUTO_SEED=true — running idempotent bootstrap…');
      await autoSeed();
    } catch (err) {
      console.error('[seed] Auto-seed failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  app.listen(config.port, () => {
    console.log(`[server] Glow by Parveen API listening on port ${config.port}`);
    console.log(`[server] CORS origins: ${config.corsOrigins.join(', ')}`);
    // Status only — never the key or the secret.
    console.log(cloudinaryStatusLine());
  });
}

main().catch((err) => {
  // Redact before logging: raw driver errors can quote the full connection
  // string (with credentials) in their message. Message + stack keep the
  // failure debuggable without exposing MONGODB_URI.
  const detail =
    err instanceof Error ? err.stack ?? err.message : String(err);
  console.error('[server] Fatal startup error:', redactMongoSecrets(detail));
  process.exit(1);
});
