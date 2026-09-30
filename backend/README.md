# Backend

This backend foundation uses Express.js with a layered architecture intended for a multi-tenant SaaS rental platform.

## Local development
```bash
npm install
npm run dev
```

## Notes
- API versioning is configured under `/api/v1`.
- Controllers remain thin and delegate to services.
- Database access is isolated in repository modules.
- Security and validation foundation is prepared but not implemented as business logic.
