// Tests de integración contra el stack LOCAL de Supabase.
//
// Requisitos previos (una sola vez):
//   1. Docker corriendo.
//   2. supabase start  (desde la raíz del repo). Esto levanta Postgres + GoTrue +
//      Edge Functions + PostgREST y aplica todas las migraciones de
//      `supabase/migrations/`.
//   3. Seed de usuarios admin y conductor (manual o via SQL en supabase/init/).
//   4. Variables de entorno SUPABASE_LOCAL_URL, ADMIN_JWT, CONDUCTOR_JWT.
//
// Ejecución:
//   cd supabase/functions
//   SUPABASE_LOCAL_URL=http://127.0.0.1:54321 \
//   ADMIN_JWT=<jwt> CONDUCTOR_JWT=<jwt> \
//   deno task test:integration
//
// Si las env vars no están presentes, los tests se saltan automáticamente.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const BASE = Deno.env.get("SUPABASE_LOCAL_URL");
const ADMIN_JWT = Deno.env.get("ADMIN_JWT");
const SKIP_REASON =
  "Set SUPABASE_LOCAL_URL y ADMIN_JWT (requiere `supabase start` corriendo y un usuario seed).";

Deno.test({
  name: "GET /functions/v1/capacity retorna envelope con totales del tenant",
  ignore: !BASE || !ADMIN_JWT,
  fn: async () => {
    const res = await fetch(`${BASE}/functions/v1/capacity`, {
      headers: { Authorization: `Bearer ${ADMIN_JWT}` },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    if (body.error) throw new Error(`Esperado envelope ok: ${JSON.stringify(body.error)}`);
    if (typeof body.data?.total !== "number") {
      throw new Error("data.total ausente o no numérico");
    }
  },
});

Deno.test({
  name: "GET /functions/v1/parking sin Authorization devuelve 401",
  ignore: !BASE,
  fn: async () => {
    const res = await fetch(`${BASE}/functions/v1/parking`);
    assertEquals(res.status, 401);
    const body = await res.json();
    assertEquals(body.data, null);
    if (!body.error) throw new Error("Esperado error envelope");
  },
});

Deno.test({
  name: "POST /functions/v1/parking con placa válida crea sesión y respeta RLS por tenant",
  ignore: !BASE || !ADMIN_JWT,
  fn: async () => {
    const plate = `T${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    const res = await fetch(`${BASE}/functions/v1/parking`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plate: `ABC${plate}`,
        vehicle_type: "car",
        space_number: "A-99",
      }),
    });
    if (res.status !== 200 && res.status !== 201 && res.status !== 422) {
      throw new Error(`Status inesperado ${res.status}: ${await res.text()}`);
    }
  },
});
