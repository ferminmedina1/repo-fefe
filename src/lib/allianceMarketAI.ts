// src/lib/allianceMarketAI.ts
import { supabase } from '@/integrations/supabase/client';

export interface AllianceProfile {
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

export async function generateAllianceProfilesWithClaude(
  companyId: string,
  _companyDescription?: string,
  _productsSummary?: string,
  _targetIndustries?: string[],
  _targetRelationTypes?: string[],
  _searchKeywords?: string[]
): Promise<AllianceProfile[]> {
  // Get API key from environment
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not configured');
  }

  try {
    // Try Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('generate-alliance-profiles', {
      body: { 
        company_id: companyId,
        anthropic_api_key: apiKey
      },
    });

    if (!error && data?.profiles) {
      return data.profiles;
    }

    // If Edge Function fails, fall back to direct Claude API call
    console.warn('Edge Function failed, using direct Claude API call');
    return await callClaudeDirectly(companyId, apiKey);
  } catch (err) {
    console.warn('Edge Function error, falling back to direct API:', err);
    try {
      return await callClaudeDirectly(companyId, apiKey);
    } catch (fallbackErr) {
      throw new Error(`Error generating profiles: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'}`);
    }
  }
}

async function callClaudeDirectly(companyId: string, apiKey: string): Promise<AllianceProfile[]> {
  // Fetch company config
  const { data: config } = await supabase
    .from('alliance_market_scoring_config')
    .select('company_description, products_summary, target_industries, target_relation_types, ai_search_keywords')
    .eq('company_id', companyId)
    .single();

  if (!config?.company_description) {
    throw new Error('Company description is required');
  }

  const prompt = `You are an expert business strategist. Based on the following company information and search criteria, generate 5-7 potential alliance or client profiles.

COMPANY PROFILE:
Description: ${config.company_description}
Products/Services: ${config.products_summary || 'Not specified'}
Target Industries: ${(config.target_industries || []).join(", ") || "Any"}
Seeking: ${(config.target_relation_types || []).join(", ") || "Partnerships"}
Search Keywords: ${(config.ai_search_keywords || []).join(", ") || "General"}

Instructions:
1. Generate realistic company profiles based on the criteria
2. Provide names, industries, locations, descriptions
3. Calculate compatibility_score (0-100) for each
4. Generate synergy_tags (2-4 tags per profile)
5. Provide compatibility_breakdown with metrics

Return ONLY a valid JSON array with this exact structure for each profile:
{
  "business_name": "Company Name",
  "industry": "Industry Category",
  "city": "City Name",
  "province": "Province/State",
  "country": "Country",
  "website": "https://example.com",
  "description": "Brief description",
  "contact_name": "Name",
  "contact_email": "email@example.com",
  "contact_phone": "+1234567890",
  "profile_type": "alliance",
  "relation_type": "co-distribucion",
  "compatibility_score": 82,
  "estimated_value": 50000,
  "synergy_tags": ["tag1", "tag2"],
  "compatibility_breakdown": {
    "market_overlap": 85,
    "product_compatibility": 78,
    "geographic_fit": 90,
    "potential_revenue": 75
  },
  "badge": "hot"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Extract JSON
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from Claude');
  }

  return JSON.parse(jsonMatch[0]);
}
