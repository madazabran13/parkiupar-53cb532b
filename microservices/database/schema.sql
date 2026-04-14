-- ═══════════════════════════════════════════════════════
-- ParkiUpar Microservices — Database Schema
-- Tables prefixed with ms_ to avoid conflicts with existing tables
-- ═══════════════════════════════════════════════════════

-- MS-1: Users (Authentication)
CREATE TABLE IF NOT EXISTS ms_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'operador', 'cliente')),
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MS-2: Vehicles (soft delete)
CREATE TABLE IF NOT EXISTS ms_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(8) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('carro', 'moto', 'bicicleta')),
  marca TEXT,
  modelo TEXT,
  color TEXT,
  owner_id UUID REFERENCES ms_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(placa) WHERE (deleted_at IS NULL)
);

-- MS-3: Parkings
CREATE TABLE IF NOT EXISTS ms_parkings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  capacidad_total INTEGER NOT NULL DEFAULT 0,
  tarifa_carro NUMERIC NOT NULL DEFAULT 0,
  tarifa_moto NUMERIC NOT NULL DEFAULT 0,
  tarifa_bicicleta NUMERIC NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MS-3: Spots
CREATE TABLE IF NOT EXISTS ms_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id UUID NOT NULL REFERENCES ms_parkings(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'general',
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupado', 'mantenimiento')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MS-4: Reservations (soft delete)
CREATE TABLE IF NOT EXISTS ms_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES ms_vehicles(id),
  spot_id UUID NOT NULL REFERENCES ms_spots(id),
  parking_id UUID NOT NULL REFERENCES ms_parkings(id),
  user_id UUID NOT NULL REFERENCES ms_users(id),
  entrada_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  salida_at TIMESTAMPTZ,
  minutos INTEGER,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'finalizada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ms_vehicles_placa ON ms_vehicles(placa) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ms_vehicles_owner ON ms_vehicles(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ms_spots_parking ON ms_spots(parking_id);
CREATE INDEX IF NOT EXISTS idx_ms_reservations_vehiculo ON ms_reservations(vehiculo_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ms_reservations_parking ON ms_reservations(parking_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ms_reservations_estado ON ms_reservations(estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ms_users_email ON ms_users(email);
