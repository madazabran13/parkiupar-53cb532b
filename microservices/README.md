# ParkiUpar — Microservices Architecture

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials and generated secrets

# 2. Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"  # INTERNAL_SECRET

# 3. Start all services
docker-compose up --build

# 4. Verify
curl http://localhost:8080/health
```

## Architecture

```
Frontend (5173) → Gateway (8080) → Microservices
                                    ├── ms-auth (3001) REST
                                    ├── ms-vehiculos (3002) REST
                                    ├── ms-parqueaderos (3003) REST
                                    ├── ms-reservas (3004) REST
                                    └── ms-reportes (3005) GraphQL
```

## Patterns Applied

- **Repository Pattern**: Data access isolated in `*.repository.ts`
- **Service Layer**: Business logic in `*.service.ts`
- **Controller Layer**: HTTP mapping in `*.controller.ts`
- **Domain Errors**: `DomainError` hierarchy (NotFound, Conflict, Forbidden, Validation)
- **Zod Validation**: Schema validation middleware on all POST/PUT
- **Circuit Breaker**: opossum in gateway for resilience
- **WAF**: SQL injection and XSS blocking
- **Rate Limiting**: 100 req/min per IP
- **JWT Auth**: Centralized in gateway, forwarded as headers

## Database Tables (create in Supabase)

The microservices use separate tables prefixed with `ms_`:
- `ms_users` — Authentication
- `ms_vehicles` — Vehicle management (soft delete)
- `ms_parkings` — Parking lots
- `ms_spots` — Parking spaces
- `ms_reservations` — Reservations (soft delete)
