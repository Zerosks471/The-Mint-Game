import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const log: Prisma.LogLevel[] = process.env.NODE_ENV === 'development'
  ? ['error', 'warn']  // Removed 'query' to reduce console spam
  : ['error'];

export const prisma = globalThis.prisma ?? new PrismaClient({ log });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
