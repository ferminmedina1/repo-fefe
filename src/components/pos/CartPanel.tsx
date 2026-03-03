import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Plus, Minus, Trash2, Receipt,
  Award, Star, Percent, AlertCircle,
} from "lucide-react";
import type { CartItem } from "@/hooks/pos/useCartLogic";
import type { PaymentMethod } from "@/hooks/pos/usePaymentLogic";

interface CartPanelProps {
  // Cart state & actions
  cart: CartItem[];
  discountRate: number;
  setDiscountRate: (v: number) => void;
  loyaltyPointsToUse: number;
  setLoyaltyPointsToUse: (v: number) => void;
  updateQuantity: (id: string, change: number) => void;
  removeFromCart: (id: string) => void;
  onClearAll: () => void;

  // Cart derived
  subtotal: number;
  manualDiscountAmount: number;
  loyaltyDiscountAmount: number;
  loyaltyDiscountRate: number;
  loyaltyPointsValue: number;
  taxAmount: number;
  taxRate: number;

  // Payment state & actions
  paymentMethods: PaymentMethod[];
  currentPaymentMethod: string;
  setCurrentPaymentMethod: (v: string) => void;
  currentPaymentAmount: string;
  setCurrentPaymentAmount: (v: string) => void;
  currentInstallments: number;
  setCurrentInstallments: (v: number) => void;
  currentPaymentCurrency: string;
  setCurrentPaymentCurrency: (v: string) => void;
  addPaymentMethod: (auto?: number) => void;
  payTotalAmount: () => void;
  removePaymentMethod: (id: string) => void;

  // Payment derived
  recargo_pagado: number;
  total_cobrado: number;
  restante_base: number;
  potentialCardSurcharge: number;
  total: number;
  remaining: number;

  // Customer & warehouse
  selectedCustomer: any;
  setSelectedCustomer: (c: any) => void;
  setLoyaltyPointsToUseZero: () => void;
  customers: any[] | undefined;
  selectedWarehouse: string;
  setSelectedWarehouse: (w: string) => void;
  warehouses: any[] | undefined;

  // Settings
  companySettings: any;
  cardSurchargeRate: number;
  exchangeRates: any[] | undefined;
  convertCurrency: (amount: number, from: string, to: string) => number;

  // Sale
  onCreateCustomer: () => void;
  onProcessSale: () => void;
  isProcessing: boolean;
}

