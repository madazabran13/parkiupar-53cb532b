import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "@/config/env";

const FN = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

/**
 * Handlers por defecto del happy-path. Cada test puede sobreescribir
 * un handler concreto con `server.use(...)` antes de la llamada.
 */
export const handlers = [
  http.get(`${FN}/parking`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "active";
    return HttpResponse.json({
      data: [
        {
          id: "sess-1",
          tenant_id: "t1",
          plate: "ABC123",
          vehicle_type: "car",
          space_number: "A-01",
          status,
          entry_time: "2026-01-01T12:00:00Z",
        },
      ],
      error: null,
    });
  }),

  http.get(`${FN}/parking/check-duplicate`, ({ request }) => {
    const plate = new URL(request.url).searchParams.get("plate");
    return HttpResponse.json({
      data: { exists: plate === "ABC123", same_parking: true, tenant_id: "t1" },
      error: null,
    });
  }),

  http.post(`${FN}/parking`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: {
        id: "sess-new",
        tenant_id: "t1",
        plate: body.plate,
        vehicle_type: body.vehicle_type,
        space_number: body.space_number,
        status: "active",
        entry_time: "2026-01-01T12:00:00Z",
      },
      error: null,
    });
  }),

  http.put(`${FN}/parking/:id/exit`, ({ params }) => {
    return HttpResponse.json({
      data: { id: params.id, status: "completed", exit_time: "2026-01-01T13:00:00Z" },
      error: null,
    });
  }),

  http.get(`${FN}/capacity`, () => {
    return HttpResponse.json({
      data: { total: 50, available: 30, occupied: 20, reserved: 0 },
      error: null,
    });
  }),

  http.get(`${FN}/me`, () => {
    return HttpResponse.json({
      data: { id: "u1", email: "test@parkiupar.dev", role: "admin", tenant_id: "t1" },
      error: null,
    });
  }),
];
