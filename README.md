# Taskly App Node

Taskly includes a custom unit-test agent and an automatic GitHub PR workflow.
See [SOLUTION.md](SOLUTION.md) for the architecture, security boundaries, reusable
skills, setup and limitations. Use Node **24.22.1 LTS** (`.nvmrc`).

The original application is preserved from [cf-recruitment/taskly-app-node](https://github.com/cf-recruitment/taskly-app-node).

## Setup

```sh
cp .env.example .env
```

## Docker

```sh
docker compose up --build -d --wait
```

Application: http://localhost:8080. API: http://localhost:8000/docs.

```sh
docker compose down
```

## Code quality

From the repository root, install the shared tools and package types:

```sh
npm ci
npm ci --prefix frontend
npm ci --prefix backend
npm run lint
npm run format:check
```

`npm run lint:fix` applies ESLint's automatic fixes; `npm run format` formats frontend, backend and agent files with the shared Prettier configuration. ESLint uses type-aware TypeScript rules, React hook rules and recommended JavaScript rules for the agent. CI rejects lint errors or warnings and formatting differences. Generated Prisma files, build output, coverage and archived evidence are excluded from formatting/linting.

## Frontend

React + TypeScript + Vite. Tests: Vitest + React Testing Library.

Installation:

```sh
cd frontend
npm ci
```

Development — http://localhost:5173:

```sh
npm run dev
```

Storybook — http://localhost:6006:

```sh
npm run storybook
```

Tests:

```sh
npm test
```

Coverage — `frontend/coverage/index.html`:

```sh
npm run test:coverage
```

## Backend

Node.js + TypeScript + Express. Database: PostgreSQL + Prisma ORM. Tests: Vitest + Supertest.

Requires Node.js >=22.12 and PostgreSQL.

Installation:

```sh
cd backend
npm ci
```

Database — run from the repository root:

```sh
docker compose up -d --wait postgres
```

Development — http://localhost:8000/docs (from `backend`):

```sh
npm run dev
```

Production:

```sh
npm run build
npm start
```

### Database (Prisma ORM)

Schema — `backend/prisma/schema.prisma`. Connection — root `.env`.

Validate schema:

```sh
npm run db:validate
```

Generate client — also runs during installation and build:

```sh
npm run db:generate
```

Database browser:

```sh
npm run db:studio
```

Schema migrations are managed separately; generating the client does not update the database.

### Tests and coverage

Type check:

```sh
npm run typecheck
```

Tests:

```sh
npm test
```

Watch mode:

```sh
npm run test:watch
```

Coverage — `backend/coverage/index.html`:

```sh
npm run test:coverage
```
