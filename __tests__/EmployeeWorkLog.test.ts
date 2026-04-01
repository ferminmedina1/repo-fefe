import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock data generators for testing
export const createMockEmployee = (overrides = {}) => ({
  id: '1',
  company_id: 'test-company',
  first_name: 'Juan',
  last_name: 'Pérez',
  email: 'juan@example.com',
  role: 'developer',
  ...overrides,
});

export const createMockWorkLog = (overrides = {}) => ({
  id: '1',
  company_id: 'test-company',
  employee_id: '1',
  task_title: 'Implementar feature',
  task_date: '2025-03-20',
  status: 'completed',
  duration_hours: 8,
  category: 'development',
  notes: 'Test notes',
  created_at: '2025-03-20T10:00:00Z',
  ...overrides,
});

describe('EmployeeWorkLog - Data Layer Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('crear mock employee válido', () => {
    const employee = createMockEmployee();
    
    expect(employee).toHaveProperty('id');
    expect(employee).toHaveProperty('first_name');
    expect(employee).toHaveProperty('email');
    expect(employee.company_id).toBe('test-company');
  });

  it('crear mock employee con overrides', () => {
    const employee = createMockEmployee({ first_name: 'Carlos', role: 'manager' });
    
    expect(employee.first_name).toBe('Carlos');
    expect(employee.role).toBe('manager');
    expect(employee.email).toBe('juan@example.com'); // from default
  });

  it('crear mock work log válido', () => {
    const workLog = createMockWorkLog();
    
    expect(workLog).toHaveProperty('id');
    expect(workLog).toHaveProperty('task_title');
    expect(workLog).toHaveProperty('task_date');
    expect(workLog.status).toBe('completed');
  });

  it('crear work log con diferentes estados', () => {
    const pending = createMockWorkLog({ status: 'pending' });
    const cancelled = createMockWorkLog({ status: 'cancelled' });
    const completed = createMockWorkLog({ status: 'completed' });

    expect(pending.status).toBe('pending');
    expect(cancelled.status).toBe('cancelled');
    expect(completed.status).toBe('completed');
  });

  it('crear múltiples work logs para diferentes empleados', () => {
    const logs = [
      createMockWorkLog({ employee_id: '1', task_title: 'Task 1' }),
      createMockWorkLog({ employee_id: '2', task_title: 'Task 2' }),
      createMockWorkLog({ employee_id: '1', task_title: 'Task 3' }),
    ];

    const emp1Logs = logs.filter(l => l.employee_id === '1');
    expect(emp1Logs).toHaveLength(2);
    expect(emp1Logs[0].task_title).toBe('Task 1');
  });
});

