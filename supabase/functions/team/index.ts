// Edge Function: team
// CRUD de usuarios del equipo del tenant (user_profiles + auth.users).
//
// Rutas:
//   GET    /team             → lista de usuarios del tenant
//   POST   /team             → invita un usuario (crea auth.user + user_profile)
//   PUT    /team/:id         → cambia rol / nombre / estado
//   DELETE /team/:id         → desactiva (no borra de auth)
//
// Solo accesible por admin y superadmin.

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, requireRole, AppRole } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface InviteBody {
  email: string;
  full_name?: string;
  phone?: string;
  role: AppRole;
  password?: string;
}

interface UpdateBody {
  role?: AppRole;
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  user_modules?: unknown;
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "team");
  return { id: idx === -1 ? null : parts[idx + 1] ?? null };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    requireRole(ctx, ["superadmin", "admin"]);
    const url = new URL(req.url);
    const { id } = parsePath(url);

    if (req.method === "GET" && !id) return await list(ctx, tenantId);
    if (req.method === "POST" && !id) return await invite(ctx, tenantId, await readJson<InviteBody>(req));
    if (req.method === "PUT" && id) return await update(ctx, tenantId, id, await readJson<UpdateBody>(req));
    if (req.method === "DELETE" && id) return await deactivate(ctx, tenantId, id);
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function list(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("user_profiles")
    .select("id, tenant_id, role, full_name, phone, avatar_url, is_active, user_modules, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (err) throw new Error(err.message);

  const { data: usersList } = await ctx.supabase.auth.admin.listUsers();
  const byId = new Map<string, string>();
  usersList?.users?.forEach((u) => byId.set(u.id, u.email ?? ""));

  const items = (data ?? []).map((p) => ({ ...p, email: byId.get(p.id) ?? null }));
  return ok(items);
}

async function invite(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: InviteBody,
) {
  if (!body?.email || !body?.role) {
    throw new Error("VALIDATION: email and role are required");
  }
  const allowedRoles: AppRole[] = ["admin", "conductor"];
  if (!allowedRoles.includes(body.role)) {
    throw new Error("VALIDATION: role must be admin or conductor");
  }

  // Crear usuario en auth
  const { data: createdUser, error: createErr } = await ctx.supabase.auth.admin.createUser({
    email: body.email,
    password: body.password ?? cryptoRandomPassword(),
    email_confirm: true,
    user_metadata: { full_name: body.full_name ?? "" },
  });
  if (createErr || !createdUser?.user) {
    throw new Error(`CONFLICT: ${createErr?.message ?? "could not create user"}`);
  }

  // Crear el perfil
  const { data: profile, error: profErr } = await ctx.supabase
    .from("user_profiles")
    .insert({
      id: createdUser.user.id,
      tenant_id: tenantId,
      role: body.role,
      full_name: body.full_name ?? null,
      phone: body.phone ?? null,
      is_active: true,
    })
    .select()
    .single();
  if (profErr) {
    // rollback en auth
    await ctx.supabase.auth.admin.deleteUser(createdUser.user.id);
    throw new Error(profErr.message);
  }

  return created({ ...profile, email: createdUser.user.email });
}

async function update(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
  body: UpdateBody,
) {
  // Verificar que el usuario destino pertenece al tenant
  const { data: target } = await ctx.supabase
    .from("user_profiles")
    .select("id, tenant_id, role")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new Error("NOT_FOUND: user not found");
  if (target.tenant_id !== tenantId) throw new Error("FORBIDDEN: user belongs to another tenant");
  if (target.role === "superadmin") throw new Error("FORBIDDEN: cannot modify superadmin");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.role !== undefined) {
    if (!["admin", "conductor"].includes(body.role)) {
      throw new Error("VALIDATION: role must be admin or conductor");
    }
    patch.role = body.role;
  }
  if (body.full_name !== undefined) patch.full_name = body.full_name;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.user_modules !== undefined) patch.user_modules = body.user_modules;

  const { data, error: err } = await ctx.supabase
    .from("user_profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  return ok(data);
}

async function deactivate(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data: target } = await ctx.supabase
    .from("user_profiles")
    .select("id, tenant_id, role")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new Error("NOT_FOUND: user not found");
  if (target.tenant_id !== tenantId) throw new Error("FORBIDDEN: user belongs to another tenant");
  if (target.role === "superadmin") throw new Error("FORBIDDEN: cannot deactivate superadmin");

  const { data, error: err } = await ctx.supabase
    .from("user_profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  return ok(data);
}

function cryptoRandomPassword(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
