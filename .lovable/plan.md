

# Plan: ParkingPro — Sistema SaaS de Parqueaderos

## Nota importante

Este proyecto usa **React + Vite + React Router** (no Next.js, ya que la plataforma Lovable no lo soporta). Se adaptará toda la arquitectura a este stack manteniendo la misma funcionalidad. Se usará **Leaflet** (gratuito) en vez de Mapbox para el mapa, ya que no requiere API key.

Este es un proyecto muy grande. Se implementará en **fases incrementales**. Este plan cubre las primeras 3 fases fundamentales. Las siguientes fases se implementarán en iteraciones posteriores.

---

## Fase 1: Base de Datos (Migraciones SQL)

Se crearán todas las tablas, enums, funciones, triggers y políticas RLS en una migración SQL.

### Tablas:
1. **plans** — Planes de licencia (basic, pro, enterprise)
2. **tenants** — Parqueaderos (nombre, slug, logo, colores, coordenadas, capacidad, espacios disponibles)
3. **user_profiles** — Perfil de usuario con rol y tenant_id (FK a auth.users)
4. **vehicle_rates** — Tarifas por tipo de vehículo por tenant
5. **customers** — Clientes del parqueadero (teléfono como ID único por tenant)
6. **vehicles** — Vehículos registrados
7. **parking_sessions** — Sesiones de estacionamiento (entrada/salida/cálculo)

### Enums:
- `app_role`: superadmin, admin, operator, viewer, enduser
- `vehicle_type`: car, motorcycle, truck, bicycle
- `session_status`: active, completed, cancelled

### Funciones PostgreSQL:
- `has_role(user_id, role)` — Security definer para RLS sin recursión
- `get_user_tenant_id(user_id)` — Security definer para obtener tenant
- `is_superadmin(user_id)` — Verificar si es superadmin
- `calculate_parking_fee(entry, exit, rate, fraction_minutes)` — Cálculo de tarifa por fracciones
- `handle_new_user()` — Trigger para crear perfil automáticamente al registrarse

### Triggers:
- **on_auth_user_created** — Crear perfil en user_profiles
- **on_session_start** — Decrementar available_spaces al INSERT con status=active
- **on_session_complete** — Incrementar available_spaces y actualizar stats del customer
- **update_parking_sessions_updated_at** — Timestamp de modificación

### Políticas RLS (por tabla):
- Superadmin bypassa todo usando `is_superadmin()`
- Usuarios normales filtran por `tenant_id` usando `get_user_tenant_id()`
- Tabla `tenants`: lectura pública para el mapa (solo campos no sensibles)
- Tabla `plans`: lectura pública

### Storage:
- Bucket `tenant-logos` público para logos de parqueaderos

---

## Fase 2: Autenticación y Contexto

### Archivos a crear:
- **`src/contexts/AuthContext.tsx`** — Provider con `onAuthStateChange`, carga user_profiles, expone user/role/tenantId/loading
- **`src/components/ProtectedRoute.tsx`** — Wrapper que verifica autenticación y rol permitido
- **`src/pages/Login.tsx`** — Formulario email + contraseña con validación Zod
- **`src/pages/Register.tsx`** — Registro público (rol enduser por defecto)
- **`src/pages/ResetPassword.tsx`** — Página para resetear contraseña

### Lógica:
- Al login, consultar `user_profiles` para obtener rol y tenant_id
- Redirección por rol: superadmin → `/superadmin`, admin/operator → `/dashboard`, enduser → `/map`
- Rutas protegidas con `ProtectedRoute` que recibe `allowedRoles`

---

## Fase 3: Layout, Sidebar y Navegación

### Archivos a crear:
- **`src/components/layout/DashboardLayout.tsx`** — Layout con SidebarProvider, header con badge de espacios disponibles
- **`src/components/layout/AppSidebar.tsx`** — Sidebar colapsable con menú dinámico según rol
- **`src/components/layout/SuperAdminLayout.tsx`** — Layout separado para superadmin
- **`src/hooks/useTenant.ts`** — Hook para obtener datos del tenant y aplicar theming (CSS variables)

### Menú por rol:

| Rol | Módulos visibles |
|-----|-----------------|
| superadmin | Tenants, Planes, Métricas globales |
| admin | Dashboard, Vehículos, Clientes, Tarifas, Reportes, Aforo, Config |
| operator | Dashboard, Vehículos, Clientes, Aforo |
| viewer | Dashboard |

### Rutas (App.tsx):
```text
/login, /register, /reset-password     → públicas
/dashboard                              → Dashboard
/parking                                → Gestión de vehículos
/customers                              → Clientes
/rates                                  → Tarifas
/reports                                → Reportes
/capacity                               → Aforo
/superadmin                             → Panel superadmin
/map                                    → Mapa público
```

---

## Componentes Reutilizables (se crean en Fase 3)

- **`src/components/ui/DataTable.tsx`** — Tabla con búsqueda global, filtros por columna (togglable), ordenamiento por header, paginación (8/página), contador de registros
- **`src/lib/utils/formatters.ts`** — `formatCurrency()` (COP con `Intl.NumberFormat`), `formatDateTime()`, `formatDuration()`
- **`src/lib/utils/pricing.ts`** — `calculateParkingFee()` en frontend (mirror de la función PG)

---

## Fases Posteriores (se implementarán después)

- **Fase 4**: Dashboard con KPIs, grid de aforo, gráficos Recharts
- **Fase 5**: Módulo de vehículos (entrada/salida con modales, tarifa live)
- **Fase 6**: Módulo de clientes con historial
- **Fase 7**: Módulo de tarifas con cards editables
- **Fase 8**: Reportes con filtros y export PDF (jsPDF + autoTable)
- **Fase 9**: Aforo visual con grid de espacios
- **Fase 10**: Super Admin (CRUD tenants, credenciales, planes)
- **Fase 11**: Mapa público con Leaflet + Supabase Realtime
- **Fase 12**: Realtime subscriptions en todos los módulos

---

## Dependencias a instalar

- `jspdf` + `jspdf-autotable` (reportes PDF)
- `leaflet` + `react-leaflet` + `@types/leaflet` (mapa)
- `zustand` (estado global ligero)

Las demás dependencias necesarias (supabase, recharts, date-fns, zod, sonner, react-router-dom) ya están instaladas.

