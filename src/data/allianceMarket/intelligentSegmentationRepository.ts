/**
 * INTELLIGENT SEGMENTATION REPOSITORY
 * Orchestrates analysis and intelligence engines
 * Manages segmentation reports and caching
 */

import { supabase } from '@/integrations/supabase/client';
import { analysisEngine } from '@/lib/analysisEngine';
import { intelligenceEngine } from '@/lib/intelligenceEngine';
import type {
  SegmentationReport,
  SegmentationMetrics,
  AllianceSuggestion,
  OpportunityGap,
} from '@/domain/allianceMarket/intelligentSegmentation';

// ============================================================================
// SEGMENTATION REPORT GENERATION & MANAGEMENT
// ============================================================================

export const intelligentSegmentationRepository = {
  /**
   * Generate a complete segmentation report
   * Analyzes real company data and generates actionable insights
   */
  async generateSegmentationReport(companyId: string, months: number = 12): Promise<SegmentationReport> {
    try {
      // Validate inputs
      if (!companyId?.trim()) {
        throw new Error('Company ID is required');
      }
      if (months <= 0 || months > 36) {
        throw new Error('Analysis period must be between 1 and 36 months');
      }

      console.log('[SEGMENTATION] Starting analysis for company:', companyId, `(${months} months)`);

      // STEP 1: Analyze all data sources in parallel
      const [customerAnalysis, productAnalysis, geographicAnalysis, segmentAnalysis] = await Promise.all([
        analysisEngine.analyzeCustomers(companyId, months),
        analysisEngine.analyzeProducts(companyId, months),
        analysisEngine.analyzeGeography(companyId, months),
        analysisEngine.analyzeSegments(companyId, months),
      ]);

      console.log('[SEGMENTATION] Analysis phase complete');

      // STEP 2: Detect gaps and generate suggestions
      const gaps = intelligenceEngine.detectGaps(
        customerAnalysis,
        productAnalysis,
        geographicAnalysis,
        segmentAnalysis
      );

      const suggestions = intelligenceEngine.generateAllianceSuggestions(
        customerAnalysis,
        productAnalysis,
        geographicAnalysis,
        segmentAnalysis,
        gaps
      );

      console.log(`[SEGMENTATION] Detected ${gaps.length} gaps and generated ${suggestions.length} suggestions`);

      // STEP 3: Calculate metrics
      const metrics = this.calculateMetrics(
        customerAnalysis,
        productAnalysis,
        geographicAnalysis,
        segmentAnalysis
      );

      // STEP 4: Collect all validation alerts
      const allAlerts = [
        ...customerAnalysis.alerts,
        ...productAnalysis.alerts,
        ...geographicAnalysis.alerts,
        ...segmentAnalysis.alerts,
      ];

      // Log critical alerts
      const criticalAlerts = allAlerts.filter((a) => a.severity === 'CRITICAL');
      if (criticalAlerts.length > 0) {
        console.warn(`[SEGMENTATION] ⚠️ ${criticalAlerts.length} CRITICAL alerts found:`, criticalAlerts.map((a) => a.message));
      }

      // STEP 5: Generate executive summary
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - Math.floor(months / 12));
      startDate.setDate(startDate.getDate() - ((months % 12) * 2.5));

      const report: SegmentationReport = {
        companyId,
        generatedAt: new Date(),
        analysisPeriod: {
          startDate,
          endDate: new Date(),
          daysOfData: months * 30,
        },
        customerAnalysis,
        productAnalysis,
        geographicAnalysis,
        segmentAnalysis,
        gaps,
        suggestions,
        allAlerts,
        executiveSummary: {
          overallHealth: this.calculateHealth(metrics),
          healthScore: Math.round((metrics.marketPenetration + metrics.segmentDominance) / 2),
          topPriorities: gaps.slice(0, 3).map((g) => g.title),
          estimatedTotalOpportunity: gaps.reduce((sum, g) => sum + (Math.max(0, g.estimatedImpact.revenue)), 0),
          confidenceLevel: this.calculateConfidenceLevel(allAlerts),
          keyInsights: this.generateKeyInsights(
            customerAnalysis,
            productAnalysis,
            geographicAnalysis,
            segmentAnalysis
          ),
        },
      };

      console.log('[SEGMENTATION] Report generation complete');

      // STEP 6: Store report
      await this.storeReport(report);

      return report;
    } catch (error) {
      console.error('[SEGMENTATION] Error generating report:', error);
      throw new Error(`Failed to generate segmentation report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get cached segmentation report if available
   */
  async getSegmentationReport(companyId: string): Promise<SegmentationReport | null> {
    try {
      const { data, error } = await supabase
        .from('alliance_market_segmentation_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      // Table doesn't exist or no data
      if (error) return null;
      if (!data) return null;

      // Reconstruct report from stored JSON
      return JSON.parse(data.report_data);
    } catch (error) {
      // Silently fail - cache table might not exist yet
      return null;
    }
  },

  /**
   * Get specific suggestions for a company
   */
  async getSuggestions(companyId: string): Promise<AllianceSuggestion[]> {
    const report = await this.getSegmentationReport(companyId);
    return report?.suggestions || [];
  },

  /**
   * Get specific gaps identified for a company
   */
  async getGaps(companyId: string): Promise<OpportunityGap[]> {
    const report = await this.getSegmentationReport(companyId);
    return report?.gaps || [];
  },

  /**
   * Calculate segmentation metrics
   */
  calculateMetrics(
    customerAnalysis: any,
    productAnalysis: any,
    geographicAnalysis: any,
    segmentAnalysis: any
  ): SegmentationMetrics {
    // Market penetration: what % of potential market do you reach?
    const marketPenetration = Math.min(
      (customerAnalysis.topGeographies?.[0]?.percentage || 0),
      100
    );

    // Segment dominance: how dominant are you in your main segment?
    const dominantSegment = segmentAnalysis.segments?.[0];
    const segmentDominance = dominantSegment ? dominantSegment.marketShare * 0.1 : 0; // Scaled

    // Product affinity: average affinity between products
    const productAffinity = productAnalysis.productAffinity?.length > 0
      ? 50 // Placeholder - would calculate average affinity
      : 0;

    // Geographic dispersion: how spread out are customers?
    const totalCovered = geographicAnalysis.covered?.length || 0;
    const geographicDispersion = Math.min(totalCovered * 20, 100);

    // Margin optimization: how close are you to optimal margin?
    const targetMargin = 30;
    const currentMargin = productAnalysis.avgMargin || 20;
    const marginOptimization = (currentMargin / targetMargin) * 100;

    // Growth potential: estimated opportunity size
    const totalRevenue = productAnalysis.totalRevenue || 1000000;
    const growthPotential = Math.min(
      (geographicAnalysis.uncovered?.reduce((sum: number, g: any) => sum + (g.estimatedRevenue || 0), 0) || 0) /
        totalRevenue * 100,
      100
    );

    return {
      marketPenetration: Math.round(marketPenetration),
      segmentDominance: Math.round(segmentDominance),
      productAffinity: Math.round(productAffinity),
      geographicDispersion: Math.round(geographicDispersion),
      marginOptimization: Math.round(marginOptimization),
      growthPotential: Math.round(growthPotential),
      competitivePosition: this.determineCompetitivePosition(
        marketPenetration,
        segmentDominance,
        marginOptimization
      ),
      marketOpportunitiesCount: 0,
      riskExposure: 100 - Math.round((marketPenetration + geographicDispersion) / 2),
    };
  },

  /**
   * Determine competitive position based on metrics
   */
  determineCompetitivePosition(
    penetration: number,
    dominance: number,
    margin: number
  ): 'LEADER' | 'STRONG' | 'COMPETITIVE' | 'CHALLENGER' | 'WEAK' {
    const score = (penetration + dominance + margin) / 3;
    if (score >= 80) return 'LEADER';
    if (score >= 60) return 'STRONG';
    if (score >= 40) return 'COMPETITIVE';
    if (score >= 20) return 'CHALLENGER';
    return 'WEAK';
  },

  /**
   * Calculate overall health score
   */
  calculateHealth(
    metrics: SegmentationMetrics
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    const avgScore =
      (metrics.marketPenetration +
        metrics.segmentDominance +
        metrics.geographicDispersion +
        metrics.marginOptimization) /
      4;

    if (avgScore >= 75) return 'EXCELLENT';
    if (avgScore >= 55) return 'GOOD';
    if (avgScore >= 35) return 'FAIR';
    return 'POOR';
  },

  /**
   * Calculate confidence level based on data alerts
   */
  calculateConfidenceLevel(alerts: any[]): number {
    let confidence = 100; // Start at 100%

    // Reduce confidence for each critical alert
    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');
    confidence -= criticalAlerts.length * 25; // -25% per critical

    // Reduce confidence for warning alerts
    const warningAlerts = alerts.filter((a) => a.severity === 'WARNING');
    confidence -= warningAlerts.length * 10; // -10% per warning

    // Info alerts don't affect confidence

    return Math.max(0, Math.min(100, confidence)); // Clamp 0-100
  },

  /**
   * Generate key insights from analysis
   */
  generateKeyInsights(
    customerAnalysis: any,
    productAnalysis: any,
    geographicAnalysis: any,
    segmentAnalysis: any
  ): string[] {
    const insights: string[] = [];

    // Insight 1: Customer concentration
    if (customerAnalysis.concentrationRatio > 60) {
      insights.push(
        `⚠️ High customer concentration: Top 20% of customers represent ${customerAnalysis.concentrationRatio.toFixed(0)}% of revenue. Risk of revenue loss if key customer churns.`
      );
    }

    // Insight 2: Top industry
    const topIndustry = segmentAnalysis.segments?.[0];
    if (topIndustry) {
      insights.push(
        `📊 Industry dominance: ${topIndustry.industry} is your main sector (${topIndustry.percentOfTotal.toFixed(1)}% of customers). Strong positioning here.`
      );
    }

    // Insight 3: Geographic gaps
    if (geographicAnalysis.uncovered?.length > 0) {
      insights.push(
        `🌍 Geographic opportunity: ${geographicAnalysis.uncovered.length} uncovered regions identified. Potential for distribution partnerships.`
      );
    }

    // Insight 4: Product mix
    if (productAnalysis.lowPenetrationProducts?.length > 0) {
      insights.push(
        `📦 Product gap: ${productAnalysis.lowPenetrationProducts.length} products have <20% customer penetration. Consider bundling or marketing initiatives.`
      );
    }

    // Insight 5: Margin opportunity
    if (productAnalysis.avgMargin < 25) {
      insights.push(
        `💰 Margin improvement: Current margin ${productAnalysis.avgMargin}% is below industry standard. Partner with higher-margin suppliers.`
      );
    }

    // Insight 6: Retention strength
    if (customerAnalysis.retentionRate > 80) {
      insights.push(
        `✅ Strong retention: ${customerAnalysis.retentionRate.toFixed(0)}% customer retention indicates product-market fit and customer satisfaction.`
      );
    }

    return insights;
  },

  /**
   * Store segmentation report in database
   */
  async storeReport(report: SegmentationReport): Promise<void> {
    try {
      const { error } = await supabase.from('alliance_market_segmentation_reports').insert({
        company_id: report.companyId,
        generated_at: report.generatedAt,
        report_data: JSON.stringify(report),
        health_score: report.executiveSummary.healthScore,
        opportunities_count: report.gaps.length,
        suggestions_count: report.suggestions.length,
      });

      if (error) {
        // Silently fail - cache table might not exist yet
        return;
      }
      console.log('[SEGMENTATION] Report stored successfully');
    } catch (error) {
      // Silently fail - do not throw
    }
  },

  /**
   * Invalidate cached report (force regeneration)
   */
  async invalidateReport(companyId: string): Promise<void> {
    try {
      await supabase
        .from('alliance_market_segmentation_reports')
        .delete()
        .eq('company_id', companyId);
      console.log('[SEGMENTATION] Report invalidated');
    } catch (error) {
      // Silently fail - cache table might not exist
    }
  },
};
