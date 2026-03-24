import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";

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
}

async function generateProfilesWithClaude(
  companyDescription: string,
  productsSummary: string,
  targetIndustries: string[],
  targetRelationTypes: string[],
  searchKeywords: string[],
  apiKey: string  // Accept API key as parameter
): Promise<AllianceProfile[]> {
  const prompt = `You are an expert business strategist. Based on the following company information and search criteria, generate 5-7 potential alliance or client profiles.

COMPANY PROFILE:
Description: ${companyDescription}
Products/Services: ${productsSummary}
Target Industries: ${targetIndustries.join(", ") || "Any"}
Seeking: ${targetRelationTypes.join(", ") || "Co-distribution, technology integration, referrals"}
Search Keywords: ${searchKeywords.join(", ") || "distributors, retailers, integrators"}

Instructions:
1. Search for real companies and professionals (use web search tools if available)
2. For each profile, provide realistic information (name, industry, location, description)
3. Calculate a compatibility_score (0-100) based on:
   - Market overlap potential
   - Synergies with products/services
   - Geographic alignment
   - Business model compatibility
4. Generate "synergy_tags" with 2-4 relevant skill/characteristic keywords
5. Provide "compatibility_breakdown" with metrics like:
   - market_overlap (0-100)
   - product_compatibility (0-100)
   - geographic_fit (0-100)
   - potential_revenue (0-100)

Return ONLY a valid JSON array with this exact structure for each profile:
{
  "business_name": "Company Name",
  "industry": "Industry Category",
  "city": "City Name",
  "province": "Province/State",
  "country": "Country",
  "website": "https://example.com",
  "description": "Brief description of the company and why it's a good fit",
  "contact_name": "John Doe",
  "contact_email": "john@example.com",
  "contact_phone": "+1234567890",
  "profile_type": "alliance",
  "relation_type": "co-distribucion",
  "compatibility_score": 82,
  "estimated_value": 50000,
  "synergy_tags": ["retail", "distribution", "tech-savvy"],
  "compatibility_breakdown": {
    "market_overlap": 85,
    "product_compatibility": 78,
    "geographic_fit": 90,
    "potential_revenue": 75
  },
  "badge": "hot"
}

Generate diverse profiles with real companies. Focus on ACTION - find actual businesses that match the criteria.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,  // Use the passed API key
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Claude API error:", data);
    throw new Error(`Claude API error: ${data.error?.message}`);
  }

  // Extract JSON from Claude's response
  const content = data.content[0].text;
  const jsonMatch = content.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    console.error("Could not extract JSON from Claude response:", content);
    throw new Error("Invalid JSON response from Claude");
  }

  const profiles: AllianceProfile[] = JSON.parse(jsonMatch[0]);
  return profiles;
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

serve(async (req) => {
  // CORS headers - IMPORTANTE: deben estar en TODAS las respuestas
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
  };

  // Responder a preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Solo aceptar POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { company_id, anthropic_api_key } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Usar la API key pasada desde el client o la del environment
    const apiKey = anthropic_api_key || claudeApiKey;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get company config
    const { data: config, error: configError } = await supabase
      .from("alliance_market_scoring_config")
      .select(
        "company_description, products_summary, market_positioning, target_industries, target_relation_types, ai_search_keywords"
      )
      .eq("company_id", company_id)
      .single();

    if (configError) {
      console.error("Config error:", configError);
      return new Response(
        JSON.stringify({
          error: "Could not fetch company config: " + (configError.message || "Unknown error"),
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!config) {
      return new Response(
        JSON.stringify({
          error: "Company configuration not found. Please set up Alliance Market config first.",
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate required fields
    if (!config.company_description) {
      return new Response(
        JSON.stringify({
          error: "Company description is required. Please fill it in the Alliance Market configuration.",
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Update status to generating
    await updateGenerationStatus(supabase, company_id, "generating");

    // Generate profiles with Claude - USE THE PROVIDED API KEY
    const profiles = await generateProfilesWithClaude(
      config.company_description,
      config.products_summary || "Not specified",
      config.target_industries || [],
      config.target_relation_types || [],
      config.ai_search_keywords || [],
      apiKey  // Pass the API key explicitly
    );

    // Insert profiles
    const inserted = await insertProfiles(supabase, company_id, profiles);

    // Update status to completed
    await updateGenerationStatus(supabase, company_id, "completed");

    return new Response(
      JSON.stringify({
        success: true,
        profiles_generated: profiles.length,
        profiles: inserted,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
