# ParkiUpar — Edge Functions

Base URL: `https://xqgwetpzuslklycflebu.supabase.co/functions/v1`

Todas las funciones requieren `Authorization: Bearer <JWT>`. La respuesta siempre tiene forma:

```json
{ "data": <payload>, "error": null }
```

o, en caso de error:

```json
{ "data": null, "error": { "message": "...", "code": "..." } }
```

Códigos HTTP devueltos según el prefijo del error: `UNAUTHORIZED→401`, `FORBIDDEN→403`, `NOT_FOUND→404`, `CONFLICT→409`, `VALIDATION→422`, `BAD_REQUEST→400`, resto `500`.

---

## parking
Sesiones de parqueo: entrada, salida con cobro automático, listado, detalle.

| Método | Path                          | Body / Params                                                                                  | Respuesta                                                 |
|--------|-------------------------------|------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| GET    | `/parking`                    | `?status=active\|completed\|cancelled` (default `active`), `?limit=100`, `?from=ISO&to=ISO`   | `ParkingSession[]`                                        |
| GET    | `/parking/:id`                | —                                                                                              | `ParkingSession`                                          |
| GET    | `/parking/check-duplicate`    | `?plate=ABC123`                                                                                | `{ exists, same_parking?, tenant_id? }` (cross-tenant)    |
| POST   | `/parking`                    | `{ plate, vehicle_type?, vehicle_category_id?, space_number?, customer_id?, customer_name?, customer_phone?, notes? }` | `ParkingSession` (201)                       |
| PUT    | `/parking/:id/exit`           | `{ notes? }`                                                                                   | `ParkingSession` con `total_amount` y `duration_minutes`  |

Lógica al hacer EXIT: calcula minutos transcurridos → aplica `rate_per_hour` y `fraction_minutes` de la tarifa activa → guarda `total_amount` → incrementa `tenants.available_spaces` → libera `parking_spaces` → actualiza métricas del cliente.

`check-duplicate` busca sesiones `active` con esa placa en **cualquier tenant** (server-side). Útil para detectar vehículos ya parqueados en otro establecimiento antes de registrar entrada.

---

## customers
CRUD de clientes con paginación, búsqueda e historial.

| Método | Path                | Body / Params                                                | Respuesta                                                |
|--------|---------------------|--------------------------------------------------------------|----------------------------------------------------------|
| GET    | `/customers`        | `?q=texto`, `?page=1`, `?pageSize=20`                        | `{ items, page, pageSize, total }`                       |
| GET    | `/customers/:id`    | —                                                            | `Customer & { vehicles, sessions }`                      |
| POST   | `/customers`        | `{ full_name, phone, email? }`                               | `Customer` (201)                                         |
| PUT    | `/customers/:id`    | `{ full_name?, phone?, email? }`                             | `Customer`                                               |

---

## rates
Tarifas por tipo de vehículo. Solo **una tarifa activa por tipo** a la vez. Crear o activar una desactiva automáticamente las otras del mismo tipo.

| Método | Path           | Body / Params                                                                       | Respuesta             |
|--------|----------------|-------------------------------------------------------------------------------------|-----------------------|
| GET    | `/rates`       | `?all=true` para incluir inactivas                                                  | `VehicleRate[]`       |
| POST   | `/rates`       | `{ vehicle_type, rate_per_hour, minimum_minutes?, fraction_minutes?, is_active? }`  | `VehicleRate` (201)   |
| PUT    | `/rates/:id`   | `{ rate_per_hour?, minimum_minutes?, fraction_minutes?, is_active?, vehicle_type? }`| `VehicleRate`         |
| DELETE | `/rates/:id`   | —                                                                                   | `VehicleRate` (`is_active=false`) |

Requiere rol `admin` o `superadmin` para mutaciones.

---

## capacity
Aforo en tiempo real con control optimista de concurrencia.

