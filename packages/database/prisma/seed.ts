import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const propertyTypes: Prisma.PropertyTypeCreateInput[] = [
  // Tier 1 - Starter (can own many)
  {
    slug: 'lemonade-stand',
    name: 'Street Food Cart',
    category: 'starter',
    tier: 1,
    baseCost: 100,
    baseIncomeHour: 15, // Increased income to make this starter hustle feel more rewarding
    managerCost: 500,
    managerName: 'Street Vendor',
    maxQuantity: 100, // Can own up to 100 carts
    sortOrder: 1,
  },
  {
    slug: 'newspaper-route',
    name: 'Newspaper Route',
    category: 'starter',
    tier: 1,
    baseCost: 500,
    baseIncomeHour: 25,
    managerCost: 2500,
    managerName: 'Delivery Supervisor',
    maxQuantity: 50, // Can own up to 50 routes
    sortOrder: 2,
  },
  {
    slug: 'car-wash',
    name: 'Car Wash',
    category: 'starter',
    tier: 1,
    baseCost: 2000,
    baseIncomeHour: 100,
    managerCost: 10000,
    managerName: 'Wash Manager',
    maxQuantity: 25, // Can own up to 25 car washes
    sortOrder: 3,
  },

  // Tier 2 - Residential (moderate limits)
  {
    slug: 'apartment',
    name: 'Apartment',
    category: 'residential',
    tier: 2,
    baseCost: 10000,
    baseIncomeHour: 500,
    managerCost: 50000,
    managerName: 'Property Manager',
    maxQuantity: 50, // Can own up to 50 apartments
    sortOrder: 4,
    unlockRequirement: { level: 5 },
  },
  {
    slug: 'duplex',
    name: 'Duplex',
    category: 'residential',
    tier: 2,
    baseCost: 50000,
    baseIncomeHour: 2500,
    managerCost: 250000,
    managerName: 'Building Super',
    maxQuantity: 25, // Can own up to 25 duplexes
    sortOrder: 5,
    unlockRequirement: { level: 10 },
  },
  {
    slug: 'condo-complex',
    name: 'Condo Complex',
    category: 'residential',
    tier: 2,
    baseCost: 200000,
    baseIncomeHour: 10000,
    managerCost: 1000000,
    managerName: 'HOA President',
    maxQuantity: 15, // Can own up to 15 condo complexes
    sortOrder: 6,
    unlockRequirement: { level: 15 },
  },

  // Tier 3 - Commercial (stricter limits)
  {
    slug: 'strip-mall',
    name: 'Strip Mall',
    category: 'commercial',
    tier: 3,
    baseCost: 1000000,
    baseIncomeHour: 50000,
    managerCost: 5000000,
    managerName: 'Mall Director',
    maxQuantity: 10, // Can own up to 10 strip malls
    sortOrder: 7,
    unlockRequirement: { level: 20 },
  },
  {
    slug: 'office-building',
    name: 'Office Building',
    category: 'commercial',
    tier: 3,
    baseCost: 5000000,
    baseIncomeHour: 250000,
    managerCost: 25000000,
    managerName: 'Building Manager',
    maxQuantity: 5, // Can own up to 5 office buildings
    sortOrder: 8,
    unlockRequirement: { level: 25 },
  },

  // Tier 4 - Luxury (very limited)
  {
    slug: 'hotel',
    name: 'Luxury Hotel',
    category: 'luxury',
    tier: 4,
    baseCost: 25000000,
    baseIncomeHour: 1250000,
    managerCost: 125000000,
    managerName: 'Hotel GM',
    maxQuantity: 3, // Can own up to 3 luxury hotels
    sortOrder: 9,
    unlockRequirement: { level: 30 },
  },
  {
    slug: 'skyscraper',
    name: 'Skyscraper',
    category: 'luxury',
    tier: 4,
    baseCost: 100000000,
    baseIncomeHour: 5000000,
    managerCost: 500000000,
    managerName: 'Tower Director',
    maxQuantity: 1, // Can only own 1 skyscraper (iconic!)
    sortOrder: 10,
    unlockRequirement: { level: 35 },
  },
];

const prestigePerks: Prisma.PrestigePerkCreateInput[] = [
  // Tier 1 - Starter Perks
  {
    slug: 'investor-network',
    name: 'Investor Network',
    description: 'Your network brings in extra deals. +5% income per level.',
    category: 'income',
    tier: 1,
    cost: 5,
    effect: { type: 'income_mult', value: 0.05 },
    maxLevel: 10,
    sortOrder: 1,
  },
  {
    slug: 'early-bird',
    name: 'Early Bird',
    description: 'Wake up to more earnings. +1 hour offline cap per level.',
    category: 'offline',
    tier: 1,
    cost: 10,
    effect: { type: 'offline_hours', value: 1 },
    maxLevel: 8,
    sortOrder: 2,
  },
  {
    slug: 'fast-learner',
    name: 'Fast Learner',
    description: 'Learn from mistakes faster. -5% upgrade costs per level.',
    category: 'speed',
    tier: 1,
    cost: 8,
    effect: { type: 'upgrade_discount', value: 0.05 },
    maxLevel: 5,
    sortOrder: 3,
  },

  // Tier 2 - Advanced Perks
  {
    slug: 'golden-touch',
    name: 'Golden Touch',
    description: 'Everything you touch turns profitable. +8% income per level.',
    category: 'income',
    tier: 2,
    cost: 25,
    effect: { type: 'income_mult', value: 0.08 },
    maxLevel: 5,
    sortOrder: 4,
  },
  {
    slug: 'night-owl',
    name: 'Night Owl',
    description: 'Your empire never sleeps. +2 hours offline cap per level.',
    category: 'offline',
    tier: 2,
    cost: 30,
    effect: { type: 'offline_hours', value: 2 },
    maxLevel: 4,
    sortOrder: 5,
  },
  {
    slug: 'bulk-buyer',
    name: 'Bulk Buyer',
    description: 'Buy in bulk, save big. -8% property costs per level.',
    category: 'speed',
    tier: 2,
    cost: 20,
    effect: { type: 'property_discount', value: 0.08 },
    maxLevel: 5,
    sortOrder: 6,
  },

  // Tier 3 - Expert Perks
  {
    slug: 'tycoon',
    name: 'Tycoon',
    description: 'You are a force of nature. +12% income per level.',
    category: 'income',
    tier: 3,
    cost: 50,
    effect: { type: 'income_mult', value: 0.12 },
    maxLevel: 3,
    sortOrder: 7,
  },
  {
    slug: 'insomniac',
    name: 'Insomniac',
    description: 'Sleep is for the weak. +4 hours offline cap per level.',
    category: 'offline',
    tier: 3,
    cost: 75,
    effect: { type: 'offline_hours', value: 4 },
    maxLevel: 2,
    sortOrder: 8,
  },

  // Tier 4 - Legendary Perks
  {
    slug: 'midas',
    name: 'Midas Touch',
    description: 'Legendary wealth generation. +20% income per level.',
    category: 'income',
    tier: 4,
    cost: 100,
    effect: { type: 'income_mult', value: 0.2 },
    maxLevel: 2,
    sortOrder: 9,
  },
  {
    slug: 'time-lord',
    name: 'Time Lord',
    description: 'Master of time itself. +8 hours offline cap.',
    category: 'offline',
    tier: 4,
    cost: 150,
    effect: { type: 'offline_hours', value: 8 },
    maxLevel: 1,
    sortOrder: 10,
  },
];

