import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignupFormData } from "@/hooks/useSignupWizard";
import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";

const accountSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().min(1, "Nombre requerido"),
  company_name: z.string().min(1, "Nombre de empresa requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  country: z.string().min(2, "El país es requerido"),
});

interface Step1AccountProps {
  formData: SignupFormData;
  updateFormData: (data: Partial<SignupFormData>) => void;
  nextStep: () => void;
}

export function Step1Account({ formData, updateFormData, nextStep }: Step1AccountProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleNext = () => {
    if (!acceptedTerms) {
      setErrors((prev) => ({ ...prev, terms: "Debes aceptar los Términos y la Política de Privacidad para continuar" }));
      return;
    }
    try {
      accountSchema.parse(formData);
      setErrors({});
      nextStep();
    } catch (e) {
      if (e instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        e.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">Crear tu cuenta</h2>
        <p className="text-slate-200/85">Completa tus datos para comenzar</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-slate-100 font-medium">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            placeholder="tu@empresa.com"
            className="bg-slate-900/70 border-white/15 text-white placeholder:text-slate-300 focus:border-primary focus:ring-primary/30 h-11"
          />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="full_name" className="text-slate-100 font-medium">Nombre completo *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => updateFormData({ full_name: e.target.value })}
            placeholder="Juan Pérez"
            className="bg-slate-900/70 border-white/15 text-white placeholder:text-slate-300 focus:border-primary focus:ring-primary/30 h-11"
          />
          {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name}</p>}
        </div>

        <div>
          <Label htmlFor="company_name" className="text-slate-100 font-medium">Nombre de la empresa *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => updateFormData({ company_name: e.target.value })}
            placeholder="Mi Empresa SRL"
            className="bg-slate-900/70 border-white/15 text-white placeholder:text-slate-300 focus:border-primary focus:ring-primary/30 h-11"
          />
          {errors.company_name && <p className="text-sm text-destructive mt-1">{errors.company_name}</p>}
        </div>

        <div>
          <Label htmlFor="password" className="text-slate-100 font-medium">Contraseña *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => updateFormData({ password: e.target.value })}
            placeholder="Mínimo 8 caracteres"
            className="bg-slate-900/70 border-white/15 text-white placeholder:text-slate-300 focus:border-primary focus:ring-primary/30 h-11"
          />
          {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
        </div>

        <div>
          <Label htmlFor="country" className="text-slate-100 font-medium">País *</Label>
          <Select value={formData.country || ""} onValueChange={(v) => updateFormData({ country: v })}>
            <SelectTrigger id="country" className="w-full bg-slate-900/70 border-white/15 text-white h-11">
              <SelectValue placeholder="Selecciona tu país" className="placeholder:text-slate-300" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AR">Argentina</SelectItem>
              <SelectItem value="CL">Chile</SelectItem>
              <SelectItem value="UY">Uruguay</SelectItem>
              <SelectItem value="PE">Perú</SelectItem>
              <SelectItem value="MX">México</SelectItem>
              <SelectItem value="US">Estados Unidos</SelectItem>
              <SelectItem value="OTHER">Otro país</SelectItem>
            </SelectContent>
          </Select>
          {errors.country && <p className="text-sm text-destructive mt-1">{errors.country}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => {
              setAcceptedTerms(checked === true);
              if (checked) setErrors((prev) => { const { terms: _, ...rest } = prev; return rest; });
            }}
            className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label htmlFor="terms" className="text-sm text-slate-200 leading-relaxed cursor-pointer">
            Acepto los{" "}
            <Link to="/terms" target="_blank" className="underline underline-offset-2 hover:text-white">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link to="/privacy" target="_blank" className="underline underline-offset-2 hover:text-white">
              Política de Privacidad
            </Link>
          </Label>
        </div>
        {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg" className="h-11 px-8 font-semibold shadow-lg">
          Continuar
        </Button>
      </div>
    </div>
  );
}