| Método | Path                | Body / Params | Respuesta                                                                  |
|--------|---------------------|---------------|----------------------------------------------------------------------------|
| GET    | `/capacity`         | —             | `{ total, occupied, available, stored_available, is_consistent }`          |
| POST   | `/capacity/entry`   | —             | `{ total, available }` (decrementa)                                        |
| POST   | `/capacity/exit`    | —             | `{ total, available }` (incrementa)                                        |

Si dos requests llegan a la vez, la segunda recibe `CONFLICT: capacity changed concurrently, retry` (optimistic locking sobre `available_spaces`).

---

## payments
Historial unificado (sesiones completadas + pagos de mensualidades) y registro/ajuste de cobro por sesión.

| Método | Path                  | Body / Params                                                | Respuesta                                                            |
|--------|-----------------------|--------------------------------------------------------------|----------------------------------------------------------------------|
| GET    | `/payments`           | `?from=ISO&to=ISO&type=all\|parking\|subscription&limit=100` | `{ parking[], subscription[], totals: { parking, subscription, combined } }` |
| GET    | `/payments/:sessionId`| —                                                            | Detalle del cobro de la sesión                                       |
| POST   | `/payments`           | `{ session_id, amount, payment_method?, notes? }`            | `ParkingSession` actualizada (201)                                   |

---

## monthly-subscriptions
Mensualidades con validación anti-solapamiento por placa.

| Método | Path                            | Body / Params                                                                                            | Respuesta                  |
|--------|---------------------------------|----------------------------------------------------------------------------------------------------------|----------------------------|
| GET    | `/monthly-subscriptions`        | `?active=true` para solo activas vigentes, `?customer_id=<uuid>` para filtrar por cliente                | `Subscription[]`           |
| POST   | `/monthly-subscriptions`        | `{ plate, amount, start_date, end_date, customer_id?, vehicle_id?, customer_name?, customer_phone?, notes? }` | `Subscription` (201)  |
| PUT    | `/monthly-subscriptions/:id`    | mismos campos opcionales                                                                                 | `Subscription`             |
| DELETE | `/monthly-subscriptions/:id`    | —                                                                                                        | `Subscription` cancelada   |

Si ya existe una suscripción activa con la misma placa cuyo `[start_date, end_date]` se solapa, devuelve `409 CONFLICT`. Solo `admin`/`superadmin` mutan.

---

## schedules
Horarios del parqueadero agrupados por `weekday | saturday | sunday`.

| Método | Path          | Body / Params                                                                                                      | Respuesta             |
|--------|---------------|--------------------------------------------------------------------------------------------------------------------|-----------------------|
| GET    | `/schedules`  | —                                                                                                                  | `Schedule[]`          |
| PUT    | `/schedules`  | `{ schedules: [{ day_group, open_time, close_time, is_active?, sort_order? }] }`                                   | `Schedule[]` nuevos   |

El `PUT` reemplaza completamente los horarios del tenant (delete + insert). Solo `admin`/`superadmin`.

---

## team
Gestión del equipo del tenant (usuarios + roles).

| Método | Path          | Body / Params                                                       | Respuesta                                |
|--------|---------------|---------------------------------------------------------------------|------------------------------------------|
| GET    | `/team`       | —                                                                   | `UserProfile[] & { email }`              |
| POST   | `/team`       | `{ email, role: 'admin'\|'conductor', full_name?, phone?, password? }` | `UserProfile` (201, crea auth.user)   |
| PUT    | `/team/:id`   | `{ role?, full_name?, phone?, is_active?, user_modules? }`         | `UserProfile`                            |
| DELETE | `/team/:id`   | —                                                                   | `UserProfile` desactivado                |

Solo `admin`/`superadmin`. No se pueden mutar perfiles `superadmin`. No se borra el `auth.user`; se desactiva el perfil.

---

## reports
Reportes agregados por periodo y distribución por tipo de vehículo.

