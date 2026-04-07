/**
 * ALLIANCE MARKET V2 - Segmentación Inteligente
 * Reemplaza perfiles ficticios con análisis de datos reales y segmentación
 * Muestra oportunidades de negocio accionables basadas en tus datos reales
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BarChart3, TrendingUp, Zap, RefreshCw, Download, Eye, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';
import { intelligentSegmentationRepository } from '@/data/allianceMarket/intelligentSegmentationRepository';
import { AllianceMarketDataConsent } from '@/components/allianceMarket/AllianceMarketDataConsent';
import { useAllianceMarketConsent } from '@/hooks/useAllianceMarketConsent';
import type {
  SegmentationReport,
  AllianceSuggestion,
  OpportunityGap,
} from '@/domain/allianceMarket/intelligentSegmentation';

export default function AllianceMarket() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id ?? '';

  const { showDialog, setShowDialog, preferences, resetConsent } = useAllianceMarketConsent();
  
  const [selectedSuggestion, setSelectedSuggestion] = useState<AllianceSuggestion | null>(null);
  const [selectedGap, setSelectedGap] = useState<OpportunityGap | null>(null);

  // ── Generate/Get Segmentation Report ──
  const { data: report, isLoading: reportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['alliance-segmentation-report', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      // First try to get cached report
      let cachedReport = await intelligentSegmentationRepository.getSegmentationReport(companyId);
      
      // If no cache or older than 24 hours, regenerate
      if (!cachedReport || 
          (new Date().getTime() - new Date(cachedReport.generatedAt).getTime()) > 24 * 60 * 60 * 1000) {
        cachedReport = await intelligentSegmentationRepository.generateSegmentationReport(companyId, 12);
      }
      
      return cachedReport;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // ── Regenerate Report Mutation ──
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No hay empresa seleccionada');
      await intelligentSegmentationRepository.invalidateReport(companyId);
      return intelligentSegmentationRepository.generateSegmentationReport(companyId, 12);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-segmentation-report', companyId] });
      toast.success('Análisis de segmentación actualizado');
    },
    onError: (error: any) => {
      toast.error('Error al regenerar análisis: ' + error.message);
    },
  });

  if (!companyId) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay empresa seleccionada</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mercado de Alianzas</h1>
            <p className="text-gray-600 mt-1">
              Análisis de segmentación inteligente basado en tus datos comerciales reales
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDialog(true)}
              variant="ghost"
              size="icon"
              title="Preferencias de datos"
              className="h-10 w-10"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              Actualizar Análisis
            </Button>
          </div>
        </div>

        {reportLoading || !report ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {/* VALIDATION ALERTS BANNER */}
            {report.allAlerts && report.allAlerts.length > 0 && (
              <Card className={`border-l-4 ${
                report.allAlerts.some((a) => a.severity === 'CRITICAL')
                  ? 'border-l-red-500 bg-red-50'
                  : report.allAlerts.some((a) => a.severity === 'WARNING')
                  ? 'border-l-yellow-500 bg-yellow-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Alertas de Calidad de Datos ({report.allAlerts.length})
                  </CardTitle>
                  <CardDescription>
                    {report.allAlerts.filter((a) => a.severity === 'CRITICAL').length > 0
                      ? '⚠️ Problemas críticos encontrados - algunas métricas pueden no ser confiables'
                      : report.allAlerts.filter((a) => a.severity === 'WARNING').length > 0
                      ? '⚠️ Advertencias detectadas - revisa antes de confiar en las recomendaciones'
                      : 'ℹ️ Alertas informativas - bueno saberlo'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.allAlerts.map((alert, idx) => (
                      <div key={alert.id || idx} className="flex gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                        <div className="flex-shrink-0 pt-0.5">
                          <div className={`w-2 h-2 rounded-full ${
                            alert.severity === 'CRITICAL' ? 'bg-red-600' : 
                            alert.severity === 'WARNING' ? 'bg-yellow-600' : 
                            'bg-blue-600'
                          }`} />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                              <p className="text-xs text-gray-600 mt-1">{alert.impact}</p>
                              <p className="text-xs text-gray-500 mt-1 italic">💡 {alert.recommendation}</p>
                            </div>
                            <Badge variant="outline" className="whitespace-nowrap">
                              {alert.category.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* EXECUTIVE SUMMARY */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumen Ejecutivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Health Score */}
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">Salud General</div>
                    <div className="text-2xl font-bold">
                      {report.executiveSummary.healthScore.toFixed(0)}/100
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {report.executiveSummary.overallHealth}
                    </div>
                  </div>

                  {/* Confidence Level */}
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">Confianza del Análisis</div>
                    <div className="text-2xl font-bold">
                      {report.executiveSummary.confidenceLevel.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {report.executiveSummary.confidenceLevel >= 80
                        ? 'Confianza alta' 
                        : report.executiveSummary.confidenceLevel >= 60
                        ? 'Buena confianza'
                        : report.executiveSummary.confidenceLevel >= 40
                        ? 'Confianza moderada'
                        : 'Baja confianza'}
                    </div>
                  </div>

                  {/* Opportunities */}
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">Oportunidades Encontradas</div>
                    <div className="text-2xl font-bold">{report.gaps.length}</div>
                    <div className="text-xs text-gray-500 mt-1">brechas identificadas</div>
                  </div>

                  {/* Total Opportunity */}
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">Oportunidad Total Est.</div>
                    <div className="text-2xl font-bold">
                      ${(report.executiveSummary.estimatedTotalOpportunity / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-500 mt-1">potencial de ingresos</div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="space-y-2 pt-4 border-t">
                  <h3 className="font-semibold text-sm">Perspectivas Clave</h3>
                  <ul className="space-y-2">
                    {report.executiveSummary.keyInsights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* TABS */}
            <Tabs defaultValue="gaps" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gaps" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Oportunidades ({report.gaps.length})
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sugerencias ({report.suggestions.length})
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Detalles del Análisis
                </TabsTrigger>
              </TabsList>

              {/* GAPS TAB */}
              <TabsContent value="gaps" className="space-y-4">
                {report.gaps.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-600">
                      No se identificaron brechas - ¡Tu negocio está bien optimizado!
                    </CardContent>
                  </Card>
                ) : (
                  report.gaps.map((gap) => (
                    <Card
                      key={gap.id}
                      className="cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => setSelectedGap(gap)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{gap.title}</CardTitle>
                            <CardDescription className="mt-1">{gap.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={`${
                                gap.impactLevel > 70
                                  ? 'bg-red-100 text-red-800'
                                  : gap.impactLevel > 50
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Impact: {gap.impactLevel}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">Impacto de Ingresos</div>
                            <div className="font-semibold">
                              ${(gap.estimatedImpact.revenue / 1000).toFixed(0)}k
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Margen +</div>
                            <div className="font-semibold">{gap.estimatedImpact.margin}%</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Tipo</div>
                            <div className="font-semibold">{gap.type}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Riesgo</div>
                            <div className={`font-semibold ${gap.riskLevel === 'LOW' ? 'text-green-600' : gap.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'}`}>
                              {gap.riskLevel}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Tipo de Alianza Requerida</div>
                          <Badge variant="outline">{gap.requiredAllianceType}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* SUGGESTIONS TAB */}
              <TabsContent value="suggestions" className="space-y-4">
                {report.suggestions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-600">
                      No hay sugerencias en este momento
                    </CardContent>
                  </Card>
                ) : (
                  report.suggestions.map((suggestion) => (
                    <Card
                      key={suggestion.id}
                      className="cursor-pointer hover:border-green-500 transition-colors"
                      onClick={() => setSelectedSuggestion(suggestion)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Zap className="h-5 w-5 text-green-600" />
                              {suggestion.title}
                            </CardTitle>
                            <CardDescription className="mt-1">{suggestion.description}</CardDescription>
                          </div>
                          <Badge
                            variant={
                              suggestion.priority === 'HIGH'
                                ? 'destructive'
                                : suggestion.priority === 'MEDIUM'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            PRIORIDAD {suggestion.priority === 'HIGH' ? 'ALTA' : suggestion.priority === 'MEDIUM' ? 'MEDIA' : 'BAJA'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">Ingresos +</div>
                            <div className="font-semibold">
                              ${(suggestion.expectedImpact.revenueIncrease / 1000).toFixed(0)}k
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Margen +</div>
                            <div className="font-semibold">{suggestion.expectedImpact.marginIncrease}%</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Cronograma</div>
                            <div className="font-semibold">{suggestion.implementationPath.timelineMonths} meses</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Nivel de Riesgo</div>
                            <div className={`font-semibold ${suggestion.riskLevel === 'LOW' ? 'text-green-600' : suggestion.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'}`}>
                              {suggestion.riskLevel}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Tipo de Socio Necesario</div>
                          <Badge variant="outline">{suggestion.type}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* ANALYSIS DETAILS TAB */}
              <TabsContent value="analysis" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Análisis de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Clientes Totales</span>
                        <span className="font-semibold">{report.customerAnalysis.totalCustomers}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Clientes Activos</span>
                        <span className="font-semibold">{report.customerAnalysis.activeCustomers}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Ticket Promedio</span>
                        <span className="font-semibold">${report.customerAnalysis.avgTicket.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Tasa de Retención</span>
                        <span className="font-semibold">{report.customerAnalysis.retentionRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Razón de Concentración</span>
                        <span className="font-semibold">{report.customerAnalysis.concentrationRatio.toFixed(0)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Product Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Análisis de Productos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Productos Totales</span>
                        <span className="font-semibold">{report.productAnalysis.totalProducts}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Productos Activos</span>
                        <span className="font-semibold">{report.productAnalysis.activeProducts}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Margen Promedio</span>
                        <span className="font-semibold">{report.productAnalysis.avgMargin}%</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Ingresos Totales</span>
                        <span className="font-semibold">${(report.productAnalysis.totalRevenue / 1000000).toFixed(2)}M</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Artículos de Baja Penetración</span>
                        <span className="font-semibold">{report.productAnalysis.lowPenetrationProducts.length}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Industries */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Industrias Principales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {report.segmentAnalysis.segments.slice(0, 5).map((seg, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                          <span className="text-gray-600">{seg.industry}</span>
                          <span className="font-semibold">{seg.percentOfTotal.toFixed(1)}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Geographic Coverage */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cobertura Geográfica</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {report.geographicAnalysis.covered.slice(0, 5).map((geo, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                          <span className="text-gray-600">{geo.region}</span>
                          <span className="font-semibold">{geo.penetration.toFixed(1)}%</span>
                        </div>
                      ))}
                      {report.geographicAnalysis.uncovered.length > 0 && (
                        <div className="pt-2 text-xs text-orange-600">
                          +{report.geographicAnalysis.uncovered.length} regiones sin cobertura
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* FOOTER */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-semibold text-blue-900">Próximos Pasos</div>
                    <p className="text-blue-800 mt-1">
                      Revisa las sugerencias anteriores e identifica qué alianzas se alinean con tus prioridades estratégicas. 
                      Usa los elementos de acción proporcionados para guiar la comunicación con proveedores y negociaciones de asociaciones.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Data Consent Dialog */}
        <AllianceMarketDataConsent open={showDialog} onOpenChange={setShowDialog} />
      </div>
    </Layout>
  );
}
