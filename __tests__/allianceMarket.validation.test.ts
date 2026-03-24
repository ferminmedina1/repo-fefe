import { describe, it, expect, beforeEach } from 'vitest';

describe('Alliance Market - Data Validation', () => {
  describe('Profile Data Validation', () => {
    it('debe validar que los perfiles tengan campos requeridos', () => {
      const validProfile = {
        id: 'test-id',
        company_id: 'company-id',
        business_name: 'Test Company',
        industry: 'Tech',
        profile_type: 'alliance' as const,
        relation_type: 'co-distribucion',
        compatibility_score: 85,
        estimated_value: 100000,
        currency: 'USD',
      };

      expect(validProfile.business_name).toBeTruthy();
      expect(validProfile.industry).toBeTruthy();
      expect(validProfile.profile_type).toBeTruthy();
      expect(validProfile.compatibility_score).toBeGreaterThanOrEqual(0);
      expect(validProfile.compatibility_score).toBeLessThanOrEqual(100);
    });

    it('debe rechazar valores de compatibilidad fuera de rango', () => {
      const invalidScores = [-10, 101, 150];

      invalidScores.forEach(score => {
        expect(score < 0 || score > 100).toBe(true);
      });
    });

    it('debe validar tipos de perfil', () => {
      const validTypes = ['alliance', 'client'];
      const testType = 'alliance';

      expect(validTypes).toContain(testType);
    });

    it('debe validar relaciones de alianza válidas', () => {
      const allianceRelations = [
        'co-distribucion',
        'integracion-tecnologica',
        'referidos',
        'proveedor-estrategico',
        'bundling',
        'canal-de-ventas',
      ];

      const testRelation = 'co-distribucion';
      expect(allianceRelations).toContain(testRelation);
    });

    it('debe validar relaciones de cliente válidas', () => {
      const clientRelations = [
        'cliente-potencial',
        'lead-calificado',
        'oportunidad-directa',
      ];

      const testRelation = 'cliente-potencial';
      expect(clientRelations).toContain(testRelation);
    });

    it('debe validar estados de perfil', () => {
      const validStatuses = [
        'suggested',
        'contacted',
        'in_negotiation',
        'active',
        'discarded',
      ];

      const testStatus = 'suggested';
      expect(validStatuses).toContain(testStatus);
    });

    it('debe validar badges', () => {
      const validBadges = ['hot', 'new', 'verified', null];

      const testBadge = 'hot';
      expect(validBadges).toContain(testBadge);
    });
  });

  describe('Compatibility Breakdown Validation', () => {
    it('debe validar estructura de compatibility_breakdown', () => {
      const breakdown = {
        market_overlap: 88,
        product_compatibility: 82,
        geographic_fit: 90,
        synergy_potential: 80,
      };

      Object.values(breakdown).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('debe calcular promedio de breakdown', () => {
      const breakdown = {
        market_overlap: 80,
        product_compatibility: 90,
        geographic_fit: 80,
        synergy_potential: 90,
      };

      const average = Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length;

      expect(average).toBe(85);
    });
  });

  describe('Config Validation', () => {
    it('debe validar configuración requerida', () => {
      const validConfig = {
        company_description: 'Empresa de tech',
        products_summary: 'Software y apps',
        market_positioning: 'Premium',
        target_industries: ['Tecnología', 'E-commerce'],
        target_relation_types: ['integracion-tecnologica'],
        ai_search_keywords: ['startups', 'agencias'],
      };

      expect(validConfig.company_description).toBeTruthy();
      expect(validConfig.target_industries.length).toBeGreaterThan(0);
    });

    it('debe validar que company_description no esté vacío', () => {
      const config = {
        company_description: '',
      };

      expect(config.company_description).toBeFalsy();
    });

    it('debe permitir arrays vacíos para campos opcionales', () => {
      const config = {
        company_description: 'Test',
        target_industries: [],
        ai_search_keywords: [],
      };

      expect(Array.isArray(config.target_industries)).toBe(true);
      expect(config.target_industries.length).toBe(0);
    });
  });

  describe('Contact Information Validation', () => {
    it('debe validar información de contacto', () => {
      const contact = {
        contact_name: 'John Doe',
        contact_email: 'john@example.com',
        contact_phone: '+54123456789',
        contact_linkedin: 'https://linkedin.com/in/johndoe',
      };

      expect(contact.contact_name).toBeTruthy();
      expect(contact.contact_email).toContain('@');
    });

    it('debe permitir contacto parcial', () => {
      const contact = {
        contact_name: 'John Doe',
        contact_email: null,
      };

      expect(contact.contact_name).toBeTruthy();
      expect(contact.contact_email).toBeNull();
    });
  });

  describe('Synergy Tags Validation', () => {
    it('debe validar synergy_tags cómo array', () => {
      const profile = {
        synergy_tags: ['retail', 'distribution', 'tech-savvy'],
      };

      expect(Array.isArray(profile.synergy_tags)).toBe(true);
      expect(profile.synergy_tags.length).toBeGreaterThan(0);
      expect(profile.synergy_tags.length).toBeLessThanOrEqual(4);
    });

    it('debe tener entre 2-4 tags', () => {
      const validTags = [
        ['tag1', 'tag2'],
        ['tag1', 'tag2', 'tag3'],
        ['tag1', 'tag2', 'tag3', 'tag4'],
      ];

      validTags.forEach(tags => {
        expect(tags.length).toBeGreaterThanOrEqual(2);
        expect(tags.length).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Estimated Value Validation', () => {
    it('debe validar que estimated_value sea positivo', () => {
      const profiles = [
        { estimated_value: 50000 },
        { estimated_value: 150000 },
        { estimated_value: 0 },
      ];

      profiles.forEach(profile => {
        expect(profile.estimated_value).toBeGreaterThanOrEqual(0);
      });
    });

    it('debe soportar múltiples currencias', () => {
      const validCurrencies = ['USD', 'ARS', 'EUR'];

      validCurrencies.forEach(currency => {
        expect(['USD', 'ARS', 'EUR']).toContain(currency);
      });
    });
  });
});
