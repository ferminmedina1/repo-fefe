-- Create a simple RPC function to generate alliance profiles via Claude
-- This avoids CORS issues completely by calling from the database

create or replace function generate_alliance_profiles_with_claude(
  p_company_id uuid,
  p_api_key text
)
returns json
language plpgsql
as $$
declare
  v_config record;
  v_prompt text;
  v_response json;
begin
  -- Get company configuration
  select 
    company_description,
    products_summary,
    target_industries,
    target_relation_types,
    ai_search_keywords
  into v_config
  from alliance_market_scoring_config
  where company_id = p_company_id;

  if v_config is null then
    return json_build_object('error', 'Company configuration not found');
  end if;

  if v_config.company_description is null or v_config.company_description = '' then
    return json_build_object('error', 'Company description is required');
  end if;

  -- Build the prompt
  v_prompt := 'You are an expert business strategist. Based on the following company information and search criteria, generate 5-7 potential alliance or client profiles.

COMPANY PROFILE:
Description: ' || v_config.company_description || '
Products/Services: ' || coalesce(v_config.products_summary, 'Not specified') || '
Target Industries: ' || coalesce(array_to_string(v_config.target_industries, ', '), 'Any') || '
Seeking: ' || coalesce(array_to_string(v_config.target_relation_types, ', '), 'Partnerships') || '
Search Keywords: ' || coalesce(array_to_string(v_config.ai_search_keywords, ', '), 'General') || '

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
}';

  -- Call Claude API using http extension
  -- Note: This requires pgsql_http extension to be installed
  -- For now, we''ll return a placeholder that the client will use
  
  return json_build_object(
    'success', false,
    'error', 'RPC method not fully implemented. Use Edge Function or direct API call.'
  );

end;
$$;

-- Grant execute permission to authenticated users
grant execute on function generate_alliance_profiles_with_claude(uuid, text) to authenticated;
