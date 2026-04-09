# TESTING GUIDE - MVP Dashboard Features

**Date**: April 9, 2026  
**Status**: READY FOR QA  
**Build**: 32.45s | 0 errors  

---

## 🧪 Quick Testing Checklist

### ✅ 1. GLOBAL FILTERS (5 min)

**Location**: Dashboard top-left area

**Test Cases**:
```
[ ] Date Range Selector appears
    - Default: "Month"
    - Options: Week, Month, Year, Custom
    
[ ] Dimension Selector appears
    - Options: Country, Category, Region, Sales Rep
    
[ ] Can set custom date range
    - Click "Custom" → date picker appears
    - Select from/to dates
    
[ ] All 8 widgets respond
    - Monthly Comparison values change ✓
    - Top Products re-sorts ✓
    - Top Customers re-sorts ✓
    - Receivables recalculate ✓
    - Critical Stock filters ✓
    - 7-Day Sales chart updates ✓
    - Exchange Rates query-bound ✓
    
[ ] Reset button clears filters
    - Click "Clear filters"
    - All widgets return to default
```

**Expected Data Changes**:
```
Select: Month (April 2026)
→ Monthly Comparison shows April data

Select: Dimension Country = "Colombia"  
→ All widgets show Colombia-filtered data

Toggle: Week view
→ Chart shows last 7 days
```

---

### ✅ 2. CSV UPLOADER (5 min)

**Location**: Dashboard toolbar → "📥 Importar datos CSV" button

**Test Cases**:
```
[ ] Modal opens on button click
    - Dark overlay appears
    - Modal centered
    
[ ] Drag & drop works
    - Drag CSV file into drop zone
    - File name appears
    - Preview shows first 5 rows in table
    
[ ] File picker works
    - Click "Seleccionar archivo"
    - File dialog opens
    - Select CSV → preview appears
    
[ ] Template download works
    - Click "Descargar plantilla"
    - CSV downloads with headers + example data
    - Headers: product_name, quantity, unit_price, cost, customer_name, date, category
    
[ ] Data import validates
    - Valid file → "✓ X venta(s) importada(s)"
    - Invalid headers → Error message with missing columns
    - Invalid rows → Warnings show for each bad row
    
[ ] Successful import
    - Sales appear in database
    - Top Products widget refreshes
    - Top Customers widget refreshes
    - Monthly Comparison recalculates
```

**Test Data File** (save as `test-import.csv`):
```csv
product_name,quantity,unit_price,customer_name,date,cost,category
Laptop Pro,2,1299.99,John Doe,2026-04-08,780,Electronics
Monitor LG,1,299.99,Jane Smith,2026-04-08,150,Electronics
Office Chair,5,199.99,Company ABC,2026-04-09,100,Furniture
```

**Expected Results**:
```
Row 1: ✓ Inserted (2 × $1299.99 = $2,599.98)
Row 2: ✓ Inserted (1 × $299.99)
Row 3: ✓ Inserted (5 × $199.99 = $999.95)
Total: 3 sales records created
```

---

### ✅ 3. METRIC BUILDER (10 min)

**Location**: Dashboard toolbar → "⚡ Crear métrica" button

#### 3A. CREATE TAB

**Test Cases**:
```
[ ] Modal opens with 2 tabs
    - "Crear métrica" (default)
    - "Tus métricas" (shows count)
    
[ ] Data source selector works
    - All 7 options available:
      • Monthly Comparison
      • Top Products
      • Top Customers
      • Receivables
      • Critical Stock
      • 7-Day Sales Chart
      • Exchange Rates
    
[ ] Formula suggestions appear
    - Click "Sugerencias" ChevronDown
    - 3-4 suggestions per data source
    - Each has: Label, Description, Formula code
    
[ ] Copy formula works
    - Hover suggestion → Copy icon appears
    - Click copy → Formula goes to textarea
    
[ ] Formula validation
    - Valid: monthlyComparison.percentageChange → No error
    - Invalid: monthlyComparison.xyz → Error on save
    - Empty: Can't save without formula
    
[ ] Can create metric
    - Fill: Name, Data Source, Formula
    - Click "Crear métrica"
    - Success → Tab 2 shows new metric
```

