// ============================================================
// Tutorial Help Button - Botón flotante para acceder a tutoriales
// ============================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTutorial } from '@/hooks/useTutorial';
import { getTutorialByModuleId, TUTORIAL_MODULES } from '@/lib/tutorial/config';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// Mapa completo de ruta → moduleId
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/app': 'dashboard',
  '/sales': 'sales',
  '/products': 'products',
  '/customers': 'customers',
  '/inventory-alerts': 'inventory_alerts',
  '/pos': 'pos',
  '/quotations': 'quotations',
  '/delivery-notes': 'delivery_notes',
  '/returns': 'returns',
  '/reservations': 'reservations',
  '/accounts-receivable': 'accounts_receivable',
  '/customer-support': 'customer_support',
  '/purchases': 'purchases',
  '/purchase-returns': 'purchase_returns',
  '/suppliers': 'suppliers',
  '/bank-accounts': 'bank_accounts',
  '/bank-movements': 'bank_movements',
  '/card-movements': 'card_movements',
  '/retentions': 'retentions',
  '/technical-services': 'technical_services',
  '/cash-register': 'cash_register',
  '/expenses': 'expenses',
  '/checks': 'checks',
  '/promotions': 'promotions',
  '/payroll': 'payroll',
  '/commissions': 'commissions',
  '/employees': 'employees',
  '/reports': 'reports',
  '/accountant-reports': 'accountant_reports',
  '/pos-points': 'pos_afip',
  '/audit-logs': 'audit_logs',
  '/access-logs': 'access_logs',
  '/warehouses': 'warehouses',
  '/warehouse-stock': 'warehouse_stock',
  '/warehouse-transfers': 'warehouse_transfers',
  '/stock-reservations': 'stock_reservations',
  '/monthly-closing': 'monthly_closing',
  '/bulk-operations': 'bulk_operations',
  '/notification-settings': 'notifications',
  '/settings': 'settings',
  '/afip': 'afip',
  '/learning-center': 'learning_center',
  '/help': 'knowledge_base',
  '/platform-support': 'platform_support',
};

function getModuleIdFromPath(path: string): string | null {
  if (ROUTE_MODULE_MAP[path]) return ROUTE_MODULE_MAP[path];
  for (const [route, moduleId] of Object.entries(ROUTE_MODULE_MAP)) {
    if (path.startsWith(route + '/')) return moduleId;
  }
  return null;
}

export function TutorialHelpButton() {
  const { isRunning, startTutorialWithRoute } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const currentModuleId = getModuleIdFromPath(location.pathname);
  const currentTutorial = currentModuleId ? getTutorialByModuleId(currentModuleId) : null;

  const handleStartCurrentTutorial = () => {
    if (currentModuleId && currentTutorial) {
      startTutorialWithRoute(currentModuleId, currentTutorial.route, navigate);
      setOpen(false);
    }
  };

  const tutorialsByCategory = TUTORIAL_MODULES.reduce(
    (acc, tutorial) => {
      if (!acc[tutorial.category]) acc[tutorial.category] = [];
      acc[tutorial.category].push(tutorial);
      return acc;
    },
    {} as Record<string, typeof TUTORIAL_MODULES>
  );

  if (isRunning) return null;

  const publicRoutes = ['/', '/auth', '/signup', '/reset-password', '/setup-wizard'];
  if (
    publicRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/set-password/') ||
    location.pathname.includes('/signup/')
  ) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 rounded-full h-11 w-11 sm:h-12 sm:w-12 shadow-lg hover:shadow-xl transition-all z-40 bg-background"
          title="Tutoriales de la app"
          aria-label="Abrir tutoriales"
        >
          <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="top"
        className="w-60 max-h-[70vh] overflow-y-auto scrollbar-thin mb-1"
      >
        {currentTutorial && (
          <>
            <DropdownMenuLabel className="text-xs">Este módulo</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleStartCurrentTutorial} className="cursor-pointer">
              <span className="text-sm">📖 Tutorial: {currentTutorial.moduleName}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="text-xs">Todos los tutoriales</DropdownMenuLabel>
        {Object.entries(tutorialsByCategory).map(([category, tutorials]) => (
          <DropdownMenuGroup key={category}>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{category}</div>
            {tutorials.map(tutorial => (
              <DropdownMenuItem
                key={tutorial.moduleId}
                className="cursor-pointer pl-4"
                onClick={() => {
                  startTutorialWithRoute(tutorial.moduleId, tutorial.route, navigate);
                  setOpen(false);
                }}
              >
                <span className="text-sm truncate">{tutorial.moduleName}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
