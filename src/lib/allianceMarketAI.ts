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
  ai_comment?: string;
}

export async function generateAllianceProfilesWithClaude(
  companyId: string,
  _companyDescription?: string,
  _productsSummary?: string,
  _targetIndustries?: string[],
  _targetRelationTypes?: string[],
  _searchKeywords?: string[]
): Promise<AllianceProfile[]> {
  // Fetch company config from Supabase
  const { data: config, error: configError } = await supabase
    .from('alliance_market_scoring_config')
    .select('company_description, products_summary, target_industries, target_relation_types, ai_search_keywords')
    .eq('company_id', companyId)
    .single();

  if (configError || !config) {
    throw new Error('Company configuration not found');
  }

  if (!config.company_description) {
    throw new Error('Company description is required');
  }

  try {
    console.log('[ALLIANCE_AI] Invoking generate-alliance-profiles Edge Function');
    
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-alliance-profiles', {
      body: {
        companyId,
        companyDescription: config.company_description,
        productsSummary: config.products_summary || 'Not specified',
        targetIndustries: config.target_industries || [],
        targetRelationTypes: config.target_relation_types || [],
        searchKeywords: config.ai_search_keywords || [],
      },
    });

    if (error) {
      console.error('[ALLIANCE_AI] Edge Function error:', error);
      throw new Error(error.message || 'Edge Function error');
    }

    if (!data?.success) {
      console.error('[ALLIANCE_AI] Function returned unsuccessful response:', data);
      throw new Error(data?.error || 'Profile generation failed');
    }

    if (!Array.isArray(data.profiles) || data.profiles.length === 0) {
      console.warn('[ALLIANCE_AI] No profiles returned from Edge Function');
      throw new Error('No profiles were generated');
    }

    console.log(`[ALLIANCE_AI] Successfully generated ${data.profiles.length} profiles in ${data.execution_time_ms}ms`);
    return data.profiles;
  } catch (err) {
    console.error('[ALLIANCE_AI] Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Error generating alliance profiles: ${errorMsg}`);
  }
}
