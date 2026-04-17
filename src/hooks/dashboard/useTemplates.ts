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
      try {
        let query = supabase.from('dashboard_templates').select('*');

        if (!includeCustom) {
          query = query.eq('is_preset', true);
        }

        // PERFORMANCE: Limit to 50 templates to avoid heavy queries
        query = query.limit(50);

        const { data, error } = await query;

        // Handle missing table gracefully (table_not_exists = 42P01)
        if (error) {
          if (error.code === '42P01') {
            console.warn('[Dashboard] Templates table not created yet, returning empty array');
            return [];
          }
          console.error('[Dashboard] Error fetching templates:', error);
          throw error;
        }

        return (data || []) as DashboardTemplate[];
      } catch (err) {
        console.error('[Dashboard] Unexpected error in useTemplates:', err);
        // Return empty array on error so UI doesn't break
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 min
    retry: 1, // Retry once on transient errors
  });
};

export const useTemplatesForCategory = (category: string) => {
  return useQuery<DashboardTemplate[]>({
    queryKey: ['dashboard-templates', category],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('dashboard_templates')
          .select('*')
          .eq('category', category)
          .order('is_preset', { ascending: false })
          // PERFORMANCE: Limit to 50 templates per category
          .limit(50);

        // Handle missing table gracefully
        if (error) {
          if (error.code === '42P01') {
            console.warn('[Dashboard] Templates table not created yet for category:', category);
            return [];
          }
          console.error('[Dashboard] Error fetching templates for category:', category, error);
          throw error;
        }

        return (data || []) as DashboardTemplate[];
      } catch (err) {
        console.error('[Dashboard] Unexpected error in useTemplatesForCategory:', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: !!category, // Only run if category is provided
  });
};

export const useSaveTemplateFromLayout = () => {
  return async (
    name: string,
    description: string,
    widgets: DashboardWidget[],
    category: 'sales' | 'finance' | 'ops' | 'custom' = 'custom'
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user.id) {
        throw new Error('Not authenticated - no user session');
      }

      // Get user's company
      const { data: userCompany, error: companyError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', sessionData.session.user.id)
        .limit(1)
        .single();

      if (companyError || !userCompany) {
        throw new Error('No company found for user');
      }

      // Insert template
      const { error: insertError } = await supabase.from('dashboard_templates').insert({
        user_id: sessionData.session.user.id,
        company_id: userCompany.company_id,
        name,
        description,
        category,
        widgets_data: { widgets },
        is_preset: false,
        is_public: false,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation
          throw new Error(`Template "${name}" already exists for your company`);
        }
        throw new Error(`Failed to save template: ${insertError.message}`);
      }

      return { success: true };
    } catch (err) {
      console.error('[Dashboard] Error saving template:', err);
      throw err;
    }
  };
};
