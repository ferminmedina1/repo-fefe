import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { Plus, Edit, Trash2, Search, Upload, Download, X, Package, ChevronDown, ChevronRight, DollarSign, AlertCircle, CheckCircle2, Info, Image as ImageIcon, BarChart3, ShoppingCart, PackageOpen, Eye, Sliders } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import Papa from "papaparse";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useTutorial } from "@/hooks/useTutorial";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCompany } from "@/contexts/CompanyContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { compressImage, isValidImage, formatFileSize } from "@/lib/imageUtils";
import { ComboComponentsDialog } from "@/components/products/ComboComponentsDialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditLogger, AuditActionType } from "@/lib/auditLog";
import { validateProductUniqueness, validateStockConsistency, validateWarehouseDistribution, validateBulkUpdateData, validatePriceChange } from "@/lib/dataIntegrity";
import { batchInsertWithValidation, batchUpdateWithValidation, softDeleteBatch, createTransactionContext, upsertWithConflictHandling } from "@/lib/transactionService";
import { createAppError, classifyError, getUserFriendlyError } from "@/lib/errorHandler";

const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(200, "El nombre debe tener máximo 200 caracteres"),
  price: z.number({ invalid_type_error: "El precio debe ser un número" })
    .positive("El precio debe ser mayor a 0")
    .max(9999999999.99, "El precio debe ser menor a 10,000,000,000"),
  cost: z.number({ invalid_type_error: "El costo debe ser un número" })
    .nonnegative("El costo no puede ser negativo")
    .max(9999999999.99, "El costo debe ser menor a 10,000,000,000")
    .optional(),
  stock: z.number({ invalid_type_error: "El stock debe ser un número" })
    .int("El stock debe ser un número entero")
    .nonnegative("El stock no puede ser negativo")
    .max(10000000, "El stock debe ser menor a 10,000,000"),
  min_stock: z.number({ invalid_type_error: "El stock mínimo debe ser un número" })
    .int("El stock mínimo debe ser un número entero")
    .nonnegative("El stock mínimo no puede ser negativo")
    .max(10000000, "El stock mínimo debe ser menor a 10,000,000")
    .optional(),
  category_id: z.string().uuid("La categoría debe ser un ID válido").optional(),
  barcode: z.string().max(50, "El código de barras debe tener máximo 50 caracteres").optional(),
  sku: z.string().max(50, "El SKU debe tener máximo 50 caracteres").optional(),
  location: z.string().max(100, "La ubicación debe tener máximo 100 caracteres").optional(),
  batch_number: z.string().max(50, "El número de lote debe tener máximo 50 caracteres").optional(),
  expiration_date: z.string().optional(),
}).refine((data) => !data.cost || data.cost <= data.price, {
  message: "El costo no puede ser mayor que el precio",
  path: ["cost"],
});

