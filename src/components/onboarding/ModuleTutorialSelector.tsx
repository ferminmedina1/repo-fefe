// ============================================================
// ModuleTutorialSelector — Post-onboarding module picker
// Shows after COMPLETED. User selects which modules to explore.
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useModuleTutorials } from '@/hooks/useModuleTutorials';
import { getTutorialsByCategory, type ModuleTutorialConfig } from '@/lib/onboarding/moduleTutorials';
import {
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  FileCheck,
  Truck,
  TrendingDown,
  Calendar,
  Users,
  Receipt,
  MessageCircle,
  BookOpen,
  Package,
  AlertCircle,
  Warehouse,
  PackageSearch,
  ArrowLeftRight,
  PackageCheck,
  ShoppingBag,
  PackageOpen,
  UserCheck,
  Building2,
  DollarSign,
  CreditCard,
  Calculator,
  Wrench,
  Banknote,
  Tag,
  TrendingUp,
  BarChart3,
  Shield,
  Settings,
  Store,
  Activity,
  Zap,
  Bell,
  Plug,
  Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ShoppingCart, FileText, FileCheck, Truck, TrendingDown,
  Calendar, Users, Receipt, MessageCircle, BookOpen, Package, AlertCircle,
  Warehouse, PackageSearch, ArrowLeftRight, PackageCheck, ShoppingBag,
  PackageOpen, UserCheck, Building2, DollarSign, CreditCard, Calculator,
  Wrench, Banknote, Tag, TrendingUp, BarChart3, Shield, Settings, Store,
  Activity, Zap, Bell, Plug, Sparkles,
};

export function ModuleTutorialSelector() {
  const navigate = useNavigate();
  const { showModuleSelector, dismissModuleSelector } = useOnboarding();
  const { viewedModules, markViewed } = useModuleTutorials();
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  const categorized = useMemo(() => getTutorialsByCategory(), []);

  if (!showModuleSelector) return null;

  const toggleModule = (key: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStart = () => {
    // Store selected modules in sessionStorage for the tutorial runner
    const selected = Array.from(selectedModules);
    if (selected.length > 0) {
      sessionStorage.setItem('pending_module_tutorials', JSON.stringify(selected));
      // Navigate to the first selected module
      const allTutorials = Array.from(categorized.values()).flat();
      const first = allTutorials.find((t) => t.key === selected[0]);
      if (first) {
        navigate(first.route);
      }
    }
    dismissModuleSelector();
  };

  const handleSkip = () => {
    dismissModuleSelector();
  };

  const Icon = ({ name, className }: { name: string; className?: string }) => {
    const Comp = ICON_MAP[name];
    return Comp ? <Comp className={className} /> : null;
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          ¿Qué parte del sistema querés explorar?
        </h1>
        <p className="text-slate-400 mt-2 max-w-md mx-auto">
          Seleccioná los módulos que te interesen y te guiamos paso a paso. Podés volver a esto cuando quieras.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Badge variant="secondary" className="text-xs">
            {selectedModules.size} seleccionados
          </Badge>
        </div>
      </div>

      {/* Module grid */}
      <ScrollArea className="flex-1 px-4 md:px-8">
        <div className="max-w-4xl mx-auto pb-8 space-y-6">
          {Array.from(categorized.entries()).map(([category, tutorials]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {tutorials.map((tutorial) => {
                  const isSelected = selectedModules.has(tutorial.key);
                  const isViewed = viewedModules.has(tutorial.key);

                  return (
                    <button
                      key={tutorial.key}
                      onClick={() => toggleModule(tutorial.key)}
                      className={`
                        relative p-3 rounded-xl border text-left transition-all duration-200
                        ${isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200
                            ${isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-700/50 text-slate-400'}
                          `}
                        >
                          <Icon name={tutorial.icon} className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {tutorial.label}
                        </span>
                      </div>
                      {isViewed && (
                        <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={handleSkip}
          >
            Omitir por ahora
          </Button>
          <Button
            size="lg"
            className="h-11 px-8 font-semibold"
            disabled={selectedModules.size === 0}
            onClick={handleStart}
          >
            Explorar {selectedModules.size > 0 ? `(${selectedModules.size})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