// Daily rewards for 30-day cycle
const dailyRewards: Prisma.DailyRewardCreateInput[] = [
  // Week 1 - Building momentum
  { day: 1, rewardType: 'cash', rewardData: { amount: 500 } },
  { day: 2, rewardType: 'cash', rewardData: { amount: 750 } },
  { day: 3, rewardType: 'cash', rewardData: { amount: 1000 } },
  { day: 4, rewardType: 'cash', rewardData: { amount: 1500 } },
  { day: 5, rewardType: 'cash', rewardData: { amount: 2000, bonusCoins: 10 } },
  { day: 6, rewardType: 'cash', rewardData: { amount: 2500 } },
  { day: 7, rewardType: 'cash', rewardData: { amount: 5000, bonusCoins: 25 } },

  // Week 2 - Growing rewards
  { day: 8, rewardType: 'cash', rewardData: { amount: 3000 } },
  { day: 9, rewardType: 'cash', rewardData: { amount: 3500 } },
  { day: 10, rewardType: 'cash', rewardData: { amount: 4000 } },
  { day: 11, rewardType: 'cash', rewardData: { amount: 4500 } },
  { day: 12, rewardType: 'cash', rewardData: { amount: 5000, bonusCoins: 15 } },
  { day: 13, rewardType: 'cash', rewardData: { amount: 6000 } },
  { day: 14, rewardType: 'cash', rewardData: { amount: 10000, bonusCoins: 50 } },

  // Week 3 - Big milestone rewards
  { day: 15, rewardType: 'cash', rewardData: { amount: 7500 } },
  { day: 16, rewardType: 'cash', rewardData: { amount: 8000 } },
  { day: 17, rewardType: 'cash', rewardData: { amount: 9000 } },
  { day: 18, rewardType: 'cash', rewardData: { amount: 10000 } },
  { day: 19, rewardType: 'cash', rewardData: { amount: 12000, bonusCoins: 20 } },
  { day: 20, rewardType: 'cash', rewardData: { amount: 15000 } },
  { day: 21, rewardType: 'cash', rewardData: { amount: 25000, bonusCoins: 100 } },

  // Week 4 - Premium rewards
  { day: 22, rewardType: 'cash', rewardData: { amount: 15000 } },
  { day: 23, rewardType: 'cash', rewardData: { amount: 17500 } },
  { day: 24, rewardType: 'cash', rewardData: { amount: 20000 } },
  { day: 25, rewardType: 'cash', rewardData: { amount: 22500, bonusCoins: 30 } },
  { day: 26, rewardType: 'cash', rewardData: { amount: 25000 } },
  { day: 27, rewardType: 'cash', rewardData: { amount: 30000 } },
  { day: 28, rewardType: 'cash', rewardData: { amount: 35000, bonusCoins: 75 } },

  // Final stretch - Ultimate rewards
  { day: 29, rewardType: 'cash', rewardData: { amount: 40000 } },
  {
    day: 30,
    rewardType: 'cash',
    rewardData: { amount: 50000, bonusCoins: 250, prestigePoints: 5 },
  },
];

