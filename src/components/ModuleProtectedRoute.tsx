import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useActiveModules, BASE_MODULES } from "@/hooks/useActiveModules";
import { Permission, usePermissions } from "@/hooks/usePermissions";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useCompany } from "@/contexts/CompanyContext";

interface ModuleProtectedRouteProps {
  children: ReactNode;
  moduleCode: string;
  redirectTo?: string;
  permission?: Permission;
}

export function ModuleProtectedRoute({
  children,
  moduleCode,
  redirectTo = "/module-not-available",
  permission = "view",
}: ModuleProtectedRouteProps) {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { data: activeModules = [], isLoading: modulesLoading } = useActiveModules();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { isPlatformAdmin, isLoading: adminLoading } = usePlatformAdmin();
  
  // Validate module access on company change
  useEffect(() => {
    if (modulesLoading || permissionsLoading || adminLoading) return;
    
    const hasRolePermission = hasPermission(moduleCode as any, permission);
    const isBaseModule = BASE_MODULES.includes(moduleCode);
    const hasModule = activeModules.includes(moduleCode);
    const hasAccess = isPlatformAdmin || (hasRolePermission && (isBaseModule || hasModule));
    
    if (!hasAccess) {
      console.log(`[ModuleProtectedRoute] Access denied for module: ${moduleCode} in company: ${currentCompany?.id}`);
      navigate(redirectTo, { replace: true });
    }
  }, [currentCompany?.id, moduleCode, activeModules, permissionsLoading, modulesLoading, adminLoading]);

  // Mostrar loading mientras se cargan los datos
  if (modulesLoading || permissionsLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Solo platform admins pueden ver todo
  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  // Verificar permiso de rol para el módulo
  const hasRolePermission = hasPermission(moduleCode as any, permission);
  if (!hasRolePermission) {
    return <Navigate to={redirectTo} replace />;
  }

  // Módulos base siempre disponibles si el rol tiene permiso
  if (BASE_MODULES.includes(moduleCode)) {
    return <>{children}</>;
  }

  // Verificar si el módulo está activo para la empresa
  const hasModule = activeModules.includes(moduleCode);

  if (!hasModule) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
