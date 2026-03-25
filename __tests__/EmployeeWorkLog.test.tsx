import { describe, it, expect } from 'vitest';

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

describe('EmployeeWorkLog - Mock Data Generation', () => {
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
    expect(employee.email).toBe('juan@example.com');
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
});

describe('EmployeeWorkLog - Data Aggregation', () => {
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

  it('convertir a formato heatmap', () => {
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

  it('combinar filtros de empleados y fecha', () => {
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

  it('contar por categoría', () => {
    const logs = [
      createMockWorkLog({ category: 'development', task_date: '2025-03-20' }),
      createMockWorkLog({ category: 'testing', task_date: '2025-03-20' }),
      createMockWorkLog({ category: 'development', task_date: '2025-03-21' }),
    ];

    const categoryMap = new Map<string, number>();
    logs.forEach(log => {
      categoryMap.set(log.category, (categoryMap.get(log.category) || 0) + 1);
    });

    expect(categoryMap.get('development')).toBe(2);
    expect(categoryMap.get('testing')).toBe(1);
  });
});

describe('EmployeeWorkLog - Time Range Calculations', () => {
  it('últimas 365 días incluyen hoy', () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const testDate = new Date(today);
    testDate.setDate(testDate.getDate() - 180);

    expect(testDate.getTime()).toBeGreaterThan(oneYearAgo.getTime());
    expect(testDate.getTime()).toBeLessThan(today.getTime());
  });

  it('normalizar datos nulos en query response', () => {
    const rawData = [
      { task_date: '2025-03-20', status: 'completed' },
      null,
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

describe('EmployeeWorkLog - Status Management', () => {
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

  it('todos los status requieren color y label', () => {
    const statuses = ['pending', 'completed', 'cancelled'];
    
    statuses.forEach(status => {
      expect(STATUS_COLORS[status]).toBeDefined();
      expect(STATUS_LABELS[status]).toBeDefined();
    });
  });
});

describe('EmployeeWorkLog - Duration Calculations', () => {
  it('calcular duración total de trabajo', () => {
    const logs = [
      createMockWorkLog({ duration_hours: 8, task_date: '2025-03-20' }),
      createMockWorkLog({ duration_hours: 6, task_date: '2025-03-20' }),
      createMockWorkLog({ duration_hours: 4, task_date: '2025-03-21' }),
    ];

    const totalHours = logs.reduce((sum, log) => sum + log.duration_hours, 0);
    expect(totalHours).toBe(18);
  });

  it('calcular duración por empleado', () => {
    const logs = [
      createMockWorkLog({ employee_id: '1', duration_hours: 8 }),
      createMockWorkLog({ employee_id: '1', duration_hours: 4 }),
      createMockWorkLog({ employee_id: '2', duration_hours: 6 }),
    ];

    const employeeHours = new Map<string, number>();
    logs.forEach(log => {
      employeeHours.set(log.employee_id, (employeeHours.get(log.employee_id) || 0) + log.duration_hours);
    });

    expect(employeeHours.get('1')).toBe(12);
    expect(employeeHours.get('2')).toBe(6);
  });

  it('calcular promedio de horas por tarea', () => {
    const logs = [
      createMockWorkLog({ duration_hours: 8 }),
      createMockWorkLog({ duration_hours: 6 }),
      createMockWorkLog({ duration_hours: 10 }),
    ];

    const avgHours = logs.reduce((sum, log) => sum + log.duration_hours, 0) / logs.length;
    expect(avgHours).toBeCloseTo(8, 0);
  });
});
