// Helpers de respuesta estandarizada para todas las edge functions.
// Forma del payload: { data, error } donde solo uno está poblado.

import { corsHeaders } from "./cors.ts";

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

export function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: JSON_HEADERS,
  });
}

export function created<T>(data: T): Response {
  return ok(data, 201);
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export interface ErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
}

export function error(message: string, status = 400, details?: unknown, code?: string): Response {
  const payload: { data: null; error: ErrorPayload } = {
    data: null,
    error: { message, ...(code ? { code } : {}), ...(details !== undefined ? { details } : {}) },
  };
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

// Mapea excepciones a códigos HTTP según el prefijo del mensaje.
// Convención: lanzar `throw new Error("UNAUTHORIZED: ...")`, "FORBIDDEN: ...", etc.
export function handleException(e: unknown): Response {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith("UNAUTHORIZED")) return error(msg, 401);
  if (msg.startsWith("FORBIDDEN")) return error(msg, 403);
  if (msg.startsWith("NOT_FOUND")) return error(msg, 404);
  if (msg.startsWith("CONFLICT")) return error(msg, 409);
  if (msg.startsWith("VALIDATION")) return error(msg, 422);
  if (msg.startsWith("BAD_REQUEST")) return error(msg, 400);
  console.error("[edge-function] unhandled error:", e);
  return error(msg || "Internal server error", 500);
}

// Extrae JSON body con manejo seguro.
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("BAD_REQUEST: invalid JSON body");
  }
}
