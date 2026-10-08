# Nirmal Rentals

## Overview
This repository is the foundation for Nirmal Rentals, a multi-tenant SaaS platform for clothing and fashion rental businesses operating across Tamil Nadu and India. The initial release focuses on a clean, scalable architecture and development setup without business feature implementation.

## Technology Stack
- Frontend: React, Vite, JavaScript, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express.js, JavaScript, REST API
- Database: MySQL
- Architecture: Multi-tenant SaaS, modular monolith, layered service architecture
- Version control: Git, GitHub
- Tooling: ESLint, Prettier, Docker Compose

## Repository Structure
```text
rental-management-platform/
├── frontend/
├── backend/
├── database/
├── docs/
├── .github/
├── .gitignore
├── .env.example
├── README.md
├── docker-compose.yml
└── .github/copilot-instructions.md
```

## Local Development
1. Copy `.env.example` to `.env` and update the values for your local environment.
2. Start MySQL using Docker Compose.
3. Install frontend dependencies.
4. Install backend dependencies.
5. Start the backend and frontend development servers.

## Environment Variables
Update the root `.env` file before running the project:

- `VITE_API_BASE_URL`
- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`

## Running Frontend
```bash
cd frontend
npm install
npm run dev
```

## Running Backend
```bash
cd backend
npm install
npm run dev
```

## Database Setup
```bash
cd rental-management-platform
docker compose up -d mysql
```

The application is designed to connect to MySQL using environment variables only. Database credentials and host settings must never be hardcoded.

## Development Guidelines
- Maintain the folder structure and architecture documented in this repository.
- Keep controllers thin and business logic in services.
- Put database access in repositories.
- Validate all external input before processing.
- Do not implement business features outside the current scope.
- Reuse utilities before creating new abstractions.

## Git Workflow
- Create feature branches from `main`.
- Keep commits small and focused.
- Write maintainable, reviewable code.
- Update documentation when architecture changes.
- Never commit secrets or environment files.
