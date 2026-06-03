import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { error, handleException, ok, created, noContent, readJson } from "./response.ts";

Deno.test("ok() construye envelope { data, error:null } con status 200", async () => {
  const res = ok({ id: "x", n: 1 });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "application/json");
  const body = await res.json();
  assertEquals(body, { data: { id: "x", n: 1 }, error: null });
});

Deno.test("ok() acepta status custom", async () => {
  const res = ok({ ok: true }, 202);
  assertEquals(res.status, 202);
});

Deno.test("created() responde con 201", async () => {
  const res = created({ id: "new" });
  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.data.id, "new");
});

Deno.test("noContent() responde con 204 sin body", async () => {
  const res = noContent();
  assertEquals(res.status, 204);
  assertEquals(await res.text(), "");
});

Deno.test("error() envuelve message/code/details", async () => {
  const res = error("placa invalida", 422, { field: "plate" }, "VALIDATION_PLATE");
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.data, null);
  assertEquals(body.error.message, "placa invalida");
  assertEquals(body.error.code, "VALIDATION_PLATE");
  assertEquals(body.error.details, { field: "plate" });
});

Deno.test("error() sin code ni details omite esas keys", async () => {
  const res = error("simple", 400);
  const body = await res.json();
  assertEquals(body.error.message, "simple");
  assertEquals(body.error.code, undefined);
  assertEquals(body.error.details, undefined);
});

Deno.test("handleException mapea UNAUTHORIZED → 401", async () => {
  const res = handleException(new Error("UNAUTHORIZED: missing token"));
  assertEquals(res.status, 401);
  const body = await res.json();
  assertStringIncludes(body.error.message, "UNAUTHORIZED");
});

Deno.test("handleException mapea FORBIDDEN → 403", () => {
  const res = handleException(new Error("FORBIDDEN: insufficient role"));
  assertEquals(res.status, 403);
});

Deno.test("handleException mapea NOT_FOUND → 404", () => {
  const res = handleException(new Error("NOT_FOUND: session not found"));
  assertEquals(res.status, 404);
});

Deno.test("handleException mapea CONFLICT → 409", () => {
  const res = handleException(new Error("CONFLICT: duplicate"));
  assertEquals(res.status, 409);
});

Deno.test("handleException mapea VALIDATION → 422", () => {
  const res = handleException(new Error("VALIDATION: bad payload"));
  assertEquals(res.status, 422);
});

Deno.test("handleException mapea BAD_REQUEST → 400", () => {
  const res = handleException(new Error("BAD_REQUEST: missing field"));
  assertEquals(res.status, 400);
});

Deno.test("handleException default → 500", () => {
  const res = handleException(new Error("kaboom"));
  assertEquals(res.status, 500);
});

Deno.test("handleException acepta non-Error (string)", async () => {
  const res = handleException("raw string error");
  assertEquals(res.status, 500);
  const body = await res.json();
  assertStringIncludes(body.error.message, "raw string error");
});

Deno.test("readJson devuelve el body parseado", async () => {
  const req = new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ a: 1, b: "two" }),
  });
  const json = await readJson<{ a: number; b: string }>(req);
  assertEquals(json, { a: 1, b: "two" });
});

Deno.test("readJson lanza BAD_REQUEST en JSON inválido", async () => {
  const req = new Request("http://x", { method: "POST", body: "not json" });
  let caught: unknown = null;
  try {
    await readJson(req);
  } catch (e) {
    caught = e;
  }
  if (!(caught instanceof Error)) throw new Error("expected Error");
  assertStringIncludes(caught.message, "BAD_REQUEST");
});
