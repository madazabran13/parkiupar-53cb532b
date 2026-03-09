
-- ============================================
-- Insert test data for ParkiUpar
-- ============================================

-- 1. Plans
INSERT INTO public.plans (id, name, description, price_monthly, max_spaces, modules) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Básico', 'Plan básico con módulos esenciales', 99000, 30, '["dashboard","parking","customers","rates"]'),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'Profesional', 'Plan profesional con reportes y aforo', 199000, 100, '["dashboard","parking","customers","rates","reports","capacity"]'),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'Empresarial', 'Plan completo con todas las funcionalidades', 349000, 500, '["dashboard","parking","customers","rates","reports","capacity","map","settings"]');

-- 2. Tenants (Parqueaderos en Valledupar)
INSERT INTO public.tenants (id, name, slug, primary_color, secondary_color, plan_id, address, city, phone, email, total_spaces, available_spaces, latitude, longitude) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000001', 'Parqueadero Central Valledupar', 'central-valledupar', '#1e40af', '#3b82f6', 'a1b2c3d4-0001-0001-0001-000000000002', 'Calle 16 #14-50, Centro', 'Valledupar', '3001234567', 'central@parking.co', 40, 28, 10.4736, -73.2532),
  ('b2c3d4e5-0001-0001-0001-000000000002', 'Parking Plaza del Sol', 'plaza-del-sol', '#059669', '#10b981', 'a1b2c3d4-0001-0001-0001-000000000003', 'Carrera 9 #16B-25, Novalito', 'Valledupar', '3009876543', 'plazadelsol@parking.co', 60, 45, 10.4770, -73.2490),
  ('b2c3d4e5-0001-0001-0001-000000000003', 'EasyPark La Ceiba', 'easypark-ceiba', '#dc2626', '#f87171', 'a1b2c3d4-0001-0001-0001-000000000001', 'Calle 20 #7-30, La Ceiba', 'Valledupar', '3115551234', 'ceiba@easypark.co', 25, 3, 10.4700, -73.2550),
  ('b2c3d4e5-0001-0001-0001-000000000004', 'Parqueadero Los Mayales', 'los-mayales', '#7c3aed', '#a78bfa', 'a1b2c3d4-0001-0001-0001-000000000002', 'Calle 30 #19-40, Los Mayales', 'Valledupar', '3204567890', 'mayales@parking.co', 35, 35, 10.4820, -73.2460);

-- 3. Vehicle rates for each tenant
-- Central Valledupar
INSERT INTO public.vehicle_rates (tenant_id, vehicle_type, rate_per_hour, fraction_minutes, minimum_minutes) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000001', 'car', 3500, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'motorcycle', 2000, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'truck', 5000, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'bicycle', 1000, 30, 30);

-- Plaza del Sol
INSERT INTO public.vehicle_rates (tenant_id, vehicle_type, rate_per_hour, fraction_minutes, minimum_minutes) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000002', 'car', 4000, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000002', 'motorcycle', 2500, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000002', 'truck', 6000, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000002', 'bicycle', 1500, 30, 30);

-- EasyPark La Ceiba
INSERT INTO public.vehicle_rates (tenant_id, vehicle_type, rate_per_hour, fraction_minutes, minimum_minutes) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000003', 'car', 3000, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000003', 'motorcycle', 1500, 15, 15);

-- Los Mayales
INSERT INTO public.vehicle_rates (tenant_id, vehicle_type, rate_per_hour, fraction_minutes, minimum_minutes) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000004', 'car', 3500, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000004', 'motorcycle', 2000, 15, 15),
  ('b2c3d4e5-0001-0001-0001-000000000004', 'truck', 5500, 15, 15);

