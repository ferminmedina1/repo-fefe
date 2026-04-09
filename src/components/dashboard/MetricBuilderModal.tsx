import { useState } from "react";
import { X, Plus, Trash2, Copy, ChevronDown } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import {
  useCreateMetric,
  useUpdateMetric,
  useDeleteMetric,
  useMetrics,
  CustomMetric,
} from "@/hooks/dashboard/useMetricBuilder";
import { getFormulaSuggestions } from "@/hooks/dashboard/useMetricFormula";

export interface MetricBuilderModalProps {
  onClose: () => void;
}

type DataSource =
  | "monthly-comparison"
  | "top-products"
  | "top-customers"
  | "receivables"
  | "critical-stock"
  | "seven-days-sales"
  | "exchange-rates";

const DATA_SOURCES: { label: string; value: DataSource }[] = [
  { label: "Monthly Comparison", value: "monthly-comparison" },
  { label: "Top Products", value: "top-products" },
  { label: "Top Customers", value: "top-customers" },
  { label: "Receivables", value: "receivables" },
  { label: "Critical Stock", value: "critical-stock" },
  { label: "7-Day Sales Chart", value: "seven-days-sales" },
  { label: "Exchange Rates", value: "exchange-rates" },
];

const OPERATIONS = [
  { label: "Custom", value: "custom" },
  { label: "Sum", value: "sum" },
  { label: "Average", value: "avg" },
  { label: "Maximum", value: "max" },
  { label: "Minimum", value: "min" },
  { label: "Count", value: "count" },
];

export const MetricBuilderModal = ({ onClose }: MetricBuilderModalProps) => {
  const { currentCompany } = useCompany();
  const { data: metrics = [] } = useMetrics(currentCompany?.id);
  const createMutation = useCreateMetric();
  const updateMutation = useUpdateMetric();
  const deleteMutation = useDeleteMetric();

  const [tab, setTab] = useState<"create" | "manage">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dataSource, setDataSource] = useState<DataSource>("monthly-comparison");
  const [operation, setOperation] = useState("custom");
  const [formula, setFormula] = useState("");
  const [expandedHelp, setExpandedHelp] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetric | null>(null);

  const suggestions = getFormulaSuggestions(dataSource);

  const handleCreateMetric = async () => {
    if (!name || !formula || !currentCompany) return;

    try {
      if (editingMetric) {
        await updateMutation.mutateAsync({
          ...editingMetric,
          name,
          description,
          data_source: dataSource,
          formula,
          operation,
        });
        setEditingMetric(null);
      } else {
        await createMutation.mutateAsync({
          company_id: currentCompany.id,
          name,
          description,
          data_source: dataSource,
          formula,
          operation,
        });
      }

      // Reset form
      setName("");
      setDescription("");
      setFormula("");
      setOperation("custom");
      setTab("manage");
    } catch (err) {
      console.error("Error saving metric:", err);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!currentCompany) return;

    try {
      await deleteMutation.mutateAsync({
        id: metricId,
        companyId: currentCompany.id,
      });
    } catch (err) {
      console.error("Error deleting metric:", err);
    }
  };

  const handleEditMetric = (metric: CustomMetric) => {
    setEditingMetric(metric);
    setName(metric.name);
    setDescription(metric.description || "");
    setDataSource(metric.data_source);
    setFormula(metric.formula);
    setOperation(metric.operation);
    setTab("create");
  };

  const handleCopyFormula = (f: string) => {
    setFormula(f);
    navigator.clipboard.writeText(f);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Generador de Métricas Personalizadas</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-800 rounded-lg p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setTab("create")}
              className={`px-4 py-3 font-medium transition ${
                tab === "create"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {editingMetric ? "Editar métrica" : "Crear métrica"}
            </button>
            <button
              onClick={() => setTab("manage")}
              className={`px-4 py-3 font-medium transition ${
                tab === "manage"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tus métricas ({metrics.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === "create" ? (
            <div className="space-y-6">
              {/* Name & Description */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Nombre de la métrica *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Margen de ganancia mensual"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrición de qué mide esta métrica"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Data Source Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Fuente de datos *
                  </label>
                  <select
                    value={dataSource}
                    onChange={(e) => {
                      setDataSource(e.target.value as DataSource);
                      setFormula(""); // Reset formula when changing source
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    {DATA_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Operación
                  </label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    {OPERATIONS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formula Input */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Fórmula *
                  </label>
                  <button
                    onClick={() => setExpandedHelp(!expandedHelp)}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition ${
                        expandedHelp ? "rotate-180" : ""
                      }`}
                    />
                    Sugerencias
                  </button>
                </div>

                <textarea
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="Ej: monthlyComparison.percentageChange"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono h-24"
                />

                {/* Formula Suggestions */}
                {expandedHelp && suggestions.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-purple-900">
                      Fórmulas sugeridas:
                    </p>
                    {suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-start gap-2 p-2 bg-white rounded border border-purple-100 hover:border-purple-300 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900">
                            {suggestion.label}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {suggestion.description}
                          </p>
                          <code className="text-xs text-purple-600 break-words mt-1 block">
                            {suggestion.formula}
                          </code>
                        </div>
                        <button
                          onClick={() => handleCopyFormula(suggestion.formula)}
                          className="flex-shrink-0 p-1 text-purple-600 hover:bg-purple-100 rounded transition"
                          title="Copiar fórmula"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                  💡 Puedes usar: monthlyComparison, topProducts, topCustomers, receivables,
                  criticalStock, sevenDaysSales, exchangeRates, y funciones Math.
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancelar
                </button>
                {editingMetric && (
                  <button
                    onClick={() => {
                      setEditingMetric(null);
                      setName("");
                      setDescription("");
                      setFormula("");
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={handleCreateMetric}
                  disabled={!name || !formula}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {editingMetric ? "Guardar cambios" : "Crear métrica"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {metrics.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay métricas personalizadas aún</p>
                  <button
                    onClick={() => setTab("create")}
                    className="text-purple-600 hover:text-purple-700 text-sm mt-2"
                  >
                    Crear la primera métrica
                  </button>
                </div>
              ) : (
                metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex justify-between items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{metric.name}</h3>
                      {metric.description && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          {metric.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {DATA_SOURCES.find((d) => d.value === metric.data_source)?.label}
                        </span>
                        <span className="inline-block text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-mono truncate">
                          {metric.formula}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditMetric(metric)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteMetric(metric.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