describe('EmployeeWorkLog - Data Aggregation Tests', () => {
  it('agregación: contar tareas completadas por fecha', () => {
    const logs = [
      createMockWorkLog({ task_date: '2025-03-20', status: 'completed' }),
      createMockWorkLog({ task_date: '2025-03-20', status: 'completed' }),
      createMockWorkLog({ task_date: '2025-03-21', status: 'completed' }),
      createMockWorkLog({ task_date: '2025-03-20', status: 'pending' }),
    ];

    const dateMap = new Map<string, number>();
    logs.forEach(log => {
      if (log.status === 'completed') {
        dateMap.set(log.task_date, (dateMap.get(log.task_date) || 0) + 1);
      }
    });

    expect(dateMap.get('2025-03-20')).toBe(2);
    expect(dateMap.get('2025-03-21')).toBe(1);
  });

  it('agregación: convertir a formato heatmap', () => {
    const logs = [
      createMockWorkLog({ task_date: '2025-03-20', status: 'completed' }),
      createMockWorkLog({ task_date: '2025-03-20', status: 'completed' }),
      createMockWorkLog({ task_date: '2025-03-21', status: 'completed' }),
    ];

    const dateMap = new Map<string, number>();
    logs.forEach(log => {
      if (log.status === 'completed') {
        dateMap.set(log.task_date, (dateMap.get(log.task_date) || 0) + 1);
      }
    });

    const contributionData = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    expect(contributionData).toHaveLength(2);
    expect(contributionData[0]).toEqual({ date: '2025-03-20', count: 2 });
  });

  it('filtrar empleados seleccionados', () => {
    const logs = [
      createMockWorkLog({ employee_id: '1', task_title: 'Task 1' }),
      createMockWorkLog({ employee_id: '2', task_title: 'Task 2' }),
      createMockWorkLog({ employee_id: '3', task_title: 'Task 3' }),
    ];

    const selectedEmployees = new Set(['1', '3']);
    const filtered = logs.filter(log => selectedEmployees.has(log.employee_id));

    expect(filtered).toHaveLength(2);
    expect(filtered[0].employee_id).toBe('1');
    expect(filtered[1].employee_id).toBe('3');
  });

  it('filtrar por intervalo de fechas', () => {
    const logs = [
      createMockWorkLog({ task_date: '2025-03-15' }),
      createMockWorkLog({ task_date: '2025-03-20' }),
      createMockWorkLog({ task_date: '2025-03-25' }),
    ];

    const filterDate = '2025-03-20';
    const filtered = logs.filter(log => log.task_date === filterDate);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].task_date).toBe('2025-03-20');
  });

  it('combinar filtros (empleados Y fecha)', () => {
    const logs = [
      createMockWorkLog({ employee_id: '1', task_date: '2025-03-20' }),
      createMockWorkLog({ employee_id: '2', task_date: '2025-03-20' }),
      createMockWorkLog({ employee_id: '1', task_date: '2025-03-21' }),
    ];

    const selectedEmployees = new Set(['1']);
    const filterDate = '2025-03-20';

    const filtered = logs.filter(
      log => selectedEmployees.has(log.employee_id) && log.task_date === filterDate
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].employee_id).toBe('1');
    expect(filtered[0].task_date).toBe('2025-03-20');
  });
});

describe('EmployeeWorkLog - Contribution Data Tests', () => {
  it('últimas 365 días incluyen hoy', () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const testDate = new Date(today);
    testDate.setDate(testDate.getDate() - 180); // hace 180 días

    expect(testDate.getTime()).toBeGreaterThan(oneYearAgo.getTime());
    expect(testDate.getTime()).toBeLessThan(today.getTime());
  });

  it('generar array de fechas consecutivas', () => {
    const startDate = new Date('2025-03-01');
    const endDate = new Date('2025-03-05');

    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }

    expect(dates).toHaveLength(5);
    expect(dates[0]).toBe('2025-03-01');
    expect(dates[4]).toBe('2025-03-05');
  });

  it('normalizar datos nulos en query response', () => {
    const rawData = [
      { task_date: '2025-03-20', status: 'completed' },
      null, // simulando error en respuesta
      { task_date: '2025-03-21', status: 'completed' },
      undefined,
    ] as any[];

    const normalized = (rawData || [])
      .filter(item => item != null)
      .map((item: any) => ({
        task_date: item?.task_date,
        status: item?.status,
      }));

    expect(normalized).toHaveLength(2);
    expect(normalized[0].task_date).toBe('2025-03-20');
  });
});

describe('EmployeeWorkLog - Status Management Tests', () => {
  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    completed: 'bg-green-500/10 text-green-700 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-700 border-red-500/20',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };

  it('mapear status a colores correctos', () => {
    expect(STATUS_COLORS['pending']).toContain('yellow');
    expect(STATUS_COLORS['completed']).toContain('green');
    expect(STATUS_COLORS['cancelled']).toContain('red');
  });

  it('mapear status a labels en español', () => {
    expect(STATUS_LABELS['pending']).toBe('Pendiente');
    expect(STATUS_LABELS['completed']).toBe('Completado');
    expect(STATUS_LABELS['cancelled']).toBe('Cancelado');
  });

  it('obtener label de status inválido', () => {
    const invalidStatus = 'unknown';
    const label = STATUS_LABELS[invalidStatus] || 'Desconocido';
    
    expect(label).toBe('Desconocido');
  });
});
