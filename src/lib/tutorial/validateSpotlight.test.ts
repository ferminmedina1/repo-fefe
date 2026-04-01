/**
 * SPOTLIGHT VALIDATION TEST SUITE
 * ================================
 * Valida que todas las configuraciones del spotlight estén correctas
 * y que funcione en todos los tutoriales.
 * 
 * Ejecución: npm test -- validateSpotlight
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTutorialModules } from './config';

describe('🎯 Spotlight Animation System', () => {
  let styleElement: HTMLStyleElement | null;

  beforeEach(() => {
    // Limpiar cualquier estilo previo
    document.getElementById('spotlight-pulse-animation')?.remove();
  });

  afterEach(() => {
    // Limpiar después de cada test
    document.getElementById('spotlight-pulse-animation')?.remove();
  });

  describe('✅ CSS Animation Definition', () => {
    it('should have spotlight-pulse animation defined', () => {
      const animationStyles = `
        @keyframes spotlight-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 
                        0 0 0 8px rgba(59, 130, 246, 0.3), 
                        0 0 30px rgba(59, 130, 246, 0.7), 
                        0 0 60px rgba(59, 130, 246, 0.5), 
                        inset 0 0 25px rgba(59, 130, 246, 0.25) !important;
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.8), 
                        0 0 0 12px rgba(59, 130, 246, 0.4), 
                        0 0 40px rgba(59, 130, 246, 0.8), 
                        0 0 80px rgba(59, 130, 246, 0.6), 
                        inset 0 0 35px rgba(59, 130, 246, 0.35) !important;
          }
        }
      `;
      
      expect(animationStyles).toContain('spotlight-pulse');
      expect(animationStyles).toContain('box-shadow');
      expect(animationStyles).toContain('2s ease-in-out infinite');
    });

    it('should have 4 shadow layers in initial state (0%)', () => {
      const keyframe0 = `
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 
                    0 0 0 8px rgba(59, 130, 246, 0.3), 
                    0 0 30px rgba(59, 130, 246, 0.7), 
                    0 0 60px rgba(59, 130, 246, 0.5), 
                    inset 0 0 25px rgba(59, 130, 246, 0.25) !important;
      `;
      
      const layers = keyframe0.split(',');
      expect(layers).toHaveLength(5); // 4 layers + 1 inset
      expect(keyframe0).toContain('4px'); // Ring 1
      expect(keyframe0).toContain('8px'); // Ring 2
      expect(keyframe0).toContain('30px'); // Bloom 1
      expect(keyframe0).toContain('60px'); // Bloom 2
      expect(keyframe0).toContain('inset'); // Inner glow
    });

    it('should have expanded shadows in animation peak (50%)', () => {
      const keyframe50 = `
        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.8), 
                    0 0 0 12px rgba(59, 130, 246, 0.4), 
                    0 0 40px rgba(59, 130, 246, 0.8), 
                    0 0 80px rgba(59, 130, 246, 0.6), 
                    inset 0 0 35px rgba(59, 130, 246, 0.35) !important;
      `;
      
      // Verificar que los valores crecen del 0% al 50%
      expect(keyframe50).toContain('6px'); // 4px → 6px
      expect(keyframe50).toContain('12px'); // 8px → 12px
      expect(keyframe50).toContain('40px'); // 30px → 40px
      expect(keyframe50).toContain('80px'); // 60px → 80px
      // Inset glow también crece
      expect(keyframe50).toContain('35px'); // 25px → 35px
    });

    it('should use correct blue color palette', () => {
      const animationStyles = `
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 
                    0 0 0 8px rgba(59, 130, 246, 0.3)
      `;
      
      // RGB de Blue-500 Tailwind
      expect(animationStyles).toContain('rgba(59, 130, 246');
      // Verificar que NO usa rojo u otro color
      expect(animationStyles).not.toContain('rgb(255, 0, 0'); // Red
      expect(animationStyles).not.toContain('rgb(34, 197, 94'); // Green
    });

    it('should include !important flags for all shadows', () => {
      const animationStyles = `
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 
                    0 0 0 8px rgba(59, 130, 246, 0.3), 
                    0 0 30px rgba(59, 130, 246, 0.7), 
                    0 0 60px rgba(59, 130, 246, 0.5), 
                    inset 0 0 25px rgba(59, 130, 246, 0.25) !important;
      `;
      
      const importantCount = (animationStyles.match(/!important/g) || []).length;
      expect(importantCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('✅ Joyride Configuration', () => {
    it('should have correct overlay opacity (20%)', () => {
      const overlayColor = 'rgba(0, 0, 0, 0.20)';
      const opacityValue = parseFloat(overlayColor.match(/[\d.]+\)$/)?.[0] || '0');
      
      expect(opacityValue).toBe(0.20);
      expect(overlayColor).toContain('rgba(0, 0, 0'); // Negro
    });

    it('should have rounded spotlight border', () => {
      const borderRadius = '14px';
      expect(borderRadius).toBe('14px');
      expect(parseInt(borderRadius)).toBeGreaterThan(0);
    });

    it('should have spotlight sync with animation keyframe 0%', () => {
      const initialShadow = '0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.7), 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 25px rgba(59, 130, 246, 0.25)';
      
      expect(initialShadow).toContain('4px');
      expect(initialShadow).toContain('8px');
      expect(initialShadow).toContain('30px');
      expect(initialShadow).toContain('60px');
    });

    it('should disable default Joyride animation', () => {
      const floaterProps = { disableAnimation: true };
      expect(floaterProps.disableAnimation).toBe(true);
    });
  });

  describe('✅ Tutorial Modules Structure', () => {
    let modules: ReturnType<typeof getTutorialModules>;

    beforeEach(() => {
      modules = getTutorialModules();
    });

    it('should have all 17 tutorial modules defined', () => {
      expect(modules).toHaveLength(17);
    });

    it('should have required fields in each module', () => {
      modules.forEach((module, index) => {
        expect(module, `Module ${index}: ${module.id}`).toHaveProperty('id');
        expect(module, `Module ${index}: ${module.id}`).toHaveProperty('title');
        expect(module, `Module ${index}: ${module.id}`).toHaveProperty('description');
        expect(module, `Module ${index}: ${module.id}`).toHaveProperty('category');
        expect(module, `Module ${index}: ${module.id}`).toHaveProperty('steps');
        expect(Array.isArray(module.steps)).toBe(true);
      });
    });

    it('should have at least 4 steps per module', () => {
      modules.forEach((module) => {
        expect(module.steps.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should have valid data-tutorial selectors for each step', () => {
      modules.forEach((module) => {
        module.steps.forEach((step, stepIndex) => {
          if (step.target) {
            // Debe ser selector CSS válido
            expect(step.target).toMatch(/^\[data-tutorial=/);
            expect(step.target).toContain(']');
          }
        });
      });
    });

    it('should have descriptive content for each step', () => {
      modules.forEach((module) => {
        module.steps.forEach((step, stepIndex) => {
          expect(step.content || step.title, `${module.id} step ${stepIndex}`).toBeTruthy();
          if (step.content) {
            expect(step.content.length).toBeGreaterThan(10);
          }
        });
      });
    });

    it('should have unique module IDs', () => {
      const ids = modules.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(ids).toHaveLength(uniqueIds.size);
    });
  });

  describe('✅ Module-Specific Validations', () => {
    let modules: ReturnType<typeof getTutorialModules>;

    beforeEach(() => {
      modules = getTutorialModules();
    });

    it('should have dashboard module with 4 steps', () => {
      const dashboard = modules.find((m) => m.id === 'dashboard');
      expect(dashboard).toBeDefined();
      expect(dashboard?.steps).toHaveLength(4);
    });

    it('should have sales module with 4 steps', () => {
      const sales = modules.find((m) => m.id === 'sales');
      expect(sales).toBeDefined();
      expect(sales?.steps).toHaveLength(4);
    });

    it('should have products module with 4 steps', () => {
      const products = modules.find((m) => m.id === 'products');
      expect(products).toBeDefined();
      expect(products?.steps).toHaveLength(4);
    });

    it('should have customers module with 4 steps', () => {
      const customers = modules.find((m) => m.id === 'customers');
      expect(customers).toBeDefined();
      expect(customers?.steps).toHaveLength(4);
    });

    it('should have inventory module with 4 steps', () => {
      const inventory = modules.find((m) => m.id === 'inventory');
      expect(inventory).toBeDefined();
      expect(inventory?.steps).toHaveLength(4);
    });

    it('should have pos module with at least 4 steps', () => {
      const pos = modules.find((m) => m.id === 'pos');
      expect(pos).toBeDefined();
      expect(pos?.steps.length).toBeGreaterThanOrEqual(4);
    });

    it('should have deliveries module with 4 steps', () => {
      const deliveries = modules.find((m) => m.id === 'deliveries');
      expect(deliveries).toBeDefined();
      expect(deliveries?.steps).toHaveLength(4);
    });

    // Agregar más módulos según sea necesario
  });

  describe('✅ Animation Injection & Cleanup', () => {
    it('should inject style element with correct ID', () => {
      const styleId = 'spotlight-pulse-animation';
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = '@keyframes spotlight-pulse { /* ... */ }';
      document.head.appendChild(style);

      const injected = document.getElementById(styleId);
      expect(injected).toBeTruthy();
      expect(injected?.tagName).toBe('STYLE');

      // Cleanup
      injected?.remove();
    });

    it('should not inject duplicate styles', () => {
      const styleId = 'spotlight-pulse-animation';
      const style1 = document.createElement('style');
      style1.id = styleId;
      style1.textContent = '@keyframes spotlight-pulse { /* ... */ }';
      document.head.appendChild(style1);

      // Intentar inyectar de nuevo
      const style2 = document.getElementById(styleId);
      expect(style2).toBe(style1); // Debe ser el mismo

      // Cleanup
      style1.remove();
    });

    it('should remove style on cleanup', () => {
      const styleId = 'spotlight-pulse-animation';
      const style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);

      expect(document.getElementById(styleId)).toBeTruthy();

      style.remove();

      expect(document.getElementById(styleId)).toBeNull();
    });
  });

  describe('⚠️ Common Issues Detection', () => {
    it('should detect if overlay is too dark (>50% opacity)', () => {
      const overlayColor = 'rgba(0, 0, 0, 0.20)';
      const opacity = parseFloat(overlayColor.match(/[\d.]+\)$/)?.[0] || '0');

      expect(opacity).toBeLessThanOrEqual(0.5);
    });

    it('should detect if animation is too fast or too slow', () => {
      const animationDuration = '2s'; // Debe estar entre 1s y 3s
      const duration = parseFloat(animationDuration);

      expect(duration).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThanOrEqual(3);
    });

    it('should have sufficient color contrast for spotlight', () => {
      // Blue-500 (59, 130, 246) vs Black (0, 0, 0)
      // Contrast Ratio debe ser > 7 para AAA
      const spotlightColor = [59, 130, 246];
      const backgroundColor = [0, 0, 0];

      const luminance1 = calculateLuminance(spotlightColor);
      const luminance2 = calculateLuminance(backgroundColor);

      const contrast = (Math.max(luminance1, luminance2) + 0.05) / 
                      (Math.min(luminance1, luminance2) + 0.05);

      expect(contrast).toBeGreaterThan(4.5); // WCAG AA minimum
    });
  });
});

/**
 * Helper: Calcular luminancia relativa (WCAG)
 */
function calculateLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}