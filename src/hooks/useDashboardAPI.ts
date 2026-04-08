// useDashboardAPI - React hook for dashboard CRUD operations

import { useState, useCallback } from 'react';
import { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase';

export interface UseDashboardAPIOptions {
  companyId?: string;
  userId?: string;
  enabled?: boolean;
}

interface DashboardListItem extends Omit<DashboardConfig, 'widgets'> {
  widgets_count: number;
}

/**
 * Fetch all dashboards for a company
 */
export const useDashboards = (companyId: string, options: UseDashboardAPIOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['dashboards', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as DashboardListItem[];
    },
    enabled: enabled && !!companyId
  });
};

/**
 * Fetch single dashboard with all widgets
 */
export const useDashboard = (dashboardId: string, options: UseDashboardAPIOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: async () => {
      const { data: configData, error: configError } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('id', dashboardId)
        .single();

      if (configError) throw configError;

      const { data: widgetsData, error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('position->x', { ascending: true });

      if (widgetsError) throw widgetsError;

      return {
        ...configData,
        widgets: widgetsData || []
      } as DashboardConfig;
    },
    enabled: enabled && !!dashboardId
  });
};

/**
 * Create new dashboard
 */
export const useCreateDashboard = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboard: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .insert([
          {
            company_id: companyId,
            name: dashboard.name,
            description: dashboard.description,
            layout: dashboard.layout,
            theme: dashboard.theme,
            version: 1
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', companyId] });
    }
  });
};

/**
 * Update dashboard config
 */
export const useUpdateDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboard: DashboardConfig) => {
      const { id, company_id, widgets, created_at, ...updateData } = dashboard;

      const { data, error } = await supabase
        .from('dashboard_configs')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', data.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboards', data.company_id] });
    }
  });
};

/**
 * Delete dashboard
 */
export const useDeleteDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string) => {
      // Delete widgets first
      await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('dashboard_id', dashboardId);

      // Delete dashboard
      const { error } = await supabase
        .from('dashboard_configs')
        .delete()
        .eq('id', dashboardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

/**
 * Save complete dashboard (config + widgets)
 */
export const useSaveDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboard: DashboardConfig) => {
      const { id, company_id, widgets, created_at, ...updateData } = dashboard;

      // Update config
      await supabase
        .from('dashboard_configs')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Delete old widgets
      await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('dashboard_id', id);

      // Insert new widgets
      if (widgets.length > 0) {
        await supabase
          .from('dashboard_widgets')
          .insert(
            widgets.map(w => ({
              dashboard_id: id,
              name: w.name,
              description: w.description,
              type: w.type,
              config: w.config,
              position: w.position,
              size: w.size,
              created_at: w.created_at || new Date().toISOString(),
              updated_at: w.updated_at || new Date().toISOString()
            }))
          );
      }

      return dashboard;
    },
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboard.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboards', dashboard.company_id] });
    }
  });
};

/**
 * Add widget to dashboard
 */
export const useAddWidget = (dashboardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (widget: Omit<DashboardWidget, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert([
          {
            dashboard_id: dashboardId,
            ...widget,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
    }
  });
};

/**
 * Update widget
 */
export const useUpdateWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dashboardId,
      widgetId,
      updates
    }: {
      dashboardId: string;
      widgetId: string;
      updates: Partial<DashboardWidget>;
    }) => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', widgetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', data.dashboard_id] });
    }
  });
};

/**
 * Delete widget
 */
export const useDeleteWidget = (dashboardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
    }
  });
};

/**
 * Get data for widget from data source
 */
export const useWidgetData = (dataSourceId: string | null, options: UseDashboardAPIOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['widget-data', dataSourceId],
    queryFn: async () => {
      if (!dataSourceId) return null;

      const { data, error } = await supabase
        .from('dashboard_data_sources')
        .select('*')
        .eq('id', dataSourceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!dataSourceId
  });
};

/**
 * Create data source for widget
 */
export const useCreateDataSource = (dashboardId: string) => {
  return useMutation({
    mutationFn: async (source: {
      name: string;
      type: 'table' | 'view' | 'query' | 'api';
      config: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('dashboard_data_sources')
        .insert([
          {
            dashboard_id: dashboardId,
            ...source
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  });
};
