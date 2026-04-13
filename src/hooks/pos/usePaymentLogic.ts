import { useState } from "react";
import { toast } from "sonner";

export interface PaymentMethod {
  id: string;
  method: string;
  originalAmount: number; // amount in original currency (for server-side conversion)
  baseAmount: number;     // converted to ARS
  surcharge: number;
  amount: number;         // baseAmount + surcharge (ARS)
  installments?: number;
  currency?: string;      // original currency code
}

interface PaymentLogicParams {
  total_base: number;
  exchangeRates: any[] | undefined;
  cardSurchargeRate: number;
}

export function usePaymentLogic({ total_base, exchangeRates, cardSurchargeRate }: PaymentLogicParams) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState("cash");
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState("");
  const [currentInstallments, setCurrentInstallments] = useState(1);
  const [currentPaymentCurrency, setCurrentPaymentCurrency] = useState("ARS");

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const rates = exchangeRates || [];
    let amountInARS = amount;
    if (fromCurrency !== 'ARS') {
      const fromRate = rates.find(r => r.currency === fromCurrency);
      if (fromRate) amountInARS = amount * fromRate.rate;
    }
    if (toCurrency !== 'ARS') {
      const toRate = rates.find(r => r.currency === toCurrency);
      if (toRate && toRate.rate > 0) return amountInARS / toRate.rate;
    }
    return amountInARS;
  };

  // Derived totals
  const totalBaseAmount = paymentMethods.reduce((sum, p) => sum + p.baseAmount, 0);
  const recargo_pagado = paymentMethods.reduce((sum, p) => sum + p.surcharge, 0);
  const total_cobrado = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
  const restante_base = total_base - totalBaseAmount;

  let potentialCardSurcharge = 0;
  if (currentPaymentMethod === 'card' && cardSurchargeRate > 0 && restante_base > 0) {
    const tasa_recargo = cardSurchargeRate * currentInstallments / 100;
    potentialCardSurcharge = restante_base * tasa_recargo;
  }

  const total = total_base + recargo_pagado;
  const remaining = restante_base;

  const addPaymentMethod = (autoBaseAmount?: number) => {
    const baseAmount = autoBaseAmount || parseFloat(currentPaymentAmount);
    if (!baseAmount || baseAmount <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }
    const baseAmountInARS = convertCurrency(baseAmount, currentPaymentCurrency, 'ARS');
    if (baseAmountInARS > restante_base + 0.01) {
      toast.error("El monto base excede el restante");
      return;
    }
    let surcharge = 0;
    if (currentPaymentMethod === 'card' && cardSurchargeRate > 0) {
      const tasa_recargo = cardSurchargeRate * currentInstallments / 100;
      surcharge = baseAmountInARS * tasa_recargo;
    }
    const totalAmount = baseAmountInARS + surcharge;
    setPaymentMethods(prev => [...prev, {
      id: Date.now().toString(),
      method: currentPaymentMethod,
      originalAmount: baseAmount,
      baseAmount: baseAmountInARS,
      surcharge,
      amount: totalAmount,
      installments: currentPaymentMethod === 'card' ? currentInstallments : 1,
      currency: currentPaymentCurrency,
    }]);
    setCurrentPaymentAmount("");
    setCurrentInstallments(1);
    toast.success(`Método de pago agregado (${currentPaymentCurrency})`);
  };

  const payTotalAmount = () => {
    if (restante_base <= 0) {
      toast.error("Ya está pagado el total");
      return;
    }
    // Convert remaining ARS to user's selected currency for correct roundtrip
    const amountInUserCurrency = convertCurrency(restante_base, 'ARS', currentPaymentCurrency);
    addPaymentMethod(amountInUserCurrency);
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
    toast.success("Método de pago eliminado");
  };

  const resetPayments = () => {
    setPaymentMethods([]);
    setCurrentPaymentMethod("cash");
    setCurrentPaymentAmount("");
    setCurrentInstallments(1);
    setCurrentPaymentCurrency("ARS");
  };

  return {
    paymentMethods,
    currentPaymentMethod,
    setCurrentPaymentMethod,
    currentPaymentAmount,
    setCurrentPaymentAmount,
    currentInstallments,
    setCurrentInstallments,
    currentPaymentCurrency,
    setCurrentPaymentCurrency,
    convertCurrency,
    totalBaseAmount,
    recargo_pagado,
    total_cobrado,
    restante_base,
    potentialCardSurcharge,
    total,
    remaining,
    addPaymentMethod,
    payTotalAmount,
    removePaymentMethod,
    resetPayments,
  };
}
