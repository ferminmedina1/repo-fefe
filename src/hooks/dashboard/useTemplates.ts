import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardWidget } from '@/lib/dashboard/widgets';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'finance' | 'ops' | 'custom';
  widgets_data: {
    widgets: DashboardWidget[];
  };
  is_preset: boolean;
  is_public: boolean;
}

export const useTemplates = (includeCustom = true) => {
  return useQuery<DashboardTemplate[]>({
    queryKey: ['dashboard-templates', includeCustom],
    queryFn: async () => {
      let query = supabase.from('dashboard_templates').select('*');

      if (!includeCustom) {
        query = query.eq('is_preset', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DashboardTemplate[];
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
};

export const useTemplatesForCategory = (category: string) => {
  return useQuery<DashboardTemplate[]>({
    queryKey: ['dashboard-templates', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_templates')
        .select('*')
        .eq('category', category)
        .order('is_preset', { ascending: false });

      if (error) throw error;
      return (data || []) as DashboardTemplate[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSaveTemplateFromLayout = () => {
  return async (
    name: string,
    description: string,
    widgets: DashboardWidget[],
    category: 'sales' | 'finance' | 'ops' | 'custom' = 'custom'
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user.id) {
      throw new Error('Not authenticated');
    }

    // Get user's company
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', sessionData.session.user.id)
      .limit(1)
      .single();

    if (!userCompany) throw new Error('No company found');

    return supabase.from('dashboard_templates').insert({
      user_id: sessionData.session.user.id,
      company_id: userCompany.company_id,
      name,
      description,
      category,
      widgets_data: { widgets },
      is_preset: false,
      is_public: false,
    });
  };
};