// Achievements - 25 total across multiple categories
const achievements: Prisma.AchievementCreateInput[] = [
  // ============ WEALTH ACHIEVEMENTS ============
  {
    id: 'first_thousand',
    name: 'First Thousand',
    description: 'Earn your first $1,000',
    category: 'wealth',
    tier: 'bronze',
    points: 10,
    requirementType: 'cash',
    requirementValue: 1000,
    rewardCash: 100,
    sortOrder: 1,
  },
  {
    id: 'ten_grand',
    name: 'Ten Grand',
    description: 'Accumulate $10,000 in cash',
    category: 'wealth',
    tier: 'bronze',
    points: 25,
    requirementType: 'cash',
    requirementValue: 10000,
    rewardCash: 500,
    sortOrder: 2,
  },
  {
    id: 'hundred_grand',
    name: 'Hundred Grand',
    description: 'Accumulate $100,000 in cash',
    category: 'wealth',
    tier: 'silver',
    points: 50,
    requirementType: 'cash',
    requirementValue: 100000,
    rewardCash: 5000,
    sortOrder: 3,
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    description: 'Accumulate $1,000,000 in cash',
    category: 'wealth',
    tier: 'gold',
    points: 100,
    requirementType: 'cash',
    requirementValue: 1000000,
    rewardCash: 50000,
    sortOrder: 4,
  },
  {
    id: 'multi_millionaire',
    name: 'Multi-Millionaire',
    description: 'Accumulate $10,000,000 in cash',
    category: 'wealth',
    tier: 'platinum',
    points: 200,
    requirementType: 'cash',
    requirementValue: 10000000,
    rewardCash: 500000,
    sortOrder: 5,
  },

  // ============ PROPERTY ACHIEVEMENTS ============
  {
    id: 'first_property',
    name: 'Landlord',
    description: 'Purchase your first property',
    category: 'property',
    tier: 'bronze',
    points: 10,
    requirementType: 'properties_owned',
    requirementValue: 1,
    rewardCash: 100,
    sortOrder: 10,
  },
  {
    id: 'property_collector',
    name: 'Property Collector',
    description: 'Own 10 properties',
    category: 'property',
    tier: 'silver',
    points: 50,
    requirementType: 'properties_owned',
    requirementValue: 10,
    rewardCash: 5000,
    sortOrder: 11,
  },
  {
    id: 'property_mogul',
    name: 'Property Mogul',
    description: 'Own 50 properties',
    category: 'property',
    tier: 'gold',
    points: 100,
    requirementType: 'properties_owned',
    requirementValue: 50,
    rewardCash: 25000,
    sortOrder: 12,
  },
  {
    id: 'real_estate_empire',
    name: 'Real Estate Empire',
    description: 'Own 100 properties',
    category: 'property',
    tier: 'platinum',
    points: 200,
    requirementType: 'properties_owned',
    requirementValue: 100,
    rewardCash: 100000,
    sortOrder: 13,
  },
  {
    id: 'first_manager',
    name: 'Delegation',
    description: 'Hire your first property manager',
    category: 'property',
    tier: 'bronze',
    points: 15,
    requirementType: 'managers_hired',
    requirementValue: 1,
    rewardCash: 500,
    sortOrder: 14,
  },
  {
    id: 'full_automation',
    name: 'Full Automation',
    description: 'Have managers on all property types',
    category: 'property',
    tier: 'gold',
    points: 100,
    requirementType: 'managers_hired',
    requirementValue: 10,
    rewardCash: 50000,
    sortOrder: 15,
  },

  // ============ BUSINESS ACHIEVEMENTS ============
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    description: 'Start your first business',
    category: 'business',
    tier: 'bronze',
    points: 15,
    requirementType: 'businesses_owned',
    requirementValue: 1,
    rewardCash: 500,
    sortOrder: 20,
  },
  {
    id: 'serial_entrepreneur',
    name: 'Serial Entrepreneur',
    description: 'Own 5 different businesses',
    category: 'business',
    tier: 'silver',
    points: 50,
    requirementType: 'businesses_owned',
    requirementValue: 5,
    rewardCash: 10000,
    sortOrder: 21,
  },
  {
    id: 'business_empire',
    name: 'Business Empire',
    description: 'Own all 8 business types',
    category: 'business',
    tier: 'gold',
    points: 100,
    requirementType: 'businesses_owned',
    requirementValue: 8,
    rewardCash: 100000,
    sortOrder: 22,
  },

  // ============ INCOME ACHIEVEMENTS ============
  {
    id: 'passive_income',
    name: 'Passive Income',
    description: 'Reach $100/hour income',
    category: 'income',
    tier: 'bronze',
    points: 15,
    requirementType: 'income_per_hour',
    requirementValue: 100,
    rewardCash: 200,
    sortOrder: 30,
  },
  {
    id: 'income_stream',
    name: 'Income Stream',
    description: 'Reach $1,000/hour income',
    category: 'income',
    tier: 'silver',
    points: 40,
    requirementType: 'income_per_hour',
    requirementValue: 1000,
    rewardCash: 2000,
    sortOrder: 31,
  },
  {
    id: 'money_machine',
    name: 'Money Machine',
    description: 'Reach $10,000/hour income',
    category: 'income',
    tier: 'gold',
    points: 75,
    requirementType: 'income_per_hour',
    requirementValue: 10000,
    rewardCash: 20000,
    sortOrder: 32,
  },
  {
    id: 'wealth_generator',
    name: 'Wealth Generator',
    description: 'Reach $100,000/hour income',
    category: 'income',
    tier: 'platinum',
    points: 150,
    requirementType: 'income_per_hour',
    requirementValue: 100000,
    rewardCash: 200000,
    sortOrder: 33,
  },

  // ============ PRESTIGE ACHIEVEMENTS ============
  {
    id: 'first_ipo',
    name: 'Going Public',
    description: 'Complete your first prestige',
    category: 'prestige',
    tier: 'silver',
    points: 50,
    requirementType: 'times_prestiged',
    requirementValue: 1,
    rewardCash: 10000,
    sortOrder: 40,
  },
  {
    id: 'serial_ipo',
    name: 'Serial IPO',
    description: 'Prestige 5 times',
    category: 'prestige',
    tier: 'gold',
    points: 100,
    requirementType: 'times_prestiged',
    requirementValue: 5,
    rewardCash: 50000,
    sortOrder: 41,
  },
  {
    id: 'prestige_master',
    name: 'Prestige Master',
    description: 'Prestige 10 times',
    category: 'prestige',
    tier: 'platinum',
    points: 200,
    requirementType: 'times_prestiged',
    requirementValue: 10,
    rewardCash: 250000,
    sortOrder: 42,
  },

  // ============ STREAK ACHIEVEMENTS ============
  {
    id: 'dedicated_player',
    name: 'Dedicated',
    description: 'Maintain a 7-day login streak',
    category: 'streak',
    tier: 'bronze',
    points: 25,
    requirementType: 'login_streak',
    requirementValue: 7,
    rewardCash: 5000,
    sortOrder: 50,
  },
  {
    id: 'committed',
    name: 'Committed',
    description: 'Maintain a 30-day login streak',
    category: 'streak',
    tier: 'gold',
    points: 100,
    requirementType: 'login_streak',
    requirementValue: 30,
    rewardCash: 50000,
    sortOrder: 51,
  },

  // ============ LEVEL ACHIEVEMENTS ============
  {
    id: 'level_10',
    name: 'Rising Star',
    description: 'Reach player level 10',
    category: 'level',
    tier: 'bronze',
    points: 20,
    requirementType: 'player_level',
    requirementValue: 10,
    rewardCash: 1000,
    sortOrder: 60,
  },
  {
    id: 'level_25',
    name: 'Veteran',
    description: 'Reach player level 25',
    category: 'level',
    tier: 'silver',
    points: 50,
    requirementType: 'player_level',
    requirementValue: 25,
    rewardCash: 10000,
    sortOrder: 61,
  },
  {
    id: 'level_50',
    name: 'Master',
    description: 'Reach player level 50',
    category: 'level',
    tier: 'gold',
    points: 100,
    requirementType: 'player_level',
    requirementValue: 50,
    rewardCash: 100000,
    sortOrder: 62,
  },
];