export default function Products() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { isRunning } = useTutorial();
  const canCreate = hasPermission('products', 'create') || isRunning;
  const canEdit = hasPermission('products', 'edit') || isRunning;
  const canDelete = hasPermission('products', 'delete');
  const canExport = hasPermission('products', 'export');

  // Verificar que el usuario tenga acceso a la empresa actual
  useEffect(() => {
    console.log('Permissions check:', { 
      permissionsLoading, 
      currentCompany: currentCompany?.id,
      canCreate,
      canEdit,
      canDelete,
      canExport 
    });
    
    if (!permissionsLoading && currentCompany && !hasPermission('products', 'view')) {
      toast.error("No tienes acceso a los productos de esta empresa");
      console.warn("Usuario sin acceso a empresa", { currentCompany });
    }
  }, [currentCompany, permissionsLoading, hasPermission, canCreate, canEdit, canDelete, canExport]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const customFieldsSectionRef = useRef<HTMLDivElement>(null);
  const [digitalPriceTier, setDigitalPriceTier] = useState({name: "", price: ""});
  
  // Sorting & Filtering States
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "category" | "created_at">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<"all" | "digital" | "combo" | "physical">("all");
  const [filterStockStatus, setFilterStockStatus] = useState<"all" | "low" | "out">("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  
  // Cargar parámetro de búsqueda desde URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, []);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Reset form when dialog opens for new product
  useEffect(() => {
    if (isDialogOpen && !editingProduct) {
      console.log('Dialog opened for new product, resetting form');
      resetForm();
    }
  }, [isDialogOpen, editingProduct]);
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
    min_stock: "",
    category_id: "",
    location: "",
    batch_number: "",
    expiration_date: "",
    is_combo: false,
    is_digital: false,
    currency: "ARS",
    tags: [] as string[],
    custom_fields: {} as Record<string, any>,
    digital_prices: [] as Array<{name: string, price: string}>,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isMassEditDialogOpen, setIsMassEditDialogOpen] = useState(false);
  const [massEditData, setMassEditData] = useState({
    price: "",
    cost: "",
    stock: "",
    category_id: "",
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [warehouseStockData, setWarehouseStockData] = useState<Record<string, Record<string, number>>>({});
  const [isStockAdjustDialogOpen, setIsStockAdjustDialogOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, string>>({});
  const [isPriceListDialogOpen, setIsPriceListDialogOpen] = useState(false);
  const [priceListProduct, setPriceListProduct] = useState<any>(null);
  const [priceListPrices, setPriceListPrices] = useState<Record<string, string>>({});
  const [isCurrencyAdjustDialogOpen, setIsCurrencyAdjustDialogOpen] = useState(false);
  const [adjustmentCurrency, setAdjustmentCurrency] = useState<string>('USD');
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<string>('');
  const [previewAdjustments, setPreviewAdjustments] = useState<any[]>([]);
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);
  const [tagInput, setTagInput] = useState<string>("");
  const [isCustomFieldsDialogOpen, setIsCustomFieldsDialogOpen] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string, name: string, type: "text" | "number" | "textarea" | "select" | "checkbox" | "date", options?: string[], required?: boolean}>>([]);
  const [newCustomField, setNewCustomField] = useState<any>({name: "", type: "text", options: ""});

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["product-categories", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      try {
        const { data, error } = await supabase
          .from("product_categories" as any)
          .select("*")
          .eq("company_id", currentCompany.id)
          .order("name");
        if (error) {
          console.warn("Error fetching categories:", error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn("Error in categories query:", err);
        return [];
      }
    },
    enabled: !!currentCompany?.id,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentCompany?.id) throw new Error('Empresa no seleccionada');
      try {
        const { data, error } = await supabase
          .from("product_categories" as any)
          .insert({ company_id: currentCompany.id, name: name.trim() })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err: any) {
        if (err.message?.includes("404") || err.message?.includes("not found")) {
          throw new Error("La tabla de categorías no está disponible. Contacta al administrador.");
        }
        throw err;
      }
    },
    onSuccess: (newCategory: any) => {
      toast.success(`Categoría "${newCategory?.name || 'Nueva'}" creada exitosamente`);
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      if (newCategory?.id) {
        setFormData({ ...formData, category_id: newCategory.id });
      }
      setIsAddCategoryDialogOpen(false);
      setNewCategoryName("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear la categoría");
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!currentCompany?.id) throw new Error('Empresa no seleccionada');
      try {
        // Primero verificar si hay productos con esta categoría
        const { data: productsWithCategory } = await supabase
          .from("products")
          .select("id")
          .eq("category_id", categoryId)
          .eq("company_id", currentCompany.id);

        if (productsWithCategory && productsWithCategory.length > 0) {
          throw new Error(`No se puede eliminar esta categoría porque tiene ${productsWithCategory.length} producto(s) asociado(s)`);
        }

        const { error } = await supabase
          .from("product_categories" as any)
          .delete()
          .eq("id", categoryId)
          .eq("company_id", currentCompany.id);

        if (error) throw error;
        return categoryId;
      } catch (err: any) {
        if (err.message?.includes("404") || err.message?.includes("not found")) {
          throw new Error("La categoría no existe o ya fue eliminada.");
        }
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Categoría eliminada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      setIsDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar la categoría");
    },
  });

  // Función para convertir precio a ARS
  const convertToARS = (price: number, currency: string) => {
    if (!currency || currency === 'ARS') return price;
    const rate = exchangeRates?.find(r => r.currency === currency);
    if (!rate) return null;
    return price * rate.rate;
  };

  // Función para generar SKU automáticamente
  const generateSKU = (productName: string, category?: string): string => {
    // Obtener las primeras 3 letras del nombre o categoría (en mayúsculas, sin acentos)
    const baseText = productName.trim() || category?.trim() || 'PRD';
    
    // Remover acentos
    const normalized = baseText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
    
    // Tomar primeras 3 letras, si no hay suficientes, rellenar con 'X'
    const prefix = (normalized.substring(0, 3) + 'XXX').substring(0, 3);
    
    // Generar un identificador único basado en timestamp + random
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const suffix = (timestamp + random).toString().slice(-6);
    
    return `${prefix}${suffix}`;
  };

  const [isComboDialogOpen, setIsComboDialogOpen] = useState(false);
  const [comboProduct, setComboProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", searchQuery, categoryFilter, sortBy, sortDirection, filterType, filterStockStatus, priceRange, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query: any = supabase
        .from("products")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("active", true);
      
      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) {
          query = (query as any).or(`name.ilike.%${sanitized}%,barcode.ilike.%${sanitized}%,sku.ilike.%${sanitized}%`);
        }
      }
      
      if (categoryFilter) {
        query = (query as any).eq("category_id", categoryFilter);
      }
      
      // Apply price range filter
      query = (query as any).gte("price", priceRange[0]).lte("price", priceRange[1]);
      
      // Apply type filter at DB level
      if (filterType === "digital") {
        query = (query as any).eq("is_digital", true);
      } else if (filterType === "combo") {
        query = (query as any).eq("is_combo", true);
      } else if (filterType === "physical") {
        query = (query as any).eq("is_digital", false).eq("is_combo", false);
      }
      
      // Apply stock status filter at DB level (simple cases)
      if (filterStockStatus === "out") {
        query = (query as any).eq("stock", 0);
      }
      
      // Apply sorting
      let orderColumn = sortBy;
      if (sortBy === "created_at") {
        orderColumn = "created_at";
      }
      query = (query as any).order(orderColumn, { ascending: sortDirection === "asc" });
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by low stock (requires client-side for min_stock comparison)
      let filtered = (data || []) as any[];
      if (filterStockStatus === "low") {
        filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 5));
      }
      
      return filtered;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("is_main", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: priceLists } = useQuery({
    queryKey: ["price-lists", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from("price_lists")
        .select("id, name, is_default, company_id")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");
      
      if (error) {
        console.error('Error loading price lists:', error);
        throw error;
      }
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: exchangeRates } = useQuery({
    queryKey: ["exchange-rates", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("company_id", currentCompany.id);
      
      if (error) {
        console.error('Error loading exchange rates:', error);
        return [];
      }
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch warehouse stock for expanded products
  const { data: warehouseStock } = useQuery({
    queryKey: ["warehouse-stock-detail", Array.from(expandedProducts)],
    queryFn: async () => {
      if (expandedProducts.size === 0) return [];
      
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select(`
          *,
          warehouses (code, name)
        `)
        .in("product_id", Array.from(expandedProducts));
      
      if (error) throw error;
      return data;
    },
    enabled: expandedProducts.size > 0,
  });

  // Fetch product prices for price list dialog
  const { data: productPrices } = useQuery({
    queryKey: ["product-prices", priceListProduct?.id],
    queryFn: async () => {
      if (!priceListProduct?.id) return [];
      
      const { data, error } = await supabase
        .from("product_prices")
        .select("*, price_lists(name, company_id)")
        .eq("product_id", priceListProduct.id);
      
      if (error) {
        console.error('Error loading product prices:', error);
        throw error;
      }
      return data;
    },
    enabled: !!priceListProduct?.id,
  });

  const uploadProductImage = async (file: File, productId: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    // Compress image before upload (optimized for faster loading)
    const compressedBlob = await compressImage(file, {
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.65,
      outputFormat: 'image/webp'
    });
    
    const originalSize = formatFileSize(file.size);
    const compressedSize = formatFileSize(compressedBlob.size);
    console.log(`Imagen comprimida: ${originalSize} → ${compressedSize}`);
    
    // Generate unique filename
    const fileExt = 'webp';
    const fileName = `${user.id}/${productId}_${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, compressedBlob, {
        contentType: 'image/webp',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  // Funciones para manejar múltiples precios
  const getPriceRangeForProduct = (product: any) => {
    const prices: number[] = [product.price];
    
    // Agregar precios de listas si existen
    productPrices?.forEach((pp: any) => {
      if (pp.product_id === product.id && pp.price) {
        prices.push(pp.price);
      }
    });
    
    if (prices.length <= 1) return null;
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return { min, max, count: prices.length };
  };

  const hasMultiplePrices = (product: any) => {
    return (productPrices?.filter((pp: any) => pp.product_id === product.id).length || 0) > 0;
  };

  const formatPriceDisplay = (product: any) => {
    const range = getPriceRangeForProduct(product);
    if (range && range.min !== range.max) {
      return `$${Number(range.min).toFixed(0)} - $${Number(range.max).toFixed(0)}`;
    }
    return `$${Number(product.price).toFixed(0)}`;
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      if (!currentCompany?.id) throw new Error('COMPANY_NOT_SELECTED');
      if (!canCreate) throw new Error('PERMISSION_DENIED');
      
      // Validar unicidad de SKU y Barcode
      const uniquenessValidation = await validateProductUniqueness(currentCompany.id, {
        sku: data.sku,
        barcode: data.barcode,
      });
      
      if (!uniquenessValidation.isValid) {
        const error = new Error(uniquenessValidation.errors.join('; '));
        (error as any).code = uniquenessValidation.errors[0].includes('SKU') ? 'INVALID_SKU' : 'INVALID_BARCODE';
        throw error;
      }

      const payload = { ...data, company_id: currentCompany.id };
      const { data: product, error } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log creación en auditoría
      await auditLogger.log({
        action: AuditActionType.CREATE,
        resourceType: 'product',
        resourceId: product.id,
        userId: user.id,
        companyId: currentCompany.id,
        metadata: {
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
        },
        status: 'success',
      });
      
      // Upload image if provided
      if (imageFile) {
        try {
          setUploadingImage(true);
          const imageUrl = await uploadProductImage(imageFile, product.id);
          
          const { error: updateError } = await supabase
            .from("products")
            .update({ image_url: imageUrl })
            .eq("id", product.id);
          
          if (updateError) throw updateError;
          product.image_url = imageUrl;
        } catch (imgError) {
          console.error('Error uploading image:', imgError);
          toast.error('Producto creado pero falló la subida de imagen');
          // No lanzamos error para no romper la creación del producto
        } finally {
          setUploadingImage(false);
        }
      }
      
      // Create warehouse stock entries with batch operation
      if (warehouses && warehouseStockData["new"] && Object.keys(warehouseStockData["new"]).length > 0) {
        const distribution = validateWarehouseDistribution(data.stock, warehouseStockData["new"]);
        if (!distribution.isValid) {
          throw new Error(distribution.error || 'Warehouse distribution invalid');
        }

        const warehouseStockEntries = Object.entries(warehouseStockData["new"]).map(([warehouseId, stock]) => ({
          warehouse_id: warehouseId,
          product_id: product.id,
          stock: stock || 0,
          min_stock: data.min_stock || 0,
          company_id: currentCompany!.id,
        }));
        
        const txContext = createTransactionContext(user.id, currentCompany.id);
        const stockResult = await batchInsertWithValidation(
          'warehouse_stock',
          warehouseStockEntries,
          txContext
        );
        
        if (!stockResult.success) {
          throw new Error(stockResult.error || 'Failed to create warehouse stock entries');
        }
      }
      
      return product;
    },
    onSuccess: () => {
      toast.success("Producto creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      setIsDialogOpen(false);
      resetForm();
      setWarehouseStockData({});
    },
    onError: (error: any) => {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error creating product:`, error);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data: updateData, oldData }: { id: string; data: any; oldData?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      if (!currentCompany?.id) throw new Error('COMPANY_NOT_SELECTED');
      if (!canEdit) throw new Error('PERMISSION_DENIED');
      
      // Validar unicidad de SKU y Barcode (excluyendo el producto actual)
      if (updateData.sku || updateData.barcode) {
        const uniquenessValidation = await validateProductUniqueness(
          currentCompany.id,
          {
            sku: updateData.sku,
            barcode: updateData.barcode,
          },
          id
        );
        
        if (!uniquenessValidation.isValid) {
          const error = new Error(uniquenessValidation.errors.join('; '));
          (error as any).code = uniquenessValidation.errors[0].includes('SKU') ? 'INVALID_SKU' : 'INVALID_BARCODE';
          throw error;
        }
      }

      // Validar cambios de precio (prevenir cambios radicales)
      if (updateData.price && oldData?.price) {
        const priceValidation = validatePriceChange(oldData.price, updateData.price);
        if (!priceValidation.isValid) {
          throw new Error(priceValidation.error);
        }
      }
      
      // Upload new image if provided
      if (imageFile) {
        try {
          setUploadingImage(true);
          const imageUrl = await uploadProductImage(imageFile, id);
          updateData.image_url = imageUrl;
        } catch (imgError) {
          console.error('Error uploading image:', imgError);
          toast.error('Error al subir la imagen');
          throw imgError;
        } finally {
          setUploadingImage(false);
        }
      }
      
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", currentCompany.id);
      
      if (error) throw error;
      
      // Log cambios en auditoría
      if (oldData) {
        await auditLogger.logChanges(
          AuditActionType.UPDATE,
          id,
          'product',
          oldData,
          updateData,
          currentCompany.id
        );
      }
      
      // Update warehouse stock if provided
      if (warehouses && warehouseStockData[id] && Object.keys(warehouseStockData[id]).length > 0) {
        const distribution = validateWarehouseDistribution(updateData.stock || oldData?.stock, warehouseStockData[id]);
        if (!distribution.isValid) {
          throw new Error(distribution.error);
        }

        const upsertEntries = Object.entries(warehouseStockData[id])
          .map(([warehouseId, stock]) => ({
            warehouse_id: warehouseId,
            product_id: id,
            stock: stock || 0,
            min_stock: updateData.min_stock || oldData?.min_stock || 0,
            company_id: currentCompany.id,
          }));

        if (upsertEntries.length > 0) {
          const txContext = createTransactionContext(user.id, currentCompany.id);
          const result = await upsertWithConflictHandling(
            'warehouse_stock',
            upsertEntries,
            ['warehouse_id', 'product_id'],
            txContext
          );

          if (!result.success) {
            throw new Error(result.error);
          }
        }
        
        // Validar consistencia de stock
        const consistency = await validateStockConsistency(
          id,
          updateData.stock || oldData?.stock || 0,
          currentCompany.id
        );

        if (!consistency.isConsistent) {
          console.warn('Stock inconsistency detected:', consistency);
          // Log pero no lanzo error para no afectar la actualización
        }
      }
    },
    onSuccess: () => {
      toast.success("Producto actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock-detail"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      setWarehouseStockData({});
    },
    onError: (error: any) => {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error updating product:`, error);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      if (!currentCompany?.id) throw new Error('COMPANY_NOT_SELECTED');
      if (!canDelete) throw new Error('PERMISSION_DENIED');
      
      // Soft delete: marcar como inactivo y archivado
      const { error } = await supabase
        .from("products")
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("company_id", currentCompany.id);
      
      if (error) throw error;

      // Log eliminación en auditoría
      await auditLogger.log({
        action: AuditActionType.DELETE,
        resourceType: 'product',
        resourceId: id,
        userId: user.id,
        companyId: currentCompany.id,
        metadata: {
          deleteType: 'soft_delete',
          markedInactive: true,
          timestamp: new Date().toISOString(),
        },
        status: 'success',
      });
    },
    onSuccess: () => {
      toast.success("Producto eliminado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error deleting product:`, error);
    },
  });

  const resetForm = () => {
    console.log('Resetting form');
    setFormData({
      name: "",
      barcode: "",
      sku: "",
      price: "",
      cost: "",
      stock: "",
      min_stock: "",
      category_id: "",
      location: "",
      batch_number: "",
      expiration_date: "",
      is_combo: false,
      is_digital: false,
      currency: "ARS",
      tags: [],
      custom_fields: {},
      digital_prices: [],
    });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
    setTagInput("");
    setCustomFields([]);
    setNewCustomField({ name: "", type: "text", options: "" });
    setDigitalPriceTier({name: "", price: ""});
  };

  // Funciones para manejar tags
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({...formData, tags: [...formData.tags, trimmedTag]});
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tag)});
  };

  // Funciones para campos personalizados
  const addCustomField = () => {
    if (!newCustomField.name.trim()) {
      toast.error("El nombre del campo es requerido");
      return;
    }
    const field: any = {
      id: `field_${Date.now()}`,
      name: newCustomField.name,
      type: newCustomField.type,
    };
    // Only add options if it's a select field
    if (newCustomField.type === "select") {
      field.options = newCustomField.options.split(",").map(o => o.trim()).filter(o => o.length > 0);
    }
    setCustomFields([...customFields, field]);
    setNewCustomField({name: "", type: "text", options: ""});
    toast.success(`Campo "${newCustomField.name}" agregado`);
  };

  const removeCustomField = (fieldId: string) => {
    const field = customFields.find(f => f.id === fieldId);
    setCustomFields(customFields.filter(f => f.id !== fieldId));
    const newCustom = {...formData.custom_fields};
    delete newCustom[fieldId];
    setFormData({...formData, custom_fields: newCustom});
    toast.success(`Campo eliminado`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!currentCompany?.id) {
        throw new Error('COMPANY_NOT_SELECTED');
      }
      
      // Validate required fields
      if (!formData.name || !formData.price || !formData.stock) {
        throw new Error('VALIDATION_ERROR: Nombre, Precio y Stock son obligatorios');
      }
      
      // Validate warehouse distribution if provided
      if (warehouseStockData["new"]) {
        const totalStock = parseInt(formData.stock);
        const distribution = validateWarehouseDistribution(totalStock, warehouseStockData["new"]);
        if (!distribution.isValid) {
          throw new Error(distribution.error);
        }
      }

      // Generar SKU automáticamente si no está proporcionado (para mejorar UX)
      const skuValue = formData.sku?.trim() || generateSKU(formData.name);

      // Validar digital prices si es producto digital
      if (formData.is_digital && formData.digital_prices) {
        const validDigitalPrices = formData.digital_prices.filter((p: any) => p.name && p.price);
        if (validDigitalPrices.length === 0) {
          throw new Error('VALIDATION_ERROR: Debe tener al menos una opción de precio para productos digitales');
        }
      }

      const validatedData = {
        name: formData.name?.trim() || "",
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        stock: parseInt(formData.stock),
        min_stock: formData.min_stock ? parseInt(formData.min_stock) : undefined,
        category_id: formData.category_id || undefined,
        barcode: formData.barcode || undefined,
        sku: skuValue || undefined,
        location: formData.location || undefined,
        batch_number: formData.batch_number || undefined,
        expiration_date: formData.expiration_date || undefined,
      };
      productSchema.parse(validatedData);

      // Clean custom field definitions (remove undefined properties)
      const cleanedCustomFields = customFields.map(field => {
        const cleanField: any = {
          id: field.id,
          name: field.name,
          type: field.type,
        };
        if (field.options && field.options.length > 0) {
          cleanField.options = field.options;
        }
        return cleanField;
      });

      // Filter digital prices to remove empty entries
      const cleanedDigitalPrices = formData.digital_prices
        ? formData.digital_prices.filter((p: any) => p.name && p.price)
        : [];

      const productData = {
        name: validatedData.name,
        barcode: validatedData.barcode || null,
        sku: validatedData.sku || null,
        price: validatedData.price,
        cost: validatedData.cost ?? 0,
        stock: validatedData.stock,
        stock_physical: validatedData.stock,
        stock_reserved: 0,
        min_stock: validatedData.min_stock ?? 0,
        category_id: validatedData.category_id || null,
        location: validatedData.location || null,
        batch_number: validatedData.batch_number || null,
        expiration_date: validatedData.expiration_date || null,
        is_combo: formData.is_combo,
        is_digital: formData.is_digital,
        digital_prices: cleanedDigitalPrices,
        currency: formData.currency || 'ARS',
        tags: formData.tags,
        custom_fields: formData.custom_fields,
        custom_field_definitions: cleanedCustomFields,
        last_restock_date: editingProduct ? undefined : new Date().toISOString(),
        company_id: currentCompany.id,
      };

      if (editingProduct) {
        updateProductMutation.mutate({ 
          id: editingProduct.id, 
          data: productData,
          oldData: editingProduct 
        });
      } else {
        createProductMutation.mutate(productData);
      }
    } catch (error) {
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error('Error en handleSubmit:', error);
    }
  };

  const handleEdit = async (product: any) => {
    try {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode || "",
        sku: product.sku || "",
        price: product.price.toString(),
        cost: product.cost?.toString() || "",
        stock: product.stock.toString(),
        min_stock: product.min_stock?.toString() || "",
        category_id: product.category_id || "",
        location: product.location || "",
        batch_number: product.batch_number || "",
        expiration_date: product.expiration_date || "",
        is_combo: product.is_combo || false,
        is_digital: product.is_digital || false,
        currency: product.currency || "ARS",
        tags: product.tags || [],
        custom_fields: product.custom_fields || {},
        digital_prices: product.digital_prices || [],
      });
      setImagePreview(product.image_url || "");
      setImageFile(null);
      
      // Load custom field definitions if they exist
      if (product.custom_field_definitions && Array.isArray(product.custom_field_definitions)) {
        setCustomFields(product.custom_field_definitions);
      } else {
        // If no definitions stored, clear custom fields
        setCustomFields([]);
      }
      
      // Load warehouse stock data for this product
      if (warehouses) {
        const { data: warehouseStockData, error } = await supabase
          .from("warehouse_stock")
          .select("warehouse_id, stock")
          .eq("product_id", product.id);
        
        if (error) {
          console.error('Error loading warehouse stock:', error);
          toast.error("Error al cargar datos de warehouse");
          return;
        }
        
        const stockByWarehouse: Record<string, number> = {};
        warehouseStockData?.forEach(ws => {
          stockByWarehouse[ws.warehouse_id] = ws.stock;
        });
        
        setWarehouseStockData({
          [product.id]: stockByWarehouse
        });
      }
      
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      toast.error('Error al editar producto');
    }
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!isValidImage(file)) {
      toast.error('Por favor selecciona una imagen válida (JPG, PNG o WebP)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 10MB');
      return;
    }
    
    setCompressingImage(true);
    
    try {
      // Show preview of original image immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setImageFile(file);
      toast.success(`Imagen cargada (${formatFileSize(file.size)}). Se comprimirá al guardar.`);
    } catch (error) {
      console.error('Error loading image:', error);
      toast.error('Error al cargar la imagen');
    } finally {
      setCompressingImage(false);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const toggleProductExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleStockAdjust = async (product: any) => {
    setAdjustingProduct(product);
    
    // Load current warehouse stock values
    if (warehouses) {
      const { data: warehouseStockData } = await supabase
        .from("warehouse_stock")
        .select("warehouse_id, stock")
        .eq("product_id", product.id);
      
      const initialStockValues: Record<string, string> = {};
      warehouses.forEach(warehouse => {
        const stockEntry = warehouseStockData?.find(ws => ws.warehouse_id === warehouse.id);
        initialStockValues[warehouse.id] = stockEntry ? stockEntry.stock.toString() : '0';
      });
      
      setStockAdjustments(initialStockValues);
    } else {
      setStockAdjustments({});
    }
    
    setIsStockAdjustDialogOpen(true);
  };

  const handlePriceListEdit = (product: any) => {
    setPriceListProduct(product);
    setPriceListPrices({});
    setIsPriceListDialogOpen(true);
  };

  const submitPriceListUpdates = async () => {
    if (!priceListProduct) return;

    try {
      // Batch upsert instead of N SELECT+INSERT/UPDATE queries
      const upsertEntries = Object.entries(priceListPrices)
        .filter(([_, priceValue]) => priceValue)
        .map(([priceListId, priceValue]) => ({
          product_id: priceListProduct.id,
          price_list_id: priceListId,
          price: parseFloat(priceValue),
        }))
        .filter(entry => !isNaN(entry.price) && entry.price >= 0);

      if (upsertEntries.length === 0) {
        toast.error("No hay precios válidos para actualizar");
        return;
      }

      const { error } = await supabase
        .from("product_prices")
        .upsert(upsertEntries, { onConflict: 'product_id,price_list_id' });

      if (error) throw error;

      toast.success("Precios actualizados exitosamente");
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsPriceListDialogOpen(false);
      setPriceListPrices({});
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar precios");
    }
  };

  const submitStockAdjustments = async () => {
    if (!adjustingProduct) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const upsertEntries = Object.entries(stockAdjustments)
        .filter(([_, newStockValue]) => newStockValue !== '' && newStockValue !== undefined)
        .map(([warehouseId, newStockValue]) => {
          // Validar que sea número entero válido (no "abc", no decimales)
          const stockStr = newStockValue.toString().trim();
          if (!/^\d+$/.test(stockStr)) {
            console.warn(`Invalid stock value for warehouse ${warehouseId}: ${stockStr}`);
            return null;
          }
          
          const newStock = parseInt(stockStr, 10);
          if (isNaN(newStock) || newStock < 0) return null;
          
          return {
            warehouse_id: warehouseId,
            product_id: adjustingProduct.id,
            stock: newStock,
            min_stock: adjustingProduct.min_stock || 0,
            company_id: currentCompany?.id,
          };
        })
        .filter(Boolean);

      if (upsertEntries.length > 0) {
        const txContext = createTransactionContext(user.id, currentCompany!.id);
        const result = await upsertWithConflictHandling(
          'warehouse_stock',
          upsertEntries,
          ['warehouse_id', 'product_id'],
          txContext
        );

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Validar y recalcular stock total
      const { data: allStocks, error: fetchError } = await supabase
        .from("warehouse_stock")
        .select("stock")
        .eq("product_id", adjustingProduct.id);

      if (fetchError) throw fetchError;

      const totalStock = (allStocks || []).reduce((sum, s) => sum + (s.stock || 0), 0);
      const consistency = await validateStockConsistency(
        adjustingProduct.id,
        totalStock,
        currentCompany!.id
      );

      if (!consistency.isConsistent) {
        console.warn('Stock inconsistency detected after adjustment:', consistency);
      }

      // Actualizar el stock total del producto
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: totalStock, updated_at: new Date().toISOString() })
        .eq("id", adjustingProduct.id);

      if (updateError) throw updateError;

      // Log auditoría
      await auditLogger.log({
        action: AuditActionType.ADJUST_STOCK,
        resourceType: 'product',
        resourceId: adjustingProduct.id,
        userId: user.id,
        companyId: currentCompany!.id,
        metadata: {
          productName: adjustingProduct.name,
          totalStockAfter: totalStock,
          adjustmentCount: upsertEntries.length,
        },
        status: 'success',
      });

      toast.success("Stock ajustado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock-detail"] });
      setIsStockAdjustDialogOpen(false);
      setStockAdjustments({});
    } catch (error: any) {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error adjusting stock:`, error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && products) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleExportCSV = async () => {
    if (!products || products.length === 0) {
      toast.error("No hay productos para exportar");
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Usuario no autenticado');
      }
      const user = authData.user;

      // Fetch category names for all products
      const categoryIds = [...new Set((products as any[]).map(p => p.category_id).filter(Boolean))];
      let categoryMap: Record<string, string> = {};
      
      if (categoryIds.length > 0) {
        try {
          const { data: categories, error: catError } = await supabase
            .from("product_categories" as any)
            .select("id, name")
            .in("id", categoryIds);
          
          if (!catError && categories) {
            (categories as any[]).forEach(cat => {
              categoryMap[cat.id] = cat.name;
            });
          }
        } catch (err) {
          console.warn("Error fetching categories for export:", err);
        }
      }

      const csvData = (products as any[]).map(p => {
        const row: any = {
          nombre: p.name,
          categoria: p.category_id ? (categoryMap[p.category_id] || "") : "",
          codigo_barras: p.barcode || "",
          sku: p.sku || "",
          precio: p.price,
          costo: p.cost || "",
          stock: p.stock,
          stock_minimo: p.min_stock || "",
        };

        if (warehouses) {
          warehouses.forEach(w => {
            row[`deposito_${w.code}`] = 0;
          });
        }

        return row;
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      // Log auditoría de exportación
      await auditLogger.log({
        action: AuditActionType.EXPORT,
        resourceType: 'product',
        resourceId: 'batch-export',
        userId: user.id,
        companyId: currentCompany!.id,
        metadata: {
          totalExported: products.length,
          exportDate: new Date().toISOString(),
        },
        status: 'success',
      });

      toast.success("Productos exportados exitosamente");
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error("Error al exportar productos");
    }
  };

  const handleImportCSV = () => {
    if (!importFile) {
      toast.error("Selecciona un archivo CSV");
      return;
    }

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        if (data.length === 0) {
          toast.error("El archivo CSV está vacío");
          return;
        }

        if (data.length > 1000) {
          toast.error("El archivo CSV es demasiado grande (máximo 1000 productos)");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Usuario no autenticado");
          return;
        }

        const validProducts: any[] = [];
        const productRowMapping: Map<string, { row: any; validated: any }> = new Map();

        // Validar todos los rows primero
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            const nameField = row.nombre?.trim() || row.name?.trim();
            if (!nameField) {
              throw new Error("Falta el campo 'nombre'");
            }

            const validatedData = productSchema.parse({
              name: nameField,
              price: parseFloat(row.precio || row.price),
              cost: row.costo || row.cost ? parseFloat(row.costo || row.cost) : undefined,
              stock: parseInt(row.stock),
              min_stock: row.stock_minimo || row.min_stock ? parseInt(row.stock_minimo || row.min_stock) : undefined,
              category: row.categoria?.trim() || row.category?.trim() || undefined,
              barcode: row.codigo_barras?.trim() || row.barcode?.trim() || undefined,
              sku: row.sku?.trim() || undefined,
            });

            // Generar SKU automáticamente si no se proporciona
            const skuForProduct = validatedData.sku || generateSKU(validatedData.name, "");
            
            const productKey = `${validatedData.barcode || ''}_${skuForProduct}_${validatedData.name}`;
            
            validProducts.push({
              name: validatedData.name,
              barcode: validatedData.barcode || null,
              sku: skuForProduct,
              price: validatedData.price,
              cost: validatedData.cost ?? 0,
              stock: validatedData.stock,
              min_stock: validatedData.min_stock ?? 0,
              category_id: validatedData.category_id || null,
              tags: [],
              custom_fields: {},
              company_id: currentCompany?.id,
            });
            productRowMapping.set(productKey, { row, validated: validatedData });
          } catch (error: any) {
            errorCount++;
            const errorMsg = error instanceof z.ZodError
              ? error.errors[0].message
              : error.message || "Error desconocido";
            errors.push(`Fila ${i + 1}: ${errorMsg}`);
          }
        }

        // Batch insert todas los productos válidos con transacción
        if (validProducts.length > 0) {
          const txContext = createTransactionContext(user.id, currentCompany!.id);
          
          // Validator para chequear unicidad
          const validator = async (product: any) => {
            const uniqueness = await validateProductUniqueness(currentCompany!.id, {
              sku: product.sku,
              barcode: product.barcode,
            });
            return {
              valid: uniqueness.isValid,
              error: uniqueness.errors.length > 0 ? uniqueness.errors[0] : undefined,
            };
          };

          const insertResult = await batchInsertWithValidation(
            'products',
            validProducts,
            txContext,
            (product) => {
              // Validación básica en lote
              if (!product.name || product.price <= 0) {
                return { valid: false, error: 'Nombre y precio requeridos' };
              }
              return { valid: true };
            }
          );

          if (insertResult.success && insertResult.data) {
            successCount = insertResult.itemsProcessed || 0;
            
            // Batch insert warehouse stock entries
            if (warehouses && insertResult.data.length > 0) {
              const allWarehouseEntries: any[] = [];

              insertResult.data.forEach((product: any) => {
                const productKey = `${product.barcode || ''}_${product.sku || ''}_${product.name}`;
                const warehouseInfo = productRowMapping.get(productKey);
                if (!warehouseInfo) return;
                const { row, validated } = warehouseInfo;

                warehouses.forEach(w => {
                  const columnName = `deposito_${w.code}`;
                  const stockValue = row[columnName];

                  if (stockValue && parseInt(stockValue) > 0) {
                    allWarehouseEntries.push({
                      warehouse_id: w.id,
                      product_id: product.id,
                      stock: parseInt(stockValue),
                      min_stock: validated.min_stock ?? 0,
                      company_id: currentCompany!.id,
                    });
                  }
                });
              });

              if (allWarehouseEntries.length > 0) {
                const warehouseResult = await batchInsertWithValidation(
                  'warehouse_stock',
                  allWarehouseEntries,
                  txContext
                );
                
                if (!warehouseResult.success) {
                  console.warn('Some warehouse stock entries failed:', warehouseResult.error);
                }
              }
            }
          } else {
            errors.push(`Error al insertar productos: ${insertResult.error}`);
            errorCount += validProducts.length;
          }
        }

        // Log auditoría de importación
        if (successCount > 0) {
          await auditLogger.log({
            action: AuditActionType.IMPORT,
            resourceType: 'product',
            resourceId: 'batch-import',
            userId: user.id,
            companyId: currentCompany!.id,
            metadata: {
              totalRows: data.length,
              successCount,
              errorCount,
              fileName: importFile.name,
            },
            status: successCount > 0 ? 'success' : 'error',
          });
        }

        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
        setIsImportDialogOpen(false);
        setImportFile(null);
        
        if (successCount > 0) {
          toast.success(`${successCount} productos importados exitosamente`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} productos no pudieron ser importados. ${errors.slice(0, 3).join(", ")}`);
        }
      },
      error: (error) => {
        toast.error("Error al leer el archivo CSV");
        console.error(error);
      },
    });
  };

  const handleMassEdit = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }

    const updates: any = {};
    if (massEditData.price) updates.price = parseFloat(massEditData.price);
    if (massEditData.cost) updates.cost = parseFloat(massEditData.cost);
    if (massEditData.stock) updates.stock = parseInt(massEditData.stock);
    if (massEditData.category_id) updates.category_id = massEditData.category_id;

    if (Object.keys(updates).length === 0) {
      toast.error("Ingresa al menos un campo para actualizar");
      return;
    }

    // Validar los datos antes de actualizar
    const validationResult = validateBulkUpdateData(updates);
    if (!validationResult.isValid) {
      toast.error(`Error de validación: ${validationResult.errors.join(', ')}`);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const productIds = Array.from(selectedProducts);
      const txContext = createTransactionContext(user.id, currentCompany!.id);
      
      // Actualizar en la base de datos
      const { error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in("id", productIds)
        .eq("company_id", currentCompany!.id);

      if (error) throw error;

      // Log auditoría de actualización masiva
      await auditLogger.log({
        action: AuditActionType.BULK_UPDATE,
        resourceType: 'product',
        resourceId: productIds.join(','),
        userId: user.id,
        companyId: currentCompany!.id,
        changes: updates,
        metadata: {
          transactionId: txContext.transactionId,
          totalUpdated: productIds.length,
          fields: Object.keys(updates),
        },
        status: 'success',
      });

      toast.success(`${productIds.length} productos actualizados exitosamente`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsMassEditDialogOpen(false);
      setMassEditData({ price: "", cost: "", stock: "", category_id: "" });
      setSelectedProducts(new Set());
    } catch (error: any) {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error in mass edit:`, error);
    }
  };

  const handleMassDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const productIds = Array.from(selectedProducts);
      const txContext = createTransactionContext(user.id, currentCompany!.id);
      
      // Usar soft delete para mantener integridad histórica
      const result = await softDeleteBatch('products', productIds, txContext);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`${result.itemsProcessed} productos eliminados exitosamente`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDeleteDialogOpen(false);
      setSelectedProducts(new Set());
    } catch (error: any) {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error in mass delete:`, error);
    }
  };

  const calculatePriceAdjustmentPreview = () => {
    if (!adjustmentPercentage || !products) {
      toast.error("Ingresa un porcentaje de ajuste");
      return;
    }

    const percentage = parseFloat(adjustmentPercentage);
    if (isNaN(percentage)) {
      toast.error("Porcentaje inválido");
      return;
    }

    // Validar que el porcentaje esté en un rango razonable (-99 a 10000)
    if (percentage < -99 || percentage > 10000) {
      toast.error("El porcentaje debe estar entre -99% y 10000%");
      return;
    }

    const productsToAdjust = products.filter((p: any) => {
      const currency = p.currency || 'ARS';
      return currency === adjustmentCurrency;
    });

    if (productsToAdjust.length === 0) {
      toast.error(`No hay productos en ${adjustmentCurrency}`);
      setPreviewAdjustments([]);
      return;
    }

    const previews = productsToAdjust.map((product: any) => {
      const currentPrice = Number(product.price);
      const newPrice = currentPrice * (1 + percentage / 100);
      const currency = product.currency || 'ARS';
      const currentARS = convertToARS(currentPrice, currency);
      const newARS = convertToARS(newPrice, currency);

      return {
        id: product.id,
        name: product.name,
        currentPrice,
        newPrice,
        currentARS,
        newARS,
        difference: newPrice - currentPrice,
      };
    });

    setPreviewAdjustments(previews);
    toast.success(`${previews.length} productos listos para ajustar`);
  };

  const applyPriceAdjustments = async () => {
    if (previewAdjustments.length === 0) {
      toast.error("No hay ajustes para aplicar");
      return;
    }

    setIsApplyingAdjustments(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const txContext = createTransactionContext(user.id, currentCompany!.id);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const auditChanges: Record<string, any> = {};
      
      // Validar cambios de precio antes de aplicar
      for (const adjustment of previewAdjustments) {
        const oldProduct = products?.find(p => p.id === adjustment.id);
        if (oldProduct) {
          const validation = validatePriceChange(oldProduct.price, adjustment.newPrice);
          if (!validation.isValid) {
            errors.push(`${adjustment.name}: ${validation.error}`);
            errorCount++;
            continue;
          }
        }
      }

      if (errorCount > 0) {
        throw new Error(`${errorCount} productos tienen cambios de precio inválidos`);
      }

      // Actualizar precios en paralelo (con límite de concurrencia)
      const maxConcurrency = 10;
      const now = new Date().toISOString();
      
      for (let i = 0; i < previewAdjustments.length; i += maxConcurrency) {
        const batch = previewAdjustments.slice(i, i + maxConcurrency);
        const results = await Promise.all(
          batch.map(adjustment =>
            supabase
              .from("products")
              .update({ price: adjustment.newPrice, updated_at: now })
              .eq("id", adjustment.id)
              .eq("company_id", currentCompany!.id)
              .select()
              .then(({ data, error }) => ({ adjustment, data, error }))
          )
        );

        for (const { adjustment, data, error } of results) {
          if (error) {
            console.error(`Error updating ${adjustment.name}:`, error);
            errors.push(`${adjustment.name}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
            const oldProduct = products?.find(p => p.id === adjustment.id);
            if (oldProduct) {
              auditChanges[adjustment.id] = {
                oldPrice: oldProduct.price,
                newPrice: adjustment.newPrice,
                percentageChange: ((adjustment.newPrice - oldProduct.price) / oldProduct.price) * 100,
                currency: adjustmentCurrency,
              };
            }
          }
        }
      }

      // Log auditoría de ajuste masivo de precios
      if (successCount > 0) {
        await auditLogger.log({
          action: AuditActionType.ADJUST_PRICE,
          resourceType: 'product',
          resourceId: Object.keys(auditChanges).join(','),
          userId: user.id,
          companyId: currentCompany!.id,
          changes: auditChanges,
          metadata: {
            transactionId: txContext.transactionId,
            totalAttempted: previewAdjustments.length,
            successCount,
            failCount: errorCount,
            percentageApplied: parseFloat(adjustmentPercentage),
            currencyAdjusted: adjustmentCurrency,
          },
          status: errorCount === 0 ? 'success' : 'error',
        });
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} de ${previewAdjustments.length} precios actualizados`);
      }
      if (errorCount > 0) {
        console.error("Errores detallados:", errors);
        toast.error(`❌ ${errorCount} productos no pudieron actualizarse`);
      }
      
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      if (errorCount === 0) {
        setIsCurrencyAdjustDialogOpen(false);
        setPreviewAdjustments([]);
        setAdjustmentPercentage('');
      }
    } catch (error: any) {
      const errorCode = classifyError(error);
      const userMessage = getUserFriendlyError(error);
      toast.error(userMessage);
      console.error(`[${errorCode}] Error applying price adjustments:`, error);
    } finally {
      setIsApplyingAdjustments(false);
    }
  };

  const getWarehouseStockForProduct = (productId: string) => {
    return warehouseStock?.filter(ws => ws.product_id === productId) || [];
  };

  const getStockBadgeColor = (stock: number, minStock: number) => {
    if (stock <= minStock) return "destructive";
    if (stock <= minStock * 1.5) return "secondary";
    return "default";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">Productos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Gestiona tu inventario</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/reports?tab=products")}>
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ver Reportes</span>
            </Button>
            {canEdit && (
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setIsCurrencyAdjustDialogOpen(true)}
                className="border-blue-500/50 text-blue-600 hover:bg-blue-700 hover:text-white dark:hover:bg-blue-700 dark:hover:text-white"
              >
                <DollarSign className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajustar Cotización</span>
              </Button>
            )}
            {canExport && (
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
            )}
            {canCreate && (
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Importar CSV</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Productos desde CSV</DialogTitle>
                  <DialogDescription>
                    Columnas requeridas: nombre, precio, stock. 
                    {warehouses && warehouses.length > 0 && (
                      <span className="block mt-2">
                        Opcional: {warehouses.map(w => `deposito_${w.code}`).join(", ")}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Archivo CSV</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleImportCSV} disabled={!importFile}>
                      Importar
                    </Button>
                  </div>
                </div>
            </DialogContent>
          </Dialog>
          )}
          {canCreate && (
            <Dialog 
              open={isDialogOpen} 
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  resetForm();
                  setEditingProduct(null);
                  setCustomFields([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 sm:gap-2" data-tutorial="btn-create-product">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Agregar Producto</span>
                  <span className="sm:hidden">Agregar</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-xl sm:max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Package className="h-5 w-5" />
                  {editingProduct ? "Editar" : "Agregar"}
                  <span className="hidden sm:inline">{editingProduct ? " Producto" : " Nuevo Producto"}</span>
                </DialogTitle>
                <DialogDescription>
                  {editingProduct 
                    ? "Modifica los detalles del producto existente" 
                    : "Completa la información básica del producto. Los campos con * son obligatorios"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">
                      Información Básica
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-1 text-sm">
                        Nombre del Producto <span className="text-destructive">*</span>
                      </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Categoría</Label>
                    <div className="flex gap-2">
                      <Select value={formData.category_id || ""} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent className="max-w-xs">
                          {categories?.map((category: any) => (
                            <div
                              key={category.id}
                              className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer group"
                              onClick={() => setFormData({ ...formData, category_id: category.id })}
                            >
                              <span className="flex-1">{category.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryToDelete(category);
                                  setIsDeleteCategoryDialogOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all text-destructive hover:text-destructive ml-2"
                                title="Eliminar categoría"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddCategoryDialogOpen(true)}
                        className="whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Escanea o ingresa manualmente"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sku" className="flex items-center gap-2 text-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                SKU (Código Interno)
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Código único para identificar el producto.</p>
                              <p className="text-xs mt-1">Si dejas vacío, se genera automáticamente.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Dejar vacío para generar automáticamente"
                        className="flex-1 text-sm"
                      />
                      {formData.name && !formData.sku && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const generated = generateSKU(formData.name, "");
                            setFormData({ ...formData, sku: generated });
                            toast.success(`SKU generado: ${generated}`);
                          }}
                          className="whitespace-nowrap w-full sm:w-auto"
                        >
                          Generar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Etiquetas */}
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs hidden sm:inline">Tag</Badge>
                      <span>Etiquetas</span>
                    </Label>
                    <div className="space-y-2">
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg min-h-[2.5rem]">
                          {formData.tags.map((tag) => {
                            const colors = [
                              "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
                              "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
                              "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
                              "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
                              "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
                            ];
                            const color = colors[formData.tags.indexOf(tag) % colors.length];
                            return (
                              <Badge key={tag} variant="secondary" className={`${color} gap-1 px-2 py-1`}>
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 hover:opacity-70"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="tags"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag(tagInput);
                            }
                          }}
                          placeholder="Escribe una etiqueta y presiona Enter"
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTag(tagInput)}
                          className="whitespace-nowrap w-full sm:w-auto"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Campos Personalizados */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCustomFieldsDialogOpen(true)}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Gestionar Campos Personalizados ({customFields.length})
                    </Button>
                    {customFields.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => customFieldsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="w-full gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Campos Personalizados
                      </Button>
                    )}
                  </div>
                  </div>
                  
                  {/* Imagen del Producto */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <ImageIcon className="h-4 w-4" />
                      Imagen del Producto
                    </Label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {imagePreview && (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 border rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 w-full">
                        <Input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageSelect}
                          className="cursor-pointer text-xs sm:text-sm"
                          disabled={compressingImage || uploadingImage}
                        />
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {compressingImage ? (
                            <span className="text-primary">⏳ Procesando imagen...</span>
                          ) : uploadingImage ? (
                            <span className="text-primary">⏳ Subiendo imagen...</span>
                          ) : (
                            <>Formatos: JPG, PNG, WebP. Máx: 10MB. Se comprimirá automáticamente.</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tipo de Producto */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 sm:p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/30">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="is_digital" className="text-sm font-medium cursor-pointer">
                        Este es un producto digital
                      </Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Los productos digitales no tienen stock físico. Pueden tener múltiples opciones de precios (ej: Basic, Pro).
                      </p>
                    </div>
                    <Switch
                      id="is_digital"
                      checked={formData.is_digital}
                      onCheckedChange={(checked) => {
                        setFormData({ 
                          ...formData, 
                          is_digital: checked,
                          stock: checked ? "999999" : "0",
                          min_stock: checked ? "0" : ""
                        });
                        setDigitalPriceTier({name: "", price: ""});
                      }}
                    />
                  </div>
                </div>

                {/* Precios y Stock */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-500" />
                    </div>
                    <h3 className="text-sm font-semibold">
                      Precios {formData.is_digital && "(Producto Digital)"} y Stock
                    </h3>
                  </div>
                  
                  {/* Productos Digitales - Múltiples Precios */}
                  {formData.is_digital ? (
                    <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Opciones de Precio</p>
                        <p className="text-xs text-muted-foreground">Define hasta 3 opciones de precios diferentes (ej: Básico, Estándar, Premium)</p>
                      </div>
                      
                      {/* Precio Base */}
                      <div className="space-y-2 p-3 bg-white dark:bg-slate-950 rounded border">
                        <Label className="text-sm font-medium">Opción Base (Requerida)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nombre"
                            value="Acceso Standard"
                            disabled
                            className="flex-1"
                          />
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                              className="w-20 sm:w-32"
                              required
                            />
                            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                              <SelectTrigger className="w-20 sm:w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ARS">ARS</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Opciones Adicionales */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Opciones Adicionales (Máximo 2)</p>
                        {formData.digital_prices && formData.digital_prices.map((tier: any, idx: number) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-3 bg-white dark:bg-slate-950 rounded border">
                            <Input
                              placeholder="Nombre (ej: Pro)"
                              value={tier.name}
                              onChange={(e) => {
                                const newPrices = [...formData.digital_prices];
                                newPrices[idx].name = e.target.value;
                                setFormData({ ...formData, digital_prices: newPrices });
                              }}
                              className="flex-1 text-sm"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={tier.price}
                              onChange={(e) => {
                                const newPrices = [...formData.digital_prices];
                                newPrices[idx].price = e.target.value;
                                setFormData({ ...formData, digital_prices: newPrices });
                              }}
                              className="w-24 sm:w-32 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const nPrices = formData.digital_prices.filter((_: any, i: number) => i !== idx);
                                setFormData({ ...formData, digital_prices: nPrices });
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        {formData.digital_prices.length < 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                digital_prices: [...(formData.digital_prices || []), {name: "", price: ""}]
                              });
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Opción
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price" className="flex items-center gap-1 text-sm">
                            Precio de Venta <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cost" className="text-sm">Costo (Opcional)</Label>
                          <Input
                            id="cost"
                            type="number"
                            step="0.01"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency" className="text-sm">Moneda</Label>
                          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ARS">🇦🇷 ARS</SelectItem>
                              <SelectItem value="USD">🇺🇸 USD</SelectItem>
                              <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                              <SelectItem value="BRL">🇧🇷 BRL</SelectItem>
                              <SelectItem value="CLP">🇨🇱 CLP</SelectItem>
                              <SelectItem value="UYU">🇺🇾 UYU</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {editingProduct && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/30"
                          onClick={() => handlePriceListEdit(editingProduct)}
                        >
                          <DollarSign className="h-4 w-4" />
                          Gestionar Lista de Precios
                        </Button>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stock" className="flex items-center gap-1 text-sm">
                            Cantidad en Stock <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="stock"
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            required
                            placeholder="0"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="min_stock" className="text-sm">Stock Mínimo</Label>
                          <Input
                            id="min_stock"
                            type="number"
                            value={formData.min_stock}
                            onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                            placeholder="0"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Producto Combo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <PackageOpen className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                    </div>
                    <h3 className="text-sm font-semibold">
                      Producto Combo/Mix
                    </h3>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="is_combo" className="text-sm font-medium cursor-pointer">
                        Este producto es un combo
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Un combo está compuesto por otros productos. Al venderlo, se descontará el stock de sus componentes.
                      </p>
                    </div>
                    <Switch
                      id="is_combo"
                      checked={formData.is_combo}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_combo: checked })}
                    />
                  </div>
                  {formData.is_combo && editingProduct && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        Para gestionar los componentes de este combo, guarda el producto y usa el botón "Gestionar Componentes" en la tabla.
                      </p>
                    </div>
                  )}
                </div>

                {/* Información Adicional */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold">
                      Información Adicional <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
                    </h3>
                  </div>

                  {/* Campos Personalizados Dinámicos */}
                  {customFields.length > 0 && (
                    <div ref={customFieldsSectionRef} className="bg-muted/30 p-4 rounded-lg space-y-3 border border-dashed">
                      <p className="text-sm font-medium">Campos Personalizados</p>
                      <div className="space-y-3">
                        {customFields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label htmlFor={field.id}>{field.name}</Label>
                            {field.type === "text" && (
                              <Input
                                id={field.id}
                                type="text"
                                value={formData.custom_fields[field.id] || ""}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  custom_fields: {...formData.custom_fields, [field.id]: e.target.value}
                                })}
                                placeholder={field.name}
                              />
                            )}
                            {field.type === "number" && (
                              <Input
                                id={field.id}
                                type="number"
                                value={formData.custom_fields[field.id] || ""}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  custom_fields: {...formData.custom_fields, [field.id]: e.target.value}
                                })}
                                placeholder={field.name}
                              />
                            )}
                            {field.type === "textarea" && (
                              <textarea
                                id={field.id}
                                value={formData.custom_fields[field.id] || ""}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  custom_fields: {...formData.custom_fields, [field.id]: e.target.value}
                                })}
                                placeholder={field.name}
                                className="w-full px-3 py-2 text-sm border rounded-md border-input bg-background"
                                rows={3}
                              />
                            )}
                            {field.type === "select" && (
                              <Select
                                value={formData.custom_fields[field.id] || ""}
                                onValueChange={(value) => setFormData({
                                  ...formData,
                                  custom_fields: {...formData.custom_fields, [field.id]: value}
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Selecciona ${field.name}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {field.type === "checkbox" && (
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <input
                                  id={field.id}
                                  type="checkbox"
                                  checked={formData.custom_fields[field.id] === true}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    custom_fields: {...formData.custom_fields, [field.id]: e.target.checked}
                                  })}
                                  className="rounded"
                                />
                                <Label htmlFor={field.id} className="m-0 cursor-pointer">{field.name}</Label>
                              </div>
                            )}
                            {field.type === "date" && (
                              <Input
                                id={field.id}
                                type="date"
                                value={formData.custom_fields[field.id] || ""}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  custom_fields: {...formData.custom_fields, [field.id]: e.target.value}
                                })}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación/Almacén</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ej: Estante A-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch_number">Número de Lote</Label>
                    <Input
                      id="batch_number"
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      placeholder="Ej: LOTE-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiration_date">Fecha de Vencimiento</Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    />
                  </div>
                  </div>
                </div>

                {/* Warehouse Distribution Section */}
                {warehouses && warehouses.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">
                        {editingProduct ? "Gestionar Stock por Depósito" : "Distribución por Depósito (Opcional)"}
                      </Label>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {editingProduct 
                          ? "Asigna o modifica el stock de este producto en cada depósito. El stock total se calculará automáticamente."
                          : "Distribuye el stock total entre los depósitos. Si no distribuyes, el stock quedará sin asignar."}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {warehouses.map((warehouse) => {
                          const existingStock = editingProduct 
                            ? warehouseStockData[editingProduct.id]?.[warehouse.id]
                            : warehouseStockData["new"]?.[warehouse.id];
                          
                          return (
                            <div key={warehouse.id} className="space-y-2">
                              <Label htmlFor={`warehouse-${warehouse.id}`} className="text-sm">
                                <span className="block sm:inline">{warehouse.code}</span>
                                <span className="hidden sm:inline"> - </span>
                                <span className="block sm:inline text-xs sm:text-sm text-muted-foreground">{warehouse.name}</span>
                                {warehouse.is_main && <Badge variant="default" className="ml-2 text-xs">Principal</Badge>}
                              </Label>
                              <Input
                                id={`warehouse-${warehouse.id}`}
                                type="number"
                                min="0"
                                placeholder="0"
                                value={editingProduct 
                                  ? (warehouseStockData[editingProduct.id]?.[warehouse.id] ?? existingStock ?? "")
                                  : (warehouseStockData["new"]?.[warehouse.id] || "")}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  const productKey = editingProduct ? editingProduct.id : "new";
                                  setWarehouseStockData({
                                    ...warehouseStockData,
                                    [productKey]: {
                                      ...warehouseStockData[productKey],
                                      [warehouse.id]: value
                                    }
                                  });
                                }}
                                className="text-sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                      {editingProduct ? (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            💡 Al editar, puedes usar el botón de "Ajustar Stock" para modificaciones rápidas del stock actual.
                          </p>
                        </div>
                      ) : (
                        warehouseStockData["new"] && Object.values(warehouseStockData["new"]).some(v => v > 0) && (
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between text-sm">
                              <span>Total distribuido:</span>
                              <span className="font-semibold">
                                {Object.values(warehouseStockData["new"]).reduce((sum, val) => sum + (val || 0), 0)} / {formData.stock || 0}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={uploadingImage || compressingImage}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="gap-2 w-full sm:w-auto"
                    disabled={uploadingImage || compressingImage}
                  >
                    {uploadingImage ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="hidden sm:inline">Subiendo imagen...</span>
                        <span className="sm:hidden">Subiendo...</span>
                      </>
                    ) : editingProduct ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Actualizar Producto
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Crear Producto
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
          </div>
        </div>

        {selectedProducts.size > 0 && (
          <Card className="shadow-soft bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">
                    {selectedProducts.size} producto{selectedProducts.size > 1 ? 's' : ''} seleccionado{selectedProducts.size > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProducts(new Set())}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpiar selección
                  </Button>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <Dialog open={isMassEditDialogOpen} onOpenChange={setIsMassEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Editar seleccionados
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edición Masiva</DialogTitle>
                        <DialogDescription>
                          Los campos que completes se aplicarán a los {selectedProducts.size} productos seleccionados
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="mass-price">Precio</Label>
                          <Input
                            id="mass-price"
                            type="number"
                            step="0.01"
                            placeholder="Dejar vacío para no modificar"
                            value={massEditData.price}
                            onChange={(e) => setMassEditData({ ...massEditData, price: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mass-cost">Costo</Label>
                          <Input
                            id="mass-cost"
                            type="number"
                            step="0.01"
                            placeholder="Dejar vacío para no modificar"
                            value={massEditData.cost}
                            onChange={(e) => setMassEditData({ ...massEditData, cost: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mass-stock">Stock</Label>
                          <Input
                            id="mass-stock"
                            type="number"
                            placeholder="Dejar vacío para no modificar"
                            value={massEditData.stock}
                            onChange={(e) => setMassEditData({ ...massEditData, stock: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mass-category">Categoría</Label>
                          <Select value={massEditData.category_id || ""} onValueChange={(value) => setMassEditData({ ...massEditData, category_id: value })}>
                            <SelectTrigger id="mass-category">
                              <SelectValue placeholder="Dejar vacío para no modificar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sin categoría</SelectItem>
                              {categories?.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsMassEditDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleMassEdit}>
                            Actualizar {selectedProducts.size} productos
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                  {canDelete && (
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar seleccionados
                        </Button>
                      </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará {selectedProducts.size} producto{selectedProducts.size > 1 ? 's' : ''} y no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMassDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex flex-col gap-3">
              {/* Búsqueda y Botón de Filtros */}
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select value={categoryFilter || "ALL"} onValueChange={(value) => setCategoryFilter(value === "ALL" ? "" : value)}>
                    <SelectTrigger className="flex-1 sm:w-[200px]">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas</SelectItem>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    title="Abrir filtros avanzados"
                    className={isFiltersOpen ? "bg-primary text-primary-foreground" : ""}
                  >
                    <Sliders className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Panel de Filtros Desplegable */}
              {isFiltersOpen && (
                <Collapsible defaultOpen open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="w-full">
                  <CollapsibleContent className="space-y-3 pt-3 border-t">
                    {/* Filtro de Tipo */}
                    <div className="flex flex-wrap gap-2">
                      <div className="text-xs font-medium text-muted-foreground pt-1">Tipo:</div>
                      {["all", "physical", "digital", "combo"].map((type) => (
                        <Button
                          key={type}
                          variant={filterType === type ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => setFilterType(type as any)}
                        >
                          {type === "all" && "Todos"}
                          {type === "physical" && "📦 Físicos"}
                          {type === "digital" && "💻 Digitales"}
                          {type === "combo" && "🎁 Combos"}
                        </Button>
                      ))}
                    </div>

                    {/* Filtro de Stock */}
                    <div className="flex flex-wrap gap-2">
                      <div className="text-xs font-medium text-muted-foreground pt-1">Stock:</div>
                      {[
                        { value: "all", label: "Todos" },
                        { value: "low", label: "⚠️ Bajo" },
                        { value: "out", label: "💔 Agotado" }
                      ].map((status) => (
                        <Button
                          key={status.value}
                          variant={filterStockStatus === status.value ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => setFilterStockStatus(status.value as any)}
                        >
                          {status.label}
                        </Button>
                      ))}
                    </div>

                    {/* Rango de Precios */}
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-medium text-muted-foreground">Rango de Precios: ${priceRange[0]} - ${priceRange[1]}</div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={priceRange[0]}
                          onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                          className="w-24 text-xs"
                          min="0"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                          className="w-24 text-xs"
                          min="0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPriceRange([0, 10000])}
                          className="text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 overflow-x-auto">
            <Table data-tutorial="product-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 sm:w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={products && products.length > 0 && selectedProducts.size === products.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-8 sm:w-12 hidden sm:table-cell"></TableHead>
                  <TableHead 
                    className="min-w-[120px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("name");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Nombre
                      {sortBy === "name" && (
                        <span className="text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead 
                    className="min-w-[80px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortBy === "price") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("price");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Precio
                      {sortBy === "price" && (
                        <span className="text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="hidden sm:table-cell cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortBy === "stock") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("stock");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Stock
                      {sortBy === "stock" && (
                        <span className="text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Estado</TableHead>
                  <TableHead className="text-right min-w-[80px]">Acc.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products && products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="h-12 w-12 text-muted-foreground/40" />
                        <div>
                          <h3 className="text-lg font-semibold">Sin productos registrados</h3>
                          <p className="text-sm text-muted-foreground mb-4">Comienza agregando tu primer producto al catálogo</p>
                          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Crear Primer Producto
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products?.map((product) => {
                    const isExpanded = expandedProducts.has(product.id);
                    const productWarehouseStock = getWarehouseStockForProduct(product.id);
                  
                  return (
                    <React.Fragment key={product.id}>
                      <TableRow>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); toggleProductExpand(product.id); }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded border flex items-center justify-center">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="font-medium text-xs sm:text-sm truncate">{product.name}</span>
                                {product.is_combo && (
                                  <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
                                    <PackageOpen className="h-3 w-3" />
                                    Combo
                                  </Badge>
                                )}
                              </div>
                              {product.sku && (
                                <span className="text-xs text-muted-foreground hidden sm:block">SKU: {product.sku}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-muted-foreground text-xs sm:text-sm">{product.category || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-help">
                                    <span className="font-semibold text-green-600 dark:text-green-500 text-xs sm:text-sm">
                                      {formatPriceDisplay(product)}
                                    </span>
                                    {hasMultiplePrices(product) && (
                                      <Badge variant="secondary" className="text-xs gap-1">
                                        <DollarSign className="h-2.5 w-2.5" />
                                        Listas
                                      </Badge>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="w-64">
                                  <div className="space-y-2">
                                    <p className="font-semibold">Precio Base</p>
                                    <p className="text-lg">${Number(product.price).toFixed(2)}</p>
                                    {productPrices && productPrices.filter((pp: any) => pp.product_id === product.id).length > 0 && (
                                      <div className="pt-2 border-t border-slate-600">
                                        <p className="font-semibold mb-2">Listas de Precios</p>
                                        <div className="space-y-1 text-xs">
                                          {productPrices
                                            .filter((pp: any) => pp.product_id === product.id)
                                            .map((pp: any) => (
                                              <div key={pp.id} className="flex justify-between gap-2">
                                                <span className="text-slate-300">{pp.price_lists?.name}:</span>
                                                <span className="font-medium">${Number(pp.price).toFixed(2)}</span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {product.is_digital ? (
                            <span className="font-semibold text-xs sm:text-sm text-blue-600 dark:text-blue-500">
                              -
                            </span>
                          ) : (
                            <span className={`font-semibold text-xs sm:text-sm ${
                              product.stock <= (product.min_stock || 0)
                                ? 'text-red-600 dark:text-red-500'
                                : product.stock <= (product.min_stock || 0) * 1.5
                                ? 'text-yellow-600 dark:text-yellow-500'
                                : 'text-green-600 dark:text-green-500'
                            }`}>
                              {product.stock}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {product.is_digital ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
                              <Info className="h-3 w-3" />
                              Digital
                            </Badge>
                          ) : product.stock <= (product.min_stock || 0) ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit text-xs">
                              <AlertCircle className="h-3 w-3" />
                              Bajo
                            </Badge>
                          ) : product.stock <= (product.min_stock || 0) * 1.5 ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit text-xs">
                              <Info className="h-3 w-3" />
                              Medio
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1 w-fit bg-green-600 hover:bg-green-700 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      navigate(`/sales?product=${product.id}`);
                                    }}
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver ventas del producto</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
{!product.is_digital && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/purchases?product=${product.id}`);
                                      }}
                                    >
                                      <ShoppingCart className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Crear orden de compra</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          {canEdit && (
                            <>
                              {!product.is_digital && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleStockAdjust(product); }}>
                                        <Package className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ajustar stock</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePriceListEdit(product); }}>
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Listas de precios</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              {product.is_combo && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setComboProduct(product);
                                          setIsComboDialogOpen(true);
                                        }}
                                      >
                                        <PackageOpen className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Gestionar componentes</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(product); }}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar producto</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                          {canDelete && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteProductMutation.mutate(product.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar producto</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="p-4 space-y-6">
                              {/* Stock por Depósito */}
                              {productWarehouseStock.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Stock por Depósito
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {productWarehouseStock.map((ws: any) => (
                                      <div key={ws.id} className="flex items-center justify-between p-2 bg-background rounded border hover:border-primary/50 transition-colors">
                                        <div>
                                          <div className="font-medium text-sm">{ws.warehouses.code}</div>
                                          <div className="text-xs text-muted-foreground">{ws.warehouses.name}</div>
                                        </div>
                                        <Badge variant={getStockBadgeColor(ws.stock, ws.min_stock)}>
                                          {ws.stock}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Precios por Lista */}
                              {productPrices && productPrices.filter((pp: any) => pp.product_id === product.id).length > 0 && (
                                <div className="space-y-3 pt-4 border-t">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    Precios Especiales
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="p-3 bg-background rounded border border-green-200 dark:border-green-900/50">
                                      <div className="text-xs text-muted-foreground">Precio Base</div>
                                      <div className="text-xl font-bold text-green-600 dark:text-green-500">
                                        ${Number(product.price).toFixed(2)}
                                      </div>
                                    </div>
                                    {productPrices
                                      .filter((pp: any) => pp.product_id === product.id)
                                      .map((pp: any) => {
                                        const diff = ((pp.price - product.price) / product.price * 100).toFixed(0);
                                        return (
                                          <div key={pp.id} className="p-3 bg-background rounded border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                            <div className="text-xs text-muted-foreground">{pp.price_lists?.name}</div>
                                            <div className="text-lg font-bold">${Number(pp.price).toFixed(2)}</div>
                                            <div className={`text-xs font-medium mt-1 ${parseInt(diff) < 0 ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'}`}>
                                              {parseInt(diff) < 0 ? '↓' : '↑'} {Math.abs(parseInt(diff))}%
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stock Adjustment Dialog */}
        <Dialog open={isStockAdjustDialogOpen} onOpenChange={setIsStockAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajustar Stock por Depósito</DialogTitle>
              <DialogDescription>
                {adjustingProduct?.name} - Stock Total: {adjustingProduct?.stock}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Modifica el stock de cada depósito. Ingresa el valor final deseado para cada ubicación.
              </p>
              {warehouses?.map((warehouse) => {
                const warehouseStock = getWarehouseStockForProduct(adjustingProduct?.id || "")
                  .find((ws: any) => ws.warehouse_id === warehouse.id);
                
                return (
                  <div key={warehouse.id} className="space-y-2">
                    <Label>
                      {warehouse.code} - {warehouse.name}
                      {warehouseStock && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          (Actual: {warehouseStock.stock})
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={stockAdjustments[warehouse.id] || ""}
                      onChange={(e) => setStockAdjustments({
                        ...stockAdjustments,
                        [warehouse.id]: e.target.value
                      })}
                    />
                  </div>
                );
              })}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStockAdjustDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submitStockAdjustments}>
                  Aplicar Ajustes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Precios por Lista */}
        <Dialog open={isPriceListDialogOpen} onOpenChange={setIsPriceListDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Gestionar Precios - {priceListProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Configura el precio base y precios especiales para cada lista de precios
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Guía Rápida */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-sm">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-amber-900 dark:text-amber-100 text-xs">
                    <p className="font-medium">💡 Tip:</p>
                    <p>El precio base se usa por defecto. Las listas de precios son útiles para clientes mayoristas, promociones o distribuidores con precios especiales.</p>
                  </div>
                </div>
              </div>

              {/* Precio Base */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Precio Base (Por defecto)</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                        ${Number(priceListProduct?.price).toFixed(2)}
                      </p>
                    </div>
                    <Info className="h-5 w-5 text-blue-500 opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este precio se usa cuando no hay una lista específica configurada
                  </p>
                </div>
              </div>

              {/* Listas de Precios */}
              {priceLists && priceLists.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge variant="outline">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {productPrices?.filter((pp: any) => pp.product_id === priceListProduct.id).length || 0} Listas Configuradas
                    </Badge>
                  </div>
                  
                  <div className="grid gap-3">
                    {priceLists.map((priceList: any) => {
                      const existingPrice = productPrices?.find((pp: any) => pp.product_id === priceListProduct.id && pp.price_list_id === priceList.id);
                      const inputValue = priceListPrices[priceList.id];
                      const displayPrice = inputValue ? parseFloat(inputValue) : existingPrice?.price;
                      const percentDiff = displayPrice && priceListProduct?.price 
                        ? (((displayPrice - priceListProduct.price) / priceListProduct.price) * 100).toFixed(1)
                        : null;
                      
                      return (
                        <div key={priceList.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/40 transition-colors dark:hover:bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-semibold flex items-center gap-2">
                                {priceList.name}
                                {priceList.is_default && (
                                  <Badge variant="secondary" className="text-xs">
                                    Por defecto
                                  </Badge>
                                )}
                              </Label>
                              {existingPrice && !inputValue && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Precio actual: ${Number(existingPrice.price).toFixed(2)}
                                </p>
                              )}
                            </div>
                            {displayPrice && percentDiff && (
                              <div className={`text-right text-sm font-medium ${
                                parseFloat(percentDiff) < 0 
                                  ? 'text-orange-600 dark:text-orange-500' 
                                  : 'text-green-600 dark:text-green-500'
                              }`}>
                                {parseFloat(percentDiff) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(percentDiff))}%
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={existingPrice ? String(existingPrice.price) : "Ingresa el precio"}
                                value={priceListPrices[priceList.id] || ""}
                                onChange={(e) => setPriceListPrices({
                                  ...priceListPrices,
                                  [priceList.id]: e.target.value
                                })}
                                className="text-lg font-semibold"
                              />
                            </div>
                            {displayPrice && (
                              <div className="px-3 py-2 bg-muted rounded text-center">
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-lg font-bold">${Number(displayPrice).toFixed(2)}</p>
                              </div>
                            )}
                          </div>

                          {displayPrice && priceListProduct?.cost && displayPrice > priceListProduct.cost && (
                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Margen: {((((displayPrice - priceListProduct.cost) / displayPrice) * 100)).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-lg">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No hay listas de precios configuradas</p>
                  <p className="text-sm mt-1">Crea listas de precios en Configuración para gestionar precios diferentes</p>
                </div>
              )}

              {/* Resumen */}
              {priceLists && priceLists.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                  <p className="text-sm font-semibold">📊 Resumen de Precios</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Precio Base</p>
                      <p className="font-semibold">${Number(priceListProduct?.price).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Costo del Producto</p>
                      <p className="font-semibold">${Number(priceListProduct?.cost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Margen Base</p>
                      <p className="font-semibold text-green-600 dark:text-green-500">
                        {priceListProduct?.cost && priceListProduct.price > priceListProduct.cost
                          ? `${(((priceListProduct.price - priceListProduct.cost) / priceListProduct.price) * 100).toFixed(1)}%`
                          : '—'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setIsPriceListDialogOpen(false);
                setPriceListPrices({});
              }}>
                Cancelar
              </Button>
              <Button onClick={submitPriceListUpdates} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Guardar Precios
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Fields Management Dialog */}
        <Dialog open={isCustomFieldsDialogOpen} onOpenChange={setIsCustomFieldsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Gestionar Campos Personalizados
              </DialogTitle>
              <DialogDescription>
                Crea campos adicionales para almacenar información personalizada de tus productos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Crear Nuevo Campo */}
              <div className="space-y-4 p-4 border-2 border-dashed rounded-lg bg-muted/30">
                <h4 className="font-semibold text-sm">➕ Crear Nuevo Campo</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="field-name">Nombre del Campo</Label>
                    <Input
                      id="field-name"
                      value={newCustomField.name}
                      onChange={(e) => setNewCustomField({...newCustomField, name: e.target.value})}
                      placeholder="Ej: Proveedore, Color, Tamaño"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field-type">Tipo de Campo</Label>
                    <Select value={newCustomField.type} onValueChange={(value) => setNewCustomField({...newCustomField, type: value as any})}>
                      <SelectTrigger id="field-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">📝 Texto</SelectItem>
                        <SelectItem value="number">🔢 Número</SelectItem>
                        <SelectItem value="textarea">📄 Texto Largo</SelectItem>
                        <SelectItem value="select">📋 Selección (Dropdown)</SelectItem>
                        <SelectItem value="checkbox">☑️ Checkbox</SelectItem>
                        <SelectItem value="date">📅 Fecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newCustomField.type === "select") && (
                    <div className="space-y-2">
                      <Label htmlFor="field-options">Opciones (separadas por comas)</Label>
                      <Input
                        id="field-options"
                        value={newCustomField.options}
                        onChange={(e) => setNewCustomField({...newCustomField, options: e.target.value})}
                        placeholder="Ej: Rojo, Azul, Verde"
                      />
                      <p className="text-xs text-muted-foreground">Ingresa las opciones separadas por comas</p>
                    </div>
                  )}
                  <Button onClick={addCustomField} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Campo
                  </Button>
                </div>
              </div>

              {/* Campos Existentes */}
              {customFields.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">📊 Campos Existentes ({customFields.length})</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{field.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Tipo: {field.type === "text" && "Texto"}
                            {field.type === "number" && "Número"}
                            {field.type === "textarea" && "Texto Largo"}
                            {field.type === "select" && `Selección (${field.options?.length || 0} opciones)`}
                            {field.type === "checkbox" && "Checkbox"}
                            {field.type === "date" && "Fecha"}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeCustomField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customFields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-25" />
                  <p className="font-medium">No hay campos personalizados aún</p>
                  <p className="text-sm">Crea uno para empezar</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCustomFieldsDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Combo Components Dialog */}
        {comboProduct && (
          <ComboComponentsDialog
            productId={comboProduct.id}
            productName={comboProduct.name}
            isOpen={isComboDialogOpen}
            onClose={() => {
              setIsComboDialogOpen(false);
              setComboProduct(null);
            }}
          />
        )}

        {/* Currency Adjustment Dialog */}
        <Dialog open={isCurrencyAdjustDialogOpen} onOpenChange={setIsCurrencyAdjustDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Ajuste Masivo por Cotización
              </DialogTitle>
              <DialogDescription>
                Actualiza los precios en ARS de productos en moneda extranjera basándote en la nueva cotización
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moneda a Ajustar</Label>
                  <Select value={adjustmentCurrency} onValueChange={setAdjustmentCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">🇺🇸 USD (Dólar)</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR (Euro)</SelectItem>
                      <SelectItem value="BRL">🇧🇷 BRL (Real)</SelectItem>
                      <SelectItem value="CLP">🇨🇱 CLP (Peso Chileno)</SelectItem>
                      <SelectItem value="UYU">🇺🇾 UYU (Peso Uruguayo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Productos afectados: {products?.filter((p: any) => p.currency === adjustmentCurrency).length || 0}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment-percentage">Porcentaje de Ajuste</Label>
                  <div className="flex gap-2">
                    <Input
                      id="adjustment-percentage"
                      type="number"
                      step="0.1"
                      placeholder="Ej: 10 para subir 10%"
                      value={adjustmentPercentage}
                      onChange={(e) => {
                        console.log('Porcentaje input change:', e.target.value);
                        setAdjustmentPercentage(e.target.value);
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        console.log('Porcentaje input:', target.value);
                      }}
                      className="flex-1"
                      autoComplete="off"
                    />
                    <Button onClick={calculatePriceAdjustmentPreview} variant="outline">
                      <Search className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use números negativos para bajar precios (ej: -5 para bajar 5%)
                  </p>
                </div>
              </div>

              {/* Current Exchange Rate */}
              {exchangeRates && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cotización Actual:</span>
                    <span className="text-lg font-bold">
                      1 {adjustmentCurrency} = {exchangeRates.find(r => r.currency === adjustmentCurrency)?.rate?.toFixed(2) || 'N/A'} ARS
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {previewAdjustments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Vista Previa de Cambios</Label>
                    <Badge variant="secondary">{previewAdjustments.length} productos</Badge>
                  </div>
                  
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Precio Actual</TableHead>
                          <TableHead className="text-right">Precio Nuevo</TableHead>
                          <TableHead className="text-right">En ARS Actual</TableHead>
                          <TableHead className="text-right">En ARS Nuevo</TableHead>
                          <TableHead className="text-right">Diferencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewAdjustments.map((adj) => (
                          <TableRow key={adj.id}>
                            <TableCell className="font-medium">{adj.name}</TableCell>
                            <TableCell className="text-right">
                              {adjustmentCurrency} ${adj.currentPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {adjustmentCurrency} ${adj.newPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {adj.currentARS ? `ARS $${adj.currentARS.toFixed(2)}` : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {adj.newARS ? `ARS $${adj.newARS.toFixed(2)}` : 'N/A'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${adj.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {adj.difference >= 0 ? '+' : ''}{adjustmentCurrency} ${adj.difference.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setPreviewAdjustments([]);
                        setAdjustmentPercentage('');
                      }}
                      disabled={isApplyingAdjustments}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={applyPriceAdjustments} 
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isApplyingAdjustments}
                    >
                      {isApplyingAdjustments ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Aplicando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aplicar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {previewAdjustments.length === 0 && adjustmentPercentage && (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Haz clic en "Preview" para ver los cambios antes de aplicarlos</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Category Dialog */}
        <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Categoría</DialogTitle>
              <DialogDescription>
                Crea una nueva categoría de productos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-category-name">Nombre de la Categoría</Label>
                <Input
                  id="new-category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej: Electrónica, Alimentos, Ropa, etc."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      createCategoryMutation.mutate(newCategoryName);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddCategoryDialogOpen(false)}
                  disabled={createCategoryMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      createCategoryMutation.mutate(newCategoryName);
                    }
                  }}
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Categoría
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Category AlertDialog */}
        <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Eliminar Categoría
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 pt-2">
                <p>
                  Se eliminará la categoría <span className="font-semibold text-foreground">"{categoryToDelete?.name}"</span>
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-3 text-sm">
                  <p className="text-amber-900 dark:text-amber-100">
                    <strong>Precaución:</strong> Esta acción no se puede deshacer. Asegúrate de que no hay productos asociados a esta categoría.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={deleteCategoryMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (categoryToDelete?.id) {
                    deleteCategoryMutation.mutate(categoryToDelete.id);
                  }
                }}
                disabled={deleteCategoryMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCategoryMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
