import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardShare {
  id: string;
  layout_id: string;
  share_token: string;
  title?: string;
  created_at: string;
  expires_at?: string;
}

export const useCreateShareLink = () => {
  return useMutation({
    mutationFn: async (layoutId: string) => {
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

      // Check if share already exists
      const { data: existingShare } = await supabase
        .from('dashboard_shares')
        .select('*')
        .eq('layout_id', layoutId)
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (existingShare) {
        return existingShare as DashboardShare;
      }

      // Create new share
      const { data, error } = await supabase
        .from('dashboard_shares')
        .insert({
          layout_id: layoutId,
          user_id: sessionData.session.user.id,
          company_id: userCompany.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DashboardShare;
    },
  });
};

export const useGetShareLink = (layoutId: string) => {
  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('dashboard_shares')
        .select('*')
        .eq('layout_id', layoutId)
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as DashboardShare | null;
    },
  });
};

export const useDeleteShareLink = () => {
  return useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.from('dashboard_shares').delete().eq('id', shareId);
      if (error) throw error;
    },
  });
};

export const useRetrieveSharedDashboard = (shareToken: string) => {
  return useMutation({
    mutationFn: async () => {
      const { data: share, error: shareError } = await supabase
        .from('dashboard_shares')
        .select(
          `
          *,
          dashboard_layouts (
            widgets
          )
        `
        )
        .eq('share_token', shareToken)
        .single();

      if (shareError) throw shareError;
      if (!share) throw new Error('Share not found');

      // Check if expired
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        throw new Error('Share link has expired');
      }

      return share;
    },
  });
};

export const generateShareUrl = (token: string, baseUrl: string = window.location.origin) => {
  return `${baseUrl}/dashboard/shared/${token}`;
};
