import { useState } from "react";
import { toast } from "sonner";

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface CartLogicParams {
  companySettings: any;
  selectedCustomer: any;
}

export function useCartLogic({ companySettings, selectedCustomer }: CartLogicParams) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [_discountRate, _setDiscountRate] = useState(0);
  const [_loyaltyPointsToUse, _setLoyaltyPointsToUse] = useState(0);

  // MED-03: Clamp discount rate to [0, 100]
  const discountRate = _discountRate;
  const setDiscountRate = (value: number) => _setDiscountRate(Math.min(100, Math.max(0, value)));
  // Clamp loyalty points to [0, available]
  const maxLoyaltyPoints = selectedCustomer?.loyalty_points ?? 0;
  const loyaltyPointsToUse = _loyaltyPointsToUse;
  const setLoyaltyPointsToUse = (value: number) => _setLoyaltyPointsToUse(Math.min(maxLoyaltyPoints, Math.max(0, value)));

  const addToCart = (product: any) => {
    if (product.stock === 0) {
      toast.error("Producto sin stock");
      return;
    }
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error("Stock insuficiente");
        return;
      }
      setCart(prev => prev.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      setCart(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: Number(product.price),
        subtotal: Number(product.price),
      }]);
    }
    toast.success(`${product.name} agregado al carrito`);
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        return { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
    toast.success("Producto eliminado del carrito");
  };

  const resetCart = () => {
    setCart([]);
    setDiscountRate(0);
    setLoyaltyPointsToUse(0);
  };

  const handleBarcodeScanner = (code: string) => {
    toast.success(`Código escaneado: ${code}`);
  };

  // Loyalty calculations
  const loyaltyDiscountRate = selectedCustomer && companySettings?.loyalty_enabled
    ? selectedCustomer.loyalty_tier === 'gold'
      ? companySettings.loyalty_gold_discount || 0
      : selectedCustomer.loyalty_tier === 'silver'
      ? companySettings.loyalty_silver_discount || 0
      : companySettings.loyalty_bronze_discount || 0
    : 0;

  const loyaltyPointsValue = companySettings?.loyalty_enabled && loyaltyPointsToUse > 0
    ? loyaltyPointsToUse * (companySettings.loyalty_currency_per_point || 0.01)
    : 0;

  // Derived totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const manualDiscountAmount = (subtotal * discountRate) / 100;
  const loyaltyDiscountAmount = (subtotal * loyaltyDiscountRate) / 100;
  const totalDiscount = manualDiscountAmount + loyaltyDiscountAmount + loyaltyPointsValue;
  const taxRate = companySettings?.default_tax_rate || 0;
  const taxAmount = ((subtotal - totalDiscount) * taxRate) / 100;
  const total_base = subtotal - totalDiscount + taxAmount;

  return {
    cart,
    discountRate,
    setDiscountRate,
    loyaltyPointsToUse,
    setLoyaltyPointsToUse,
    addToCart,
    updateQuantity,
    removeFromCart,
    resetCart,
    handleBarcodeScanner,
    loyaltyDiscountRate,
    loyaltyPointsValue,
    subtotal,
    manualDiscountAmount,
    loyaltyDiscountAmount,
    totalDiscount,
    taxRate,
    taxAmount,
    total_base,
  };
}
