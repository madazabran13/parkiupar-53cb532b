import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type AuthContext,
  assertSameTenant,
  isSuperadmin,
  requireRole,
  requireTenant,
} from "./auth.ts";

function ctx(partial: Partial<AuthContext>): AuthContext {
  return {
    userId: "u1",
    tenantId: "t1",
    role: "admin",
    email: "test@parkiupar.dev",
    fullName: "Test",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    ...partial,
  };
}

Deno.test("requireTenant retorna el tenantId del contexto", () => {
  assertEquals(requireTenant(ctx({ tenantId: "tenant-42" })), "tenant-42");
});

Deno.test("requireTenant lanza FORBIDDEN cuando el usuario no tiene tenant", () => {
  assertThrows(() => requireTenant(ctx({ tenantId: null })), Error, "FORBIDDEN");
});

Deno.test("requireRole permite roles incluidos en allowed", () => {
  requireRole(ctx({ role: "admin" }), ["admin", "superadmin"]);
  requireRole(ctx({ role: "superadmin" }), ["superadmin"]);
});

Deno.test("requireRole lanza FORBIDDEN cuando el rol no está permitido", () => {
  assertThrows(
    () => requireRole(ctx({ role: "conductor" }), ["admin", "superadmin"]),
    Error,
    "FORBIDDEN",
  );
});

Deno.test("isSuperadmin verdadero solo para rol superadmin", () => {
  assertEquals(isSuperadmin(ctx({ role: "superadmin" })), true);
  assertEquals(isSuperadmin(ctx({ role: "admin" })), false);
  assertEquals(isSuperadmin(ctx({ role: "conductor" })), false);
});

Deno.test("assertSameTenant: superadmin puede cruzar tenants", () => {
  assertSameTenant(ctx({ role: "superadmin", tenantId: "t1" }), "t2-otro");
});

Deno.test("assertSameTenant: mismo tenant pasa", () => {
  assertSameTenant(ctx({ tenantId: "t1" }), "t1");
});

Deno.test("assertSameTenant: tenant distinto lanza FORBIDDEN", () => {
  assertThrows(
    () => assertSameTenant(ctx({ tenantId: "t1" }), "t2"),
    Error,
    "FORBIDDEN",
  );
});

Deno.test("assertSameTenant: tenant target nulo (sin superadmin) lanza FORBIDDEN", () => {
  assertThrows(
    () => assertSameTenant(ctx({ tenantId: "t1" }), null),
    Error,
    "FORBIDDEN",
  );
});
