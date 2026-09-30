# System Architecture

## Overview
This platform is designed as a modular monolith for a multi-tenant SaaS rental business. The application is intentionally separated into frontend, API, domain services, data access, and MySQL persistence layers so the team can grow feature modules incrementally without premature abstraction.

## Request flow
```text
Frontend
  ↓
REST API
  ↓
Express
  ↓
Services
  ↓
Repositories
  ↓
MySQL
```

## Frontend
The frontend uses React with Vite and JavaScript. It contains reusable UI primitives, feature modules, and a route-based layout. Placeholder screens are created to validate the application startup and ensure the API can be reached.

## Backend
The API layer is built with Express.js and uses explicit versioning under `/api/v1`. Each request passes through middleware, validators, controllers, services, and repositories in sequence. This makes the application easier to reason about, test, and evolve as new modules are added.

## Multi-tenancy
Each tenant is represented by a shop or business account. Most business tables will include `shop_id` to ensure data separation. The system should rely on the authenticated user identity to determine the tenant instead of trusting any client-supplied tenant value.

## Authentication approach
JWT-based authentication is planned for the future. Password hashing, role checks, and tenant-scoped authorization will be enforced at the middleware and service layers. At this stage, the architecture is prepared but authentication is not implemented.

## API versioning
API routes are versioned under `/api/v1` to allow stable contract evolution without breaking clients. Future versions can coexist while the system matures.

## Error handling
The application uses central error handling to normalize validation, auth, authorization, database, and internal errors. Sensitive stack traces and implementation detail are withheld from production clients.

## Environment management
All infrastructure configuration is stored in environment variables and must remain outside source control. This includes API URLs, database settings, and JWT secrets.

## Future scalability approach
The modular monolith allows individual business domains such as customers, inventory, bookings, and payments to be introduced without moving to a distributed system too early. Additional service boundaries can be introduced later if traffic and operational complexity require them.