// ============================================================================
// PHASES (Universal Paperclips-style progression milestones)
// ============================================================================
const phases: Prisma.PhaseCreateInput[] = [
  {
    id: 1,
    slug: 'hustler',
    name: 'Hustler',
    description: 'Starting out with side gigs and first properties',
    netWorthRequired: 0,
    unlockMessage: 'Welcome to The Mint! Start building your empire.',
  },
  {
    id: 2,
    slug: 'landlord',
    name: 'Landlord',
    description: 'Building a real estate empire',
    netWorthRequired: 1000000,
    unlockMessage: "You've hit $1M net worth! New upgrades and projects unlocked.",
  },
  {
    id: 3,
    slug: 'mogul',
    name: 'Mogul',
    description: 'Running a business empire with franchises',
    netWorthRequired: 10000000,
    unlockMessage: "You're a business mogul now! Advanced projects available.",
  },
  {
    id: 4,
    slug: 'investor',
    name: 'Investor',
    description: 'Playing the stock market and diversifying',
    netWorthRequired: 100000000,
    unlockMessage: "You've reached investor status! The stock market awaits.",
  },
  {
    id: 5,
    slug: 'titan',
    name: 'Titan',
    description: 'Dominating markets and acquiring competitors',
    netWorthRequired: 1000000000,
    unlockMessage: 'You are a Titan of industry! Maximum power unlocked.',
  },
];

// ============================================================================
// PROJECTS (Universal Paperclips-style one-time purchases)
// ============================================================================
const projects: Prisma.ProjectCreateInput[] = [
  // Phase 1 - Hustler Projects
  {
    slug: 'marketing-101',
    name: 'Marketing 101',
    description: 'Learn basic marketing. +5% income from all sources.',
    category: 'marketing',
    cost: 10000,
    phaseRequired: 1,
    effect: { type: 'income_mult', value: 0.05 },
    sortOrder: 1,
  },
  {
    slug: 'networking-event',
    name: 'Networking Event',
    description: 'Meet other entrepreneurs. +3% income.',
    category: 'operations',
    cost: 25000,
    phaseRequired: 1,
    effect: { type: 'income_mult', value: 0.03 },
    sortOrder: 2,
  },
  {
    slug: 'local-seo',
    name: 'Local SEO',
    description: 'Get found online. +5% property income.',
    category: 'marketing',
    cost: 50000,
    phaseRequired: 1,
    effect: { type: 'property_income_mult', value: 0.05 },
    sortOrder: 3,
  },

  // Phase 2 - Landlord Projects
  {
    slug: 'property-management-software',
    name: 'Property Management Software',
    description: 'Automate rent collection. +10% property income.',
    category: 'technology',
    cost: 250000,
    phaseRequired: 2,
    effect: { type: 'property_income_mult', value: 0.1 },
    sortOrder: 10,
  },
  {
    slug: 'renovation-crew',
    name: 'Renovation Crew',
    description: 'Faster property upgrades. -10% upgrade costs.',
    category: 'operations',
    cost: 500000,
    phaseRequired: 2,
    effect: { type: 'upgrade_discount', value: 0.1 },
    sortOrder: 11,
  },
  {
    slug: 'tenant-screening',
    name: 'Tenant Screening Service',
    description: 'Better tenants mean more income. +8% income.',
    category: 'operations',
    cost: 750000,
    phaseRequired: 2,
    effect: { type: 'income_mult', value: 0.08 },
    sortOrder: 12,
  },

  // Phase 3 - Mogul Projects
  {
    slug: 'franchise-license',
    name: 'Franchise License',
    description: 'Open franchise locations. +15% business income.',
    category: 'expansion',
    cost: 5000000,
    phaseRequired: 3,
    effect: { type: 'business_income_mult', value: 0.15 },
    sortOrder: 20,
  },
  {
    slug: 'corporate-hq',
    name: 'Corporate Headquarters',
    description: 'Central command for your empire. +10% all income.',
    category: 'expansion',
    cost: 10000000,
    phaseRequired: 3,
    effect: { type: 'income_mult', value: 0.1 },
    sortOrder: 21,
  },
  {
    slug: 'supply-chain-optimization',
    name: 'Supply Chain Optimization',
    description: 'Reduce costs across the board. -15% purchase costs.',
    category: 'operations',
    cost: 7500000,
    phaseRequired: 3,
    effect: { type: 'purchase_discount', value: 0.15 },
    sortOrder: 22,
  },

  // Phase 4 - Investor Projects
  {
    slug: 'hedge-fund',
    name: 'Start a Hedge Fund',
    description: 'Manage money for others. +20% investment returns.',
    category: 'expansion',
    cost: 50000000,
    phaseRequired: 4,
    effect: { type: 'investment_mult', value: 0.2 },
    sortOrder: 30,
  },
  {
    slug: 'real-estate-investment-trust',
    name: 'REIT Formation',
    description: 'Pool property investments. +25% property income.',
    category: 'expansion',
    cost: 75000000,
    phaseRequired: 4,
    effect: { type: 'property_income_mult', value: 0.25 },
    sortOrder: 31,
  },
  {
    slug: 'market-analysis-ai',
    name: 'Market Analysis AI',
    description: 'AI-powered trading insights. +15% all income.',
    category: 'technology',
    cost: 100000000,
    phaseRequired: 4,
    effect: { type: 'income_mult', value: 0.15 },
    sortOrder: 32,
  },

  // Phase 5 - Titan Projects
  {
    slug: 'market-manipulation',
    name: 'Market Influence',
    description: 'Your moves shape the market. +30% all income.',
    category: 'expansion',
    cost: 500000000,
    phaseRequired: 5,
    effect: { type: 'income_mult', value: 0.3 },
    sortOrder: 40,
  },
  {
    slug: 'political-lobbying',
    name: 'Political Lobbying',
    description: 'Favorable regulations. -25% all costs.',
    category: 'operations',
    cost: 750000000,
    phaseRequired: 5,
    effect: { type: 'all_discount', value: 0.25 },
    sortOrder: 41,
  },
  {
    slug: 'global-domination',
    name: 'Global Domination',
    description: 'You own it all. +50% all income.',
    category: 'expansion',
    cost: 1000000000,
    phaseRequired: 5,
    effect: { type: 'income_mult', value: 0.5 },
    sortOrder: 42,
  },
];

