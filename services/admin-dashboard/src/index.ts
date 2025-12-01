import { createApp } from './app';
import { config } from './config';
import { logger } from './services/logger';

async function main() {
  try {
    const app = createApp();

    app.listen(config.PORT, () => {
      logger.info(`Admin Dashboard API running`, {
        port: config.PORT,
        env: config.NODE_ENV,
        allowedIps: config.ALLOWED_IPS,
      });

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔐 ADMIN DASHBOARD API                                     ║
║                                                              ║
║   Port: ${config.PORT}                                            ║
║   Environment: ${config.NODE_ENV.padEnd(43)}║
║                                                              ║
║   ⚠️  This service should NOT be publicly accessible!        ║
║   Only expose via VPN or internal network.                   ║
║                                                              ║
║   Allowed IPs: ${config.ALLOWED_IPS.slice(0, 3).join(', ').padEnd(43)}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start admin dashboard', { error });
    process.exit(1);
  }
}

main();