-- 4. Customers for Central Valledupar
INSERT INTO public.customers (id, tenant_id, phone, full_name, email, total_visits, total_spent) VALUES
  ('c3d4e5f6-0001-0001-0001-000000000001', 'b2c3d4e5-0001-0001-0001-000000000001', '3001112233', 'Carlos Martínez', 'carlos@email.com', 15, 87500),
  ('c3d4e5f6-0001-0001-0001-000000000002', 'b2c3d4e5-0001-0001-0001-000000000001', '3002223344', 'María López', 'maria@email.com', 8, 42000),
  ('c3d4e5f6-0001-0001-0001-000000000003', 'b2c3d4e5-0001-0001-0001-000000000001', '3003334455', 'Juan Rodríguez', NULL, 22, 110000),
  ('c3d4e5f6-0001-0001-0001-000000000004', 'b2c3d4e5-0001-0001-0001-000000000001', '3004445566', 'Ana Pérez', 'ana.perez@email.com', 5, 25000),
  ('c3d4e5f6-0001-0001-0001-000000000005', 'b2c3d4e5-0001-0001-0001-000000000001', '3005556677', 'Pedro Hernández', NULL, 12, 36000);

-- Customers for Plaza del Sol
INSERT INTO public.customers (id, tenant_id, phone, full_name, email, total_visits, total_spent) VALUES
  ('c3d4e5f6-0001-0001-0001-000000000006', 'b2c3d4e5-0001-0001-0001-000000000002', '3106661122', 'Sofía Gutiérrez', 'sofia@email.com', 10, 60000),
  ('c3d4e5f6-0001-0001-0001-000000000007', 'b2c3d4e5-0001-0001-0001-000000000002', '3107772233', 'Diego Torres', NULL, 6, 30000);

-- Customers for EasyPark La Ceiba
INSERT INTO public.customers (id, tenant_id, phone, full_name, email, total_visits, total_spent) VALUES
  ('c3d4e5f6-0001-0001-0001-000000000008', 'b2c3d4e5-0001-0001-0001-000000000003', '3208883344', 'Laura Díaz', 'laura@email.com', 18, 72000),
  ('c3d4e5f6-0001-0001-0001-000000000009', 'b2c3d4e5-0001-0001-0001-000000000003', '3209994455', 'Andrés Castro', NULL, 3, 9000);

-- 5. Vehicles
INSERT INTO public.vehicles (id, tenant_id, customer_id, plate, vehicle_type, brand, color) VALUES
  ('d4e5f6a7-0001-0001-0001-000000000001', 'b2c3d4e5-0001-0001-0001-000000000001', 'c3d4e5f6-0001-0001-0001-000000000001', 'ABC123', 'car', 'Chevrolet', 'Blanco'),
  ('d4e5f6a7-0001-0001-0001-000000000002', 'b2c3d4e5-0001-0001-0001-000000000001', 'c3d4e5f6-0001-0001-0001-000000000002', 'DEF456', 'motorcycle', 'Yamaha', 'Negro'),
  ('d4e5f6a7-0001-0001-0001-000000000003', 'b2c3d4e5-0001-0001-0001-000000000001', 'c3d4e5f6-0001-0001-0001-000000000003', 'GHI789', 'car', 'Renault', 'Gris'),
  ('d4e5f6a7-0001-0001-0001-000000000004', 'b2c3d4e5-0001-0001-0001-000000000001', 'c3d4e5f6-0001-0001-0001-000000000004', 'JKL012', 'truck', 'Ford', 'Rojo'),
  ('d4e5f6a7-0001-0001-0001-000000000005', 'b2c3d4e5-0001-0001-0001-000000000001', 'c3d4e5f6-0001-0001-0001-000000000005', 'MNO345', 'motorcycle', 'Honda', 'Azul'),
  ('d4e5f6a7-0001-0001-0001-000000000006', 'b2c3d4e5-0001-0001-0001-000000000002', 'c3d4e5f6-0001-0001-0001-000000000006', 'PQR678', 'car', 'Toyota', 'Negro'),
  ('d4e5f6a7-0001-0001-0001-000000000007', 'b2c3d4e5-0001-0001-0001-000000000002', 'c3d4e5f6-0001-0001-0001-000000000007', 'STU901', 'car', 'Mazda', 'Blanco'),
  ('d4e5f6a7-0001-0001-0001-000000000008', 'b2c3d4e5-0001-0001-0001-000000000003', 'c3d4e5f6-0001-0001-0001-000000000008', 'VWX234', 'motorcycle', 'Suzuki', 'Rojo'),
  ('d4e5f6a7-0001-0001-0001-000000000009', 'b2c3d4e5-0001-0001-0001-000000000003', 'c3d4e5f6-0001-0001-0001-000000000009', 'YZA567', 'car', 'Kia', 'Plata');

