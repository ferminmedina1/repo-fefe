/**
 * ANALYSIS ENGINE
 * Real data analysis from company database
 * Analyzes customers, products, and geography to identify opportunities
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  CustomerAnalysis,
  ProductAnalysis,
  GeographicAnalysis,
  SegmentAnalysis,
  CustomerSegment,
  ProductMetrics,
  ProductAffinity,
  GeographicCoverage,
  IndustrySegment,
  DataAlert,
} from '@/domain/allianceMarket/intelligentSegmentation';
import { format, subMonths } from 'date-fns';

// ============================================================================
// VALIDATION & ALERTS HELPER
// ============================================================================

function generateAlert(
  id: string,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  category: 'DATA_QUALITY' | 'DATA_COMPLETENESS' | 'DATA_RELIABILITY' | 'INSUFFICIENT_SAMPLING',
  message: string,
  impact: string,
  recommendation: string,
  affectedMetric?: string
): DataAlert {
  return { id, severity, category, message, impact, recommendation, affectedMetric };
}

// ============================================================================
// CUSTOMER ANALYSIS ENGINE
// ============================================================================

export async function analyzeCustomers(companyId: string, months: number = 12): Promise<CustomerAnalysis> {
  const startDate = subMonths(new Date(), months);

  // Get all customers and their purchase data
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select(`
      id,
      name,
      industry,
      province,
      created_at,
      sales (
        id,
        total,
        created_at,
        sale_items (
          quantity
        )
      )
    `)
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString());

  if (customerError) throw customerError;

  if (!customerData || customerData.length === 0) {
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      avgTicket: 0,
      churnRate: 0,
      retentionRate: 100,
      segments: [],
      topIndustries: [],
      topGeographies: [],
      buyingPatterns: {
        avgFrequency: 'No data',
        seasonality: [],
        topProducts: [],
      },
      customerLifetimeValue: 0,
      concentrationRatio: 0,
    };
  }

  // Calculate metrics
  const totalCustomers = customerData.length;
  const activeCustomers = customerData.filter((c: any) => c.sales && c.sales.length > 0).length;
  
  const salesByCustomer = customerData.map((c: any) => ({
    customerId: c.id,
    industry: c.industry || 'Unknown',
    province: c.province || 'Unknown',
    salesCount: c.sales?.length || 0,
    totalRevenue: (c.sales || []).reduce((sum: number, s: any) => sum + (s.total || 0), 0),
  }));

  const totalRevenue = salesByCustomer.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalTransactions = salesByCustomer.reduce((sum, c) => sum + c.salesCount, 0) || 1;
  const avgTicket = totalRevenue / totalTransactions;

  // Calculate average days between purchases for active customers
  const daysPerPurchase = totalTransactions > 0 ? months * 30 / totalTransactions : 0;

  // Industry segmentation
  const industryMap = new Map<string, typeof salesByCustomer>();
  salesByCustomer.forEach((s) => {
    if (!industryMap.has(s.industry)) {
      industryMap.set(s.industry, []);
    }
    industryMap.get(s.industry)!.push(s);
  });

  const topIndustries = Array.from(industryMap.entries())
    .map(([industry, customers]) => ({
      industry,
      count: customers.length,
      percentage: (customers.length / totalCustomers) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Geographic segmentation
  const geoMap = new Map<string, typeof salesByCustomer>();
  salesByCustomer.forEach((s) => {
    if (!geoMap.has(s.province)) {
      geoMap.set(s.province, []);
    }
    geoMap.get(s.province)!.push(s);
  });

  const topGeographies = Array.from(geoMap.entries())
    .map(([region, customers]) => ({
      region,
      count: customers.length,
      percentage: (customers.length / totalCustomers) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Concentration ratio (how much top 20% represent)
  const sortedByRevenue = [...salesByCustomer].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const top20Percent = Math.ceil(totalCustomers * 0.2) || 1;
  const top20Revenue = sortedByRevenue.slice(0, top20Percent).reduce((sum, c) => sum + c.totalRevenue, 0);
  const concentrationRatio = totalRevenue > 0 ? (top20Revenue / totalRevenue) * 100 : 0;

  // Validate data quality
  const alerts: DataAlert[] = [];

  if (totalCustomers < 5) {
    alerts.push(
      generateAlert(
        'cust-001',
        'CRITICAL',
        'INSUFFICIENT_SAMPLING',
        `Only ${totalCustomers} customers in period`,
        'Sample size too small for reliable segmentation analysis',
        'Analyze longer time period (6-12 months) for better data quality',
        'totalCustomers'
      )
    );
  } else if (totalCustomers < 20) {
    alerts.push(
      generateAlert(
        'cust-002',
        'WARNING',
        'INSUFFICIENT_SAMPLING',
        `Only ${totalCustomers} customers in analysis period`,
        'Limited customer base may skew segment analysis',
        'Consider analyzing 12-month period for more reliable patterns',
        'totalCustomers'
      )
    );
  }

  if (activeCustomers === 0) {
    alerts.push(
      generateAlert(
        'cust-003',
        'CRITICAL',
        'DATA_QUALITY',
        'No active customers found in period',
        'Cannot calculate retention or buying patterns',
        'Verify data includes sales transactions for the analysis period',
        'activeCustomers'
      )
    );
  }

  if (concentrationRatio > 80) {
    alerts.push(
      generateAlert(
        'cust-004',
        'WARNING',
        'DATA_QUALITY',
        `High customer concentration: top 20% = ${concentrationRatio.toFixed(0)}% of revenue`,
        'Business heavily dependent on few customers - high churn risk',
        'Diversify customer base and implement retention strategy',
        'concentrationRatio'
      )
    );
  }

  if (topIndustries.length === 0) {
    alerts.push(
      generateAlert(
        'cust-005',
        'INFO',
        'DATA_QUALITY',
        'No industry information available for customers',
        'Cannot segment by industry - recommendations less targeted',
        'Collect industry data for customers to enable better segmentation',
        'topIndustries'
      )
    );
  }

  if (topGeographies.length < 2) {
    alerts.push(
      generateAlert(
        'cust-006',
        'INFO',
        'DATA_QUALITY',
        'Operating in only 1 geographic region',
        'Geographic expansion opportunities may be limited',
        'Evaluate regional expansion potential or collect better geo data',
        'topGeographies'
      )
    );
  }

  return {
    totalCustomers,
    activeCustomers,
    avgTicket: Math.round(avgTicket * 100) / 100,
    churnRate: 0, // Would need historical data to calculate
    retentionRate: totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0,
    segments: [],
    topIndustries,
    topGeographies,
    buyingPatterns: {
      avgFrequency: daysPerPurchase > 0 ? `Every ${Math.round(daysPerPurchase)} days` : 'No data',
      seasonality: [],
      topProducts: [],
    },
    customerLifetimeValue: (totalRevenue / (activeCustomers || 1)),
    concentrationRatio,
    alerts,
  };
}

// ============================================================================
// PRODUCT ANALYSIS ENGINE
// ============================================================================

export async function analyzeProducts(companyId: string, months: number = 12): Promise<ProductAnalysis> {
  const startDate = subMonths(new Date(), months);

  // Get products and sales data
  const { data: productData, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category,
      profit_margin,
      sale_items (
        quantity,
        unit_price,
        sale (
          total,
          created_at,
          customer_id
        )
      )
    `)
    .eq('company_id', companyId);

  if (productError) throw productError;

  if (!productData || productData.length === 0) {
    return {
      totalProducts: 0,
      activeProducts: 0,
      avgMargin: 0,
      totalRevenue: 0,
      topProducts: [],
      productAffinity: [],
      lowPenetrationProducts: [],
      seasonalProducts: [],
      gaps: {
        missingComplementary: [],
        lowMarginCategory: [],
      },
    };
  }

  // Get total unique customers in period for penetration calculation
  const { data: totalCustomersData } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString());

  const totalCustomerCount = totalCustomersData?.length || 1;

  // Calculate product metrics
  const productMetrics: ProductMetrics[] = productData
    .map((p: any) => {
      const saleItems = p.sale_items || [];
      const filteredSales = saleItems.filter((si: any) => 
        si.sale && new Date(si.sale.created_at) >= startDate
      );
      
      const unitsSold = filteredSales.reduce((sum: number, si: any) => sum + si.quantity, 0);
      const revenue = filteredSales.reduce((sum: number, si: any) => sum + (si.quantity * si.unit_price), 0);
      const uniqueCustomers = new Set(filteredSales.map((si: any) => si.sale?.customer_id).filter(Boolean)).size;
      
      return {
        productId: p.id,
        name: p.name,
        category: p.category || 'Uncategorized',
        unitsSold,
        revenue,
        margin: p.profit_margin || 0,
        penetration: (uniqueCustomers / totalCustomerCount) * 100,
        volumePerCustomer: unitsSold / Math.max(uniqueCustomers, 1),
        seasonality: 'STABLE',
        trend: 'STABLE' as const,
        trendPercentage: 0,
      };
    })
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = productMetrics.reduce((sum, p) => sum + p.revenue, 0);
  const avgMargin = productMetrics.length > 0 ? productMetrics.reduce((sum, p) => sum + p.margin, 0) / productMetrics.length : 0;
  const activeProducts = productMetrics.length;
  const topProducts = productMetrics.slice(0, 10);
  const lowPenetrationProducts = productMetrics.filter((p) => p.penetration < 20);

  // Validate data quality
  const productAlerts: DataAlert[] = [];

  if (productData.length === 0) {
    productAlerts.push(
      generateAlert(
        'prod-001',
        'CRITICAL',
        'DATA_COMPLETENESS',
        'No products found in database',
        'Cannot analyze product portfolio or opportunities',
        'Verify product catalog is populated with accurate data',
        'totalProducts'
      )
    );
  }

  if (activeProducts < 3) {
    productAlerts.push(
      generateAlert(
        'prod-002',
        'WARNING',
        'INSUFFICIENT_SAMPLING',
        `Only ${activeProducts} products with sales in period`,
        'Limited product mix affects opportunity detection',
        'Analyze longer period or expand product offering',
        'activeProducts'
      )
    );
  }

  if (totalRevenue === 0) {
    productAlerts.push(
      generateAlert(
        'prod-003',
        'CRITICAL',
        'DATA_QUALITY',
        'No product revenue recorded in analysis period',
        'Cannot calculate margins or pricing analysis',
        'Verify sales data exists for analyzed period',
        'totalRevenue'
      )
    );
  }

  if (avgMargin < 10) {
    productAlerts.push(
      generateAlert(
        'prod-004',
        'WARNING',
        'DATA_RELIABILITY',
        `Average margin very low (${avgMargin}%)`,
        'Business profitability may be unsustainable',
        'Review pricing strategy and negotiate supplier costs',
        'avgMargin'
      )
    );
  }

  if (lowPenetrationProducts.length > totalProducts * 0.5) {
    productAlerts.push(
      generateAlert(
        'prod-005',
        'WARNING',
        'DATA_QUALITY',
        `${lowPenetrationProducts.length} products have <20% penetration`,
        'Large portfolio not reaching customer base effectively',
        'Consider consolidating product line or targeted marketing',
        'lowPenetrationProducts'
      )
    );
  }

  return {
    totalProducts: productData.length,
    activeProducts,
    avgMargin: Math.round(avgMargin),
    totalRevenue,
    topProducts,
    productAffinity: [],
    lowPenetrationProducts,
    seasonalProducts: [],
    gaps: {
      missingComplementary: [],
      lowMarginCategory: [],
    },
    alerts: productAlerts,
  };
}

// ============================================================================
// GEOGRAPHIC ANALYSIS ENGINE
// ============================================================================

export async function analyzeGeography(companyId: string, months: number = 12): Promise<GeographicAnalysis> {
  const startDate = subMonths(new Date(), months);

  // Get geographic distribution of customers
  const { data: geoData, error: geoError } = await supabase
    .from('customers')
    .select(`
      province,
      sales (
        total,
        created_at
      )
    `)
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString());

  if (geoError) throw geoError;

  if (!geoData || geoData.length === 0) {
    return {
      covered: [],
      uncovered: [],
      expansionStrategy: {
        nextHighPriority: 'No data',
        estimatedROI: 0,
        requiredInvestment: 0,
      },
    };
  }

  const totalGeoCustomers = geoData.length || 1;

  // Group by province
  const geoMap = new Map<string, any>();
  geoData.forEach((c: any) => {
    const province = c.province?.trim() || 'Unknown';
    if (!geoMap.has(province)) {
      geoMap.set(province, { customers: 0, revenue: 0, sales: [] });
    }
    const geo = geoMap.get(province);
    geo.customers += 1;
    if (Array.isArray(c.sales)) {
      c.sales.forEach((s: any) => {
        geo.revenue += Math.max(0, s.total || 0);
      });
      geo.sales.push(...c.sales);
    }
  });

  const covered: GeographicCoverage[] = Array.from(geoMap.entries())
    .map(([region, data]) => ({
      region,
      totalMarketSize: 0,
      yourMarketShare: 0,
      customerCount: data.customers,
      revenue: Math.max(0, data.revenue),
      penetration: (data.customers / totalGeoCustomers) * 100,
      avgTicket: Math.max(0, data.revenue / Math.max(data.customers, 1)),
      growthPotential: 0,
      competitors: 0,
      trend: 'STABLE' as const,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Identify uncovered regions
  const ARGENTINE_PROVINCES = [
    'Buenos Aires',
    'CABA',
    'Córdoba',
    'Rosario',
    'Mendoza',
    'Tucumán',
    'Santa Fe',
    'La Plata',
    'Mar del Plata',
  ];

  const coveredRegions = new Set(covered.map((c) => c.region));
  const uncovered = ARGENTINE_PROVINCES
    .filter((p) => !coveredRegions.has(p))
    .map((region) => ({
      region,
      potentialMarketSize: 0,
      estimatedCustomers: 0,
      estimatedRevenue: 0,
      barriers: [],
      requiredPartner: 'Distributor',
    }));

  const nextUncovered = uncovered.length > 0 ? uncovered[0].region : 'No expansion data';

  // Validate data quality
  const geoAlerts: DataAlert[] = [];

  if (covered.length === 0) {
    geoAlerts.push(
      generateAlert(
        'geo-001',
        'CRITICAL',
        'DATA_COMPLETENESS',
        'No geographic data found for any customers',
        'Cannot analyze expansion opportunities',
        'Ensure customers have province/location data populated',
        'covered'
      )
    );
  }

  if (covered.length === 1) {
    geoAlerts.push(
      generateAlert(
        'geo-002',
        'WARNING',
        'INSUFFICIENT_SAMPLING',
        'Operating in only 1 geographic region',
        'Limited geographic diversification - expansion potential significant but risky',
        'Analyze regional market data and identify strategic expansion zones',
        'covered'
      )
    );
  }

  const anyRegionWithoutData = covered.some((c) => c.customerCount < 2);
  if (anyRegionWithoutData) {
    geoAlerts.push(
      generateAlert(
        'geo-003',
        'INFO',
        'INSUFFICIENT_SAMPLING',
        'Some regions have very few customers',
        'Geographic analysis for those regions may not be statistically reliable',
        'Collect larger sample or use regional market research',
        'covered'
      )
    );
  }

  if (uncovered.length === 0) {
    geoAlerts.push(
      generateAlert(
        'geo-004',
        'INFO',
        'DATA_QUALITY',
        'All analyzed regions are covered - no uncovered expansion zones detected',
        'Geographic expansion analysis may be limited',
        'Research new geographic markets beyond analyzed regions',
        'uncovered'
      )
    );
  }

  return {
    covered,
    uncovered,
    expansionStrategy: {
      nextHighPriority: nextUncovered,
      estimatedROI: 0,
      requiredInvestment: 0,
    },
    alerts: geoAlerts,
  };
}

// ============================================================================
// SEGMENT ANALYSIS ENGINE
// ============================================================================

export async function analyzeSegments(companyId: string, months: number = 12): Promise<SegmentAnalysis> {
  const startDate = subMonths(new Date(), months);

  // Get customer segments by industry
  const { data: segmentData, error: segmentError } = await supabase
    .from('customers')
    .select(`
      industry,
      sales (
        total,
        created_at
      )
    `)
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString());

  if (segmentError) throw segmentError;

  if (!segmentData || segmentData.length === 0) {
    return {
      segments: [],
      dominantSegment: {} as any,
      underservedSegments: [],
      emptySegments: [],
    };
  }

  // Group by industry
  const industryMap = new Map<string, any>();
  segmentData.forEach((c: any) => {
    const industry = (c.industry || 'Unknown').trim();
    if (!industryMap.has(industry)) {
      industryMap.set(industry, { customers: 0, revenue: 0, sales: [] });
    }
    const seg = industryMap.get(industry);
    seg.customers += 1;
    if (Array.isArray(c.sales)) {
      c.sales.forEach((s: any) => {
        seg.revenue += Math.max(0, s.total || 0);
      });
      seg.sales.push(...c.sales);
    }
  });

  const totalCustomers = Math.max(segmentData.length, 1);
  const totalRevenue = Array.from(industryMap.values()).reduce((sum, s) => sum + Math.max(0, s.revenue), 0) || 1;

  const segments: IndustrySegment[] = Array.from(industryMap.entries())
    .map(([industry, data]) => {
      const percentage = (data.customers / totalCustomers) * 100;
      let dominance: 'DOMINANT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
      
      if (percentage >= 30) dominance = 'DOMINANT';
      else if (percentage >= 15) dominance = 'STRONG';
      else if (percentage >= 5) dominance = 'MODERATE';
      else if (percentage > 0) dominance = 'WEAK';
      else dominance = 'NONE';

      return {
        industry,
        customerCount: data.customers,
        percentOfTotal: percentage,
        revenue: Math.max(0, data.revenue),
        avgMargin: 22,
        dominance,
        growthTrend: 0,
        competitorCount: 0,
        marketShare: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        untappedPotential: 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const dominantSegment = segments[0];
  const underservedSegments = segments.filter((s) => s.dominance === 'WEAK' || s.dominance === 'MODERATE');

  // Validate data quality
  const segmentAlerts: DataAlert[] = [];

  if (segments.length === 0) {
    segmentAlerts.push(
      generateAlert(
        'seg-001',
        'WARNING',
        'DATA_COMPLETENESS',
        'No industry/segment data found for customers',
        'Cannot analyze market dominance or segment opportunities',
        'Populate industry field for customers to enable segment analysis',
        'segments'
      )
    );
  }

  if (segments.length === 1) {
    segmentAlerts.push(
      generateAlert(
        'seg-002',
        'WARNING',
        'INSUFFICIENT_SAMPLING',
        'Operating in only 1 industry segment',
        'Limited market diversification - high risk if segment declines',
        'Target adjacent industries or expand within current segment',
        'segments'
      )
    );
  }

  const dominantPercentage = dominantSegment?.percentOfTotal || 0;
  if (dominantPercentage > 70) {
    segmentAlerts.push(
      generateAlert(
        'seg-003',
        'WARNING',
        'DATA_QUALITY',
        `High segment concentration: ${dominantPercentage.toFixed(0)}% in ${dominantSegment?.industry}`,
        'Heavily dependent on single segment - market risk exposure',
        'Develop multi-segment strategy and diversify customer base',
        'dominantSegment'
      )
    );
  }

  if (underservedSegments.length > 0) {
    segmentAlerts.push(
      generateAlert(
        'seg-004',
        'INFO',
        'DATA_QUALITY',
        `${underservedSegments.length} segments underserved (WEAK/MODERATE dominance)`,
        'Opportunity gaps identified in less-dominant segments',
        'Create targeted offerings for WEAK/MODERATE dominance segments',
        'underservedSegments'
      )
    );
  }

  return {
    segments,
    dominantSegment,
    underservedSegments,
    emptySegments: [],
    alerts: segmentAlerts,
  };
}

export const analysisEngine = {
  analyzeCustomers,
  analyzeProducts,
  analyzeGeography,
  analyzeSegments,
};
