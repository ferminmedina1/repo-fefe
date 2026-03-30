/**
 * ALLIANCE MARKET V2 - Intelligent Segmentation
 * Real data analysis system instead of AI-generated fake profiles
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AllianceSuggestionType = 'DISTRIBUTOR' | 'SUPPLIER' | 'SERVICE_PARTNER' | 'CHANNEL_PARTNER' | 'TECHNOLOGY_PARTNER';
export type GapType = 'PRODUCT_GAP' | 'GEOGRAPHIC_GAP' | 'SEGMENT_GAP' | 'SERVICE_GAP' | 'MARGIN_GAP';
export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

// ============================================================================
// DATA VALIDATION ALERTS
// ============================================================================

export interface DataAlert {
  id: string;
  severity: AlertSeverity;
  category: 'DATA_QUALITY' | 'DATA_COMPLETENESS' | 'DATA_RELIABILITY' | 'INSUFFICIENT_SAMPLING';
  message: string;
  impact: string; // What this means for report
  recommendation: string;
  affectedMetric?: string;
}

// ============================================================================
// CUSTOMER ANALYSIS
// ============================================================================

export interface CustomerSegment {
  id: string;
  name: string;
  count: number;
  percentOfTotal: number;
  avgTicket: number;
  buyingFrequency: string; // e.g., "15 days"
  topProducts: string[];
  maxMargin: number;
  minMargin: number;
  avgMargin: number;
  growthRate: number; // percentage
}

export interface CustomerAnalysis {
  totalCustomers: number;
  activeCustomers: number;
  avgTicket: number;
  churnRate: number;
  retentionRate: number;
  segments: CustomerSegment[];
  topIndustries: { industry: string; count: number; percentage: number }[];
  topGeographies: { region: string; count: number; percentage: number; uncovered?: boolean }[];
  buyingPatterns: {
    avgFrequency: string;
    seasonality: { month: string; sales: number }[];
    topProducts: string[];
  };
  customerLifetimeValue: number;
  concentrationRatio: number; // How much do top 20% customers represent
  alerts: DataAlert[]; // Validation alerts
}

// ============================================================================
// PRODUCT ANALYSIS
// ============================================================================

export interface ProductMetrics {
  productId: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  penetration: number; // % of customers who buy this
  volumePerCustomer: number;
  seasonality: string;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
  trendPercentage: number;
}

export interface ProductAffinity {
  productA: string;
  productB: string;
  frequency: number; // % of times bought together
  avgTicketIncrease: number;
  marginIncrease: number;
}

export interface ProductAnalysis {
  totalProducts: number;
  activeProducts: number;
  avgMargin: number;
  totalRevenue: number;
  topProducts: ProductMetrics[];
  productAffinity: ProductAffinity[];
  lowPenetrationProducts: ProductMetrics[]; // Products not reaching enough customers
  seasonalProducts: ProductMetrics[];
  gaps: {
    missingComplementary: string[]; // Products customers ask for but don't sell
    lowMarginCategory: string[];
  };
  alerts: DataAlert[]; // Validation alerts
}

// ============================================================================
// GEOGRAPHIC ANALYSIS
// ============================================================================

export interface GeographicCoverage {
  region: string;
  totalMarketSize: number;
  yourMarketShare: number;
  customerCount: number;
  revenue: number;
  penetration: number; // % of potential customers reached
  avgTicket: number;
  growthPotential: number;
  competitors: number;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
}

export interface GeographicAnalysis {
  covered: GeographicCoverage[];
  uncovered: {
    region: string;
    potentialMarketSize: number;
    estimatedCustomers: number;
    estimatedRevenue: number;
    barriers: string[];
    requiredPartner: string;
  }[];
  expansionStrategy: {
    nextHighPriority: string;
    estimatedROI: number;
    requiredInvestment: number;
  };
  alerts: DataAlert[]; // Validation alerts
}

// ============================================================================
// SEGMENT ANALYSIS
// ============================================================================

export interface IndustrySegment {
  industry: string;
  customerCount: number;
  percentOfTotal: number;
  revenue: number;
  avgMargin: number;
  dominance: 'DOMINANT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
  growthTrend: number; // percentage
  competitorCount: number;
  marketShare: number;
  untappedPotential: number;
}

export interface SegmentAnalysis {
  segments: IndustrySegment[];
  dominantSegment: IndustrySegment;
  underservedSegments: IndustrySegment[];
  emptySegments: { industry: string; potentialMarket: number }[];
  alerts: DataAlert[]; // Validation alerts
}

// ============================================================================
// OPPORTUNITY DETECTION
// ============================================================================

export interface OpportunityGap {
  id: string;
  type: GapType;
  title: string;
  description: string;
  affectedMetric: string;
  currentState: string;
  targetState: string;
  impactLevel: number; // 0-100
  estimatedImpact: {
    revenue: number;
    margin: number;
    customerRetention: number;
    marketShare: number;
  };
  riskLevel: RiskLevel;
  requiredAllianceType: AllianceSuggestionType;
  actionItems: string[];
}

// ============================================================================
// ALLIANCE SUGGESTIONS
// ============================================================================

export interface AllianceSuggestion {
  id: string;
  type: AllianceSuggestionType;
  title: string;
  description: string;
  priority: PriorityLevel;
  riskLevel: RiskLevel;
  relatedGaps: string[]; // IDs of gaps this addresses
  businessProfile: {
    industry: string;
    region?: string;
    recommendedSize: 'STARTUP' | 'PYME' | 'MEDIANA' | 'GRANDE';
    characteristics: string[];
    criticalRequirements: string[];
    niceToHave: string[];
  };
  whyNeeded: {
    primaryReason: string;
    secondaryReasons: string[];
    urgency: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONGTERM';
  };
  expectedImpact: {
    revenueIncrease: number;
    marginIncrease: number;
    customerRetentionImprovement: number;
    marketCoverageExpansion: number;
    competitiveAdvantage: string;
  };
  implementationPath: {
    phase1: string;
    phase2: string;
    phase3: string;
    timelineMonths: number;
  };
  successMetrics: string[];
  exitStrategy: string;
}

// ============================================================================
// COMPREHENSIVE SEGMENTATION REPORT
// ============================================================================

export interface SegmentationReport {
  companyId: string;
  generatedAt: Date;
  analysisPeriod: {
    startDate: Date;
    endDate: Date;
    daysOfData: number;
  };
  
  // Individual analyses
  customerAnalysis: CustomerAnalysis;
  productAnalysis: ProductAnalysis;
  geographicAnalysis: GeographicAnalysis;
  segmentAnalysis: SegmentAnalysis;
  
  // Synthesized insights
  gaps: OpportunityGap[];
  suggestions: AllianceSuggestion[];
  
  // All validation alerts from all analyses
  allAlerts: DataAlert[];
  
  // Executive summary
  executiveSummary: {
    overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    healthScore: number; // 0-100
    topPriorities: string[];
    estimatedTotalOpportunity: number; // revenue
    confidenceLevel: number; // 0-100
    keyInsights: string[];
  };
}

// ============================================================================
// METRICS & KPIs
// ============================================================================

export interface SegmentationMetrics {
  marketPenetration: number; // % of potential market reached
  segmentDominance: number; // How dominant in your main segment
  productAffinity: number; // Average product affinity score
  geographicDispersion: number; // How spread out geographically
  marginOptimization: number; // How optimized margins are
  growthPotential: number; // Estimated growth opportunity
  competitivePosition: 'LEADER' | 'STRONG' | 'COMPETITIVE' | 'CHALLENGER' | 'WEAK';
  marketOpportunitiesCount: number;
  riskExposure: number;
}
