import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS Headers - Allow all headers needed by Supabase client
const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, user-agent, accept, accept-language, accept-encoding",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

// Types
interface GenerateProfilesRequest {
  companyDescription: string;
  productsSummary?: string;
  targetIndustries?: string[];
  targetRelationTypes?: string[];
  searchKeywords?: string[];
  companyId?: string;
}

interface AllianceProfile {
  business_name: string;
  industry: string;
  city: string;
  province: string;
  country: string;
  website?: string;
  description: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  profile_type: "alliance" | "client";
  relation_type: string;
  compatibility_score: number;
  estimated_value: number;
  synergy_tags: string[];
  compatibility_breakdown: Record<string, number>;
  badge?: "hot" | "new" | "verified";
  ai_comment?: string;
}

interface SuccessResponse {
  success: true;
  profiles_generated: number;
  profiles: AllianceProfile[];
  execution_time_ms: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// Validation
function validateRequest(data: unknown): data is GenerateProfilesRequest {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.companyDescription !== "string" || obj.companyDescription.trim().length === 0) {
    return false;
  }
  
  if (obj.productsSummary && typeof obj.productsSummary !== "string") return false;
  if (obj.targetIndustries && !Array.isArray(obj.targetIndustries)) return false;
  if (obj.targetRelationTypes && !Array.isArray(obj.targetRelationTypes)) return false;
  if (obj.searchKeywords && !Array.isArray(obj.searchKeywords)) return false;
  
  return true;
}

// Prompt Builder
function buildPrompt(req: GenerateProfilesRequest): string {
  return `You are an expert business strategist specializing in B2B partnerships and market analysis.

Based on the following company information, generate 5-7 detailed and realistic profiles of potential business partners or clients.

COMPANY PROFILE:
Description: ${req.companyDescription}
Products/Services: ${req.productsSummary || "Not specified"}
Target Industries: ${req.targetIndustries?.join(", ") || "Any"}
Seeking Relationships: ${req.targetRelationTypes?.join(", ") || "Partnerships"}
Search Keywords: ${req.searchKeywords?.join(", ") || "General"}

EXPECTATIONS:
- Generate realistic, diverse, and actionable business profiles
- Each company should have genuine partnership/client potential
- Include specific location (city, province, country)
- Provide realistic contact information or indicate N/A
- Estimate business value based on industry and size
- Rate compatibility 0-100 based on alignment with requesting company
- Use industry knowledge to suggest relationship types

RETURN ONLY A VALID JSON ARRAY:
[
  {
    "business_name": "Company Name",
    "industry": "Primary Industry",
    "city": "City",
    "province": "Province/State",
    "country": "Country",
    "website": "domain.com or null",
    "description": "Brief description and fit rationale",
    "contact_name": "Contact or null",
    "contact_email": "email@domain.com or null",
    "contact_phone": "+1234567890 or null",
    "profile_type": "alliance" or "client",
    "relation_type": "Specific relationship type",
    "compatibility_score": 85,
    "estimated_value": 150000,
    "synergy_tags": ["tag1", "tag2", "tag3"],
    "compatibility_breakdown": {
      "market_fit": 90,
      "geographic_proximity": 70,
      "technology_alignment": 85,
      "size_fit": 80,
      "growth_potential": 75
    },
    "badge": "hot" or "new" or "verified" or null,
    "ai_comment": "Personal comment as a friend would give. E.g., 'This could be a great fit - they have strong market presence in your region and complementary products!'"
  }
]

Focus on QUALITY over quantity. Generate diverse and realistic profiles.`;
}

