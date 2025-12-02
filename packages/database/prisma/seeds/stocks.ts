import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface StockSeed {
  tickerSymbol: string;
  companyName: string;
  sector: string;
  basePrice: number;
  volatility: number;
  description: string;
}

const PARODY_STOCKS: StockSeed[] = [
  // MintTech (6 stocks)
  { tickerSymbol: 'GOGGL', companyName: 'Goggle Inc', sector: 'tech', basePrice: 2850, volatility: 0.025, description: 'Surveillance tech empire. Tracks everything, sells to everyone.' },
  { tickerSymbol: 'FAKEBOOK', companyName: 'FakeBook', sector: 'tech', basePrice: 485, volatility: 0.03, description: 'Identity theft network disguised as social media.' },
  { tickerSymbol: 'DRKWEB', companyName: 'DarkWeave', sector: 'tech', basePrice: 195, volatility: 0.035, description: 'Dark web hosting. Untraceable servers for the discerning criminal.' },
  { tickerSymbol: 'CRYPT0', companyName: 'CryptØ', sector: 'tech', basePrice: 312, volatility: 0.045, description: 'Untraceable crypto exchange. Not your keys, not your problem.' },
  { tickerSymbol: 'HACKR', companyName: 'HackrBox', sector: 'tech', basePrice: 78, volatility: 0.04, description: 'Stolen data storage. Premium leaked files service.' },
  { tickerSymbol: 'BURNER', companyName: 'BurnerTech', sector: 'tech', basePrice: 156, volatility: 0.028, description: 'Disposable phones and encrypted comms for the paranoid.' },

  // MintFinance (6 stocks)
  { tickerSymbol: 'WASHD', companyName: 'WashCo Holdings', sector: 'finance', basePrice: 425, volatility: 0.02, description: 'Money laundering specialists. We clean your dirty money.' },
  { tickerSymbol: 'OFFSH', companyName: 'OffShore Capital', sector: 'finance', basePrice: 890, volatility: 0.018, description: 'Hidden accounts and tax evasion. Swiss quality, Cayman prices.' },
  { tickerSymbol: 'PAYDAY', companyName: 'PayDay Loans', sector: 'finance', basePrice: 45, volatility: 0.05, description: 'Loan sharks with a corporate facade. 400% APR is just the start.' },
  { tickerSymbol: 'SHADDW', companyName: 'Shadow Bank', sector: 'finance', basePrice: 567, volatility: 0.022, description: 'Underground banking network. No questions asked.' },
  { tickerSymbol: 'GOLDVLT', companyName: 'GoldVault Inc', sector: 'finance', basePrice: 234, volatility: 0.015, description: 'Secure storage for "assets" of questionable origin.' },
  { tickerSymbol: 'CASINO', companyName: 'Lucky Mint Casino', sector: 'finance', basePrice: 178, volatility: 0.038, description: 'Gambling and money cleaning. The house always launders.' },

  // MintEnergy (5 stocks)
  { tickerSymbol: 'SIPHON', companyName: 'Siphon Energy', sector: 'energy', basePrice: 89, volatility: 0.032, description: 'Stolen fuel and pipeline taps. Gas prices are a suggestion.' },
  { tickerSymbol: 'GRIDX', companyName: 'GridJack Corp', sector: 'energy', basePrice: 145, volatility: 0.04, description: 'Power grid exploits. We turn off your competitors.' },
  { tickerSymbol: 'BLACKOUT', companyName: 'BlackOut Systems', sector: 'energy', basePrice: 267, volatility: 0.028, description: 'Controls power for heists. Darkness on demand.' },
  { tickerSymbol: 'JUNKYARD', companyName: 'JunkYard Motors', sector: 'energy', basePrice: 34, volatility: 0.055, description: 'Chop shops and stolen parts. VIN? What VIN?' },
  { tickerSymbol: 'BTTRY', companyName: 'Hot Battery Inc', sector: 'energy', basePrice: 112, volatility: 0.042, description: 'Stolen EV batteries. Green crime for a green future.' },

  // MintConsumer (6 stocks)
  { tickerSymbol: 'AMAZONE', companyName: 'Amazone Prime', sector: 'consumer', basePrice: 3420, volatility: 0.022, description: 'Contraband delivery network. Same day shipping, no questions.' },
  { tickerSymbol: 'LUXFAKE', companyName: 'LuxFake Inc', sector: 'consumer', basePrice: 567, volatility: 0.025, description: 'Counterfeit luxury goods. Real fake quality.' },
  { tickerSymbol: 'SILKRD', companyName: 'SilkRoad Retail', sector: 'consumer', basePrice: 234, volatility: 0.048, description: 'Dark web marketplace. Everything ships from an undisclosed location.' },
  { tickerSymbol: 'PAWNIT', companyName: 'PawnIt Chain', sector: 'consumer', basePrice: 28, volatility: 0.035, description: 'Fencing stolen goods since 1987. No receipt needed.' },
  { tickerSymbol: 'BOOZE', companyName: 'BootLeg Spirits', sector: 'consumer', basePrice: 78, volatility: 0.03, description: 'Untaxed alcohol with creative labels.' },
  { tickerSymbol: 'SMOKEZ', companyName: 'SmokeScreen Co', sector: 'consumer', basePrice: 56, volatility: 0.028, description: 'Contraband tobacco. Warning labels are optional.' },

  // MintHealth (6 stocks)
  { tickerSymbol: 'PHARMA', companyName: 'PharmaBro Inc', sector: 'health', basePrice: 445, volatility: 0.035, description: 'Black market medications. Same pills, different price.' },
  { tickerSymbol: 'ENHANCE', companyName: 'EnhanceCorp', sector: 'health', basePrice: 123, volatility: 0.045, description: 'Performance drugs and steroids. Gains guaranteed.' },
  { tickerSymbol: 'DOCOFF', companyName: 'Doc-Off-Books', sector: 'health', basePrice: 89, volatility: 0.032, description: 'Unlicensed clinics. Cash only, no records.' },
  { tickerSymbol: 'PAINAWAY', companyName: 'PainAway Labs', sector: 'health', basePrice: 234, volatility: 0.038, description: '"Pain management" specialists with flexible prescriptions.' },
  { tickerSymbol: 'ORGANX', companyName: 'OrganX Trade', sector: 'health', basePrice: 890, volatility: 0.05, description: 'Black market organs. Fresh, imported, and discreet.' },
  { tickerSymbol: 'LABRAT', companyName: 'LabRat Testing', sector: 'health', basePrice: 45, volatility: 0.06, description: 'Fake medical tests. Need clean results? We got you.' },

  // MintIndustrial (6 stocks)
  { tickerSymbol: 'HEISTCO', companyName: 'HeistCo Supply', sector: 'industrial', basePrice: 178, volatility: 0.028, description: 'Heist equipment supplier. Professional grade tools for professionals.' },
  { tickerSymbol: 'GETAWAY', companyName: 'GetAway Motors', sector: 'industrial', basePrice: 345, volatility: 0.032, description: 'Custom getaway vehicles. Fast, armored, untraceable.' },
  { tickerSymbol: 'ARMORX', companyName: 'ArmorX Defense', sector: 'industrial', basePrice: 567, volatility: 0.025, description: 'Illegal weapons and armor. Second amendment plus.' },
  { tickerSymbol: 'SAFECRK', companyName: 'SafeCrack Inc', sector: 'industrial', basePrice: 89, volatility: 0.04, description: 'Lock picks and safe cracking tools. Every lock has a key.' },
  { tickerSymbol: 'VANISH', companyName: 'Vanish Logistics', sector: 'industrial', basePrice: 234, volatility: 0.03, description: 'Evidence disposal. We make problems disappear.' },
  { tickerSymbol: 'PRINTS', companyName: 'NoPrints Tech', sector: 'industrial', basePrice: 156, volatility: 0.035, description: 'Anti-forensics and clean crews. Leave no trace.' },
];