| Método | Path                  | Body / Params                                                          | Respuesta                                                          |
|--------|-----------------------|------------------------------------------------------------------------|--------------------------------------------------------------------|
| GET    | `/reports`            | `?period=day\|week\|month&from=ISO&to=ISO`                             | `{ period, from, to, totals: { sessions, revenue, avg_occupancy }, series: [{ bucket, revenue, sessions }] }` |
| GET    | `/reports/vehicles`   | `?from=ISO&to=ISO`                                                     | `{ from, to, total, distribution: [{ vehicle_type, count, revenue, pct }] }` |

Agrupación por día (`YYYY-MM-DD`), semana ISO (`YYYY-Wnn`) o mes (`YYYY-MM`).

---

## incidents
Reportes de incidencias (bugs, sugerencias).

| Método | Path             | Body / Params                                              | Respuesta                  |
|--------|------------------|------------------------------------------------------------|----------------------------|
| GET    | `/incidents`     | `?status=pending\|in_review\|resolved`                     | `Incident[]`               |
| POST   | `/incidents`     | `{ title, description, category? }`                        | `Incident` (201)           |
| PUT    | `/incidents/:id` | `{ status?, admin_notes?, category?, title?, description? }` | `Incident`                 |

El creador puede editar título/descripción solo mientras esté `pending`. Solo `admin`/`superadmin` pueden cambiar `status` y `admin_notes`. El `superadmin` puede ver/filtrar incidencias de cualquier tenant.

---

## reservations
Reservas de espacios. Estados: `pending → confirmed → arrived → completed` (o `cancelled` / `expired`).

| Método | Path                | Body / Params                                                                                                                                | Respuesta              |
|--------|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------|------------------------|
| GET    | `/reservations`     | `?all=true` para incluir cerradas, `?space_id=<uuid>`, `?pending_for_space=true` (solo la reserva pendiente del espacio)                    | `Reservation[]`        |
| POST   | `/reservations`     | `{ space_id?, customer_name?, customer_phone?, plate?, vehicle_type?, vehicle_category_id?, expires_at? \| minutes_valid? (default 30) }` | `Reservation` (201)    |
| PUT    | `/reservations/:id` | `{ status: 'confirmed' \| 'arrived' \| 'cancelled' \| 'completed' }`                                                                          | `Reservation`          |

Si `space_id` no se envía, se asigna automáticamente uno `available`. Al cancelar/completar se libera el `parking_space`.

---

## notifications
Notificaciones del usuario autenticado (recibe las dirigidas a su `user_id` o a su `target_role` dentro del tenant).

| Método | Path                              | Body / Params                              | Respuesta                          |
|--------|-----------------------------------|--------------------------------------------|------------------------------------|
| GET    | `/notifications`                  | `?unread=true&limit=50`                    | `{ items: Notification[], unread }`|
| PUT    | `/notifications/:id/read`         | —                                          | `Notification` actualizada         |
| PUT    | `/notifications/read-all`         | —                                          | `{ marked: true }`                 |

---

## spaces
Mapa físico de espacios del parqueadero. Estado: `available | occupied | reserved`. Reservar/ocupar/liberar pasa siempre por estos endpoints.

| Método | Path                                  | Body / Params                              | Respuesta                       |
|--------|---------------------------------------|--------------------------------------------|---------------------------------|
| GET    | `/spaces`                             | —                                          | `ParkingSpace[]`                |
| GET    | `/spaces/by-number/:n`                | —                                          | `ParkingSpace`                  |
| POST   | `/spaces/bulk`                        | `{ start: number, count: number }`         | `ParkingSpace[]` (201)          |
| DELETE | `/spaces/above`                       | `?threshold=N`                             | `{ deleted: number }`           |
| PUT    | `/spaces/:id/occupy`                  | —                                          | `ParkingSpace`                  |
| PUT    | `/spaces/:id/available`               | —                                          | `ParkingSpace`                  |
| PUT    | `/spaces/:id/reserve`                 | `{ user_id?, expires_at }`                 | `ParkingSpace`                  |
| PUT    | `/spaces/:id/expire-reservation`      | —                                          | `ParkingSpace`                  |
| PUT    | `/spaces/:id/confirm-reservation`     | —                                          | `ParkingSpace`                  |
| PUT    | `/spaces/:id/cancel-reservation`      | —                                          | `ParkingSpace`                  |

