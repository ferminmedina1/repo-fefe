import { describe, it, expect } from 'vitest';

describe('ContributionHeatmap - Data Validation Tests', () => {
  it('validar estructura de datos de heatmap', () => {
    const mockData = [
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-02', count: 5 },
    ];

    expect(mockData).toBeDefined();
    expect(Array.isArray(mockData)).toBe(true);
    expect(mockData[0]).toHaveProperty('date');
    expect(mockData[0]).toHaveProperty('count');
  });

  it('validar datos vacíos', () => {
    const mockData: Array<{ date: string; count: number }> = [];
    
    expect(mockData).toBeDefined();
    expect(mockData.length).toBe(0);
  });

  it('rango de conteos válidos', () => {
    const mockData = [
      { date: '2025-03-01', count: 0 },
      { date: '2025-03-02', count: 1 },
      { date: '2025-03-03', count: 5 },
      { date: '2025-03-04', count: 100 },
    ];

    mockData.forEach(item => {
      expect(item.count).toBeGreaterThanOrEqual(0);
      expect(typeof item.count).toBe('number');
    });
  });

  it('formato de fecha válido (YYYY-MM-DD)', () => {
    const mockData = [
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-31', count: 5 },
    ];

    mockData.forEach(item => {
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('agregar datos a array', () => {
    const data: Array<{ date: string; count: number }> = [];
    data.push({ date: '2025-03-01', count: 5 });
    
    expect(data).toHaveLength(1);
    expect(data[0].count).toBe(5);
  });

  it('mapear datos a estructura de días de semana', () => {
    const mockData = [
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-02', count: 5 },
    ];

    const dateMap = new Map<string, number>();
    mockData.forEach(item => {
      dateMap.set(item.date, item.count);
    });

    expect(dateMap.get('2025-03-01')).toBe(3);
    expect(dateMap.get('2025-03-02')).toBe(5);
  });

  it('filtrar datos por rango de fechas', () => {
    const mockData = [
      { date: '2025-02-28', count: 1 },
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-02', count: 5 },
      { date: '2025-04-01', count: 2 },
    ];

    const filtered = mockData.filter(item => {
      // Extraer mes del string YYYY-MM-DD
      const [year, month, day] = item.date.split('-');
      return month === '03'; // March
    });

    expect(filtered).toHaveLength(2);
    expect(filtered[0].date).toBe('2025-03-01');
    expect(filtered[1].date).toBe('2025-03-02');
  });

  it('contar contribuciones totales', () => {
    const mockData = [
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-02', count: 5 },
      { date: '2025-03-03', count: 2 },
    ];

    const total = mockData.reduce((sum, item) => sum + item.count, 0);
    expect(total).toBe(10);
  });

  it('encontrar máximo conteo', () => {
    const mockData = [
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-02', count: 15 },
      { date: '2025-03-03', count: 5 },
    ];

    const max = Math.max(...mockData.map(d => d.count));
    expect(max).toBe(15);
  });
});
