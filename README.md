# ParkiUpar

Sistema SaaS de gestión de parqueaderos diseñado para operadores multi-tenant. Permite administrar espacios, clientes, facturación, horarios, reportes y equipos de trabajo en múltiples sedes.

---

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 |
| Routing | React Router 7 |
| UI | Radix UI + shadcn/ui + Tailwind CSS 3 |
| Animaciones | Framer Motion, Canvas Confetti |
| State / Data | TanStack React Query 5 |
| Formularios | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL 15, PostgREST, GoTrue Auth, Realtime) |
| Mapas | Leaflet 1.9 |
| Reportes | jsPDF |
| Íconos | Lucide React |
| Notificaciones | Sonner |

---

## Estructura del proyecto

```
parkiupar/
├── src/
│   ├── pages/          # Vistas principales (dashboard, auth, parqueadero, clientes, facturación...)
│   ├── components/     # Componentes reutilizables (layout, UI, modales, tablas)
│   ├── contexts/       # Contextos de React (AuthContext)
│   ├── hooks/          # Hooks personalizados
│   ├── integrations/   # Cliente y tipos de Supabase
│   ├── lib/            # Utilidades y helpers
│   └── types/          # Definiciones TypeScript
├── supabase/
│   ├── migrations/     # Migraciones SQL del schema
│   ├── functions/      # Edge Functions
│   └── config.toml     # Configuración de Supabase
├── public/             # Assets estáticos
├── docker-compose.yml  # Stack completo para entorno local
└── vite.config.ts      # Configuración de Vite + PWA
```

---

## Funcionalidades principales

- **Gestión de espacios**: capacidad, disponibilidad en tiempo real, mapa visual
- **Clientes y vehículos**: historial de visitas, datos de contacto, tipos de vehículo
- **Facturación y tarifas**: precios por tipo de vehículo, pagos, suscripciones mensuales
- **Reportes**: ingresos, logs de auditoría, incidentes
- **Administración**: gestión de usuarios, planes, control de superadmin
- **Multi-rol**: `superadmin`, `admin`, `operator`, `cajero`, `portero`, `conductor`, `viewer`
- **Tiempo real**: sincronización vía Supabase Realtime (WebSocket)
- **PWA**: aplicación instalable con soporte offline básico

---

## Base de datos

PostgreSQL con Row Level Security (RLS). Tablas principales:

| Tabla | Descripción |
|---|---|
| `tenants` | Parqueaderos / sedes |
| `plans` | Planes de suscripción SaaS |
| `user_profiles` | Perfiles de usuario con rol y tenant |
| `customers` | Clientes del parqueadero |
| `vehicles` | Vehículos registrados |
| `vehicle_rates` | Tarifas por tipo de vehículo |
| `sessions` | Sesiones de parqueo (entrada/salida) |
| `payments` | Registros de pago |
| `incidents` | Incidentes reportados |
| `audit_logs` | Log de auditoría de acciones |

Tipos personalizados: `app_role`, `vehicle_type`, `session_status`, `license_type`

---

## Instalación y desarrollo

### Requisitos

- Node.js 18+
- npm o pnpm
- Cuenta de Supabase (o Docker para entorno local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/parkiupar.git
cd parkiupar
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:8080`.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `:8080` |
| `npm run build` | Build de producción |
| `npm run build:dev` | Build en modo desarrollo |
| `npm run preview` | Vista previa del build |

---

## Entorno local con Docker

Para correr Supabase localmente:

```bash
docker compose up -d
```

Esto levanta: PostgreSQL, PostgREST, GoTrue Auth, Supabase Studio y el frontend.

Para aplicar migraciones:

```bash
npx supabase db push
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL (solo Docker) |
| `SUPABASE_JWT_SECRET` | Secreto JWT (solo Docker) |

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| `superadmin` | Acceso total a todos los tenants |
| `admin` | Administrador de un tenant |
| `cajero` | Gestión de pagos y caja |
| `portero` | Registro de entradas/salidas |
| `conductor` | Portal de autoservicio del cliente |

---

## Licencia

INGEMD SOLUTIONS SAS — todos los derechos reservados.
