// supabase/functions/delete-account/index.ts
// Securely delete an account and all associated data

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

interface UserRole {
  role: string;
}

// Restrict CORS to specific domains for security
const ALLOWED_ORIGINS = [
  "https://5670e5fc-c3f6-4b61-9f11-214ae88eb9ef.lovableproject.com",
  "http://localhost:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-internal-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
};

function json(payload: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Only POST allowed" }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Server config error" }, 500, corsHeaders);
    }

    // Optional hardening: require internal admin secret when configured
    const adminSecret = Deno.env.get("ADMIN_INTERNAL_SECRET") ?? "";
    if (adminSecret) {
      const headerSecret = req.headers.get("x-admin-internal-secret") ?? "";
      if (headerSecret !== adminSecret) {
        return json({ error: "Forbidden" }, 403, corsHeaders);
      }
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authorization header required" }, 401, corsHeaders);
    }

    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(supabaseUrl, supabaseKey);

    // Resolve actor user from JWT
    const {
      data: { user: actor },
      error: actorError,
    } = await admin.auth.getUser(token);

    if (actorError || !actor) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    // Check platform admin role
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actor.id);

    const isAdmin = (roles as UserRole[] | null)?.some((r: UserRole) => r.role === "admin");
    if (!isAdmin) {
      return json({ error: "Only admins can delete accounts" }, 403, corsHeaders);
    }

    const { user_id: targetUserId, reason } = await req.json();

    if (!targetUserId) {
      return json({ error: "user_id requerido" }, 400, corsHeaders);
    }

    // 🔒 RATE LIMITING: Protect destructive operation (delete account - 1/hour per admin)
    const rateLimitCheck = await checkRateLimitByUser(actor.id, "delete-account", "admin");
    if (!rateLimitCheck.allowed) {
      return json(
        {
          error: rateLimitCheck.message || "Demasiadas solicitudes de eliminación",
          code: "RATE_LIMIT_EXCEEDED",
        },
        429,
        corsHeaders,
      );
    }

    // Get user email for logging
    const {
      data: { users },
      error: listErr,
    } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;

    const targetUser = users.find((u: any) => u.id === targetUserId);
    const targetEmail = targetUser?.email ?? "unknown";

    // Get all companies for this user
    const { data: companies, error: companyErr } = await admin
      .from("company_users")
      .select("company_id")
      .eq("user_id", targetUserId);

    if (companyErr) throw companyErr;

    // Delete all companies in one query (instead of N individual DELETEs)
    if (companies && companies.length > 0) {
      const companyIds = companies.map((cu: any) => cu.company_id);
      const { error: delErr } = await admin
        .from("companies")
        .delete()
        .in("id", companyIds);

      if (delErr) console.error("Error deleting companies:", delErr);
    }

    // Delete user from auth
    const { error: delUserErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delUserErr) throw delUserErr;

    console.log(
      `Account deleted by ${actor.email ?? actor.id}: ${targetEmail} (${targetUserId}) - Reason: ${
        reason || "manual"
      }`,
    );

    return json(
      {
        ok: true,
        message: `Cuenta ${targetEmail} eliminada completamente`,
      },
      200,
      corsHeaders,
    );
  } catch (e) {
    return json({ error: String(e) }, 500, corsHeaders);
  }
});