// ============================================================================
// UPGRADES (repeatable cash-based upgrades with levels)
// ============================================================================
const upgrades: Prisma.UpgradeCreateInput[] = [
  // Income Upgrades
  {
    slug: 'efficiency-training',
    name: 'Efficiency Training',
    description: 'Train your staff to be more efficient. +2% income per level.',
    category: 'income',
    tier: 1,
    baseCost: 5000,
    costMultiplier: 1.5,
    effect: { type: 'income_mult', value: 0.02 },
    maxLevel: 50,
    phaseRequired: 1,
    sortOrder: 1,
  },
  {
    slug: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Advertise your businesses. +3% income per level.',
    category: 'income',
    tier: 1,
    baseCost: 10000,
    costMultiplier: 1.6,
    effect: { type: 'income_mult', value: 0.03 },
    maxLevel: 30,
    phaseRequired: 1,
    sortOrder: 2,
  },
  {
    slug: 'premium-branding',
    name: 'Premium Branding',
    description: 'Elevate your brand. +5% income per level.',
    category: 'income',
    tier: 2,
    baseCost: 100000,
    costMultiplier: 1.7,
    effect: { type: 'income_mult', value: 0.05 },
    maxLevel: 20,
    phaseRequired: 2,
    sortOrder: 3,
  },

  // Automation Upgrades
  {
    slug: 'basic-automation',
    name: 'Basic Automation',
    description: 'Automate routine tasks. +1 hour offline cap per level.',
    category: 'automation',
    tier: 1,
    baseCost: 15000,
    costMultiplier: 2.0,
    effect: { type: 'offline_cap', value: 1 },
    maxLevel: 16,
    phaseRequired: 1,
    sortOrder: 10,
  },
  {
    slug: 'advanced-automation',
    name: 'Advanced Automation',
    description: 'Smart automation systems. +2 hours offline cap per level.',
    category: 'automation',
    tier: 2,
    baseCost: 500000,
    costMultiplier: 2.5,
    effect: { type: 'offline_cap', value: 2 },
    maxLevel: 8,
    phaseRequired: 2,
    sortOrder: 11,
  },

  // Efficiency Upgrades
  {
    slug: 'bulk-purchasing',
    name: 'Bulk Purchasing',
    description: 'Buy in bulk for discounts. -2% property costs per level.',
    category: 'efficiency',
    tier: 1,
    baseCost: 20000,
    costMultiplier: 1.8,
    effect: { type: 'property_discount', value: 0.02 },
    maxLevel: 25,
    phaseRequired: 1,
    sortOrder: 20,
  },
  {
    slug: 'business-optimization',
    name: 'Business Optimization',
    description: 'Streamline operations. -3% business costs per level.',
    category: 'efficiency',
    tier: 2,
    baseCost: 250000,
    costMultiplier: 1.9,
    effect: { type: 'business_discount', value: 0.03 },
    maxLevel: 20,
    phaseRequired: 2,
    sortOrder: 21,
  },
];

