// @ts-nocheck - Deno Edge Function (TypeScript errors are expected)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import DOMPurify from "https://esm.sh/dompurify@3.0.6";
import { z } from "https://esm.sh/zod@3.22.4";
import { Ratelimit } from "https://deno.land/x/upstash_ratelimit@1.0.0/mod.ts";

// 9.1 - CORS Restrictive Policy: Allowed origins from environment
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

// Fallback to localhost for development if no origins configured
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

// 9.2 - Get CORS headers based on request origin
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = ALLOWED_ORIGINS.length > 0 
    ? ALLOWED_ORIGINS 
    : DEFAULT_DEV_ORIGINS;

  // Check if request origin is in allowed list
  const isAllowed = requestOrigin && allowedOrigins.some(
    allowed => allowed === requestOrigin || allowed === "*"
  );

  // If origin is allowed, return specific origin; otherwise, reject
  const origin = isAllowed ? requestOrigin : allowedOrigins[0] || "null";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

// Email validation regex (RFC 5322 simplified)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// UUID validation regex
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 5.1 - Extract user ID from JWT token
function extractUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// 5.1 - Initialize Upstash rate limiter (10 requests per minute per user)
const ratelimit = new Ratelimit({
  redis: {
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "",
    url: Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "",
  },
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per minute
  prefix: "crm_message", // Namespace for rate limit keys
});

// 4.1 - Zod Validation Schema
const messageRequestSchema = z.object({
  log_id: z.string()
    .uuid("log_id debe ser un UUID válido"),
  channel: z.enum(["email", "whatsapp"])
    .refine((v) => v !== undefined, "channel debe ser 'email' o 'whatsapp'"),
  recipient: z.string()
    .email("recipient debe ser un email válido"),
  subject: z.string().optional().nullable(),
  body: z.string()
    .min(1, "body no puede estar vacío")
    .max(5000, "body no puede exceder 5000 caracteres"),
});

type MessageRequest = z.infer<typeof messageRequestSchema>;

interface CRMMessageRequest {
  log_id: string;
  channel: "email" | "whatsapp";
  recipient: string;
  subject?: string | null;
  body: string;
}