**Test Formulas**:
```javascript
// Simple field access
monthlyComparison.percentageChange

// Array operations
topProducts.reduce((s, p) => s + p.rentabilidad, 0)

// Math functions
Math.max(...sevenDaysSales.map(d => d.ventas))

// Conditional
topCustomers.length > 0 ? topCustomers[0].total : 0
```

#### 3B. MANAGE TAB

**Test Cases**:
```
[ ] List all created metrics
    - Shows: Name, Description, Data Source tag, Formula
    
[ ] Edit metric
    - Click ✏️ icon
    - Tab 1 refills with metric data
    - Can change values
    - Click "Guardar cambios"
    - Tab 2 updates with new values
    
[ ] Delete metric
    - Click 🗑️ icon
    - Metric disappears from list
    - Not in database anymore
    
[ ] Empty state
    - No metrics created
    - Shows: "No hay métricas" + link to create
```

#### 3C. WIDGET INTEGRATION

**Test Cases**:
```
[ ] Add metric as widget
    - Click WidgetPicker (+ button)
    - Select metric from custom section
    - Widget appears in grid
    
[ ] Widget displays correctly
    - Shows: Metric name, Description
    - Shows: Current value formatted ($1.2M, $50K, etc)
    - Shows: Trend % +/- with icon
    - Shows: Data source tag
    - Shows: Formula code
    
[ ] Widget auto-calculates
    - Changes in data → Widget value updates
    - Different filter selection → Value changes
    
[ ] Widget responsive
    - Mobile: 1 col
    - Tablet: 2 cols
    - Desktop: 3 cols
```

---

## 🔗 Data Source Reference

For testing, these formulas will always work:

| Data Source | Example Formula | Expected Result Type |
|-------------|---|---|
| Monthly Comparison | `monthlyComparison.percentageChange` | Number (-50 to +500) |
| Top Products | `topProducts.length` | Number (0-5) |
| Top Customers | `topCustomers[0].total` | Number or null |
| Receivables | `receivables.overduePercentage` | Number (0-100) |
| Critical Stock | `criticalStock.reduce((s,p)=>s+p.stock,0)` | Number |
| 7-Day Sales | `sevenDaysSales.reduce((s,d)=>s+d.ventas,0)` | Number |
| Exchange Rates | `exchangeRates.length` | Number (0+) |

---

## 🐛 Known Test Scenarios

### Scenario 1: Filter + CSV + Metric
```
1. Import CSV with 10 sales on 2026-04-09
2. Set filter to Custom date: 2026-04-09 only
3. Create metric: "Daily Sales Total"
   Formula: sevenDaysSales.reduce((s,d)=>s+d.ventas,0)
4. Expected: Widget shows sum of imported sales only
```

### Scenario 2: Complex Formula
```
1. Create metric: "Customer Health"
   Formula: (100 - receivables.overduePercentage)
2. Import CSV
3. Set dimension filter
4. Expected: Metric recalculates
```

### Scenario 3: Error Handling
```
1. Create metric with typo: "monthlyCompariso.percentageChange"
2. Expected: Error message on save or displays "—" when loading
3. Edit → fix formula → Re-save
4. Expected: Now calculates correctly
```

---

## ✅ Performance Checks

```
[ ] Dashboard loads < 2 seconds
[ ] Filters apply < 500ms
[ ] CSV upload < 5 seconds for 100 rows
[ ] Metric formula evaluation < 100ms
[ ] Modal opens instantly
[ ] No console errors
[ ] No memory leaks on filter changes
```

---

## 📋 Sign-Off Checklist

- [ ] All 3 features load without errors
- [ ] Filters update all 8 widgets
- [ ] CSV imports correctly
- [ ] Metrics calculate and display
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Responsive on mobile/tablet/desktop
- [ ] Performance acceptable
- [ ] Ready for production

---

## 🎯 Test Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Navigate to
http://localhost:5173/dashboard

# 4. Create test company/user if needed
# (Use existing fixture or sign up)

# 5. Test features in order
# - Filters first (data layer)
# - CSV upload (data import)
# - Metric builder (UI + formula eval)
```

---

## 📞 Support

If test fails:
1. Check browser console for errors
2. Verify Supabase connection
3. Check network tab for failed queries
4. Review git commits for recent changes
5. File issue with:
   - Feature (filter/csv/metric)
   - Step that failed
   - Expected vs actual
   - Browser console error (if any)

