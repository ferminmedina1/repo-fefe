import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/generate-alliance-profiles', async (req, res) => {
  try {
    const {
      companyDescription,
      productsSummary,
      targetIndustries,
      targetRelationTypes,
      searchKeywords,
    } = req.body;

    if (!companyDescription) {
      return res.status(400).json({ error: 'Company description is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const prompt = `You are an expert business strategist. Based on the following company information and search criteria, generate 5-7 potential alliance or client profiles.

COMPANY PROFILE:
Description: ${companyDescription}
Products/Services: ${productsSummary || 'Not specified'}
Target Industries: ${(targetIndustries || []).join(', ') || 'Any'}
Seeking: ${(targetRelationTypes || []).join(', ') || 'Partnerships'}
Search Keywords: ${(searchKeywords || []).join(', ') || 'General'}

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

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from Claude' });
    }

    // Extract JSON from Claude's response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not extract JSON from Claude response:', content.text);
      return res.status(500).json({ error: 'Invalid JSON response from Claude' });
    }

    const profiles = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      profiles_generated: profiles.length,
      profiles: profiles,
    });
  } catch (error) {
    console.error('Error generating profiles:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/save-profiles', async (req, res) => {
  // This endpoint is optional - for saving profiles to DB from the proxy
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Alliance Market proxy server running on http://localhost:${PORT}`);
  console.log(`   POST /api/generate-alliance-profiles - Generate profiles with Claude`);
});