serve(async (req: Request) => {
  // 9.2 - Get request origin and validate against allowlist
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 5.2 - Extract user ID from JWT and check rate limit
    const authHeader = req.headers.get("Authorization") ?? "";
    const userId = extractUserIdFromJWT(authHeader);
    
    if (userId) {
      try {
        const rateLimitResult = await ratelimit.limit(userId);
        
        if (!rateLimitResult.success) {
          // Rate limited: return 429 with Retry-After header
          const retryAfter = Math.ceil((rateLimitResult.resetMs - Date.now()) / 1000);
          return new Response(
            JSON.stringify({
              error: "Límite de tasa excedido",
              message: "Has excedido el límite de 10 solicitudes por minuto",
              retryAfter,
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "Retry-After": Math.max(1, retryAfter).toString(),
              },
            }
          );
        }
      } catch (rateLimitError) {
        // If rate limiting fails, log but don't block (fail open)
        console.error("Rate limit check failed:", rateLimitError);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // 4.2 - Parse and validate request body with Zod schema
    let payload: MessageRequest;
    try {
      const rawPayload = await req.json();
      payload = messageRequestSchema.parse(rawPayload);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
        return new Response(JSON.stringify({ 
          error: "Validación fallida",
          details: errorMessages 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Handle JSON parse errors
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { log_id, channel, recipient, subject, body } = payload;

    // 7.1 - Validate email format
    if (!isValidEmail(recipient)) {
      await supabase.from("crm_message_logs").update({ 
        status: "failed", 
        error: "Email inválido" 
      }).eq("id", log_id);
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7.2 - Get message log to verify company and opportunity
    const { data: messageLog, error: getLogError } = await supabase
      .from("crm_message_logs")
      .select("company_id, opportunity_id")
      .eq("id", log_id)
      .single();

    if (getLogError || !messageLog) {
      await supabase.from("crm_message_logs").update({ 
        status: "failed", 
        error: "Registro de mensaje no encontrado" 
      }).eq("id", log_id);
      return new Response(JSON.stringify({ error: "Registro no encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7.2 - Verify recipient belongs to company (check opportunity customer email)
    const { data: opportunity, error: oppError } = await supabase
      .from("crm_opportunities")
      .select("customer_email")
      .eq("id", messageLog.opportunity_id)
      .eq("company_id", messageLog.company_id)
      .single();

    if (oppError || !opportunity) {
      await supabase.from("crm_message_logs").update({ 
        status: "failed", 
        error: "Oportunidad no encontrada o no autorizada" 
      }).eq("id", log_id);
      return new Response(JSON.stringify({ error: "Oportunidad no encontrada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7.2 - Verify recipient email matches customer email
    if (recipient.toLowerCase() !== opportunity.customer_email?.toLowerCase()) {
      await supabase.from("crm_message_logs").update({ 
        status: "failed", 
        error: "Destinatario no autorizado para esta oportunidad" 
      }).eq("id", log_id);
      return new Response(JSON.stringify({ error: "Email não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (channel === "email") {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        await supabase.from("crm_message_logs").update({ status: "failed", error: "RESEND_API_KEY no configurado" }).eq("id", log_id);
        return new Response(JSON.stringify({ error: "RESEND_API_KEY no configurado" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resend = new Resend(RESEND_API_KEY);
      const sanitizedBody = DOMPurify.sanitize(body);
      const html = `<p>${sanitizedBody}</p>`;
      const response = await resend.emails.send({
        from: "Sistema Contable <onboarding@resend.dev>",
        to: [recipient],
        subject: subject ?? "Notificación CRM",
        html,
      });

      await supabase
        .from("crm_message_logs")
        .update({
          status: "sent",
          provider_message_id: response.data?.id ?? null,
          error: null,
        })
        .eq("id", log_id);

      return new Response(JSON.stringify({ success: true, provider_id: response.data?.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (channel === "whatsapp") {
      // Use company_id from message log (already validated above)
      const companyId = messageLog.company_id as string;

      // Get company's Twilio credentials (encrypted from database)
      const { data: credsEncrypted } = await supabase
        .from("crm_whatsapp_credentials")
        .select("id")
        .eq("company_id", companyId)
        .single();

      if (!credsEncrypted?.id) {
        await supabase.from("crm_message_logs").update({ 
          status: "failed", 
          error: "Credenciales Twilio no configuradas para esta empresa" 
        }).eq("id", log_id);
        return new Response(JSON.stringify({ error: "Credenciales Twilio no configuradas" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decrypt credentials using database function
      // Encryption key comes from Supabase Secrets
      const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
      if (!ENCRYPTION_KEY) {
        await supabase.from("crm_message_logs").update({ 
          status: "failed", 
          error: "Encryption key not configured (contact admin)" 
        }).eq("id", log_id);
        return new Response(JSON.stringify({ error: "Configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: decryptedCreds, error: decryptError } = await supabase.rpc(
        "decrypt_whatsapp_credentials",
        { 
          row_id: credsEncrypted.id,
          encryption_key: ENCRYPTION_KEY
        }
      );

      if (decryptError || !decryptedCreds || decryptedCreds.length === 0) {
        await supabase.from("crm_message_logs").update({ 
          status: "failed", 
          error: "Error al desencriptar credenciales" 
        }).eq("id", log_id);
        return new Response(JSON.stringify({ error: "Error al desencriptar credenciales" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const TWILIO_ACCOUNT_SID = decryptedCreds[0].account_sid;
      const TWILIO_AUTH_TOKEN = decryptedCreds[0].auth_token;
      const TWILIO_PHONE_NUMBER = decryptedCreds[0].phone_number;

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        await supabase
          .from("crm_message_logs")
          .update({ status: "failed", error: "Credenciales Twilio incompletas" })
          .eq("id", log_id);
        return new Response(JSON.stringify({ error: "Credenciales Twilio incompletas" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      const bodyParams = new URLSearchParams();
      bodyParams.set("From", `whatsapp:${TWILIO_PHONE_NUMBER}`);
      bodyParams.set("To", recipient.startsWith("whatsapp:") ? recipient : `whatsapp:${recipient}`);
      const sanitizedWhatsappBody = DOMPurify.sanitize(body, { ALLOWED_TAGS: [] });
      bodyParams.set("Body", sanitizedWhatsappBody);

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
        }
      );

      const twilioData = await twilioResponse.json();
      if (!twilioResponse.ok) {
        await supabase.from("crm_message_logs").update({
          status: "failed",
          error: twilioData?.message ?? "Error al enviar WhatsApp",
        }).eq("id", log_id);
        return new Response(JSON.stringify({ error: twilioData?.message ?? "Error al enviar WhatsApp" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("crm_message_logs")
        .update({
          status: "sent",
          provider_message_id: twilioData?.sid ?? null,
          error: null,
        })
        .eq("id", log_id);

      return new Response(JSON.stringify({ success: true, provider_id: twilioData?.sid }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Canal inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Error inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
