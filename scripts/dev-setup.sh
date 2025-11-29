#!/bin/bash

set -e

echo "🚀 Setting up The Mint development environment..."

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

# Start Docker services
echo "📦 Starting Docker services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Install dependencies
echo "📥 Installing dependencies..."
pnpm install

# Copy environment files if they don't exist
if [ ! -f "services/api-gateway/.env" ]; then
  echo "📄 Creating API Gateway .env file..."
  cp services/api-gateway/.env.example services/api-gateway/.env
fi

if [ ! -f "packages/database/.env" ]; then
  echo "📄 Creating Database .env file..."
  cp packages/database/.env.example packages/database/.env
fi

# Generate Prisma client
echo "🗃️ Generating Prisma client..."
pnpm db:generate

# Push database schema
echo "🗃️ Pushing database schema..."
pnpm db:push

# Build packages
echo "🔨 Building shared packages..."
pnpm --filter @mint/types build
pnpm --filter @mint/utils build

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "To start developing, run:"
echo "  pnpm dev"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo "  MailHog:    http://localhost:8025"
