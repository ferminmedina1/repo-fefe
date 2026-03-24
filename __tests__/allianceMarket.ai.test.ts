import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllianceProfilesWithClaude } from '@/lib/allianceMarketAI';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('Alliance Market AI - Claude Integration (via Supabase Edge Function)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe generar perfiles válidos desde Claude', async () => {
    const mockProfiles = [
      {
        business_name: 'TechDistrib Solutions',
        industry: 'Distribución',
        city: 'Buenos Aires',
        province: 'CABA',
        country: 'Argentina',
        website: 'https://techdistrib.com.ar',
        description: 'Distribuidor especializado',
        profile_type: 'alliance' as const,
        relation_type: 'co-distribucion',
        compatibility_score: 85,
        estimated_value: 150000,
        synergy_tags: ['tech', 'distribucion'],
        compatibility_breakdown: { market_overlap: 88, product_compatibility: 82, geographic_fit: 90, synergy_potential: 80 },
      },
    ];

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { profiles: mockProfiles },
      error: null,
    });

    const profiles = await generateAllianceProfilesWithClaude(
      'test-company-id',
      'Empresa de electrónica mayorista',
      'Vendemos electrodomésticos',
      ['Retail', 'Distribución'],
      ['co-distribucion'],
      ['distribuidores', 'mayoristas']
    );

    expect(profiles).toBeDefined();
    expect(profiles.length).toBe(1);
    expect(profiles[0].business_name).toBe('TechDistrib Solutions');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-alliance-profiles', {
      body: { company_id: 'test-company-id' },
    });
  });

  it('debe manejar errores de Supabase Function', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Function error' },
    });

    await expect(
      generateAllianceProfilesWithClaude('test-company-id')
    ).rejects.toThrow('Error generating profiles: Function error');
  });

  it('debe retornar múltiples perfiles', async () => {
    const mockProfiles = [
      {
        business_name: 'Company 1',
        industry: 'Tech',
        city: 'CABA',
        province: 'CABA',
        country: 'Argentina',
        description: 'Test 1',
        profile_type: 'alliance' as const,
        relation_type: 'co-distribucion',
        compatibility_score: 80,
        estimated_value: 100000,
        synergy_tags: ['tag1', 'tag2'],
        compatibility_breakdown: { test: 80 },
      },
      {
        business_name: 'Company 2',
        industry: 'Retail',
        city: 'Córdoba',
        province: 'Córdoba',
        country: 'Argentina',
        description: 'Test 2',
        profile_type: 'client' as const,
        relation_type: 'cliente-potencial',
        compatibility_score: 75,
        estimated_value: 50000,
        synergy_tags: ['tag3', 'tag4'],
        compatibility_breakdown: { test: 75 },
      },
    ];

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { profiles: mockProfiles },
      error: null,
    });

    const profiles = await generateAllianceProfilesWithClaude('test-company-id');

    expect(profiles.length).toBe(2);
    expect(profiles[0].business_name).toBe('Company 1');
    expect(profiles[1].business_name).toBe('Company 2');
  });
});