// Bot stocks - look like real player companies
const botStocks: Prisma.BotStockCreateInput[] = [
  // Tech (5) - High volatility
  {
    tickerSymbol: 'APEX',
    companyName: 'Apex Technologies',
    sector: 'tech',
    basePrice: 150.0,
    currentPrice: 150.0,
    previousClose: 148.5,
    highPrice24h: 152.0,
    lowPrice24h: 147.0,
    volatility: 0.035,
    description: 'Leading gaming and metaverse platform',
    sortOrder: 1,
  },
  {
    tickerSymbol: 'BYTE',
    companyName: 'ByteStream Inc',
    sector: 'tech',
    basePrice: 85.0,
    currentPrice: 85.0,
    previousClose: 84.0,
    highPrice24h: 86.5,
    lowPrice24h: 83.0,
    volatility: 0.03,
    description: 'Cloud computing and data services',
    sortOrder: 2,
  },
  {
    tickerSymbol: 'CHIP',
    companyName: 'ChipMax Corporation',
    sector: 'tech',
    basePrice: 220.0,
    currentPrice: 220.0,
    previousClose: 218.0,
    highPrice24h: 225.0,
    lowPrice24h: 215.0,
    volatility: 0.04,
    description: 'Semiconductor manufacturing giant',
    sortOrder: 3,
  },
  {
    tickerSymbol: 'DIGI',
    companyName: 'Digital Dynamics',
    sector: 'tech',
    basePrice: 45.0,
    currentPrice: 45.0,
    previousClose: 44.5,
    highPrice24h: 46.0,
    lowPrice24h: 43.5,
    volatility: 0.045,
    description: 'Cybersecurity and digital protection',
    sortOrder: 4,
  },
  {
    tickerSymbol: 'ECHO',
    companyName: 'EchoNet Systems',
    sector: 'tech',
    basePrice: 120.0,
    currentPrice: 120.0,
    previousClose: 119.0,
    highPrice24h: 122.0,
    lowPrice24h: 117.5,
    volatility: 0.038,
    description: 'AI and machine learning solutions',
    sortOrder: 5,
  },

  // Finance (3) - Medium volatility
  {
    tickerSymbol: 'FBNK',
    companyName: 'First National Bank',
    sector: 'finance',
    basePrice: 75.0,
    currentPrice: 75.0,
    previousClose: 74.5,
    highPrice24h: 76.0,
    lowPrice24h: 74.0,
    volatility: 0.02,
    description: 'Traditional banking and financial services',
    sortOrder: 6,
  },
  {
    tickerSymbol: 'GILT',
    companyName: 'Gilt Capital Partners',
    sector: 'finance',
    basePrice: 180.0,
    currentPrice: 180.0,
    previousClose: 178.0,
    highPrice24h: 182.0,
    lowPrice24h: 177.0,
    volatility: 0.025,
    description: 'Investment management and wealth advisory',
    sortOrder: 7,
  },
  {
    tickerSymbol: 'HDGE',
    companyName: 'Hedge Masters Fund',
    sector: 'finance',
    basePrice: 95.0,
    currentPrice: 95.0,
    previousClose: 94.0,
    highPrice24h: 96.5,
    lowPrice24h: 93.0,
    volatility: 0.028,
    description: 'Alternative investment strategies',
    sortOrder: 8,
  },

  // Energy (3) - High volatility
  {
    tickerSymbol: 'VOLT',
    companyName: 'VoltPower Inc',
    sector: 'energy',
    basePrice: 55.0,
    currentPrice: 55.0,
    previousClose: 54.0,
    highPrice24h: 57.0,
    lowPrice24h: 53.0,
    volatility: 0.042,
    description: 'Renewable energy and battery storage',
    sortOrder: 9,
  },
  {
    tickerSymbol: 'OILX',
    companyName: 'OilMax Global',
    sector: 'energy',
    basePrice: 90.0,
    currentPrice: 90.0,
    previousClose: 89.0,
    highPrice24h: 92.0,
    lowPrice24h: 87.5,
    volatility: 0.038,
    description: 'Oil exploration and production',
    sortOrder: 10,
  },
  {
    tickerSymbol: 'SOLR',
    companyName: 'Solar Dynamics Corp',
    sector: 'energy',
    basePrice: 35.0,
    currentPrice: 35.0,
    previousClose: 34.5,
    highPrice24h: 36.0,
    lowPrice24h: 33.5,
    volatility: 0.048,
    description: 'Solar panel manufacturing',
    sortOrder: 11,
  },

  // Consumer (2) - Low volatility
  {
    tickerSymbol: 'FOOD',
    companyName: 'FoodCorp International',
    sector: 'consumer',
    basePrice: 65.0,
    currentPrice: 65.0,
    previousClose: 64.8,
    highPrice24h: 65.5,
    lowPrice24h: 64.5,
    volatility: 0.015,
    description: 'Global food and beverage conglomerate',
    sortOrder: 12,
  },
  {
    tickerSymbol: 'LUXE',
    companyName: 'LuxeGoods Holdings',
    sector: 'consumer',
    basePrice: 200.0,
    currentPrice: 200.0,
    previousClose: 199.0,
    highPrice24h: 202.0,
    lowPrice24h: 198.0,
    volatility: 0.018,
    description: 'Premium luxury retail brands',
    sortOrder: 13,
  },

  // Healthcare (2) - Medium volatility
  {
    tickerSymbol: 'MEDS',
    companyName: 'MedTech Solutions',
    sector: 'healthcare',
    basePrice: 110.0,
    currentPrice: 110.0,
    previousClose: 109.0,
    highPrice24h: 112.0,
    lowPrice24h: 108.0,
    volatility: 0.028,
    description: 'Medical devices and diagnostics',
    sortOrder: 14,
  },
  {
    tickerSymbol: 'CURE',
    companyName: 'CureAll Pharmaceuticals',
    sector: 'healthcare',
    basePrice: 140.0,
    currentPrice: 140.0,
    previousClose: 138.5,
    highPrice24h: 142.0,
    lowPrice24h: 137.0,
    volatility: 0.032,
    description: 'Drug development and biotechnology',
    sortOrder: 15,
  },
];

const marketEvents: Prisma.MarketEventCreateInput[] = [
  // Positive Events
  {
    slug: 'bull-run',
    name: 'Bull Run',
    description: 'Market momentum is strong! Prices trending up.',
    effectType: 'trend_bias',
    effectValue: 5,
    durationMinutes: 45,
    isPositive: true,
    rarity: 2,
  },
  {
    slug: 'sector-boom-real-estate',
    name: 'Real Estate Boom',
    description: 'Property sector is hot!',
    effectType: 'trend_bias',
    effectValue: 10,
    durationMinutes: 30,
    isPositive: true,
    rarity: 2,
  },
  {
    slug: 'sector-boom-business',
    name: 'Business Sector Rally',
    description: 'Business stocks are surging!',
    effectType: 'trend_bias',
    effectValue: 10,
    durationMinutes: 30,
    isPositive: true,
    rarity: 2,
  },
  {
    slug: 'earnings-beat',
    name: 'Earnings Beat',
    description: 'Your company crushed expectations!',
    effectType: 'instant_spike',
    effectValue: 12,
    durationMinutes: 0,
    isPositive: true,
    rarity: 3,
  },
  {
    slug: 'analyst-upgrade',
    name: 'Analyst Upgrade',
    description: 'Wall Street loves you now.',
    effectType: 'tick_modifier',
    effectValue: 3,
    durationMinutes: 20,
    isPositive: true,
    rarity: 2,
  },
  {
    slug: 'fed-rate-cut',
    name: 'Fed Rate Cut',
    description: 'The Fed cut rates! Markets rally.',
    effectType: 'trend_bias',
    effectValue: 5,
    durationMinutes: 40,
    isPositive: true,
    rarity: 3,
  },
  {
    slug: 'viral-news',
    name: 'Viral News',
    description: 'Your company is trending!',
    effectType: 'instant_spike',
    effectValue: 15,
    durationMinutes: 0,
    isPositive: true,
    rarity: 3,
  },

  // Negative Events
  {
    slug: 'bear-market',
    name: 'Bear Market',
    description: 'Market sentiment is turning negative.',
    effectType: 'trend_bias',
    effectValue: -5,
    durationMinutes: 45,
    isPositive: false,
    rarity: 2,
  },
  {
    slug: 'sector-crash-real-estate',
    name: 'Real Estate Crash',
    description: 'Property bubble bursting!',
    effectType: 'trend_bias',
    effectValue: -10,
    durationMinutes: 30,
    isPositive: false,
    rarity: 2,
  },
  {
    slug: 'sector-crash-business',
    name: 'Business Sector Slump',
    description: 'Business stocks are tanking.',
    effectType: 'trend_bias',
    effectValue: -10,
    durationMinutes: 30,
    isPositive: false,
    rarity: 2,
  },
  {
    slug: 'earnings-miss',
    name: 'Earnings Miss',
    description: 'Your company disappointed investors.',
    effectType: 'instant_spike',
    effectValue: -12,
    durationMinutes: 0,
    isPositive: false,
    rarity: 3,
  },
  {
    slug: 'analyst-downgrade',
    name: 'Analyst Downgrade',
    description: 'Wall Street turned on you.',
    effectType: 'tick_modifier',
    effectValue: -3,
    durationMinutes: 20,
    isPositive: false,
    rarity: 2,
  },
  {
    slug: 'fed-rate-hike',
    name: 'Fed Rate Hike',
    description: 'The Fed raised rates. Ouch.',
    effectType: 'trend_bias',
    effectValue: -5,
    durationMinutes: 40,
    isPositive: false,
    rarity: 3,
  },

  // Neutral/Chaos Events
  {
    slug: 'meme-stock-surge',
    name: 'Meme Stock Surge',
    description: 'Wild swings incoming!',
    effectType: 'tick_modifier',
    effectValue: 10,
    durationMinutes: 20,
    isPositive: true,
    rarity: 3,
  },
  {
    slug: 'market-holiday',
    name: 'Market Holiday',
    description: 'Trading paused for holiday.',
    effectType: 'trend_bias',
    effectValue: 0,
    durationMinutes: 30,
    isPositive: true,
    rarity: 1,
  },
];

