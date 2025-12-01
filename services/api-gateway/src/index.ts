import { createApp } from './app';
import { config } from './config';
import { prisma } from '@mint/database';
import { botTraderService } from './services/botTrader.service';
import { stockService } from './services/stock.service';

async function main() {
  const app = createApp();

  // Verify database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Start server
  const server = app.listen(config.PORT, () => {
    console.log(`🚀 API Gateway running on port ${config.PORT}`);
    console.log(`📍 Environment: ${config.NODE_ENV}`);
  });

  // Start bot trading scheduler
  const startBotTrading = async () => {
    try {
      // Update stock prices first
      await stockService.updateBotStockPrices();

      // Run bot trading (each bot has its own interval internally)
      await botTraderService.runBotTrading();
    } catch (error) {
      console.error('Bot trading error:', error);
    }
  };

  // Run bot trading every 10 seconds for more active, realistic market
  // Individual bots have their own trade intervals (8s-120s) managed internally
  // This faster tick rate allows aggressive bots to trade frequently
  setInterval(startBotTrading, 10 * 1000);
  console.log('🤖 Bot trading system started (10-second market ticks)');
  console.log('   📈 Aggressive bots: 8-15 second intervals');
  console.log('   ⚖️  Moderate bots: 25-45 second intervals');
  console.log('   🐢 Conservative bots: 60-120 second intervals');
  console.log('   💥 Random pump/dump events enabled');

  // Run immediately on startup (with delay to ensure DB is ready)
  setTimeout(() => {
    startBotTrading();
  }, 5000);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    server.close(async () => {
      console.log('HTTP server closed');
      await prisma.$disconnect();
      console.log('Database disconnected');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
