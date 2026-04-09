import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AlertTriangle, Lock } from "lucide-react";
import { useRetrieveSharedDashboard } from "@/hooks/dashboard";
import { Button } from "@/components/ui/button";
import { KpiWidget } from "@/components/dashboard/KpiWidget";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { ListWidget } from "@/components/dashboard/ListWidget";
import { CurrencyWidget } from "@/components/dashboard/CurrencyWidget";
import { WidgetWrapper } from "@/components/dashboard/WidgetWrapper";
import { DashboardWidget, WIDGET_CATALOG } from "@/lib/dashboard/widgets";
import {
  useMonthlyComparison,
  useTopProducts,
  useTopCustomers,
  useReceivables,
  useCriticalStock,
  useExchangeRates,
  useSevenDaysSalesChart,
  useHistoricalRates,
} from "@/hooks/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function SharedDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [layoutData, setLayoutData] = useState<{ widgets: DashboardWidget[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retrieveShared = useRetrieveSharedDashboard(token || "");
  const monthlyComparisonQuery = useMonthlyComparison(undefined, Boolean(layoutData), true);
  const topProductsQuery = useTopProducts(undefined, Boolean(layoutData), true);
  const topCustomersQuery = useTopCustomers(undefined, Boolean(layoutData), true);
  const receivablesQuery = useReceivables(undefined, Boolean(layoutData), true);
  const criticalStockQuery = useCriticalStock(undefined, Boolean(layoutData), true);
  const exchangeRatesQuery = useExchangeRates(undefined, Boolean(layoutData), true);
  const sevenDaysSalesChartQuery = useSevenDaysSalesChart(undefined, Boolean(layoutData), true);
  const historicalRatesQuery = useHistoricalRates(undefined, Boolean(layoutData), true);

  useEffect(() => {
    const loadSharedDashboard = async () => {
      try {
        if (!token) {
          setError("No share token provided");
          return;
        }

        const result = await retrieveShared.mutateAsync();
        setLayoutData(result.dashboard_layouts.widgets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared dashboard");
      }
    };

    loadSharedDashboard();
  }, [token]);

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertTriangle className="h-16 w-16 text-warning" />
          <h2 className="text-2xl font-bold text-foreground">Dashboard not found</h2>
          <p className="text-muted-foreground text-center max-w-md">{error}</p>
          <Button onClick={() => window.location.href = "/"}>Back to home</Button>
        </div>
      </Layout>
    );
  }

  if (!layoutData) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Read-only</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Build data map
  const dataMap = {
    "kpi-monthly-sales": monthlyComparisonQuery.data,
    "kpi-gross-margin": monthlyComparisonQuery.data,
    "kpi-receivables": receivablesQuery.data,
    "kpi-sales-today": monthlyComparisonQuery.data,
    "chart-top-products": topProductsQuery.data,
    "chart-top-customers": topCustomersQuery.data,
    "chart-sales-7days": sevenDaysSalesChartQuery.data,
    "list-critical-stock": criticalStockQuery.data,
    "currency-rates": historicalRatesQuery.data,
    "currency-summary": exchangeRatesQuery.data,
  };

  const isLoadingQuery = (type: string) => {
    const loadingMap: Record<string, boolean> = {
      "kpi-monthly-sales": monthlyComparisonQuery.isLoading,
      "kpi-gross-margin": monthlyComparisonQuery.isLoading,
      "kpi-receivables": receivablesQuery.isLoading,
      "kpi-sales-today": monthlyComparisonQuery.isLoading,
      "chart-top-products": topProductsQuery.isLoading,
      "chart-top-customers": topCustomersQuery.isLoading,
      "chart-sales-7days": sevenDaysSalesChartQuery.isLoading,
      "list-critical-stock": criticalStockQuery.isLoading,
      "currency-rates": historicalRatesQuery.isLoading,
      "currency-summary": exchangeRatesQuery.isLoading,
    };
    return loadingMap[type] || false;
  };

  const renderWidget = (widget: DashboardWidget) => {
    const catalogEntry = WIDGET_CATALOG.find((w) => w.id === widget.type);
    const data = dataMap[widget.type as keyof typeof dataMap];
    const isLoading = isLoadingQuery(widget.type);

    if (!catalogEntry) return null;

    const content = (() => {
      switch (widget.type) {
        case "kpi-monthly-sales":
        case "kpi-gross-margin":
        case "kpi-receivables":
        case "kpi-sales-today":
          return <KpiWidget type={widget.type} data={data} isLoading={isLoading} />;
        case "chart-top-products":
        case "chart-top-customers":
        case "chart-sales-7days":
          return <ChartWidget type={widget.type} data={data} isLoading={isLoading} />;
        case "list-critical-stock":
          return <ListWidget data={data} isLoading={isLoading} />;
        case "currency-rates":
        case "currency-summary":
          return (
            <CurrencyWidget
              type={widget.type}
              ratesData={dataMap["currency-rates"]}
              summaryData={dataMap["currency-summary"]}
              isLoading={isLoading}
            />
          );
        default:
          return null;
      }
    })();

    return (
      <WidgetWrapper
        key={widget.id}
        title={catalogEntry.name}
        description={catalogEntry.description}
        icon={catalogEntry.icon}
        accentColor={catalogEntry.accentColor}
      >
        {content}
      </WidgetWrapper>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shared Dashboard</h1>
            <p className="text-muted-foreground">
              {layoutData.widgets.length} widget{layoutData.widgets.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            Read-only view
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {layoutData.widgets.map((widget) => renderWidget(widget))}
        </div>
      </div>
    </Layout>
  );
}
