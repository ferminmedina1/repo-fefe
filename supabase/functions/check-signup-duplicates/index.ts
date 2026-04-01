import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckDuplicatesRequest {
  email?: string;
  company_name?: string;
}

interface CheckDuplicatesResponse {
  email_exists: boolean;
  company_name_exists: boolean;
  email_error?: string;
  company_name_error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role (ignores RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: CheckDuplicatesRequest = await req.json();
    const { email, company_name } = body;

    const response: CheckDuplicatesResponse = {
      email_exists: false,
      company_name_exists: false,
    };

    // Check if email exists in companies table
    if (email) {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("id")
          .eq("email", email.toLowerCase())
          .limit(1);

        if (error) {
          console.error("Error checking email:", error);
          response.email_error = error.message;
        } else {
          response.email_exists = Array.isArray(data) && data.length > 0;
        }
      } catch (error) {
        console.error("Error checking email:", error);
        response.email_error = error instanceof Error ? error.message : "Unknown error";
      }
    }

    // Check if company name exists in companies table
    if (company_name) {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", company_name.trim())
          .limit(1);

        if (error) {
          console.error("Error checking company name:", error);
          response.company_name_error = error.message;
        } else {
          response.company_name_exists = Array.isArray(data) && data.length > 0;
        }
      } catch (error) {
        console.error("Error checking company name:", error);
        response.company_name_error = error instanceof Error ? error.message : "Unknown error";
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
