import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { SUPABASE_URL } from "@/config/env";
import { api, ApiError } from "./api";

const FN = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

// Mock del cliente Supabase para que authHeader() y handle401() no dependan de red real.
const mockSignOut = vi.fn(async () => ({ error: null }));
const mockGetSession = vi.fn(async () => ({
  data: { session: { access_token: "test-jwt-token" } },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
    },
  },
}));

describe("api client — integración con MSW", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("happy path", () => {
    it("api.parking.getSessions retorna sólo data del envelope", async () => {
      const sessions = await api.parking.getSessions({ status: "active" });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].plate).toBe("ABC123");
      expect(sessions[0].status).toBe("active");
    });

    it("api.parking.checkDuplicate aplica query string correctamente", async () => {
      const result = await api.parking.checkDuplicate("ABC123");
      expect(result.exists).toBe(true);
      expect(result.same_parking).toBe(true);

      const result2 = await api.parking.checkDuplicate("ZZZ999");
      expect(result2.exists).toBe(false);
    });

    it("api.parking.registerEntry envía body JSON y obtiene la sesión creada", async () => {
      const session = await api.parking.registerEntry({
        plate: "XYZ987",
        vehicle_type: "car",
        space_number: "A-02",
      });
      expect(session.id).toBe("sess-new");
      expect(session.plate).toBe("XYZ987");
    });

    it("api.capacity.get retorna el estado actual", async () => {
      const state = await api.capacity.get();
      expect(state.total).toBe(50);
      expect(state.available).toBe(30);
    });
  });

  describe("Authorization header", () => {
    it("incluye Bearer <token> cuando hay sesión activa", async () => {
      let receivedAuth: string | null = null;
      server.use(
        http.get(`${FN}/me`, ({ request }) => {
          receivedAuth = request.headers.get("authorization");
          return HttpResponse.json({ data: { id: "u1" }, error: null });
        }),
      );

      await api.me.get();
      expect(receivedAuth).toBe("Bearer test-jwt-token");
    });

    it("no incluye Authorization cuando no hay sesión", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null } as unknown as { session: { access_token: string } },
      });
      let receivedAuth: string | null = "still-present";
      server.use(
        http.get(`${FN}/me`, ({ request }) => {
          receivedAuth = request.headers.get("authorization");
          return HttpResponse.json({ data: { id: "u1" }, error: null });
        }),
      );

      await api.me.get();
      expect(receivedAuth).toBeNull();
    });
  });

  describe("manejo de errores", () => {
    it("lanza ApiError cuando el envelope viene con error", async () => {
      server.use(
        http.get(`${FN}/parking`, () =>
          HttpResponse.json(
            { data: null, error: { code: "VALIDATION_ERROR", message: "Placa inválida" } },
            { status: 400 },
          ),
        ),
      );

      await expect(api.parking.getSessions()).rejects.toMatchObject({
        name: "ApiError",
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Placa inválida",
      });
    });

    it("lanza ApiError cuando el HTTP es 5xx aunque no traiga envelope", async () => {
      server.use(
        http.get(`${FN}/parking`, () =>
          HttpResponse.text("Internal error", { status: 500 }),
        ),
      );

      await expect(api.parking.getSessions()).rejects.toBeInstanceOf(ApiError);
    });

    it("lanza ApiError INVALID_JSON cuando la respuesta no es JSON parseable", async () => {
      server.use(
        http.get(`${FN}/parking`, () =>
          HttpResponse.text("<html>not json</html>", { status: 200 }),
        ),
      );

      await expect(api.parking.getSessions()).rejects.toMatchObject({
        code: "INVALID_JSON",
      });
    });

    it("en 401 dispara signOut() y lanza ApiError UNAUTHORIZED", async () => {
      const assignSpy = vi.fn();
      const original = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { ...original, pathname: "/dashboard", assign: assignSpy },
      });

      server.use(
        http.get(`${FN}/parking`, () =>
          HttpResponse.json({ data: null, error: { code: "JWT_EXPIRED" } }, { status: 401 }),
        ),
      );

      await expect(api.parking.getSessions()).rejects.toMatchObject({
        status: 401,
        code: "UNAUTHORIZED",
      });
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(assignSpy).toHaveBeenCalledWith("/login");

      Object.defineProperty(window, "location", { writable: true, value: original });
    });
  });
});
