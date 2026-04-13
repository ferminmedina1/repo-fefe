import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  document: string;
}

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerFormData) => void;
  isLoading: boolean;
}

export function CreateCustomerDialog({ open, onOpenChange, onSubmit, isLoading }: CreateCustomerDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [emailError, setEmailError] = useState("");

  const validateEmail = (value: string) => {
    if (!value) { setEmailError(""); return true; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailError(valid ? "" : "Formato de email inválido");
    return valid;
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setName("");
      setPhone("");
      setEmail("");
      setDocument("");
      setEmailError("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="customer-name">Nombre *</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <Label htmlFor="customer-phone">Teléfono</Label>
            <Input
              id="customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono"
            />
          </div>
          <div>
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
              placeholder="Email"
              className={emailError ? "border-destructive" : ""}
            />
            {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
          </div>
          <div>
            <Label htmlFor="customer-document">DNI (Opcional)</Label>
            <Input
              id="customer-document"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="DNI"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => { if (!validateEmail(email)) return; onSubmit({ name, phone, email, document }); }} disabled={isLoading || !!emailError}>
              {isLoading ? "Creando..." : "Crear Cliente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
