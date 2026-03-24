import { describe, it, expect } from 'vitest';
import { generateAllianceProfilesWithClaude } from '@/lib/allianceMarketAI';

describe('Alliance Market AI - Claude Integration (Real API)', () => {
  it('debe generar perfiles válidos desde Claude', async () => {
    const profiles = await generateAllianceProfilesWithClaude(
      'Empresa de electrónica mayorista con 15 años en el mercado',
      'Vendemos electrodomésticos, componentes electrónicos y accesorios',
      ['Retail', 'Distribución', 'E-commerce'],
      ['co-distribucion', 'representante'],
      ['distribuidores', 'mayoristas', 'retailers']
    );

    expect(profiles).toBeDefined();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.length).toBeLessThanOrEqual(8);
    
    // Validar estructura del primer perfil
    const firstProfile = profiles[0];
    expect(firstProfile.business_name).toBeDefined();
    expect(firstProfile.business_name).not.toBe('');
    expect(firstProfile.industry).toBeDefined();
    expect(firstProfile.city).toBeDefined();
    expect(firstProfile.province).toBeDefined();
    expect(firstProfile.country).toBeDefined();
    expect(firstProfile.compatibility_score).toBeGreaterThanOrEqual(0);
    expect(firstProfile.compatibility_score).toBeLessThanOrEqual(100);
    expect(['alliance', 'client']).toContain(firstProfile.profile_type);
    expect(firstProfile.description).toBeDefined();
  });

  it('debe incluir información de contacto en algunos perfiles', async () => {
    const profiles = await generateAllianceProfilesWithClaude(
      'Distribuidor de bebidas y lácteos',
      'Distribuimos bebidas, lácteos y alimentos frescos',
      ['Alimentos', 'Distribución'],
      ['co-distribucion'],
      ['distribuidores', 'supermercados', 'farmacias']
    );

    expect(profiles.length).toBeGreaterThan(0);
    
    // Al menos uno debe tener contacto
    const withContact = profiles.some(p => p.contact_name || p.contact_email || p.contact_phone);
    expect(withContact).toBe(true);
  });

  it('debe calcular compatibility_breakdown correctamente', async () => {
    const profiles = await generateAllianceProfilesWithClaude(
      'Empresa de software B2B',
      'Soluções de software para empresas',
      ['Tecnología', 'SaaS'],
      ['integracion-tecnologica'],
      ['empresas tech', 'startups']
    );

    expect(profiles.length).toBeGreaterThan(0);
    
    const profile = profiles[0];
    expect(profile.compatibility_breakdown).toBeDefined();
    expect(typeof profile.compatibility_breakdown).toBe('object');
    
    // Los valores en el breakdown deben estar entre 0 y 100
    Object.values(profile.compatibility_breakdown).forEach(value => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it('debe generar tags sinérgicos realistas', async () => {
    const profiles = await generateAllianceProfilesWithClaude(
      'Agencia de marketing digital',
      'Ofrecemos servicios de marketing digital, social media y publicidad',
      ['Marketing', 'Publicidad'],
      ['co-marketing'],
      ['agencias', 'empresas finales']
    );

    expect(profiles.length).toBeGreaterThan(0);
    
    const profile = profiles[0];
    expect(Array.isArray(profile.synergy_tags)).toBe(true);
    expect(profile.synergy_tags.length).toBeGreaterThanOrEqual(2);
    expect(profile.synergy_tags.length).toBeLessThanOrEqual(4);
  });

  it('debe retornar múltiples perfiles diferentes', async () => {
    const profiles = await generateAllianceProfilesWithClaude(
      'Empresa de servicios de logística',
      'Servicios de almacenamiento, distribución y logística',
      ['Logística', 'Transporte'],
      ['co-distribucion'],
      ['distribuidores', 'transportistas']
    );

    expect(profiles.length).toBeGreaterThanOrEqual(5);
    
    // Verificar que al menos algunos sean diferentes
    const names = profiles.map(p => p.business_name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBeGreaterThan(1);
  });

  it('debe incluir estimated_value positivo en cada perfil', async () => {
    const profiles = await generateAllianceProfilesWithClaude(
      'Fabricante de artículos de cuero',
      'Fabricamos bolsos, cinturones y accesorios de cuero',
      ['Moda', 'Accesorios'],
      ['co-distribucion'],
      ['boutiques', 'tiendas departamentales']
    );

    expect(profiles.length).toBeGreaterThan(0);
    
    profiles.forEach(profile => {
      expect(typeof profile.estimated_value).toBe('number');
      expect(profile.estimated_value).toBeGreaterThan(0);
    });
  });
});
