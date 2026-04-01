// src/data/allianceMarket/allianceMarketRepository.ts

import { supabase } from '@/integrations/supabase/client';
import type {
  AllianceMarketProfileDTO,
  AllianceMarketProfileInsert,
  AllianceMarketListParams,
  AllianceMarketListResult,
  AllianceMarketKPIs,
  ConnectionAction,
  ScoringConfig,
} from '@/domain/allianceMarket/dtos/allianceMarket';

export const allianceMarketRepository = {
  async list(params: AllianceMarketListParams): Promise<AllianceMarketListResult> {
    let q = supabase
      .from('alliance_market_profiles')
      .select('*', { count: 'estimated' })
      .eq('company_id', params.companyId)
      .neq('status', 'discarded');

    if (params.profileType) {
      q = q.eq('profile_type', params.profileType);
    }

    if (params.search) {
      const needle = `%${params.search.trim()}%`;
      q = q.or(
        `business_name.ilike.${needle},industry.ilike.${needle},city.ilike.${needle},relation_type.ilike.${needle}`
      );
    }

    if (params.industry) {
      q = q.eq('industry', params.industry);
    }

    if (params.status) {
      q = q.eq('status', params.status);
    }

    if (params.minCompatibility) {
      q = q.gte('compatibility_score', params.minCompatibility);
    }

    const sortField = params.sortBy ?? 'compatibility_score';
    const sortAsc = params.sortDir === 'asc';
    q = q.order(sortField, { ascending: sortAsc });

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    q = q.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await q;

    if (error) throw error;

    return {
      data: (data ?? []) as unknown as AllianceMarketProfileDTO[],
      count: count ?? 0,
    };
  },

  async getById(id: string): Promise<AllianceMarketProfileDTO | null> {
    const { data, error } = await supabase
      .from('alliance_market_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as AllianceMarketProfileDTO | null;
  },

  async create(payload: AllianceMarketProfileInsert): Promise<AllianceMarketProfileDTO> {
    const { data, error } = await supabase
      .from('alliance_market_profiles')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as AllianceMarketProfileDTO;
  },

  async update(
    id: string,
    payload: Partial<AllianceMarketProfileInsert>
  ): Promise<AllianceMarketProfileDTO> {
    const { data, error } = await supabase
      .from('alliance_market_profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as AllianceMarketProfileDTO;
  },

  async discard(id: string): Promise<void> {
    const { error } = await supabase
      .from('alliance_market_profiles')
      .update({ status: 'discarded', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async getKPIs(companyId: string): Promise<AllianceMarketKPIs> {
    const { data, error } = await supabase
      .from('alliance_market_profiles')
      .select('profile_type, compatibility_score, estimated_value')
      .eq('company_id', companyId)
      .neq('status', 'discarded');

    if (error) throw error;

    const rows = data ?? [];
    const alliances = rows.filter((r) => r.profile_type === 'alliance');
    const clients = rows.filter((r) => r.profile_type === 'client');

    const totalValue = rows.reduce((sum, r) => sum + (r.estimated_value ?? 0), 0);
    const avgCompat =
      rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + (r.compatibility_score ?? 0), 0) / rows.length)
        : 0;

    return {
      totalAlliances: alliances.length,
      totalClients: clients.length,
      totalEstimatedValue: totalValue,
      avgCompatibility: avgCompat,
    };
  },

  async getIndustries(companyId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('alliance_market_profiles')
      .select('industry')
      .eq('company_id', companyId)
      .neq('status', 'discarded');

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r) => r.industry))).sort();
    return unique;
  },

  async registerConnection(
    companyId: string,
    profileId: string,
    action: ConnectionAction,
    initiatedBy?: string,
    notes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('alliance_market_connections')
      .upsert(
        {
          company_id: companyId,
          profile_id: profileId,
          action,
          initiated_by: initiatedBy ?? null,
          notes: notes ?? null,
        },
        { onConflict: 'company_id,profile_id,action' }
      );

    if (error) throw error;
  },

  async getScoringConfig(companyId: string): Promise<ScoringConfig | null> {
    const { data, error } = await supabase
      .from('alliance_market_scoring_config')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as ScoringConfig | null;
  },

  async upsertScoringConfig(
    companyId: string,
    config: Partial<Omit<ScoringConfig, 'id' | 'company_id'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('alliance_market_scoring_config')
      .upsert(
        { company_id: companyId, ...config, updated_at: new Date().toISOString() },
        { onConflict: 'company_id' }
      );

    if (error) throw error;
  },
};