`bulk` crea `count` espacios consecutivos desde `start`. `above` elimina los espacios `available` con número `>= threshold` (no toca los ocupados/reservados). Solo `admin`/`superadmin` pueden crear/eliminar.

---

## vehicles
Catálogo de vehículos asociados a clientes, plus accesos rápidos a `rates` y `categories` para los formularios.

| Método | Path                     | Body / Params                                                    | Respuesta                                |
|--------|--------------------------|------------------------------------------------------------------|------------------------------------------|
| GET    | `/vehicles`              | `?plate=ABC123`                                                  | `Vehicle & { customers? }`               |
| POST   | `/vehicles`              | `{ plate, vehicle_type, customer_id? }`                          | `Vehicle` (upsert por placa)             |
| GET    | `/vehicles/rates`        | —                                                                | `VehicleRate[]` activas                  |
| GET    | `/vehicles/categories`   | —                                                                | `VehicleCategory[]` activas              |

---

## visits
Historial cross-tenant del **conductor** autenticado: todos los parqueos y reservas asociados a su `user_id` en cualquier establecimiento.

| Método | Path                       | Body / Params | Respuesta                       |
|--------|----------------------------|---------------|---------------------------------|
| GET    | `/visits`                  | —             | `VisitRecord[]`                 |
| GET    | `/visits/reservations`     | —             | `VisitReservationRecord[]`      |

Cada registro incluye el `tenant` (nombre + slug) para que la UI muestre dónde ocurrió la visita.

---

## audit-logs
Bitácora de cambios sobre tablas críticas. Solo `admin`/`superadmin`.

| Método | Path                  | Body / Params                                                                            | Respuesta                                                |
|--------|-----------------------|------------------------------------------------------------------------------------------|----------------------------------------------------------|
| GET    | `/audit-logs`         | `?table=<name>&action=insert\|update\|delete&q=texto&page=1&pageSize=20`                | `{ items: AuditLog[], total, page, pageSize }`           |
| GET    | `/audit-logs/export`  | `?table=&action=&q=`                                                                     | `AuditLog[]` (sin paginar, para exportar CSV/XLSX)       |

---

## billing
Operaciones de superadmin sobre planes/pagos del SaaS, más mantenimiento de categorías de vehículo y pagos de mensualidades por tenant.

### Tenants y pagos del SaaS (superadmin)

| Método | Path                      | Body / Params                                                                                            | Respuesta                                  |
|--------|---------------------------|----------------------------------------------------------------------------------------------------------|--------------------------------------------|
| GET    | `/billing/tenants`        | —                                                                                                        | `TenantWithPlan[]`                         |
| GET    | `/billing/payments`       | —                                                                                                        | `PaymentHistoryRecord[]`                   |
| POST   | `/billing/payments`       | `{ tenant_id, plan_id, plan_name, amount, months, payment_method, notes? }`                              | renueva el plan del tenant (201)           |

### Planes

| Método | Path                                | Body / Params               | Respuesta                          |
|--------|-------------------------------------|-----------------------------|------------------------------------|
| GET    | `/billing/plans`                    | `?active=true`              | `Plan[]`                           |
| GET    | `/billing/plans/:id/max-users`      | —                           | `{ max_users: number }`            |

### Categorías de vehículo (por tenant)

