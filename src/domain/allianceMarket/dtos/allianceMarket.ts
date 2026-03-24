// src/domain/allianceMarket/dtos/allianceMarket.ts

export type ProfileType = 'alliance' | 'client';

export type AllianceRelationType =
  | 'co-distribucion'
  | 'integracion-tecnologica'
  | 'referidos'
  | 'proveedor-estrategico'
  | 'bundling'
  | 'canal-de-ventas';

export type ClientRelationType =
  | 'cliente-potencial'
  | 'lead-calificado'
  | 'oportunidad-directa';

export type ProfileStatus =
  | 'suggested'
  | 'contacted'
  | 'in_negotiation'
  | 'active'
  | 'discarded';

export type ProfileBadge = 'hot' | 'new' | 'verified' | null;

export type ConnectionAction = 'viewed' | 'contacted' | 'saved' | 'discarded' | 'connected';

export interface CompatibilityBreakdown {
  clientes_compartidos?: number;
  mercado_overlap?: number;
  alineacion_objetivos?: number;
  sinergia_operativa?: number;
  [key: string]: number | undefined;
}

export interface AllianceMarketProfileDTO {
  id: string;
  company_id: string;
  business_name: string;
  industry: string;
  city: string | null;
  province: string | null;
  country: string;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  profile_type: ProfileType;
  relation_type: string;
  compatibility_score: number;
  estimated_value: number;
  currency: string;
  synergy_tags: string[];
  compatibility_breakdown: CompatibilityBreakdown;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_linkedin: string | null;
  status: ProfileStatus;
  badge: ProfileBadge;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  last_ai_refresh_at: string | null;
}

export interface AllianceMarketProfileInsert {
  company_id: string;
  business_name: string;
  industry: string;
  city?: string | null;
  province?: string | null;
  website?: string | null;
  description?: string | null;
  logo_url?: string | null;
  profile_type: ProfileType;
  relation_type: string;
  compatibility_score?: number;
  estimated_value?: number;
  currency?: string;
  synergy_tags?: string[];
  compatibility_breakdown?: CompatibilityBreakdown;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_linkedin?: string | null;
  status?: ProfileStatus;
  badge?: ProfileBadge;
  is_ai_generated?: boolean;
}

export interface AllianceMarketListParams {
  companyId: string;
  profileType?: ProfileType;
  search?: string;
  industry?: string;
  status?: ProfileStatus;
  minCompatibility?: number;
  sortBy?: 'compatibility_score' | 'estimated_value' | 'created_at';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AllianceMarketListResult {
  data: AllianceMarketProfileDTO[];
  count: number;
}

export interface AllianceMarketKPIs {
  totalAlliances: number;
  totalClients: number;
  totalEstimatedValue: number;
  avgCompatibility: number;
}

export interface ScoringConfig {
  id: string;
  company_id: string;
  weight_shared_customers: number;
  weight_market_overlap: number;
  weight_objective_alignment: number;
  weight_operational_synergy: number;
  target_industries: string[];
  target_relation_types: string[];
  min_compatibility_threshold: number;
}
