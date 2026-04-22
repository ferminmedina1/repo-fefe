import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupFormData } from "@/hooks/useSignupWizard";
import { CreditCard, User, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Step3Payment } from "./Step3Payment";

const formatCurrency = (value: number) => value.toFixed(2);

interface Step4ConfirmationProps {
  formData: SignupFormData;
  updateFormData: (data: Partial<SignupFormData>) => void;
  prevStep: () => void;
  onCreateIntent: () => Promise<void>;
}

export function Step4Confirmation({
  formData,
  updateFormData,
  prevStep,
  onCreateIntent,
}: Step4ConfirmationProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: plan, isLoading: isPlanLoading } = useQuery({
    queryKey: ["plan", formData.plan_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-plans", { body: {} });
      if (error) throw error;

      const plans = (data?.plans ?? []) as Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        billing_period: string;
      }>;

      return plans.find((planItem) => planItem.id === formData.plan_id) || null;
    },
    enabled: !!formData.plan_id,
  });

  const totalCost = Number(plan?.price || 0);
  const hasPaymentMethod = !!formData.payment_method_ref && !!formData.payment_provider;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Paso final</h2>
        <p className="text-muted-foreground">
          Revisa el resumen de tu cuenta arriba y completa el pago abajo para finalizar tu alta
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Información de cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre:</span>
              <span className="font-medium">{formData.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empresa:</span>
              <span className="font-medium">{formData.company_name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Plan seleccionado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isPlanLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Plan:</span>
                  <div className="text-right">
                    <p className="font-medium">{plan?.name}</p>
                    <p className="text-xs text-muted-foreground">{plan?.description}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio base:</span>
                  <span className="font-medium">${formatCurrency(Number(plan?.price || 0))} USD/mes</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen del pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan {plan?.name}:</span>
                <span>${formatCurrency(totalCost)} USD</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total mensual:</span>
                <span className="text-primary">${formatCurrency(totalCost)} USD</span>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base mb-3 block">Método de pago</Label>
              {hasPaymentMethod ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Tarjeta registrada</p>
                      <p className="text-xs text-green-700">
                        {formData.payment_method_brand?.toUpperCase() || "Tarjeta"} •••• {formData.payment_method_last4 || "****"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTitle>Sin método de pago</AlertTitle>
                  <AlertDescription>
                    Puedes agregar un método de pago ahora o continuar con el plan gratuito
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            className="mt-1"
          />
          <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed text-black dark:text-black">
            He leído y acepto los{" "}
            <a href="/terms" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
              Términos y Condiciones
            </a>
          </Label>
        </div>

        {!acceptedTerms ? (
          <Alert>
            <AlertTitle>Confirma los términos para continuar</AlertTitle>
            <AlertDescription>
              Debes aceptar los términos y condiciones antes de completar el pago.
            </AlertDescription>
          </Alert>
        ) : (
          <Step3Payment
            formData={formData}
            updateFormData={updateFormData}
            showHeader={true}
            showBackButton={false}
            onPaymentSaved={onCreateIntent}
          />
        )}

        <div className="flex justify-start pt-2">
          <Button onClick={prevStep} variant="outline" size="lg" className="text-black dark:text-black">
            Atrás
          </Button>
        </div>
      </div>
    </div>
  );
}