# The Mint 🌿

Build Your Financial Empire. One Click at a Time.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for local development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd the-mint
   ```

2. **Run setup script**
   ```bash
   pnpm setup
   ```

3. **Start development servers**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   - Frontend: http://localhost:5173
   - API: http://localhost:3000
   - MailHog: http://localhost:8025
   - Adminer (Database Admin): http://localhost:8080

## Project Structure

```
the-mint/
├── apps/
│   └── web/              # React frontend
├── packages/
│   ├── database/         # Prisma schema and client
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utility functions
├── services/
│   ├── api-gateway/      # Express API gateway
│   ├── user/             # User service (Phase 1)
│   └── game/             # Game state service (Phase 1)
└── docs/
    └── plans/            # Design documents
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages and services |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Development

### Docker Services

```bash
# Start services
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

### Database

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Apply schema to database
pnpm db:push

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Cache:** Redis
- **Build:** pnpm, Turborepo

## License

Private - All Rights Reserved
