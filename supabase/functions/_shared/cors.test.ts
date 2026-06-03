import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { corsHeaders, handleCors } from "./cors.ts";

Deno.test("corsHeaders permite cualquier origen", () => {
  assertEquals(corsHeaders["Access-Control-Allow-Origin"], "*");
});

Deno.test("corsHeaders incluye headers de auth y tenant", () => {
  const headers = corsHeaders["Access-Control-Allow-Headers"].split(",").map((s) => s.trim());
  for (const required of ["authorization", "apikey", "content-type", "x-tenant-id"]) {
    if (!headers.includes(required)) {
      throw new Error(`Falta header CORS: ${required}`);
    }
  }
});

Deno.test("corsHeaders permite los métodos CRUD esperados", () => {
  const methods = corsHeaders["Access-Control-Allow-Methods"].split(",").map((s) => s.trim());
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    if (!methods.includes(m)) throw new Error(`Falta método CORS: ${m}`);
  }
});

Deno.test("handleCors responde con preflight en OPTIONS", async () => {
  const res = handleCors(new Request("http://x", { method: "OPTIONS" }));
  if (!res) throw new Error("Se esperaba una Response");
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "ok");
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("handleCors retorna null en GET/POST/etc", () => {
  for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH"]) {
    assertEquals(handleCors(new Request("http://x", { method })), null);
  }
});