| Método | Path                                  | Body / Params                                                       | Respuesta                          |
|--------|---------------------------------------|---------------------------------------------------------------------|------------------------------------|
| GET    | `/billing/categories`                 | —                                                                   | `VehicleCategory[]`                |
| POST   | `/billing/categories`                 | `CategoryPayload`                                                   | `VehicleCategory` (201)            |
| PUT    | `/billing/categories/:id`             | `CategoryPayload`                                                   | `VehicleCategory`                  |
| PUT    | `/billing/categories/:id/toggle`      | `{ is_active: boolean }`                                            | `VehicleCategory`                  |
| DELETE | `/billing/categories/:id`             | —                                                                   | `VehicleCategory` (soft-delete)    |

### Pagos de mensualidades

| Método | Path                                                | Body / Params                                                       | Respuesta                          |
|--------|-----------------------------------------------------|---------------------------------------------------------------------|------------------------------------|
| GET    | `/billing/subscription-payments?subscription_id=...`| —                                                                   | `SubscriptionPaymentRecord[]`      |
| POST   | `/billing/subscription-payments`                    | `{ subscription_id, amount, payment_method, paid_at?, notes? }`     | `SubscriptionPaymentRecord` (201)  |

### Solicitudes de cambio de plan (tenant → superadmin)

| Método | Path                          | Body / Params                                                                  | Respuesta                          |
|--------|-------------------------------|--------------------------------------------------------------------------------|------------------------------------|
| GET    | `/billing/plan-requests`      | —                                                                              | `PlanRequestRecord[]`              |
| POST   | `/billing/plan-requests`      | `{ current_plan_id, requested_plan_id, message? }`                             | `PlanRequestRecord` (201)          |

---

## me
Perfil del usuario autenticado y datos del tenant al que pertenece.

| Método | Path                                       | Body / Params                                                              | Respuesta                                  |
|--------|--------------------------------------------|----------------------------------------------------------------------------|--------------------------------------------|
| GET    | `/me`                                      | —                                                                          | `MeResponse` (`{ profile, tenant }`)       |
| PUT    | `/me`                                      | `{ full_name, phone }`                                                     | `UserProfile`                              |
| GET    | `/me/tenant`                               | —                                                                          | `TenantWithPlanModules`                    |
| PUT    | `/me/tenant`                               | `{ name, address, phone, email, latitude, longitude }`                     | `Tenant` (solo `admin`/`superadmin`)       |
| GET    | `/me/customers`                            | —                                                                          | `Customer[]` del tenant                    |
| GET    | `/me/customer/:id/subscriptions`           | —                                                                          | `Subscription[]` del cliente               |

---

## Ejemplo de consumo desde el cliente

```ts
// React (web)
const res = await fetch(`${SUPABASE_URL}/functions/v1/parking`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ plate: "ABC123", vehicle_type: "car" }),
});
const { data, error } = await res.json();
```

```dart
// Flutter (móvil)
final response = await http.post(
  Uri.parse('$supabaseUrl/functions/v1/parking'),
  headers: {
    'Authorization': 'Bearer ${session.accessToken}',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({'plate': 'ABC123', 'vehicle_type': 'car'}),
);
final body = jsonDecode(response.body) as Map<String, dynamic>;
```

---

## Estado de despliegue

Todas las funciones están desplegadas en el proyecto `xqgwetpzuslklycflebu` con `verify_jwt: true`.

| Función                | Slug                    |
|------------------------|-------------------------|
| parking                | `parking`               |
| customers              | `customers`             |
| rates                  | `rates`                 |
| capacity               | `capacity`              |
| payments               | `payments`              |
| monthly-subscriptions  | `monthly-subscriptions` |
| schedules              | `schedules`             |
| team                   | `team`                  |
| reports                | `reports`               |
| incidents              | `incidents`             |
| reservations           | `reservations`          |
| notifications          | `notifications`         |
| spaces                 | `spaces`                |
| vehicles               | `vehicles`              |
| visits                 | `visits`                |
| audit-logs             | `audit-logs`            |
| billing                | `billing`               |
| me                     | `me`                    |