-- 6. Active parking sessions (currently parked vehicles)
-- Central Valledupar: 12 active sessions (40-28=12 occupied)
INSERT INTO public.parking_sessions (tenant_id, vehicle_id, customer_id, plate, vehicle_type, customer_name, customer_phone, space_number, entry_time, rate_per_hour, status) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000001', 'd4e5f6a7-0001-0001-0001-000000000001', 'c3d4e5f6-0001-0001-0001-000000000001', 'ABC123', 'car', 'Carlos Martínez', '3001112233', '1', now() - interval '2 hours 30 minutes', 3500, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'd4e5f6a7-0001-0001-0001-000000000002', 'c3d4e5f6-0001-0001-0001-000000000002', 'DEF456', 'motorcycle', 'María López', '3002223344', '5', now() - interval '45 minutes', 2000, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'd4e5f6a7-0001-0001-0001-000000000003', 'c3d4e5f6-0001-0001-0001-000000000003', 'GHI789', 'car', 'Juan Rodríguez', '3003334455', '8', now() - interval '5 hours', 3500, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'BCD234', 'car', 'Roberto Gómez', '3101234567', '12', now() - interval '1 hour 15 minutes', 3500, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'EFG567', 'motorcycle', 'Lucía Fernández', '3102345678', '15', now() - interval '30 minutes', 2000, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'HIJ890', 'car', 'Miguel Ángel Vargas', '3103456789', '18', now() - interval '3 hours', 3500, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'd4e5f6a7-0001-0001-0001-000000000004', 'c3d4e5f6-0001-0001-0001-000000000004', 'JKL012', 'truck', 'Ana Pérez', '3004445566', '20', now() - interval '1 hour 45 minutes', 5000, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'KLM345', 'car', 'Fernando Ruiz', '3104567890', '22', now() - interval '4 hours 20 minutes', 3500, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'd4e5f6a7-0001-0001-0001-000000000005', 'c3d4e5f6-0001-0001-0001-000000000005', 'MNO345', 'motorcycle', 'Pedro Hernández', '3005556677', '25', now() - interval '2 hours', 2000, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'NOP678', 'car', 'Sandra Mejía', '3105678901', '28', now() - interval '50 minutes', 3500, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'OPQ901', 'bicycle', 'Daniel Ortiz', '3106789012', '30', now() - interval '1 hour', 1000, 'active'),
  ('b2c3d4e5-0001-0001-0001-000000000001', NULL, NULL, 'PQR234', 'car', 'Valentina Sánchez', '3107890123', '35', now() - interval '15 minutes', 3500, 'active');

-- EasyPark La Ceiba: 22 active sessions (25-3=22 occupied)
INSERT INTO public.parking_sessions (tenant_id, vehicle_id, customer_id, plate, vehicle_type, customer_name, customer_phone, space_number, entry_time, rate_per_hour, status)
SELECT
  'b2c3d4e5-0001-0001-0001-000000000003',
  CASE WHEN n = 1 THEN 'd4e5f6a7-0001-0001-0001-000000000008'::uuid WHEN n = 2 THEN 'd4e5f6a7-0001-0001-0001-000000000009'::uuid ELSE NULL END,
  CASE WHEN n = 1 THEN 'c3d4e5f6-0001-0001-0001-000000000008'::uuid WHEN n = 2 THEN 'c3d4e5f6-0001-0001-0001-000000000009'::uuid ELSE NULL END,
  'PLT' || LPAD(n::text, 3, '0'),
  CASE WHEN n % 3 = 0 THEN 'motorcycle'::vehicle_type ELSE 'car'::vehicle_type END,
  'Cliente ' || n,
  '320' || LPAD(n::text, 7, '0'),
  n::text,
  now() - (n * interval '20 minutes'),
  CASE WHEN n % 3 = 0 THEN 1500 ELSE 3000 END,
  'active'
