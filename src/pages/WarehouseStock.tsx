import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Search, AlertTriangle, Download, Filter, TrendingDown } from "lucide-react";
import { StockStatusIndicator } from "@/components/inventory/StockStatusIndicator";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface WarehouseStock {
  id: string;
  stock: number;
  min_stock: number;
  warehouse_id: string;
  products: {
    name: string;
    sku: string;
    category: string;
  };
  warehouses: {
    name: string;
    code: string;
  };
}

export default function WarehouseStock() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "critical" | "low" | "ok">("all");

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { data: stock, isLoading } = useQuery({
    queryKey: ["warehouse-stock", selectedWarehouse, searchQuery, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("warehouse_stock")
        .select(`
          *,
          products (name, sku, category),
          warehouses (name, code)
        `)
        .order("stock", { ascending: true });

      if (selectedWarehouse !== "all") {
        query = query.eq("warehouse_id", selectedWarehouse);
      }

      if (searchQuery) {
        query = query.ilike("products.name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar por estado
      let filtered = (data as unknown as WarehouseStock[]) || [];
      if (filterStatus !== "all") {
        filtered = filtered.filter((item) => {
          const isCritical = item.min_stock > 0 && item.stock <= item.min_stock;
          const isLow = item.min_stock > 0 && item.stock > item.min_stock && item.stock <= item.min_stock * 1.5;
          const isOk = item.min_stock === 0 || item.stock > item.min_stock * 1.5;

          if (filterStatus === "critical") return isCritical;
          if (filterStatus === "low") return isLow;
          if (filterStatus === "ok") return isOk;
          return true;
        });
      }

      return filtered;
    },
  });

  // Estadísticas
  const stats = {
    total: stock?.length || 0,
    critical: stock?.filter((s) => s.min_stock > 0 && s.stock <= s.min_stock).length || 0,
    low: stock?.filter((s) => s.min_stock > 0 && s.stock > s.min_stock && s.stock <= s.min_stock * 1.5).length || 0,
    ok: stock?.filter((s) => s.min_stock === 0 || s.stock > s.min_stock * 1.5).length || 0,
  };

  const exportData = () => {
    if (!stock) return;
    const csv = [
      ["Depósito", "Producto", "SKU", "Categoría", "Stock Actual", "Stock Mínimo", "Estado"],
      ...stock.map((item) => [
        item.warehouses.code,
        item.products.name,
        item.products.sku,
        item.products.category || "",
        item.stock,
        item.min_stock,
        item.min_stock > 0 && item.stock <= item.min_stock ? "Crítico" : item.min_stock > 0 && item.stock <= item.min_stock * 1.5 ? "Bajo" : "OK",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Stock por Depósito</h1>
          </div>
          <p className="text-muted-foreground">
            Visualiza y gestiona el inventario distribuido entre depósitos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </Card>
          <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <div className="text-xs font-medium text-red-700 dark:text-red-300">Crítico</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {stats.critical}
            </div>
          </Card>
          <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Bajo</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {stats.low}
            </div>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <div className="text-xs font-medium text-green-700 dark:text-green-300">OK</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {stats.ok}
            </div>
          </Card>
        </div>

        {/* Controles */}
        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-full sm:w-64" data-tutorial="warehouse-select">
                  <SelectValue placeholder="Seleccionar depósito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los depósitos</SelectItem>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtrar:</span>
              </div>
              {(["all", "critical", "low", "ok"] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="capitalize"
                >
                  {status === "all" && "Todos"}
                  {status === "critical" && "Crítico"}
                  {status === "low" && "Bajo"}
                  {status === "ok" && "OK"}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                className="ml-auto"
              data-tutorial="transfer-between"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabla */}
        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-2 text-muted-foreground">Cargando...</p>
            </div>
          ) : stock && stock.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Depósito</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-24">SKU</TableHead>
                    <TableHead className="w-32">Categoría</TableHead>
                    <TableHead className="text-right" data-tutorial="available-stock">Stock Actual</TableHead>
                    <TableHead className="text-right">Stock Mín.</TableHead>
                    <TableHead className="w-40">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={`animate-fade-in ${
                        item.stock <= item.min_stock
                          ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40"
                          : ""
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {item.warehouses.code}
                          </Badge>
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            {item.warehouses.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.products.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {item.products.sku}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.products.category || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.stock}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.min_stock}
                      </TableCell>
                      <TableCell>
                        <StockStatusIndicator
                          stock={item.stock}
                          minStock={item.min_stock}
                          size="sm"
                          showIcon={true}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No se encontraron productos con la búsqueda actual</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
