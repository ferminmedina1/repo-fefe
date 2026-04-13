import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Package } from "lucide-react";
import { sanitizeSearchQuery } from "@/lib/searchUtils";

interface ProductPanelProps {
  products: any[] | undefined;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddToCart: (product: any) => void;
}

export function ProductPanel({ products, isLoading, searchQuery, onSearchChange, onAddToCart }: ProductPanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products?.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
      {/* Search bar */}
assName="relative">
      <div className="relative" data-tutorial="pos-search">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={searchInputRef}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(e) => onSearchChange(sanitizeSearchQuery(e.target.value))}
          className="pl-10 h-10"
        />
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2 p-2 md:p-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                <div className="h-6 bg-muted rounded w-full mb-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-md transition-shadow cursor-pointer active:scale-95"
              onClick={() => onAddToCart(product)}
            >
              <CardHeader className="pb-1 md:pb-2 p-2 md:p-4">
                <div className="flex items-center gap-2">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-8 h-8 md:w-12 md:h-12 object-cover rounded border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-xs md:text-sm font-medium line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="text-[10px] md:text-xs hidden sm:block">
                      {product.sku || product.barcode || "N/A"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base md:text-lg font-bold text-primary">
                    ${product.price.toFixed(0)}
                  </span>
                </div>
                {product.stock === 0 && (
                  <div className="text-center text-[10px] md:text-xs text-destructive mt-1">
                    Sin stock
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && !isLoading && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            No se encontraron productos. {searchQuery ? 'Intenta con otros términos de búsqueda.' : 'Agrega productos desde el inventario.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