FROM generate_series(1, 22) AS n;

-- Plaza del Sol: 15 active sessions (60-45=15 occupied)
INSERT INTO public.parking_sessions (tenant_id, vehicle_id, customer_id, plate, vehicle_type, customer_name, customer_phone, space_number, entry_time, rate_per_hour, status)
SELECT
  'b2c3d4e5-0001-0001-0001-000000000002',
  CASE WHEN n = 1 THEN 'd4e5f6a7-0001-0001-0001-000000000006'::uuid WHEN n = 2 THEN 'd4e5f6a7-0001-0001-0001-000000000007'::uuid ELSE NULL END,
  CASE WHEN n = 1 THEN 'c3d4e5f6-0001-0001-0001-000000000006'::uuid WHEN n = 2 THEN 'c3d4e5f6-0001-0001-0001-000000000007'::uuid ELSE NULL END,
  'SOL' || LPAD(n::text, 3, '0'),
  CASE WHEN n % 4 = 0 THEN 'motorcycle'::vehicle_type WHEN n % 7 = 0 THEN 'truck'::vehicle_type ELSE 'car'::vehicle_type END,
  'Cliente Sol ' || n,
  '310' || LPAD(n::text, 7, '0'),
  n::text,
  now() - (n * interval '25 minutes'),
  CASE WHEN n % 4 = 0 THEN 2500 WHEN n % 7 = 0 THEN 6000 ELSE 4000 END,
  'active'
FROM generate_series(1, 15) AS n;

-- 7. Completed sessions (historical data for reports) - Central Valledupar
INSERT INTO public.parking_sessions (tenant_id, plate, vehicle_type, customer_name, customer_phone, space_number, entry_time, exit_time, hours_parked, rate_per_hour, total_amount, status) VALUES
  ('b2c3d4e5-0001-0001-0001-000000000001', 'ABC123', 'car', 'Carlos Martínez', '3001112233', '3', now() - interval '8 hours', now() - interval '5 hours', 3.0, 3500, 10500, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'DEF456', 'motorcycle', 'María López', '3002223344', '7', now() - interval '10 hours', now() - interval '8 hours 30 minutes', 1.5, 2000, 4000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'GHI789', 'car', 'Juan Rodríguez', '3003334455', '2', now() - interval '1 day', now() - interval '22 hours', 2.0, 3500, 7000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'JKL012', 'truck', 'Ana Pérez', '3004445566', '10', now() - interval '1 day 2 hours', now() - interval '1 day', 2.0, 5000, 10000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'XYZ999', 'car', 'Camilo Rueda', '3201234567', '14', now() - interval '6 hours', now() - interval '4 hours 45 minutes', 1.25, 3500, 5250, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'QRS111', 'motorcycle', 'Elena Mora', '3202345678', '16', now() - interval '7 hours', now() - interval '6 hours', 1.0, 2000, 2000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'TUV222', 'car', 'Gabriel Pinto', '3203456789', '19', now() - interval '9 hours', now() - interval '6 hours 30 minutes', 2.5, 3500, 8750, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'WXY333', 'car', 'Isabel Castillo', '3204567890', '21', now() - interval '3 days', now() - interval '2 days 21 hours', 3.0, 3500, 10500, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'ZAB444', 'motorcycle', 'Oscar Peña', '3205678901', '24', now() - interval '2 days 5 hours', now() - interval '2 days 3 hours', 2.0, 2000, 4000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'CDE555', 'car', 'Patricia Vega', '3206789012', '27', now() - interval '4 days', now() - interval '3 days 20 hours', 4.0, 3500, 14000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'FGH666', 'truck', 'Raúl Mendoza', '3207890123', '29', now() - interval '5 days 1 hour', now() - interval '5 days', 1.0, 5000, 5000, 'completed'),
  ('b2c3d4e5-0001-0001-0001-000000000001', 'IJK777', 'car', 'Susana Ríos', '3208901234', '31', now() - interval '6 days 3 hours', now() - interval '6 days', 3.0, 3500, 10500, 'completed');
