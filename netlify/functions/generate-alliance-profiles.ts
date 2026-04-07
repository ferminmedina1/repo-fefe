import { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const {
      companyDescription,
      productsSummary,
      targetIndustries,
      targetRelationTypes,
      searchKeywords,
    } = JSON.parse(event.body || '{}');

    if (!companyDescription) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Company description is required' }),
      };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      };
    }

    const prompt = `You are an expert business strategist. Based on the following company information and search criteria, generate 5-7 potential alliance or client profiles.

COMPANY PROFILE:
Description: ${companyDescription}
Products/Services: ${productsSummary || 'Not specified'}
Target Industries: ${(targetIndustries || []).join(', ') || 'Any'}
Seeking: ${(targetRelationTypes || []).join(', ') || 'Partnerships'}

SEARCH KEYWORDS: ${(searchKeywords || []).join(', ') || 'General'}

Generate realistic, diverse profiles that could be good business partners or clients. For each profile, provide:
- Business name
- Industry
- Location (city, province, country)
- Website (if applicable)
- Brief description
- Contact information (if applicable)
- Suggested relation type
- Compatibility score (0-100)
- Estimated business value (rough estimate)
- Synergy tags (3-5 relevant tags)

Return ONLY a valid JSON array with this structure:
[
  {
    "business_name": "...",
    "industry": "...",
    "city": "...",
    "province": "...",
    "country": "...",
    "website": "...",
    "description": "...",
    "contact_name": "...",
    "contact_email": "...",
    "contact_phone": "...",
    "profile_type": "alliance",
    "relation_type": "...",
    "compatibility_score": 85,
    "estimated_value": 50000,
    "synergy_tags": ["tag1", "tag2"],
    "compatibility_breakdown": {"criteria1": 80, "criteria2": 90}
  }
]

Only return the JSON array, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    const profiles = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        profiles_generated: profiles.length,
        profiles,
      }),
    };
  } catch (error) {
    console.error('Error generating profiles:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};
