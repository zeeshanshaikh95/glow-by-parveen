import { createApp } from './app.js';
import { config } from './config/env.js';

async function main() {
  const app = await createApp();

  app.listen(config.port, () => {
    console.log(`[server] Glow by Parveen API listening on http://localhost:${config.port}`);
    console.log(`[server] CORS origins: ${config.corsOrigins.join(', ')}`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
