import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContributionHeatmap } from '@/components/employees/ContributionHeatmap';

describe('ContributionHeatmap Component', () => {
  it('debe renderizar correctamente con datos válidos', () => {
    const mockData = [
      { date: '2025-03-01', count: 3 },
      { date: '2025-03-02', count: 5 },
      { date: '2025-03-03', count: 0 },
      { date: '2025-03-04', count: 12 },
    ];

    render(<ContributionHeatmap data={mockData} title="Test Heatmap" />);
    
    const title = screen.getByText('Test Heatmap');
    expect(title).toBeInTheDocument();
  });

  it('debe renderizar mensaje cuando no hay datos', () => {
    render(<ContributionHeatmap data={[]} title="Empty Heatmap" />);
    
    const emptyMessage = screen.getByText('No hay datos de actividad para mostrar');
    expect(emptyMessage).toBeInTheDocument();
  });

  it('debe usar título por defecto si no se proporciona', () => {
    const mockData = [{ date: '2025-03-01', count: 1 }];
    
    render(<ContributionHeatmap data={mockData} />);
    
    const defaultTitle = screen.getByText('Actividad Último Año');
    expect(defaultTitle).toBeInTheDocument();
  });

  it('debe renderizar leyenda de colores', () => {
    const mockData = [{ date: '2025-03-01', count: 5 }];
    
    render(<ContributionHeatmap data={mockData} />);
    
    const legend = screen.getByText('Menos');
    expect(legend).toBeInTheDocument();
  });

  it('debe manejar arrays vacíos sin errores', () => {
    expect(() => {
      render(<ContributionHeatmap data={[]} />);
    }).not.toThrow();
  });

  it('debe manejar datos con contador 0', () => {
    const mockData = [
      { date: '2025-03-01', count: 0 },
      { date: '2025-03-02', count: 0 },
    ];

    render(<ContributionHeatmap data={mockData} />);
    
    const title = screen.getByText('Actividad Último Año');
    expect(title).toBeInTheDocument();
  });

  it('debe manejar datos con contador alto', () => {
    const mockData = [
      { date: '2025-03-01', count: 100 },
    ];

    render(<ContributionHeatmap data={mockData} />);
    
    const title = screen.getByText('Actividad Último Año');
    expect(title).toBeInTheDocument();
  });

  it('debe renderizar dentro de un Card component', () => {
    const mockData = [{ date: '2025-03-01', count: 1 }];
    
    const { container } = render(<ContributionHeatmap data={mockData} />);
    
    // Verificar que existe un elemento con clase Card
    const cardElement = container.querySelector('[class*="rounded-xl"]');
    expect(cardElement).toBeInTheDocument();
  });

  it('debe tener scroll horizontal para responsividad', () => {
    const mockData = [
      { date: '2025-03-01', count: 1 },
      { date: '2025-03-02', count: 2 },
    ];

    const { container } = render(<ContributionHeatmap data={mockData} />);
    
    // Verificar que existe overflow-x-auto
    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();
  });
});
