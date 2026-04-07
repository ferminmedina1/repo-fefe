/**
 * INTELLIGENCE ENGINE
 * Converts analysis data into actionable alliance suggestions
 * Based on identified gaps and opportunities
 */

import type {
  OpportunityGap,
  AllianceSuggestion,
  SegmentationReport,
  CustomerAnalysis,
  ProductAnalysis,
  GeographicAnalysis,
  SegmentAnalysis,
  GapType,
  AllianceSuggestionType,
  PriorityLevel,
  RiskLevel,
} from '@/domain/allianceMarket/intelligentSegmentation';

// ============================================================================
// GAP DETECTION ENGINE
// ============================================================================

export function detectGaps(
  customerAnalysis: CustomerAnalysis,
  productAnalysis: ProductAnalysis,
  geographicAnalysis: GeographicAnalysis,
  segmentAnalysis: SegmentAnalysis
): OpportunityGap[] {
  const gaps: OpportunityGap[] = [];
  let gapCounter = 0;

  // Validate inputs
  if (!customerAnalysis || !productAnalysis || !geographicAnalysis || !segmentAnalysis) {
    console.warn('[INTELLIGENCE] Incomplete analysis data provided to detectGaps');
    return gaps;
  }

  // ---- GAP 1: GEOGRAPHIC GAPS ----
  if (geographicAnalysis.uncovered && geographicAnalysis.uncovered.length > 0) {
    const topUncovered = geographicAnalysis.uncovered[0];
    gaps.push({
      id: `gap-${++gapCounter}`,
      type: 'GEOGRAPHIC_GAP',
      title: `Expansion Opportunity: ${topUncovered.region}`,
      description: `No current presence in ${topUncovered.region}. Identified ${topUncovered.estimatedCustomers || 0} potential customers with similar profile to your current base.`,
      affectedMetric: 'Geographic Coverage',
      currentState: `0% coverage in ${topUncovered.region}`,
      targetState: `15-20% coverage in ${topUncovered.region}`,
      impactLevel: Math.min(75, Math.max(0, 75)),
      estimatedImpact: {
        revenue: Math.max(0, topUncovered.estimatedRevenue || 500000),
        margin: 22,
        customerRetention: 5,
        marketShare: 2,
      },
      riskLevel: 'MEDIUM',
      requiredAllianceType: 'DISTRIBUTOR',
      actionItems: [
        `Profile ideal distributor for ${topUncovered.region}`,
        'Estimate distribution margins',
        'Create partnership proposal',
        'Research 5-10 local potential partners',
      ],
    });
  }

  // ---- GAP 2: PRODUCT GAPS ----
  if (productAnalysis.lowPenetrationProducts && Array.isArray(productAnalysis.lowPenetrationProducts) && productAnalysis.lowPenetrationProducts.length > 0) {
    const lowProducts = productAnalysis.lowPenetrationProducts.slice(0, 2);
    const revenueBase = Math.max(1, productAnalysis.totalRevenue || 1000000);
    gaps.push({
      id: `gap-${++gapCounter}`,
      type: 'PRODUCT_GAP',
      title: 'Low Penetration Products',
      description: `${lowProducts.length} products have <20% customer penetration. Consider bundling or partnering to increase reach.`,
      affectedMetric: 'Product Mix',
      currentState: `${lowProducts.length} low-penetration products`,
      targetState: 'All products >30% penetration',
      impactLevel: 50,
      estimatedImpact: {
        revenue: Math.max(0, revenueBase * 0.08),
        margin: 5,
        customerRetention: 3,
        marketShare: 1,
      },
      riskLevel: 'LOW',
      requiredAllianceType: 'CHANNEL_PARTNER',
      actionItems: [
        'Analyze why these products have low penetration',
        'Create targeted marketing campaign',
        'Consider strategic partnerships for distribution',
      ],
    });
  }

  // ---- GAP 3: SEGMENT GAPS ----
  const underservedCount = segmentAnalysis.underservedSegments?.length || 0;
  if (underservedCount > 0) {
    const topUnderserved = segmentAnalysis.underservedSegments![0];
    const revenueBase = Math.max(1, productAnalysis.totalRevenue || 1000000);
    gaps.push({
      id: `gap-${++gapCounter}`,
      type: 'SEGMENT_GAP',
      title: `Underserved Market: ${topUnderserved.industry}`,
      description: `${topUnderserved.industry} segment is underserved (${(topUnderserved.percentOfTotal || 0).toFixed(1)}% of revenue). Similar companies dominate this sector.`,
      affectedMetric: 'Market Dominance',
      currentState: `${(topUnderserved.percentOfTotal || 0).toFixed(1)}% of revenue from ${topUnderserved.industry}`,
      targetState: `15-20% of revenue from ${topUnderserved.industry}`,
      impactLevel: 70,
      estimatedImpact: {
        revenue: Math.max(0, revenueBase * 0.12),
        margin: 3,
        customerRetention: 0,
        marketShare: 3,
      },
      riskLevel: 'MEDIUM',
      requiredAllianceType: 'CHANNEL_PARTNER',
      actionItems: [
        `Research ${topUnderserved.industry} market specifics`,
        'Identify specific product gaps in this segment',
        'Find strategic partner with presence in sector',
        'Create tailored offering for this industry',
      ],
    });
  }

  // ---- GAP 4: COMPLEMENTARY PRODUCT GAP ----
  if (productAnalysis.gaps?.missingComplementary && Array.isArray(productAnalysis.gaps.missingComplementary) && productAnalysis.gaps.missingComplementary.length > 0) {
    const missingProduct = productAnalysis.gaps.missingComplementary[0];
    const revenueBase = Math.max(1, productAnalysis.totalRevenue || 1000000);
    gaps.push({
      id: `gap-${++gapCounter}`,
      type: 'PRODUCT_GAP',
      title: `Complementary Product: ${missingProduct}`,
      description: `Customers frequently ask for ${missingProduct} but you don't offer it. Represents cross-sell opportunity.`,
      affectedMetric: 'Product Offering',
      currentState: `Not offering ${missingProduct}`,
      targetState: `Offering ${missingProduct} (via partnership or internal)`,
      impactLevel: 60,
      estimatedImpact: {
        revenue: Math.max(0, revenueBase * 0.10),
        margin: 8,
        customerRetention: 8,
        marketShare: 0,
      },
      riskLevel: 'LOW',
      requiredAllianceType: 'SUPPLIER',
      actionItems: [
        `Validate customer demand for ${missingProduct}`,
        'Identify potential suppliers',
        'Negotiate partnership terms',
        'Create bundled offering',
      ],
    });
  }

  // ---- GAP 5: MARGIN OPTIMIZATION GAP ----
  const avgMargin = productAnalysis.avgMargin || 20;
  if (avgMargin < 25) {
    gaps.push({
      id: `gap-${++gapCounter}`,
      type: 'MARGIN_GAP',
      title: 'Margin Optimization Opportunity',
      description: `Current average margin is ${avgMargin}%. Industry benchmark is 25-30%. Partnership with higher-margin products could improve overall margin.`,
      affectedMetric: 'Profitability',
      currentState: `${avgMargin}% average margin`,
      targetState: '25-30% average margin',
      impactLevel: 55,
      estimatedImpact: {
        revenue: 0,
        margin: 5,
        customerRetention: 2,
        marketShare: 0,
      },
      riskLevel: 'LOW',
      requiredAllianceType: 'SUPPLIER',
      actionItems: [
        'Analyze product margins by category',
        'Identify low-margin products',
        'Consider replacing with higher-margin alternatives',
        'Negotiate better supplier rates',
      ],
    });
  }

  // ---- GAP 6: SERVICE GAPS ----
  const revenueBase = Math.max(1, productAnalysis.totalRevenue || 1000000);
  gaps.push({
    id: `gap-${++gapCounter}`,
    type: 'SERVICE_GAP',
    title: 'Integrated Logistics Service',
    description: 'Customers increasingly expect integrated delivery and logistics. Current offering may be limiting retention.',
    affectedMetric: 'Customer Experience',
    currentState: 'Manual logistics coordination',
    targetState: 'Integrated, tracked logistics partner',
    impactLevel: 45,
    estimatedImpact: {
      revenue: Math.max(0, revenueBase * 0.08),
      margin: 2,
      customerRetention: 12,
      marketShare: 1,
    },
    riskLevel: 'MEDIUM',
    requiredAllianceType: 'SERVICE_PARTNER',
    actionItems: [
      'Survey customers on logistics satisfaction',
      'Identify local logistics partners',
      'Negotiate integration terms',
      'Create unified tracking experience',
    ],
  });

  return gaps.sort((a, b) => b.impactLevel - a.impactLevel);
}

