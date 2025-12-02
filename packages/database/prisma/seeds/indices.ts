import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const SECTOR_MAP: Record<string, string> = {
  tech: 'MTEK',
  finance: 'MFIN',
  energy: 'MNRG',
  consumer: 'MCON',
  health: 'MHLT',
  industrial: 'MIND',
};

const SECTOR_NAMES: Record<string, string> = {
  MTEK: 'MintTech ETF',
  MFIN: 'MintFinance ETF',
  MNRG: 'MintEnergy ETF',
  MCON: 'MintConsumer ETF',
  MHLT: 'MintHealth ETF',
  MIND: 'MintIndustrial ETF',
};

export async function seedIndices(): Promise<void> {
  console.log('📊 Seeding market indices...');

  // Get all stocks for calculations
  const stocks = await prisma.botStock.findMany({
    where: { isActive: true },
  });

  if (stocks.length === 0) {
    console.log('  ⚠️  No stocks found. Run stock seed first.');
    return;
  }

  // Calculate total market cap
  const totalMarketCap = stocks.reduce(
    (sum, s) => sum + Number(s.currentPrice) * 1000000,
    0
  );

  // Create MINT35 master index
  const masterExists = await prisma.marketIndex.findUnique({
    where: { tickerSymbol: 'MINT35' },
  });

  if (!masterExists) {
    const avgPrice = totalMarketCap / stocks.length / 1000000;
    const masterIndex = await prisma.marketIndex.create({
      data: {
        tickerSymbol: 'MINT35',
        name: 'Mint 35 Index',
        indexType: 'master',
        currentValue: new Prisma.Decimal(avgPrice * 100), // Index starts at ~100x avg
        previousClose: new Prisma.Decimal(avgPrice * 100),
        highValue24h: new Prisma.Decimal(avgPrice * 102),
        lowValue24h: new Prisma.Decimal(avgPrice * 98),
        isActive: true,
      },
    });

    // Add all stocks as components with hybrid weighting
    for (const stock of stocks) {
      const marketCap = Number(stock.currentPrice) * 1000000;
      const capWeight = marketCap / totalMarketCap * 0.7;
      const volumeWeight = 1 / stocks.length * 0.3;
      const weight = capWeight + volumeWeight;

      await prisma.indexComponent.create({
        data: {
          indexId: masterIndex.id,
          botStockId: stock.id,
          weight: new Prisma.Decimal(weight),
        },
      });
    }

    console.log('  ✅ Created MINT35 master index');
  } else {
    console.log('  ⏭️  MINT35 already exists, skipping');
  }

  // Create sector ETFs
  for (const [sector, ticker] of Object.entries(SECTOR_MAP)) {
    const etfExists = await prisma.marketIndex.findUnique({
      where: { tickerSymbol: ticker },
    });

    if (etfExists) {
      console.log(`  ⏭️  ${ticker} already exists, skipping`);
      continue;
    }

    const sectorStocks = stocks.filter((s) => s.sector === sector);
    if (sectorStocks.length === 0) continue;

    const sectorMarketCap = sectorStocks.reduce(
      (sum, s) => sum + Number(s.currentPrice) * 1000000,
      0
    );
    const avgPrice = sectorMarketCap / sectorStocks.length / 1000000;

    const etf = await prisma.marketIndex.create({
      data: {
        tickerSymbol: ticker,
        name: SECTOR_NAMES[ticker] || `${sector} ETF`,
        indexType: 'sector',
        sector,
        currentValue: new Prisma.Decimal(avgPrice * 10),
        previousClose: new Prisma.Decimal(avgPrice * 10),
        highValue24h: new Prisma.Decimal(avgPrice * 10.2),
        lowValue24h: new Prisma.Decimal(avgPrice * 9.8),
        isActive: true,
      },
    });

    // Add sector stocks as components with equal weight
    for (const stock of sectorStocks) {
      await prisma.indexComponent.create({
        data: {
          indexId: etf.id,
          botStockId: stock.id,
          weight: new Prisma.Decimal(1 / sectorStocks.length),
        },
      });
    }

    console.log(`  ✅ Created ${ticker} sector ETF`);
  }

  console.log('📊 Index seeding complete!');
}

if (require.main === module) {
  seedIndices()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
