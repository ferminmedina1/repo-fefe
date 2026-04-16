import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildInviteEmail(
  displayName: string,
  companyName: string,
  role: string,
  inviteLink: string
): string {
  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    manager: "Gerente",
    employee: "Empleado",
    cashier: "Cajero",
  };
  const roleDisplay = roleLabel[role] || role;
  const greeting = displayName ? "Hola, " + displayName : "Hola";
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8" />' +
    '<title>Invitacion a Ventify</title></head>' +
    '<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">' +
    '<tr><td align="center">' +
    '<table width="560" cellpadding="0" cellspacing="0"' +
    ' style="max-width:560px;width:100%;border-radius:16px;overflow:hidden;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.12);">' +
    "<tr>" +
    '<td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);' +
    'padding:40px 48px 32px;text-align:center;">' +
    '<h1 style="margin:0 0 8px;color:#fff;font-size:32px;font-weight:800;">Ventify</h1>' +
    '<p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px;">Sistema de Gestion Empresarial</p>' +
    "</td></tr><tr>" +
    '<td style="background:#fff;padding:40px 48px;">' +
    '<h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;">' + greeting + "</h2>" +
    '<p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">' +
    'Fuiste invitado/a a unirte a <strong style="color:#1e293b;">' + companyName + "</strong>" +
    ' en Ventify con el rol de <strong style="color:#2563eb;">' + roleDisplay + "</strong>.</p>" +
    '<p style="margin:0 0 32px;color:#64748b;font-size:15px;">Hace clic en el boton para configurar tu contrasena.</p>' +
    '<table width="100%"><tr><td align="center">' +
    '<a href="' + inviteLink + '"' +
    ' style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;' +
    'text-decoration:none;font-size:16px;font-weight:600;padding:16px 40px;border-radius:10px;">Configurar mi contrasena</a>' +
    "</td></tr></table>" +
    '<p style="margin:32px 0 0;color:#94a3b8;font-size:13px;text-align:center;">' +
    'Si el boton no funciona: <a href="' + inviteLink + '" style="color:#2563eb;">' + inviteLink + "</a></p>" +
    "</td></tr>" +
    '<tr><td style="background:#fff;padding:0 48px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>' +
    '<tr><td style="background:#fff;padding:24px 48px 32px;"><p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">' +
    "Este correo fue enviado por <strong>Ventify</strong> en nombre de <strong>" + companyName + "</strong>.<br />" +
    "Si no esperabas esta invitacion, podes ignorar este mensaje." +
    "</p></td></tr>" +
    "</table></td></tr></table></body></html>"
  );
}

