import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Bell,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Ticket,
  Plug,
  Activity,
  Rocket,
  Calculator,
  Package
} from "lucide-react";

interface PlatformAdminNavProps {
  openTicketsCount: number;
  unreadNotificationsCount: number;
}

export function PlatformAdminNav({ openTicketsCount, unreadNotificationsCount }: PlatformAdminNavProps) {
  return (
    <Card className="w-full md:w-64 flex-shrink-0 h-fit md:sticky md:top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Navegación</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <TabsList className="flex flex-col md:flex-col w-full h-auto space-y-1 bg-transparent p-0">
          <TabsTrigger value="companies" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Empresas</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Configuración Precios</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Calculator className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Calculadora</span>
          </TabsTrigger>
          <TabsTrigger value="module-limits" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Package className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Límites de Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="module-audit" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Auditoría de Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <TrendingUp className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Métricas</span>
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Rocket className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Onboarding</span>
          </TabsTrigger>
          <TabsTrigger value="platform-support" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Ticket className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Soporte</span>
            {openTicketsCount > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {openTicketsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Bell className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Notificaciones</span>
            {unreadNotificationsCount > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {unreadNotificationsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Feedback</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Pagos</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Planes</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Auditoría</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            <Plug className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Integraciones</span>
          </TabsTrigger>
        </TabsList>
      </CardContent>
    </Card>
  );
}
