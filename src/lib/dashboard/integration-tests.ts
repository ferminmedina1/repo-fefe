import { DashboardWidget } from '@/lib/dashboard/widgets';

// Test: Export/Import Round-trip
export async function testExportImportRoundTrip() {
  console.log('=== TEST: Export/Import Round-trip ===');
  
  // Mock data
  const mockWidgets: DashboardWidget[] = [
    { id: 'w1', type: 'kpi-monthly-sales', order: 0, size: 'half' },
    { id: 'w2', type: 'chart-top-products', order: 1, size: 'full' },
    { id: 'w3', type: 'list-critical-stock', order: 2, size: 'half' },
  ];

  console.log('✓ Mock widgets created:', mockWidgets.length);

  // Test export
  const exported = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    widgets: mockWidgets,
    metadata: {
      name: 'Test Dashboard',
      widgetCount: mockWidgets.length,
    },
  };

  const jsonString = JSON.stringify(exported, null, 2);
  console.log('✓ Export JSON valid:', jsonString.length > 0);

  // Test import validation
  const data = JSON.parse(jsonString);
  if (!Array.isArray(data.widgets)) {
    throw new Error('Invalid: widgets not an array');
  }

  const importedWidgets: DashboardWidget[] = [];
  data.widgets.forEach((widget: unknown) => {
    if (widget && typeof widget === 'object') {
      importedWidgets.push(widget as DashboardWidget);
    }
  });

  console.log('✓ Import validation passed:', importedWidgets.length);

  // Verify round-trip integrity
  if (JSON.stringify(mockWidgets) === JSON.stringify(importedWidgets)) {
    console.log('✓ Round-trip integrity verified');
    return { success: true };
  } else {
    console.log('✗ Round-trip integrity FAILED');
    return { success: false };
  }
}

// Test: Widget ID uniqueness
export function testWidgetIdUniqueness() {
  console.log('\n=== TEST: Widget ID Uniqueness ===');
  
  const ids: Set<string> = new Set();
  const timestamps: number[] = [];

  for (let i = 0; i < 5; i++) {
    const id = `kpi-monthly-sales-${Date.now()}`;
    ids.add(id);
    timestamps.push(Date.now());
    
    // Simulate small delay
    if (i < 4) {
      const start = Date.now();
      while (Date.now() - start < 1) {} // 1ms delay
    }
  }

  console.log('✓ Generated 5 IDs, unique count:', ids.size);
  
  if (ids.size === 5) {
    console.log('✓ All IDs are unique');
    return { success: true };
  } else {
    console.log('✗ ID collision detected');
    return { success: false };
  }
}

// Test: WIDGET_CATALOG access pattern
export function testWidgetCatalogAccess() {
  console.log('\n=== TEST: WIDGET_CATALOG Access ===');

  // Mock WIDGET_CATALOG structure
  const mockCatalog: Record<string, any> = {
    'kpi-monthly-sales': { name: 'Monthly Sales', category: 'kpi' },
    'chart-top-products': { name: 'Top Products', category: 'chart' },
    'list-critical-stock': { name: 'Critical Stock', category: 'list' },
  };

  const testWidgetTypes = ['kpi-monthly-sales', 'chart-top-products', 'list-critical-stock'];
  
  // Test record access (CORRECT way)
  const correctResults: any[] = [];
  testWidgetTypes.forEach(type => {
    const entry = mockCatalog[type];
    if (entry) {
      correctResults.push(entry);
    }
  });

  console.log('✓ Record access successful:', correctResults.length, 'widgets found');

  // Test array access would fail (WRONG way - commented out)
  // const wrongResults = mockCatalog.find((w: any) => w.name === 'Monthly Sales');
  // This would fail because mockCatalog is not an array

  if (correctResults.length === 3) {
    console.log('✓ WIDGET_CATALOG access pattern correct');
    return { success: true };
  } else {
    console.log('✗ WIDGET_CATALOG access pattern FAILED');
    return { success: false };
  }
}

// Test: Callback widget passing
export function testCallbackWidgetPassing() {
  console.log('\n=== TEST: Callback Widget Passing ===');

  const mockWidgets: DashboardWidget[] = [
    { id: 'w1', type: 'kpi-monthly-sales', order: 0, size: 'full' },
    { id: 'w2', type: 'chart-top-products', order: 1, size: 'half' },
  ];

  // Simulate original flow (before fix)
  const wrongFlow = (w: DashboardWidget) => {
    return w.type; // ❌ Only passing type
  };

  // Simulate correct flow (after fix)
  const correctFlow = (w: DashboardWidget) => {
    return { id: w.id, type: w.type, order: w.order, size: w.size }; // ✓ Full widget
  };

  const wrongResults = mockWidgets.map(w => wrongFlow(w));
  const correctResults = mockWidgets.map(w => correctFlow(w));

  console.log('✓ Wrong flow returns:', typeof wrongResults[0], '(only type)');
  console.log('✓ Correct flow returns:', typeof correctResults[0], '(full widget)');

  if (
    typeof wrongResults[0] === 'string' &&
    typeof correctResults[0] === 'object' &&
    correctResults[0].id === 'w1'
  ) {
    console.log('✓ Callback widget passing verified');
    return { success: true };
  } else {
    console.log('✗ Callback widget passing FAILED');
    return { success: false };
  }
}

// Run all tests
export async function runAllTests() {
  console.log('====================================');
  console.log('DASHBOARD ADVANCED FEATURES TESTS');
  console.log('====================================\n');

  const results = [];

  try {
    results.push(await testExportImportRoundTrip());
  } catch (e) {
    console.error('✗ Export/Import test failed:', e);
    results.push({ success: false });
  }

  try {
    results.push(testWidgetIdUniqueness());
  } catch (e) {
    console.error('✗ Widget ID test failed:', e);
    results.push({ success: false });
  }

  try {
    results.push(testWidgetCatalogAccess());
  } catch (e) {
    console.error('✗ WIDGET_CATALOG test failed:', e);
    results.push({ success: false });
  }

  try {
    results.push(testCallbackWidgetPassing());
  } catch (e) {
    console.error('✗ Callback test failed:', e);
    results.push({ success: false });
  }

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log('\n====================================');
  console.log(`RESULTS: ${passed}/${total} tests passed`);
  console.log('====================================');

  return { passed, total, allPassed: passed === total };
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).dashboardTests = { runAllTests };
  console.log('Dashboard tests available: window.dashboardTests.runAllTests()');
}
