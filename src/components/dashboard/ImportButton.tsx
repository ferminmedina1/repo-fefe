import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useImportDashboard } from "@/hooks/dashboard";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardWidget } from "@/lib/dashboard/widgets";

interface ImportButtonProps {
  onImport: (widgets: DashboardWidget[]) => Promise<void>;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<{ widgets: DashboardWidget[]; warnings: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { importFromJSON } = useImportDashboard();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const content = await file.text();
      const result = importFromJSON(content);

      if (!result.success) {
        toast({
          title: "Import failed",
          description: result.errors.join("; "),
          variant: "destructive",
        });
        return;
      }

      setImportData({
        widgets: result.widgets,
        warnings: result.warnings,
      });
    } catch (error) {
      toast({
        title: "File read error",
        description: error instanceof Error ? error.message : "Could not read file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!importData) return;

    try {
      await onImport(importData.widgets);
      toast({
        title: "✓ Dashboard imported",
        description: `Se cargaron ${importData.widgets.length} Tarjeta(s)`,
      });
      setImportData(null);
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Import
      </Button>

      <AlertDialog open={!!importData} onOpenChange={(open) => !open && setImportData(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Import Dashboard?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esto importará <strong>{importData?.widgets.length || 0} Tarjeta(s)</strong> desde tu archivo.
            </p>
            {importData?.warnings.length ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 space-y-1">
                <p className="font-semibold">⚠ Warnings:</p>
                {importData.warnings.map((warning, i) => (
                  <p key={i} className="text-xs">
                    • {warning}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-gray-500">Las Tarjetas existentes serán reemplazadas.</p>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} className="bg-blue-600 hover:bg-blue-700">
              Import
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