// JSON Parser
function parseJsonResponse(text: string): AllianceProfile[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON array from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  if (!Array.isArray(parsed)) {
    throw new Error("Claude response is not an array");
  }

  return parsed.map((profile: unknown) => {
    const p = profile as Record<string, unknown>;
    
    if (!p.business_name || typeof p.business_name !== "string") {
      throw new Error("Profile missing business_name");
    }
    
    return {
      business_name: p.business_name as string,
      industry: (p.industry as string) || "Unknown",
      city: (p.city as string) || "Unknown",
      province: (p.province as string) || "Unknown",
      country: (p.country as string) || "Unknown",
      website: (p.website as string) || undefined,
      description: (p.description as string) || "No description",
      contact_name: (p.contact_name as string) || undefined,
      contact_email: (p.contact_email as string) || undefined,
      contact_phone: (p.contact_phone as string) || undefined,
      profile_type: (p.profile_type as "alliance" | "client") || "alliance",
      relation_type: (p.relation_type as string) || "Partnership",
      compatibility_score: Number(p.compatibility_score) || 0,
      estimated_value: Number(p.estimated_value) || 0,
      synergy_tags: Array.isArray(p.synergy_tags) ? p.synergy_tags : [],
      compatibility_breakdown: (p.compatibility_breakdown as Record<string, number>) || {},
      badge: (p.badge as "hot" | "new" | "verified") || undefined,
      ai_comment: (p.ai_comment as string) || "Great opportunity to explore!",
    } as AllianceProfile;
  });
}

// Claude API Call
async function generateProfilesWithClaude(
  req: GenerateProfilesRequest,
  apiKey: string
): Promise<AllianceProfile[]> {
  const prompt = buildPrompt(req);

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!claudeResponse.ok) {
    const errorData = await claudeResponse.json();
    console.error("[CLAUDE_ERROR] Status:", claudeResponse.status);
    console.error("[CLAUDE_ERROR] Response:", JSON.stringify(errorData, null, 2));
    throw new Error(`Claude API error (${claudeResponse.status}): ${errorData.error?.message || "Unknown error"}`);
  }

  const claudeData = await claudeResponse.json();
  const responseText = claudeData.content[0]?.text;

  if (!responseText) {
    throw new Error("Empty response from Claude API");
  }

  return parseJsonResponse(responseText);
}

async function insertProfiles(
  supabase: any,
  companyId: string,
  profiles: AllianceProfile[]
) {
  const now = new Date();

  const { data, error } = await supabase
    .from("alliance_market_profiles")
    .insert(
      profiles.map((profile) => ({
        ...profile,
        company_id: companyId,
        is_ai_generated: true,
        status: "suggested",
        created_at: now,
        updated_at: now,
        last_ai_refresh_at: now,
      }))
    );

  if (error) {
    console.error("Error inserting profiles:", error);
    throw error;
  }

  return data;
}

async function updateGenerationStatus(
  supabase: any,
  companyId: string,
  status: "generating" | "completed" | "failed"
) {
  const update: any = {
    ai_generation_status: status,
  };

  if (status === "completed") {
    update.last_ai_generation_at = new Date();
  }

  const { error } = await supabase
    .from("alliance_market_scoring_config")
    .update(update)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error updating generation status:", error);
  }
}

// Check daily limit (5 per day per user)
async function checkDailyLimit(
  supabase: any,
  companyId: string
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from("alliance_market_generation_log")
    .select("count")
    .eq("company_id", companyId)
    .gte("created_at", today.toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[LIMIT_CHECK] Error checking limit:", error);
    // If table doesn't exist, allow (first time)
    return { allowed: true, remaining: 5, message: "No limit data found" };
  }

  const count = data?.count || 0;
  const remaining = Math.max(0, 5 - count);
  const allowed = remaining > 0;

  return {
    allowed,
    remaining,
    message: allowed ? `${remaining} búsquedas restantes hoy` : "Has alcanzado el límite de 5 búsquedas por día",
  };
}