export async function seedStocks(): Promise<void> {
  console.log('🏦 Seeding 35 parody stocks...');

  for (const stock of PARODY_STOCKS) {
    const existing = await prisma.botStock.findUnique({
      where: { tickerSymbol: stock.tickerSymbol },
    });

    if (existing) {
      console.log(`  ⏭️  ${stock.tickerSymbol} already exists, skipping`);
      continue;
    }

    await prisma.botStock.create({
      data: {
        tickerSymbol: stock.tickerSymbol,
        companyName: stock.companyName,
        sector: stock.sector,
        currentPrice: new Prisma.Decimal(stock.basePrice),
        previousClose: new Prisma.Decimal(stock.basePrice),
        highPrice24h: new Prisma.Decimal(stock.basePrice * 1.02),
        lowPrice24h: new Prisma.Decimal(stock.basePrice * 0.98),
        basePrice: new Prisma.Decimal(stock.basePrice),
        volatility: new Prisma.Decimal(stock.volatility),
        description: stock.description,
        trend: 'neutral',
        trendStrength: 1,
        isActive: true,
        sortOrder: PARODY_STOCKS.indexOf(stock),
      },
    });

    console.log(`  ✅ Created ${stock.tickerSymbol} - ${stock.companyName}`);
  }

  console.log('🏦 Stock seeding complete!');
}

// Run if called directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedStocks()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
