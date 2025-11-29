import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const propertyTypes: Prisma.PropertyTypeCreateInput[] = [
  // Tier 1 - Starter
  {
    slug: 'lemonade-stand',
    name: 'Lemonade Stand',
    category: 'starter',
    tier: 1,
    baseCost: 100,
    baseIncomeHour: 5,
    managerCost: 500,
    managerName: 'Street Vendor',
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
    sortOrder: 3,
  },

  // Tier 2 - Residential
  {
    slug: 'apartment',
    name: 'Apartment',
    category: 'residential',
    tier: 2,
    baseCost: 10000,
    baseIncomeHour: 500,
    managerCost: 50000,
    managerName: 'Property Manager',
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
    sortOrder: 6,
    unlockRequirement: { level: 15 },
  },

  // Tier 3 - Commercial
  {
    slug: 'strip-mall',
    name: 'Strip Mall',
    category: 'commercial',
    tier: 3,
    baseCost: 1000000,
    baseIncomeHour: 50000,
    managerCost: 5000000,
    managerName: 'Mall Director',
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
    sortOrder: 8,
    unlockRequirement: { level: 25 },
  },

  // Tier 4 - Luxury
  {
    slug: 'hotel',
    name: 'Luxury Hotel',
    category: 'luxury',
    tier: 4,
    baseCost: 25000000,
    baseIncomeHour: 1250000,
    managerCost: 125000000,
    managerName: 'Hotel GM',
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
    sortOrder: 10,
    unlockRequirement: { level: 35 },
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