// Log generation attempt
async function logGenerationAttempt(
  supabase: any,
  companyId: string
) {
  const { error } = await supabase
    .from("alliance_market_generation_log")
    .insert({
      company_id: companyId,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[LOG_GENERATION] Error logging attempt:", error);
  }
}

// Get existing profiles to avoid repetition
async function getExistingProfileNames(
  supabase: any,
  companyId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("alliance_market_profiles")
    .select("business_name")
    .eq("company_id", companyId);

  if (error) {
    console.error("[EXISTING_PROFILES] Error fetching:", error);
    return new Set();
  }

  return new Set(data?.map((p: any) => p.business_name) || []);
}

serve(async (req: Request) => {
  const startTime = Date.now();

  // Use the base CORS headers that allow Supabase client headers
  const corsHeaders = baseCorsHeaders;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[GENERATE_PROFILES] CORS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    console.log(`[GENERATE_PROFILES] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Only POST method is allowed",
        code: "METHOD_NOT_ALLOWED",
      } as ErrorResponse),
      {
        status: 405,
        headers: corsHeaders,
      }
    );
  }

  try {
    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch (_e) {
      console.error("[GENERATE_PROFILES] Invalid JSON in request body");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        } as ErrorResponse),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Validate request schema
    if (!validateRequest(requestBody)) {
      console.error("[GENERATE_PROFILES] Request validation failed", requestBody);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request. Required: companyDescription (string). Optional: productsSummary, targetIndustries, targetRelationTypes, searchKeywords",
          code: "VALIDATION_ERROR",
        } as ErrorResponse),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const request = requestBody as GenerateProfilesRequest;
    console.log("[GENERATE_PROFILES] Request validated", {
      companyDescription: request.companyDescription.substring(0, 50) + "...",
      hasProducts: !!request.productsSummary,
    });

    // Get API key from environment
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("[GENERATE_PROFILES] ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error: ANTHROPIC_API_KEY not set",
          code: "INTERNAL_ERROR",
        } as ErrorResponse),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
    console.log("[GENERATE_PROFILES] API Key length: " + apiKey.length);

    if (apiKey.length < 10) {
      console.error(
        "[GENERATE_PROFILES] ANTHROPIC_API_KEY appears to be invalid (too short)"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error: ANTHROPIC_API_KEY is invalid",
          code: "INTERNAL_ERROR",
        } as ErrorResponse),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    console.log("[GENERATE_PROFILES] API Key configured, length:", apiKey.length);

    // Create Supabase client for limit checking
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Check daily limit if companyId is provided
    if (request.companyId) {
      const limitCheck = await checkDailyLimit(supabase, request.companyId);
      if (!limitCheck.allowed) {
        console.warn("[GENERATE_PROFILES] Daily limit exceeded for company:", request.companyId);
        return new Response(
          JSON.stringify({
            success: false,
            error: limitCheck.message,
            code: "DAILY_LIMIT_EXCEEDED",
          } as ErrorResponse),
          {
            status: 429,
            headers: corsHeaders,
          }
        );
      }
      console.log(`[GENERATE_PROFILES] Limit check passed: ${limitCheck.remaining} remaining`);
    }
    
    try {
      const profiles = await generateProfilesWithClaude(request, apiKey);
      
      const executionTime = Date.now() - startTime;
      console.log(
        `[GENERATE_PROFILES] Success: ${profiles.length} profiles generated in ${executionTime}ms`
      );

      // Log the successful generation attempt
      if (request.companyId) {
        await logGenerationAttempt(supabase, request.companyId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          profiles_generated: profiles.length,
          profiles,
          execution_time_ms: executionTime,
        } as SuccessResponse),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    } catch (callError) {
      const callErrorMsg = callError instanceof Error ? callError.message : String(callError);
      console.error("[GENERATE_PROFILES] Claude call error:", callErrorMsg);
      throw callError;
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(
      `[GENERATE_PROFILES] Error after ${executionTime}ms: ${errorMsg}`
    );
    if (error instanceof Error) {
      console.error("[GENERATE_PROFILES] Stack:", error.stack);
    }

    // Determine error code and status
    let httpStatus = 500;
    let errorCode = "INTERNAL_ERROR";

    if (errorMsg.includes("Claude API error")) {
      errorCode = "CLAUDE_API_ERROR";
      httpStatus = 502;
      console.error("[GENERATE_PROFILES] Claude API failed - check API key and quotas");
    } else if (errorMsg.includes("Could not extract JSON")) {
      errorCode = "PARSE_ERROR";
      httpStatus = 502;
    } else if (errorMsg.includes("Profile missing")) {
      errorCode = "VALIDATION_ERROR";
      httpStatus = 502;
    } else if (errorMsg.includes("not configured")) {
      errorCode = "CONFIG_ERROR";
      httpStatus = 500;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        code: errorCode,
        execution_time_ms: executionTime,
      } as ErrorResponse),
      {
        status: httpStatus,
        headers: corsHeaders,
      }
    );
  }
});
