import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { getUserErrorMessage } from "@/lib/errorUtils";
import { useCompany } from "@/contexts/CompanyContext";

import { useCartLogic } from "@/hooks/pos/useCartLogic";
import { usePaymentLogic } from "@/hooks/pos/usePaymentLogic";
import { useSaleProcessing } from "@/hooks/pos/useSaleProcessing";
import { ProductPanel } from "@/components/pos/ProductPanel";
import { CartPanel } from "@/components/pos/CartPanel";
import { CreateCustomerDialog } from "@/components/pos/CreateCustomerDialog";
import { ReceiptOptionsDialog } from "@/components/pos/ReceiptOptionsDialog";

export default function POS() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // Local state for search, customer, warehouse, dialog, AFIP
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedPOSAfipId, setSelectedPOSAfipId] = useState<string>("");
  const [createCustomerDialog, setCreateCustomerDialog] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", searchQuery, selectedCustomer?.price_list_id, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase.from("products").select("*").eq("active", true).eq("company_id", currentCompany.id);
      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) {
          query = query.or(`name.ilike.%${sanitized}%,barcode.eq.${sanitized},sku.eq.${sanitized}`);
        }
      }
      const { data: productsData, error } = await query.limit(10);
      if (error) throw error;

      if (selectedCustomer?.price_list_id && productsData) {
        const productIds = productsData.map((p: any) => p.id);
        const { data: pricesData } = await supabase
          .from("product_prices")
          .select("product_id, price")
          .eq("price_list_id", selectedCustomer.price_list_id)
          .in("product_id", productIds);
        const pricesMap = new Map(pricesData?.map((p: any) => [p.product_id, p.price]) || []);
        return productsData.map((product: any) => ({
          ...product,
          price: pricesMap.get(product.id) ?? product.price,
        }));
      }
      return productsData;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase.from("companies").select("*").eq("id", currentCompany.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: posPoints } = useQuery({
    queryKey: ["pos-afip", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("pos_afip")
        .select("id, punto_venta, descripcion, tipo_comprobante, active")
        .eq("company_id", currentCompany.id)
        .eq("active", true)
        .order("punto_venta", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  useEffect(() => {
    if (posPoints && posPoints.length > 0 && !selectedPOSAfipId) {
      setSelectedPOSAfipId(posPoints[0].id);
    }
  }, [posPoints]);

  const { data: exchangeRates } = useQuery({
    queryKey: ["exchange-rates-pos", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-pos", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("customer_pos_view")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("company_id", currentCompany.id)
        .eq("active", true)
        .order("is_main", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // LOW-02: Set default warehouse via useEffect instead of side-effect in queryFn
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(warehouses[0].id);
    }
  }, [warehouses]);

  // ── Custom hooks ────────────────────────────────────────────────────────────

  const cardSurchargeRate = companySettings?.card_surcharge_rate || 0;

  const cart = useCartLogic({ companySettings, selectedCustomer });

  const payment = usePaymentLogic({
    total_base: cart.total_base,
    exchangeRates,
    cardSurchargeRate,
  });

  const clearAll = () => {
    cart.resetCart();
    payment.resetPayments();
    setSelectedCustomer(null);
    toast.info("Carrito vaciado");
  };

  const sale = useSaleProcessing({
    cart: cart.cart,
    paymentMethods: payment.paymentMethods,
    selectedCustomer,
    selectedWarehouse,
    selectedPOSAfipId,
    subtotal: cart.subtotal,
    totalDiscount: cart.totalDiscount,
    discountRate: cart.discountRate,
    loyaltyDiscountRate: cart.loyaltyDiscountRate,
    taxAmount: cart.taxAmount,
    taxRate: cart.taxRate,
    total: payment.total,
    remaining: payment.remaining,
    loyaltyPointsToUse: cart.loyaltyPointsToUse,
    companySettings,
    posPoints,
    currentCompany,
    onSaleSuccess: () => {
      cart.resetCart();
      payment.resetPayments();
      setSelectedCustomer(null);
    },
  });

  // ── Create customer mutation ───────────────────────────────────────────────

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; email: string; document: string }) => {
      if (!data.name.trim()) throw new Error("El nombre es requerido");
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          name: data.name.trim(),
          phone: data.phone.trim() || null,
          email: data.email.trim() || null,
          document: data.document.trim() || null,
          company_id: currentCompany?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return customer;
    },
    onSuccess: (customer) => {
      toast.success("Cliente creado exitosamente");
      setSelectedCustomer(customer);
      setCreateCustomerDialog(false);
      queryClient.invalidateQueries({ queryKey: ["customers-pos", currentCompany?.id] });
    },
    onError: (error: any) => {
      toast.error(getUserErrorMessage(error, "Error al crear cliente"));
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Punto de Venta</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Sistema de gestión de ventas</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
            <Badge variant="outline" className="px-2 py-1 text-xs md:text-sm">
              <DollarSign className="mr-1 h-3 w-3 md:h-4 md:w-4" />
              ${payment.total.toFixed(2)}
            </Badge>
            <Badge variant={cart.cart.length > 0 ? "default" : "secondary"} className="px-2 py-1 text-xs md:text-sm">
              <ShoppingCart className="mr-1 h-3 w-3 md:h-4 md:w-4" />
              {cart.cart.length}
            </Badge>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <ProductPanel
            products={products}
            isLoading={isLoadingProducts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddToCart={cart.addToCart}
          />

          <CartPanel
            // Cart
            cart={cart.cart}
            discountRate={cart.discountRate}
            setDiscountRate={cart.setDiscountRate}
            loyaltyPointsToUse={cart.loyaltyPointsToUse}
            setLoyaltyPointsToUse={cart.setLoyaltyPointsToUse}
            updateQuantity={cart.updateQuantity}
            removeFromCart={cart.removeFromCart}
            onClearAll={clearAll}
            subtotal={cart.subtotal}
            manualDiscountAmount={cart.manualDiscountAmount}
            loyaltyDiscountAmount={cart.loyaltyDiscountAmount}
            loyaltyDiscountRate={cart.loyaltyDiscountRate}
            loyaltyPointsValue={cart.loyaltyPointsValue}
            taxAmount={cart.taxAmount}
            taxRate={cart.taxRate}
            // Payment
            paymentMethods={payment.paymentMethods}
            currentPaymentMethod={payment.currentPaymentMethod}
            setCurrentPaymentMethod={payment.setCurrentPaymentMethod}
            currentPaymentAmount={payment.currentPaymentAmount}
            setCurrentPaymentAmount={payment.setCurrentPaymentAmount}
            currentInstallments={payment.currentInstallments}
            setCurrentInstallments={payment.setCurrentInstallments}
            currentPaymentCurrency={payment.currentPaymentCurrency}
            setCurrentPaymentCurrency={payment.setCurrentPaymentCurrency}
            addPaymentMethod={payment.addPaymentMethod}
            payTotalAmount={payment.payTotalAmount}
            removePaymentMethod={payment.removePaymentMethod}
            recargo_pagado={payment.recargo_pagado}
            total_cobrado={payment.total_cobrado}
            restante_base={payment.restante_base}
            potentialCardSurcharge={payment.potentialCardSurcharge}
            total={payment.total}
            remaining={payment.remaining}
            // Customer & warehouse
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            setLoyaltyPointsToUseZero={() => cart.setLoyaltyPointsToUse(0)}
            customers={customers}
            selectedWarehouse={selectedWarehouse}
            setSelectedWarehouse={setSelectedWarehouse}
            warehouses={warehouses}
            // Settings
            companySettings={companySettings}
            cardSurchargeRate={cardSurchargeRate}
            exchangeRates={exchangeRates}
            convertCurrency={payment.convertCurrency}
            // Sale
            onCreateCustomer={() => setCreateCustomerDialog(true)}
            onProcessSale={() => sale.processSaleMutation.mutate()}
            isProcessing={sale.processSaleMutation.isPending}
          />
        </div>

        <CreateCustomerDialog
          open={createCustomerDialog}
          onOpenChange={setCreateCustomerDialog}
          onSubmit={(data) => createCustomerMutation.mutate(data)}
          isLoading={createCustomerMutation.isPending}
        />

        <ReceiptOptionsDialog
          open={sale.showReceiptOptions}
          onOpenChange={sale.setShowReceiptOptions}
          saleData={sale.lastSaleData}
          onPrint={sale.handlePrintReceipt}
          onPrintInvoice={sale.handlePrintInvoice}
          onEmail={sale.handleEmailReceipt}
          onWhatsApp={sale.handleWhatsAppReceipt}
          onSkip={sale.handleSkipReceipt}
        />
      </div>
    </Layout>
  );
}