// Cosmetics - 15 items across 3 types
const cosmetics: Prisma.CosmeticCreateInput[] = [
  // ============ AVATARS (5) ============
  {
    id: 'avatar_default',
    name: 'Default',
    description: 'The classic investor look',
    type: 'avatar',
    rarity: 'common',
    premiumCost: 0,
    previewUrl: '/cosmetics/avatars/default.png',
    isAvailable: true,
    sortOrder: 1,
    acquisitionType: 'purchase',
  },
  {
    id: 'avatar_investor',
    name: 'Investor',
    description: 'Sharp suit, sharper mind',
    type: 'avatar',
    rarity: 'common',
    premiumCost: 100,
    previewUrl: '/cosmetics/avatars/investor.png',
    isAvailable: true,
    sortOrder: 2,
    acquisitionType: 'purchase',
  },
  {
    id: 'avatar_tycoon',
    name: 'Tycoon',
    description: 'Money talks, and you speak fluently',
    type: 'avatar',
    rarity: 'uncommon',
    premiumCost: 200,
    previewUrl: '/cosmetics/avatars/tycoon.png',
    isAvailable: true,
    sortOrder: 3,
    acquisitionType: 'purchase',
  },
  {
    id: 'avatar_mogul',
    name: 'Mogul',
    description: 'Empire builder extraordinaire',
    type: 'avatar',
    rarity: 'rare',
    premiumCost: 300,
    previewUrl: '/cosmetics/avatars/mogul.png',
    isAvailable: true,
    sortOrder: 4,
    acquisitionType: 'purchase',
  },
  {
    id: 'avatar_legend',
    name: 'Legend',
    description: 'Your name echoes through Wall Street',
    type: 'avatar',
    rarity: 'epic',
    premiumCost: 400,
    previewUrl: '/cosmetics/avatars/legend.png',
    isAvailable: true,
    sortOrder: 5,
    acquisitionType: 'purchase',
  },

  // ============ AVATAR FRAMES (5) ============
  {
    id: 'frame_none',
    name: 'None',
    description: 'Keep it simple',
    type: 'avatar_frame',
    rarity: 'common',
    premiumCost: 0,
    previewUrl: '/cosmetics/frames/none.png',
    isAvailable: true,
    sortOrder: 10,
    acquisitionType: 'purchase',
  },
  {
    id: 'frame_bronze',
    name: 'Bronze',
    description: 'A modest frame for modest gains',
    type: 'avatar_frame',
    rarity: 'common',
    premiumCost: 100,
    previewUrl: '/cosmetics/frames/bronze.png',
    isAvailable: true,
    sortOrder: 11,
    acquisitionType: 'purchase',
  },
  {
    id: 'frame_silver',
    name: 'Silver',
    description: 'Second place is still on the podium',
    type: 'avatar_frame',
    rarity: 'uncommon',
    premiumCost: 150,
    previewUrl: '/cosmetics/frames/silver.png',
    isAvailable: true,
    sortOrder: 12,
    acquisitionType: 'purchase',
  },
  {
    id: 'frame_gold',
    name: 'Gold',
    description: 'Nothing but the best',
    type: 'avatar_frame',
    rarity: 'rare',
    premiumCost: 200,
    previewUrl: '/cosmetics/frames/gold.png',
    isAvailable: true,
    sortOrder: 13,
    acquisitionType: 'purchase',
  },
  {
    id: 'frame_diamond',
    name: 'Diamond',
    description: 'Unbreakable, like your portfolio',
    type: 'avatar_frame',
    rarity: 'epic',
    premiumCost: 300,
    previewUrl: '/cosmetics/frames/diamond.png',
    isAvailable: true,
    sortOrder: 14,
    acquisitionType: 'purchase',
  },

  // ============ BADGES (5) ============
  {
    id: 'badge_newbie',
    name: 'Newbie',
    description: 'Everyone starts somewhere',
    type: 'badge',
    rarity: 'common',
    premiumCost: 0,
    previewUrl: '/cosmetics/badges/newbie.png',
    isAvailable: true,
    sortOrder: 20,
    acquisitionType: 'purchase',
  },
  {
    id: 'badge_trader',
    name: 'Trader',
    description: 'You know the markets',
    type: 'badge',
    rarity: 'uncommon',
    premiumCost: 150,
    previewUrl: '/cosmetics/badges/trader.png',
    isAvailable: true,
    sortOrder: 21,
    acquisitionType: 'purchase',
  },
  {
    id: 'badge_whale',
    name: 'Whale',
    description: 'Your trades move markets',
    type: 'badge',
    rarity: 'rare',
    premiumCost: 250,
    previewUrl: '/cosmetics/badges/whale.png',
    isAvailable: true,
    sortOrder: 22,
    acquisitionType: 'purchase',
  },
  {
    id: 'badge_vip',
    name: 'VIP',
    description: 'Very Important Player',
    type: 'badge',
    rarity: 'epic',
    premiumCost: 400,
    previewUrl: '/cosmetics/badges/vip.png',
    isAvailable: true,
    sortOrder: 23,
    acquisitionType: 'purchase',
  },
  {
    id: 'badge_founder',
    name: 'Founder',
    description: 'A true pioneer of The Mint',
    type: 'badge',
    rarity: 'legendary',
    premiumCost: 500,
    previewUrl: '/cosmetics/badges/founder.png',
    isAvailable: true,
    sortOrder: 24,
    acquisitionType: 'purchase',
  },
];

