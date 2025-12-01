import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env from root
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // Server
  PORT: parseInt(process.env.ADMIN_PORT || '3002', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Admin JWT (separate from main app for security)
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || requireEnv('JWT_ACCESS_SECRET') + '_admin',
  ADMIN_JWT_EXPIRY: '15m', // Short expiry for admin tokens

  // Security
  ALLOWED_IPS: (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1,::ffff:127.0.0.1').split(',').map(ip => ip.trim()),
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // requests per window

  // CORS - Admin frontend URL (could be different from main app)
  ADMIN_APP_URL: process.env.ADMIN_APP_URL || 'http://localhost:3003',

  // Main app JWT secret for validating existing admin tokens
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),

  // Database (uses shared @mint/database)
  DATABASE_URL: requireEnv('DATABASE_URL'),
} as const;