export function CartPanel({
  cart, discountRate, setDiscountRate, loyaltyPointsToUse, setLoyaltyPointsToUse,
  updateQuantity, removeFromCart, onClearAll,
  subtotal, manualDiscountAmount, loyaltyDiscountAmount, loyaltyDiscountRate, loyaltyPointsValue,
  taxAmount, taxRate,
  paymentMethods, currentPaymentMethod, setCurrentPaymentMethod,
  currentPaymentAmount, setCurrentPaymentAmount,
  currentInstallments, setCurrentInstallments,
  currentPaymentCurrency, setCurrentPaymentCurrency,
  addPaymentMethod, payTotalAmount, removePaymentMethod,
  recargo_pagado, total_cobrado, restante_base, potentialCardSurcharge, total, remaining,
  selectedCustomer, setSelectedCustomer, setLoyaltyPointsToUseZero,
  customers, selectedWarehouse, setSelectedWarehouse, warehouses,
  companySettings, cardSurchargeRate, exchangeRates, convertCurrency,
  onCreateCustomer, onProcessSale, isProcessing,
}: CartPanelProps) {
  return (
    <div className="space-y-4 order-1 lg:order-2">
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
            Carrito
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
            {cart.map((item, index) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between p-2 md:p-3 bg-muted rounded-lg animate-slide-in-right"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-medium text-xs md:text-sm truncate">{item.product_name}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">${item.unit_price.toFixed(0)} x {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6 md:h-7 md:w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 md:w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-6 w-6 md:h-7 md:w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 md:h-7 md:w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold">Resumen</Label>

                <div className="space-y-2">
                  <Label className="text-xs">Descuento Manual (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1 text-sm p-3 bg-muted/30 rounded-lg animate-fade-in">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  {manualDiscountAmount > 0 && (
                    <div className="flex justify-between text-destructive animate-slide-in-right">
                      <span>Descuento Manual ({discountRate}%):</span>
                      <span>-${manualDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {loyaltyDiscountAmount > 0 && (
                    <div className="flex justify-between text-primary animate-slide-in-right">
                      <span>Descuento Fidelidad ({loyaltyDiscountRate}%):</span>
                      <span>-${loyaltyDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {loyaltyPointsValue > 0 && (
                    <div className="flex justify-between text-primary animate-slide-in-right">
                      <span>Puntos Canjeados ({loyaltyPointsToUse}):</span>
                      <span>-${loyaltyPointsValue.toFixed(2)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impuesto ({taxRate}%):</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {recargo_pagado > 0 && (
                    <div className="flex justify-between text-warning animate-slide-in-right">
                      <span>Recargo Tarjeta (pagado):</span>
                      <span>+${recargo_pagado.toFixed(2)}</span>
                    </div>
                  )}
                  {potentialCardSurcharge > 0 && (
                    <div className="flex justify-between text-warning animate-pulse-subtle">
                      <span>Recargo Tarjeta Potencial:</span>
                      <span>+${potentialCardSurcharge.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator className="my-2" />

                  <div className="flex justify-between text-base font-bold pt-1 animate-scale-in">
                    <span>Total a Pagar:</span>
                    <span className="text-primary text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>

                {selectedCustomer && companySettings?.loyalty_enabled && (
                  <div className="bg-primary/10 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Nivel: {selectedCustomer.loyalty_tier?.toUpperCase()}</span>
                      </div>
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        {selectedCustomer.loyalty_points || 0} pts
                      </Badge>
                    </div>
                    {loyaltyDiscountRate > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <Percent className="h-3 w-3 inline mr-1" />
                        Descuento aplicado: {loyaltyDiscountRate}%
                      </p>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Canjear Puntos</Label>
                      <Input
                        type="number"
                        min="0"
                        max={selectedCustomer.loyalty_points || 0}
                        value={loyaltyPointsToUse}
                        onChange={(e) => setLoyaltyPointsToUse(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor: ${loyaltyPointsValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Depósito</Label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar depósito..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Cliente (Opcional)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={onCreateCustomer}>
                      <Plus className="h-3 w-3 mr-1" />
                      Nuevo
                    </Button>
                  </div>
                  <Select
                    value={selectedCustomer?.id || "none"}
                    onValueChange={(val) => {
                      if (val === "none") {
                        setSelectedCustomer(null);
                        setLoyaltyPointsToUseZero();
                      } else {
                        const customer = customers?.find(c => c.id === val);
                        setSelectedCustomer(customer || null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cliente</SelectItem>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Panel de Cobro</Label>
                    {paymentMethods.length > 1 && (
                      <Badge variant="secondary">Pago Mixto</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Método de Pago</Label>
                    <Select value={currentPaymentMethod} onValueChange={setCurrentPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Efectivo</SelectItem>
                        <SelectItem value="card">💳 Tarjeta de Crédito</SelectItem>
                        <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                        <SelectItem value="credit">📝 Crédito</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="space-y-2">
                      <Label className="text-xs">Moneda del Pago</Label>
                      <Select value={currentPaymentCurrency} onValueChange={setCurrentPaymentCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                          <SelectItem value="USD">USD - Dólar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="BRL">BRL - Real</SelectItem>
                          <SelectItem value="UYU">UYU - Peso Uruguayo</SelectItem>
                        </SelectContent>
                      </Select>
                      {currentPaymentCurrency !== 'ARS' && exchangeRates && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                          {(() => {
                            const rate = exchangeRates.find(r => r.currency === currentPaymentCurrency);
                            if (rate) {
                              const totalInForeign = convertCurrency(restante_base, 'ARS', currentPaymentCurrency);
                              return (
                                <>
                                  <div>Cotización: 1 {currentPaymentCurrency} = ${rate.rate.toFixed(2)} ARS</div>
                                  <div className="font-medium mt-1">Total a pagar: {currentPaymentCurrency} {totalInForeign.toFixed(2)}</div>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                    {currentPaymentMethod === 'card' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Cuotas</Label>
                        <Select
                          value={currentInstallments.toString()}
                          onValueChange={(val) => setCurrentInstallments(parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 cuota (sin interés)</SelectItem>
                            <SelectItem value="3">3 cuotas</SelectItem>
                            <SelectItem value="6">6 cuotas</SelectItem>
                            <SelectItem value="12">12 cuotas</SelectItem>
                          </SelectContent>
                        </Select>
                        {currentInstallments > 1 && cardSurchargeRate > 0 && (
                          <Alert className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Recargo +{cardSurchargeRate}% por cada cuota ({currentInstallments} cuotas = +{cardSurchargeRate * currentInstallments}%)
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={payTotalAmount}
                        className="flex-1"
                        disabled={remaining <= 0}
                      >
                        Pagar Total (${(restante_base + potentialCardSurcharge).toFixed(2)})
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Monto parcial (opcional)"
                        value={currentPaymentAmount}
                        onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" size="icon" onClick={() => addPaymentMethod()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {paymentMethods.length > 0 && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs font-semibold">Tramos de Pago Agregados</Label>
                    </div>
                    {paymentMethods.map((pm, index) => {
                      const methodLabel = pm.method === 'cash' ? '💵 Efectivo' : pm.method === 'card' ? '💳 Tarjeta' : '🏦 Transferencia';
                      const installmentInfo = pm.installments && pm.installments > 1 ? ` (${pm.installments} cuotas)` : '';
                      return (
                        <div
                          key={pm.id}
                          className="flex items-center justify-between p-2 bg-background rounded border animate-slide-in-right"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {methodLabel}{installmentInfo}
                              {pm.currency && pm.currency !== 'ARS' && (
                                <Badge variant="outline" className="ml-2 text-xs">{pm.currency}</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Base: ${pm.baseAmount.toFixed(2)} ARS
                              {pm.surcharge > 0 && ` + Recargo: $${pm.surcharge.toFixed(2)}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">${pm.amount.toFixed(2)} ARS</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 hover:scale-110 transition-transform" onClick={() => removePaymentMethod(pm.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Separator />
                    <div className="space-y-1 animate-fade-in">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total pagado:</span>
                        <span className="font-medium">${total_cobrado.toFixed(2)} ARS</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Restante:</span>
                        <span className={`font-semibold ${remaining > 0.01 ? "text-destructive" : "text-success"}`}>
                          ${remaining.toFixed(2)} ARS
                        </span>
                      </div>
                      {remaining < -0.01 && (
                        <div className="mt-2 p-2 bg-success/10 rounded border border-success/20">
                          <div className="text-xs font-semibold text-success mb-1">Vuelto a entregar:</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>ARS:</span>
                              <span className="font-medium">${Math.abs(remaining).toFixed(2)}</span>
                            </div>
                            {exchangeRates && ['USD', 'EUR', 'BRL'].map(currency => {
                              const changeInCurrency = convertCurrency(Math.abs(remaining), 'ARS', currency);
                              const rate = exchangeRates.find(r => r.currency === currency);
                              if (!rate) return null;
                              return (
                                <div key={currency} className="flex justify-between text-xs text-muted-foreground">
                                  <span>{currency}:</span>
                                  <span>{changeInCurrency.toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={onClearAll} className="flex-1 hover:scale-105 transition-transform">
                    Limpiar
                  </Button>
                  <Button
                    onClick={onProcessSale}
                    disabled={isProcessing || remaining > 0.01}
                    className="flex-1 hover:scale-105 transition-transform"
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    {isProcessing ? "Procesando..." : "Cobrar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
