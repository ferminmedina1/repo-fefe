import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SignupFormData } from "@/hooks/useSignupWizard";
import { useState } from "react";
import { z } from "zod";
import { validateEmail, validateString } from "@/lib/validators";
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PasswordStrength = "BASICA" | "INTERMEDIA" | "FUERTE";
interface PasswordValidation {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
  strength: PasswordStrength;
  isAccepted: boolean;
}

const accountSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  company_name: z.string().min(1, "Nombre de empresa requerido").max(150, "Nombre de empresa muy largo"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña no puede exceder 128 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
  country: z.string().min(2, "El país es requerido"),
});

// Additional security validation layer
const validateFormSecurity = (data: SignupFormData): Record<string, string> => {
  const securityErrors: Record<string, string> = {};

  // Email validation
  if (data.email) {
    const emailValid = validateEmail(data.email);
    if (!emailValid.valid) {
      securityErrors.email = "Formato de email no válido";
    }
  }

  // Name validation (prevent XSS)
  if (data.full_name) {
    const nameValid = validateString(data.full_name, { required: true, min: 1, max: 100 });
    if (!nameValid.valid) {
      securityErrors.full_name = "Nombre contiene caracteres no permitidos";
    }
  }

  // Company name validation
  if (data.company_name) {
    const companyValid = validateString(data.company_name, { required: true, min: 1, max: 150 });
    if (!companyValid.valid) {
      securityErrors.company_name = "Nombre de empresa contiene caracteres no permitidos";
    }
  }

  return securityErrors;
};

const evaluatePasswordStrength = (password: string): PasswordValidation => {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const hasMinLength = password.length >= 8;

  // 8+ caracteres es obligatorio
  if (!hasMinLength) {
    return {
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      hasMinLength,
      strength: "BASICA",
      isAccepted: false,
    };
  }

  // Detectar patrones débiles
  const hasSequentialNumbers = /0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321/.test(password);
  const hasBirthYearPattern = /(19[0-9]{2}|20[0-2][0-9])/.test(password); // Años 1900-2029
  const hasRepeatedNumbers = /(\d)\1{2,}/.test(password); // 111, 222, etc.
  const hasWeakPattern = hasSequentialNumbers || hasBirthYearPattern || hasRepeatedNumbers;

  // Si cumple 8+, contar los otros criterios
  const otherCriteriaCount = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(
    Boolean
  ).length;

  let strength: PasswordStrength = "BASICA";
  if (otherCriteriaCount >= 3) strength = "INTERMEDIA";
  if (otherCriteriaCount === 4) strength = "FUERTE";
  
  // Si tiene patrón débil y es FUERTE, baja a INTERMEDIA
  if (hasWeakPattern && strength === "FUERTE") {
    strength = "INTERMEDIA";
  }

  return {
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasMinLength,
    strength,
    isAccepted: strength !== "BASICA",
  };
};

interface Step1AccountProps {
  formData: SignupFormData;
  updateFormData: (data: Partial<SignupFormData>) => void;
  nextStep: () => void;
}

export function Step1Account({ formData, updateFormData, nextStep }: Step1AccountProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordChange = (value: string) => {
    updateFormData({ password: value });
    const validation = evaluatePasswordStrength(value);
    setPasswordValidation(validation);
  };

  // Verificar duplicados usando edge function (sin limitaciones RLS)
  const checkDuplicates = async (
    email: string,
    company: string
  ): Promise<{ email_exists: boolean; company_name_exists: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("check-signup-duplicates", {
        body: {
          email: email.toLowerCase(),
          company_name: company.trim(),
        },
      });

      if (error) {
        console.error("Error checking duplicates:", error);
        return { email_exists: false, company_name_exists: false, error: error.message };
      }

      return data;
    } catch (error) {
      console.error("Error checking duplicates:", error);
      return { email_exists: false, company_name_exists: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const handleNext = async () => {
    try {
      setIsValidating(true);

      // Check security validations first
      const securityErrors = validateFormSecurity(formData);
      if (Object.keys(securityErrors).length > 0) {
        setErrors(securityErrors);
        setIsValidating(false);
        return;
      }

      // Then check schema
      accountSchema.parse(formData);

      // Check for duplicates using edge function
      const duplicateCheck = await checkDuplicates(formData.email, formData.company_name);

      if (duplicateCheck.error) {
        setErrors({ ...securityErrors, general: `Error en validación: ${duplicateCheck.error}` });
        setIsValidating(false);
        return;
      }

      if (duplicateCheck.email_exists) {
        setErrors({ ...securityErrors, email: "Este email de empresa ya está registrado" });
        setIsValidating(false);
        return;
      }

      if (duplicateCheck.company_name_exists) {
        setErrors({ ...securityErrors, company_name: "Este nombre de empresa ya está registrado" });
        setIsValidating(false);
        return;
      }

      setErrors({});
      setIsValidating(false);
      nextStep();
    } catch (e) {
      setIsValidating(false);
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
          {errors.email && <p className="text-sm text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.email}</p>}
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
          {errors.full_name && <p className="text-sm text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.full_name}</p>}
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
          {errors.company_name && <p className="text-sm text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.company_name}</p>}
        </div>

        <div>
          <Label htmlFor="password" className="text-slate-100 font-medium">Contraseña *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="bg-slate-900/70 border-white/15 text-white placeholder:text-slate-300 focus:border-primary focus:ring-primary/30 h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && passwordValidation && (
            <div className="mt-3 space-y-2">
              {/* Strength Bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordValidation.strength === "BASICA"
                        ? "w-1/3 bg-red-500"
                        : passwordValidation.strength === "INTERMEDIA"
                          ? "w-2/3 bg-amber-500"
                          : "w-full bg-green-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                    passwordValidation.strength === "BASICA"
                      ? "text-red-300 bg-red-500/20"
                      : passwordValidation.strength === "INTERMEDIA"
                        ? "text-amber-300 bg-amber-500/20"
                        : "text-green-300 bg-green-500/20"
                  }`}
                >
                  {passwordValidation.strength === "BASICA"
                    ? "Débil"
                    : passwordValidation.strength === "INTERMEDIA"
                      ? "Moderada"
                      : "Fuerte"}
                </span>
              </div>

              {/* Criteria Checklist */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  {passwordValidation.hasMinLength ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span
                    className={passwordValidation.hasMinLength ? "text-slate-300" : "text-slate-500"}
                  >
                    8+ caracteres
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordValidation.hasUppercase ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span
                    className={passwordValidation.hasUppercase ? "text-slate-300" : "text-slate-500"}
                  >
                    Mayúscula
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordValidation.hasLowercase ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span
                    className={passwordValidation.hasLowercase ? "text-slate-300" : "text-slate-500"}
                  >
                    Minúscula
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordValidation.hasNumber ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span className={passwordValidation.hasNumber ? "text-slate-300" : "text-slate-500"}>
                    Número
                  </span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  {passwordValidation.hasSpecialChar ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span className={passwordValidation.hasSpecialChar ? "text-slate-300" : "text-slate-500"}>
                    Carácter especial (!@#$%^&*)
                  </span>
                </div>
              </div>

              {/* Warning if not strong enough */}
              {!passwordValidation.isAccepted && (
                <p className="text-xs text-amber-400/90 mt-2">La fortaleza de la contraseña debe ser mínimo Moderada</p>
              )}
            </div>
          )}

          {errors.password && <p className="text-sm text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.password}</p>}
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
          {errors.country && <p className="text-sm text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.country}</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg" className="h-11 px-8 font-semibold shadow-lg" disabled={isValidating || !passwordValidation?.isAccepted}>
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </div>
    </div>
  );
}
