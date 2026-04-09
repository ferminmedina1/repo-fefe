import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useExportDashboard } from "@/hooks/dashboard";
import { DashboardWidget } from "@/lib/dashboard/widgets";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  widgets: DashboardWidget[];
  dashboardName?: string;
}

export function ExportButton({ widgets, dashboardName = "My Dashboard" }: ExportButtonProps) {
  const { toast } = useToast();
  const { exportDashboard, downloadAsJSON } = useExportDashboard();

  const handleExport = () => {
    try {
      const exported = exportDashboard(widgets, dashboardName);
      const filename = `${dashboardName.replace(/\s+/g, "-")}-${Date.now()}.json`;
      downloadAsJSON(exported, filename);

      toast({
        title: "✓ Dashboard exported",
        description: `Downloaded as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2"
      disabled={widgets.length === 0}
    >
      <Download className="w-4 h-4" />
      Export
    </Button>
  );
}