const businessTypes: Prisma.BusinessTypeCreateInput[] = [
  // Tier 1 - Small Business
  {
    slug: 'food-truck',
    name: 'Food Truck',
    category: 'food',
    tier: 1,
    baseCost: 5000,
    baseRevenue: 1000,
    cycleSeconds: 60,
    employeeBaseCost: 500,
    sortOrder: 1,
  },
  {
    slug: 'coffee-shop',
    name: 'Coffee Shop',
    category: 'food',
    tier: 1,
    baseCost: 25000,
    baseRevenue: 5000,
    cycleSeconds: 120,
    employeeBaseCost: 2500,
    sortOrder: 2,
    unlockRequirement: { level: 5 },
  },

  // Tier 2 - Medium Business
  {
    slug: 'restaurant',
    name: 'Restaurant',
    category: 'food',
    tier: 2,
    baseCost: 100000,
    baseRevenue: 20000,
    cycleSeconds: 300,
    employeeBaseCost: 10000,
    sortOrder: 3,
    unlockRequirement: { level: 10 },
  },
  {
    slug: 'gym',
    name: 'Fitness Gym',
    category: 'service',
    tier: 2,
    baseCost: 250000,
    baseRevenue: 50000,
    cycleSeconds: 600,
    employeeBaseCost: 25000,
    sortOrder: 4,
    unlockRequirement: { level: 15 },
  },

  // Tier 3 - Large Business
  {
    slug: 'tech-startup',
    name: 'Tech Startup',
    category: 'tech',
    tier: 3,
    baseCost: 1000000,
    baseRevenue: 200000,
    cycleSeconds: 1800,
    employeeBaseCost: 100000,
    sortOrder: 5,
    unlockRequirement: { level: 20 },
  },
  {
    slug: 'factory',
    name: 'Factory',
    category: 'manufacturing',
    tier: 3,
    baseCost: 5000000,
    baseRevenue: 1000000,
    cycleSeconds: 3600,
    employeeBaseCost: 500000,
    sortOrder: 6,
    unlockRequirement: { level: 25 },
  },

  // Tier 4 - Enterprise
  {
    slug: 'bank',
    name: 'Private Bank',
    category: 'finance',
    tier: 4,
    baseCost: 25000000,
    baseRevenue: 5000000,
    cycleSeconds: 7200,
    employeeBaseCost: 2500000,
    sortOrder: 7,
    unlockRequirement: { level: 30 },
  },
  {
    slug: 'space-company',
    name: 'Space Company',
    category: 'tech',
    tier: 4,
    baseCost: 100000000,
    baseRevenue: 20000000,
    cycleSeconds: 14400,
    employeeBaseCost: 10000000,
    sortOrder: 8,
    unlockRequirement: { level: 35 },
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert property types
  for (const property of propertyTypes) {
    await prisma.propertyType.upsert({
      where: { slug: property.slug },
      update: property,
      create: property,
    });
  }
  console.log(`✅ Seeded ${propertyTypes.length} property types`);

  // Upsert business types
  for (const business of businessTypes) {
    await prisma.businessType.upsert({
      where: { slug: business.slug },
      update: business,
      create: business,
    });
  }
  console.log(`✅ Seeded ${businessTypes.length} business types`);

  // Upsert market events
  for (const event of marketEvents) {
    await prisma.marketEvent.upsert({
      where: { slug: event.slug },
      update: event,
      create: event,
    });
  }
  console.log(`✅ Seeded ${marketEvents.length} market events`);

  // Upsert prestige perks
  for (const perk of prestigePerks) {
    await prisma.prestigePerk.upsert({
      where: { slug: perk.slug },
      update: perk,
      create: perk,
    });
  }
  console.log(`✅ Seeded ${prestigePerks.length} prestige perks`);

  // Upsert daily rewards
  for (const reward of dailyRewards) {
    await prisma.dailyReward.upsert({
      where: { day: reward.day },
      update: reward,
      create: reward,
    });
  }
  console.log(`✅ Seeded ${dailyRewards.length} daily rewards`);

  // Upsert achievements
  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { id: achievement.id },
      update: achievement,
      create: achievement,
    });
  }
  console.log(`✅ Seeded ${achievements.length} achievements`);

  // Upsert cosmetics
  for (const cosmetic of cosmetics) {
    await prisma.cosmetic.upsert({
      where: { id: cosmetic.id },
      update: cosmetic,
      create: cosmetic,
    });
  }
  console.log(`✅ Seeded ${cosmetics.length} cosmetics`);

  // Upsert phases
  for (const phase of phases) {
    await prisma.phase.upsert({
      where: { id: phase.id },
      update: phase,
      create: phase,
    });
  }
  console.log(`✅ Seeded ${phases.length} phases`);

  // Upsert projects
  for (const project of projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: project,
      create: project,
    });
  }
  console.log(`✅ Seeded ${projects.length} projects`);

  // Upsert upgrades
  for (const upgrade of upgrades) {
    await prisma.upgrade.upsert({
      where: { slug: upgrade.slug },
      update: upgrade,
      create: upgrade,
    });
  }
  console.log(`✅ Seeded ${upgrades.length} upgrades`);

  // Upsert bot stocks
  for (const stock of botStocks) {
    await prisma.botStock.upsert({
      where: { tickerSymbol: stock.tickerSymbol },
      update: stock,
      create: stock,
    });
  }
  console.log(`✅ Seeded ${botStocks.length} bot stocks`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
