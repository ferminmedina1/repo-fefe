// src/lib/allianceMarketAI.ts

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
  companyDescription: string,
  productsSummary: string,
  targetIndustries: string[],
  targetRelationTypes: string[],
  searchKeywords: string[]
): Promise<AllianceProfile[]> {
  const prompt = `You are an expert business strategist specializing in identifying strategic alliances and potential clients.

COMPANY PROFILE:
Description: ${companyDescription}
Products/Services: ${productsSummary}
Target Industries: ${targetIndustries.join(", ") || "Any"}
Seeking Partnerships: ${targetRelationTypes.join(", ") || "Co-distribution, technology integration, referrals"}
Search Keywords: ${searchKeywords.join(", ") || "distributors, retailers, integrators"}

TASK:
Generate 5-8 potential alliance or client profiles based on the company profile above. Use your knowledge of real companies and industries to create realistic profiles.

For each profile, provide:
1. Real company information (name, industry, location, description)
2. A compatibility_score (0-100) based on:
   - Market overlap potential (0-100)
   - Product/service compatibility (0-100)
   - Geographic alignment (0-100)
   - Business model synergy (0-100)
3. Estimated annual value opportunity (in USD)
4. 2-4 synergy tags (skills/characteristics)
5. Breakdown metrics for compatibility analysis

IMPORTANT REQUIREMENTS:
- Return ONLY a valid JSON array
- Do NOT include markdown formatting or code blocks
- Each profile must match this EXACT structure:
{
  "business_name": "Company name",
  "industry": "Industry",
  "city": "City",
  "province": "State/Province",
  "country": "Argentina",
  "website": "https://example.com",
  "description": "Brief description why good fit",
  "contact_name": "Name",
  "contact_email": "email@example.com",
  "contact_phone": "+54...",
  "profile_type": "alliance" or "client",
  "relation_type": "co-distribucion",
  "compatibility_score": 82,
  "estimated_value": 150000,
  "synergy_tags": ["tag1", "tag2", "tag3"],
  "compatibility_breakdown": {
    "market_overlap": 88,
    "product_compatibility": 82,
    "geographic_fit": 90,
    "synergy_potential": 80
  },
  "badge": "hot" or "new" or null
}

Generate diverse and realistic profiles focused on ACTION - real businesses that would benefit from partnership.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "",
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

  if (!response.ok) {
    const error = await response.json();
    console.error("Claude API error:", error);
    throw new Error(
      `Claude API error: ${error.error?.message || "Unknown error"}`
    );
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Extract JSON from Claude's response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Could not extract JSON from Claude response:", content);
    throw new Error("Invalid JSON response from Claude");
  }

  const profiles: AllianceProfile[] = JSON.parse(jsonMatch[0]);
  return profiles;
}