async function sendInviteEmail(
  resendApiKey: string,
  toEmail: string,
  inviteLink: string,
  displayName: string,
  companyName: string,
  role: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + resendApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: companyName + " via Ventify <support@ventify.space>",
      to: [toEmail],
      subject: "Te invitaron a unirte a " + companyName + " en Ventify",
      html: buildInviteEmail(displayName, companyName, role, inviteLink),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", res.status, body);
    throw new Error("Error enviando email: " + res.status + " " + body);
  }
  console.log("Email sent via Resend to", toEmail);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const origin = req.headers.get("origin");
  console.log("invite-employee request", { method: req.method, origin });
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY no esta configurado");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");
    const { email, full_name, role, companyId: requestedCompanyId } = await req.json();
    if (!email) throw new Error("Email is required");
    if (!role) throw new Error("Role is required");
    const baseMembershipQuery = supabaseAdmin
      .from("company_users")
      .select("company_id, role, active")
      .eq("user_id", user.id)
      .or("active.eq.true,active.is.null");
    const { data: companyUser, error: membershipError } = requestedCompanyId
      ? await baseMembershipQuery.eq("company_id", requestedCompanyId).maybeSingle()
      : await baseMembershipQuery.limit(1).maybeSingle();
    if (membershipError || !companyUser?.company_id) {
      throw new Error("User is not associated with any company");
    }
    const companyId = companyUser.company_id;
    const isAdmin = companyUser.role === "admin" || companyUser.role === "manager";
    if (!isAdmin) throw new Error("Only admins and managers can invite employees");
    const { data: companyData } = await supabaseAdmin
      .from("companies").select("name").eq("id", companyId).maybeSingle();
    const companyName = companyData?.name || "tu empresa";
    const cfUrl = (Deno.env.get("FRONTEND_URL") || origin || "").trim().replace(/\/+$/, "");
    if (!cfUrl) throw new Error("FRONTEND_URL no esta configurado y no se recibio el header Origin");
    const frontendUrl = cfUrl.startsWith("http") ? cfUrl : "https://" + cfUrl;
    const redirectTo = new URL("/reset-password", frontendUrl).toString();
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const existingUser = users?.find((u: any) => u.email === email);
    if (existingUser) {
      const userId = existingUser.id;
      const emailConfirmed = !!(existingUser as any).email_confirmed_at;
      const { data: existingCompanyUser, error: existingCompanyUserError } =
        await supabaseAdmin.from("company_users").select("id")
          .eq("user_id", userId).eq("company_id", companyId).limit(1).maybeSingle();
      if (existingCompanyUserError) throw existingCompanyUserError;
      if (existingCompanyUser) {
        const { error: updateRoleError } = await supabaseAdmin
          .from("company_users").update({ role, active: true })
          .eq("id", (existingCompanyUser as any).id);
        if (updateRoleError) throw updateRoleError;
        const { data: linkData1, error: linkError1 } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery", email, options: { redirectTo },
          });
        if (linkError1) throw linkError1;
        const inviteLink1 = (linkData1 as any)?.properties?.action_link || redirectTo;
        await sendInviteEmail(resendApiKey, email, inviteLink1, full_name || "", companyName, role);
        return new Response(JSON.stringify({
          success: true, already_member: true, user_id: userId, email_sent: true,
          message: "El usuario ya pertenece a la empresa. Se reenvio la invitacion por email.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
      const { error: companyUserError } = await supabaseAdmin
        .from("company_users")
        .insert({ user_id: userId, company_id: companyId, role, active: true });
      if (companyUserError) throw companyUserError;
      const { data: linkData2, error: linkError2 } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery", email, options: { redirectTo },
        });
      if (linkError2) throw linkError2;
      const inviteLink2 = (linkData2 as any)?.properties?.action_link || redirectTo;
      await sendInviteEmail(resendApiKey, email, inviteLink2, full_name || "", companyName, role);
      return new Response(JSON.stringify({
        success: true, user_id: userId, email_sent: true,
        message: "Usuario agregado a la empresa. Se envio la invitacion por email.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "invite", email,
        options: {
          redirectTo,
          data: { full_name: full_name || "", invited_to_company: companyId, assigned_role: role },
        },
      });
    if (linkError) { console.error("Error generating invite link:", linkError); throw linkError; }
    const inviteLink = (linkData as any)?.properties?.action_link;
    if (!inviteLink) throw new Error("No se pudo generar el link de invitacion");
    const newUserId = (linkData as any)?.user?.id;
    if (!newUserId) throw new Error("No se pudo crear el usuario");
    console.log("Invite link generated", { newUserId, email });
    const { error: insertError } = await supabaseAdmin
      .from("company_users")
      .insert({ user_id: newUserId, company_id: companyId, role, active: true });
    if (insertError) { console.error("Error creating company_users entry:", insertError); throw insertError; }
    await sendInviteEmail(resendApiKey, email, inviteLink, full_name || "", companyName, role);
    return new Response(JSON.stringify({
      success: true, user_id: newUserId, email_sent: true,
      message: "Invitacion enviada. El usuario recibira un email para configurar su contrasena.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("invite-employee error", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
