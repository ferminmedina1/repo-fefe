/**
 * Guía de Aplicación de Seguridad a Módulos
 * 
 * Patrón estándar para implementar validación y rate limiting
 * en todos los módulos de la aplicación
 */

// ============================================================
// PASO 1: IMPORTAR DEPENDENCIAS DE SEGURIDAD
// ============================================================

/*
import { useSecureMutation, useFormValidation } from "@/lib/useSecureMutation";
import { validateString, validateEmail, validateNumber } from "@/lib/validators";
import { useRateLimitWithPreset } from "@/lib/rateLimiter";
*/

// ============================================================
// PASO 2: DEFINIR VALIDADORES ESPECÍFICOS DEL MÓDULO
// ============================================================

/*
const MODULE_VALIDATORS = {
  name: (value: any) => validateString(value, { required: true, max: 100 }),
  email: (value: any) => validateEmail(value),
  phone: (value: any) => validateString(value, { max: 20 }),
  description: (value: any) => validateString(value, { max: 500 }),
  // ... más validadores específicos
};
*/

// ============================================================
// PASO 3: USO EN COMPONENTES
// ============================================================

/*
export function MyModuleComponent() {
  // 1. Setup validación
  const { errors, validate, clearError, hasErrors } = useFormValidation(MODULE_VALIDATORS);

  // 2. Setup rate limiting en mutación
  const secureMutate = useSecureMutation(
    async (data) => {
      // Tu lógica de mutación
      return await supabase.from("table").insert(data);
    },
    {
      operationName: "create_item",
      rateLimit: "write", // o "delete", "admin", etc
      logAudit: true,
    }
  );

  // 3. Handler que valida + ejecuta
  const handleSubmit = async () => {
    // Validar
    if (!validate({ name, email, phone })) {
      return; // muestra errores automáticamente
    }

    // Ejecutar con rate limiting
    try {
      await secureMutate({ name, email, phone });
      toast.success("Item creado");
    } catch (error) {
      // Error ya está manejado en hook
    }
  };

  // 4. UI con feedback de errores
  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          clearError("name"); // Limpiar error al escribir
        }}
        className={errors.name ? "border-destructive" : ""}
        placeholder="Nombre"
      />
      {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
      
      <button type="submit" disabled={hasErrors}>Guardar</button>
    </form>
  );
}
*/

// ============================================================
// MÓDULOS A ACTUALIZAR - PRIORIZADO
// ============================================================

/*
ALTA PRIORIDAD (Manejan datos críticos):
1. ✓ platformAdmin/SendNotificationModule.tsx - YA HECHO
2. contact/ContactUsDialog.tsx - Formulario de contacto
3. products/ - Gestión de productos
4. employees/ - Gestión de empleados
5. payroll/ - Gestión de nómina

MEDIA PRIORIDAD:
6. settings/ - Configuración
7. pos/ - Punto de venta
8. platformSupport/ - Soporte

BAJA PRIORIDAD (Solo lectura o simple):
9. dashboard/ - Solo visualización
10. examples/ - Ejemplos
11. onboarding/ - Onboarding
*/

// ============================================================
// CHECKLIST POR MÓDULO
// ============================================================

/*
Para cada módulo, verificar:

□ ¿Tiene formularios o inputs?
  → Aplicar validaciones con validateString, validateEmail, etc

□ ¿Realiza operaciones mutantes (create/update/delete)?
  → Usar useSecureMutation con rateLimit apropiado

□ ¿Maneja datos sensibles?
  → Aplicar rate limiting más restrictivo

□ ¿Tiene campos numéricos?
  → Usar validateNumber para evitar inyecciones

□ ¿Tiene URLs o links?
  → Validarlos con validateURL

□ ¿Expone al público?
  → Rate limiting muy restrictivo (login: 5/15min)

Patrones por tipo de módulo:

CONTACT (bajo riesgo):
- Rate limit: write (100/min)
- Validadores: nombre, email
- Campos: text, email, textarea

PRODUCTS (medio riesgo):
- Rate limit: write (100/min) 
- Validadores: sku, name, price, description
- Campos: text, number, textarea, select

EMPLOYEES (alto riesgo):
- Rate limit: admin (100/min)
- Validadores: email, name, phone, salary
- Campos: text, email, phone, number

PAYROLL (alto riesgo):
- Rate limit: admin (50/min) - MÁS restrictivo
- Validadores: amount, date, employee_id
- Campos: number, date, select

SETTINGS (crítico):
- Rate limit: admin (50/min)
- Validadores: muy estrictos
- Campos: muy limitados
*/

// ============================================================
// EJEMPLO COMPLETO: ContactUsDialog.tsx
// ============================================================

/*
import { useState } from "react";
import { useSecureMutation, useFormValidation } from "@/lib/useSecureMutation";
import { validateEmail, validateString } from "@/lib/validators";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VALIDATORS = {
  name: (value: any) => validateString(value, { required: true, max: 100 }),
  email: (value: any) => validateEmail(value),
  message: (value: any) => validateString(value, { required: true, max: 1000 }),
};

export function ContactUsDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const { errors, validate, clearError } = useFormValidation(VALIDATORS);

  const submitContact = useSecureMutation(
    async (data) => {
      const { error } = await supabase
        .from("contact_submissions")
        .insert([data]);
      if (error) throw error;
      return true;
    },
    {
      operationName: "submit_contact",
      rateLimit: "write",
      logAudit: true,
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate({ name, email, message })) {
      return;
    }

    try {
      await submitContact({ name, email, message });
      toast.success("Mensaje enviado");
      setName("");
      setEmail("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      // Error manejado en useSecureMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contactar</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
          </div>

          <div>
            <Input
              placeholder="Tu email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div>
            <Textarea
              placeholder="Tu mensaje"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                clearError("message");
              }}
              className={errors.message ? "border-destructive" : ""}
              rows={4}
            />
            {errors.message && <p className="text-destructive text-sm">{errors.message}</p>}
          </div>

          <Button type="submit">Enviar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
*/

// ============================================================
// EJEMPLO: Actualizar componente existente
// ============================================================

/*
// ANTES
export function MyComponent() {
  const handleSubmit = async () => {
    await supabase.from("table").insert({ name, email });
  };
}

// DESPUÉS
export function MyComponent() {
  const { errors, validate, clearError } = useFormValidation({
    name: (v: any) => validateString(v, { required: true }),
    email: (v: any) => validateEmail(v),
  });

  const secureMutate = useSecureMutation(
    async (data) => await supabase.from("table").insert(data),
    { operationName: "insert_item", rateLimit: "write" }
  );

  const handleSubmit = async () => {
    if (!validate({ name, email })) return;
    await secureMutate({ name, email });
  };
}
*/

export const SECURITY_MODULE_GUIDE = {
  description: "Guía para aplicar seguridad a todos los módulos de la aplicación",
  hook: "useSecureMutation + useFormValidation",
  benefits: [
    "Validación automática de inputs",
    "Rate limiting en operaciones",
    "Logging de auditoría",
    "Manejo consistente de errores",
    "UI feedback mejorado",
  ],
};
