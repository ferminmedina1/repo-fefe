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
    // Determine which endpoint to use based on environment
    let profilesUrl: string;
    
    if (import.meta.env.DEV) {
      // Development: Use local proxy server
      profilesUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/api/generate-alliance-profiles';
      console.log('Development mode - calling local proxy:', profilesUrl);
    } else {
      // Production: Use Netlify Function
      profilesUrl = '/.netlify/functions/generate-alliance-profiles';
      console.log('Production mode - calling Netlify Function:', profilesUrl);
    }
    
    const response = await fetch(profilesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyDescription: config.company_description,
        productsSummary: config.products_summary || 'Not specified',
        targetIndustries: config.target_industries || [],
        targetRelationTypes: config.target_relation_types || [],
        searchKeywords: config.ai_search_keywords || [],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Server error');
    }

    const data = await response.json();
    if (!data.profiles) {
      throw new Error('No profiles returned');
    }

    return data.profiles;
  } catch (err) {
    console.error('Profile generation error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    
    if (import.meta.env.DEV) {
      throw new Error(`Error generating profiles: ${errorMsg}\n\nDevelopment: Make sure proxy server is running: npm run proxy`);
    } else {
      throw new Error(`Error generating profiles: ${errorMsg}`);
    }
  }
}