// ============================================================================
// ALLIANCE SUGGESTION ENGINE
// ============================================================================

export function generateAllianceSuggestions(
  customerAnalysis: CustomerAnalysis,
  productAnalysis: ProductAnalysis,
  geographicAnalysis: GeographicAnalysis,
  segmentAnalysis: SegmentAnalysis,
  gaps: OpportunityGap[]
): AllianceSuggestion[] {
  const suggestions: AllianceSuggestion[] = [];

  // Main geography for calculations
  const mainGeography = geographicAnalysis.covered[0];
  const topIndustry = segmentAnalysis.segments[0];

  // ---- SUGGESTION 1: REGIONAL DISTRIBUTOR ----
  if (gaps.some((g) => g.type === 'GEOGRAPHIC_GAP')) {
    const gapId = gaps.find((g) => g.type === 'GEOGRAPHIC_GAP')?.id;
    suggestions.push({
      id: 'sug-1',
      type: 'DISTRIBUTOR',
      title: 'Regional Distributor Partner',
      description: 'Establish distribution partnership in uncovered regions to expand geographic reach and market penetration.',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      relatedGaps: gapId ? [gapId] : [],
      businessProfile: {
        industry: 'Distribution / Logistics',
        region: geographicAnalysis.uncovered[0]?.region,
        recommendedSize: 'PYME',
        characteristics: [
          'Established in target region',
          'Existing customer network in your industries',
          'Logistics infrastructure',
          'Proven track record',
        ],
        criticalRequirements: [
          'Local market knowledge',
          'Sales team in region',
          'Ability to handle your product volume',
        ],
        niceToHave: [
          'Experience with similar products',
          'Digital order management system',
          'Financial stability',
        ],
      },
      whyNeeded: {
        primaryReason: `Zero presence in ${geographicAnalysis.uncovered[0]?.region}. Estimated ${geographicAnalysis.uncovered[0]?.estimatedCustomers} potential customers.`,
        secondaryReasons: [
          'Faster market entry than direct expansion',
          'Lower operational risk',
          'Leverage existing relationships',
        ],
        urgency: 'SHORT_TERM',
      },
      expectedImpact: {
        revenueIncrease: geographicAnalysis.uncovered[0]?.estimatedRevenue || 500000,
        marginIncrease: 3,
        customerRetentionImprovement: 0,
        marketCoverageExpansion: 15,
        competitiveAdvantage: 'First-mover advantage in region',
      },
      implementationPath: {
        phase1: 'Identify and vet potential distributors',
        phase2: 'Negotiate terms and sign agreement',
        phase3: 'Training, inventory setup, soft launch',
        timelineMonths: 4,
      },
      successMetrics: [
        `Minimum 10 customers acquired in ${geographicAnalysis.uncovered[0]?.region}`,
        '$100k+ monthly revenue',
        'Distributor satisfaction score >8/10',
        'On-time delivery rate >95%',
      ],
      exitStrategy: 'Can transition to direct sales if region proves profitable, or maintain partnership',
    });
  }

  // ---- SUGGESTION 2: COMPLEMENTARY PRODUCT SUPPLIER ----
  if (gaps.some((g) => g.type === 'PRODUCT_GAP' && g.title.includes('Complementary'))) {
    const gapId = gaps.find((g) => g.type === 'PRODUCT_GAP' && g.title.includes('Complementary'))?.id;
    suggestions.push({
      id: 'sug-2',
      type: 'SUPPLIER',
      title: 'Complementary Product Supplier',
      description: 'Partner with supplier for products customers need alongside your offerings. Increases customer lifetime value.',
      priority: 'HIGH',
      riskLevel: 'LOW',
      relatedGaps: gapId ? [gapId] : [],
      businessProfile: {
        industry: 'Manufacturing / Distribution (Complementary sector)',
        recommendedSize: 'PYME',
        characteristics: [
          'Manufactures/distributes complementary products',
          'Quality standards match yours',
          'Pricing competitiveness',
          'Flexible minimum orders',
        ],
        criticalRequirements: [
          'Product quality compatibility',
          'Reliable supply chain',
          'Willing to white-label or rebrand',
        ],
        niceToHave: [
          'API for inventory sync',
          'Drop-shipping capability',
          'Co-marketing support',
        ],
      },
      whyNeeded: {
        primaryReason: 'Customers frequently request complementary products. 70% of customers want bundled solutions.',
        secondaryReasons: [
          'Increases average transaction value',
          'Improves customer retention',
          'Higher margins on bundled offerings',
        ],
        urgency: 'SHORT_TERM',
      },
      expectedImpact: {
        revenueIncrease: productAnalysis.totalRevenue * 0.10,
        marginIncrease: 8,
        customerRetentionImprovement: 15,
        marketCoverageExpansion: 0,
        competitiveAdvantage: 'One-stop-shop for customers',
      },
      implementationPath: {
        phase1: 'Validate customer demand with surveys',
        phase2: 'Negotiate pricing and terms with supplier',
        phase3: 'Training and integration into sales process',
        timelineMonths: 3,
      },
      successMetrics: [
        '30% of orders include complementary product within 6 months',
        '+15% average order value',
        'Customer feedback score >4.5/5 for bundled offering',
        'Supplier on-time delivery >98%',
      ],
      exitStrategy: 'Can internalize product if sales justify, or maintain partnership for flexibility',
    });
  }

  // ---- SUGGESTION 3: SEGMENT-SPECIFIC CHANNEL PARTNER ----
  if (gaps.some((g) => g.type === 'SEGMENT_GAP')) {
    const gapId = gaps.find((g) => g.type === 'SEGMENT_GAP')?.id;
    const underservedSegment = segmentAnalysis.underservedSegments[0];
    suggestions.push({
      id: 'sug-3',
      type: 'CHANNEL_PARTNER',
      title: `Industry Specialist: ${underservedSegment?.industry}`,
      description: `Partner with ${underservedSegment?.industry} specialist to penetrate underserved market segment.`,
      priority: 'MEDIUM',
      riskLevel: 'MEDIUM',
      relatedGaps: gapId ? [gapId] : [],
      businessProfile: {
        industry: underservedSegment?.industry,
        recommendedSize: 'PYME',
        characteristics: [
          `Deep expertise in ${underservedSegment?.industry}`,
          'Existing customer relationships in sector',
          'Understanding of industry-specific needs',
          'Complementary service offering',
        ],
        criticalRequirements: [
          `Established network in ${underservedSegment?.industry}`,
          'Sales capability',
          'Willingness to learn your products',
        ],
        niceToHave: [
          'Digital presence / online following',
          'Industry certifications',
          'Technical support capability',
        ],
      },
      whyNeeded: {
        primaryReason: `${underservedSegment?.industry} represents only ${underservedSegment?.percentOfTotal.toFixed(1)}% of revenue but has growth potential. Specialist partner can accelerate penetration.`,
        secondaryReasons: [
          'Industry-specific knowledge advantage',
          'Faster sales cycle with warm introductions',
          'Price positioning advantage',
        ],
        urgency: 'MEDIUM_TERM',
      },
      expectedImpact: {
        revenueIncrease: productAnalysis.totalRevenue * 0.12,
        marginIncrease: 3,
        customerRetentionImprovement: 5,
        marketCoverageExpansion: 10,
        competitiveAdvantage: 'Industry-specific positioning',
      },
      implementationPath: {
        phase1: 'Research ${underservedSegment?.industry} market and potential partners',
        phase2: 'Create industry-specific pitch and proposal',
        phase3: 'Pilot with 5-10 accounts, optimize offer',
        timelineMonths: 5,
      },
      successMetrics: [
        `${underservedSegment?.industry} revenue reaches 12% of total within 12 months`,
        'Minimum 15 new customers in sector',
        'Partner satisfaction >8/10',
        'Conversion rate >25% from partner leads',
      ],
      exitStrategy: 'Can evolve into equity partnership or acquisition if successful',
    });
  }

  // ---- SUGGESTION 4: LOGISTICS/SERVICE PARTNER ----
  if (gaps.some((g) => g.type === 'SERVICE_GAP')) {
    const gapId = gaps.find((g) => g.type === 'SERVICE_GAP')?.id;
    suggestions.push({
      id: 'sug-4',
      type: 'SERVICE_PARTNER',
      title: 'Integrated Logistics Partner',
      description: 'Partner with logistics provider for integrated delivery, tracking, and fulfillment to enhance customer experience.',
      priority: 'MEDIUM',
      riskLevel: 'LOW',
      relatedGaps: gapId ? [gapId] : [],
      businessProfile: {
        industry: 'Logistics / Transportation / 3PL',
        region: mainGeography?.region,
        recommendedSize: 'MEDIANA',
        characteristics: [
          'Established delivery network in your coverage area',
          'Real-time tracking capability',
          'Flexible delivery scheduling',
          'Competitive pricing',
          'Professional customer service',
        ],
        criticalRequirements: [
          'API for order integration',
          'Same-day or next-day delivery capability',
          'Insurance and liability coverage',
          'Proven reliability (>95% on-time)',
        ],
        niceToHave: [
          'Return logistics handling',
          'Temperature-controlled options',
          'Real-time inventory sync',
        ],
      },
      whyNeeded: {
        primaryReason: 'Customers increasingly expect fast, tracked deliveries. Logistics is key retention factor.',
        secondaryReasons: [
          'Reduces operational complexity',
          'Improves customer satisfaction',
          'Enables expansion to wider geography',
          'Reduces in-house logistics costs',
        ],
        urgency: 'MEDIUM_TERM',
      },
      expectedImpact: {
        revenueIncrease: productAnalysis.totalRevenue * 0.08,
        marginIncrease: 1,
        customerRetentionImprovement: 12,
        marketCoverageExpansion: 5,
        competitiveAdvantage: 'Superior customer experience',
      },
      implementationPath: {
        phase1: 'Audit current logistics challenges',
        phase2: 'Evaluate 3-5 logistics providers',
        phase3: 'Pilot with select orders, measure metrics',
        timelineMonths: 3,
      },
      successMetrics: [
        'Delivery on-time rate >98%',
        'Customer satisfaction with logistics >4.5/5',
        '+10% customer retention after launch',
        'Delivery cost per package -15% vs current',
      ],
      exitStrategy: 'Long-term partnership with periodic service reviews and renegotiation',
    });
  }

  return suggestions.sort((a, b) => {
    const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (priorityScore[b.priority] - priorityScore[a.priority]) * 1000 +
           (b.expectedImpact.revenueIncrease - a.expectedImpact.revenueIncrease);
  });
}

// Export engine
export const intelligenceEngine = {
  detectGaps,
  generateAllianceSuggestions,
};
