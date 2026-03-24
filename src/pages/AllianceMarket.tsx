// src/pages/AllianceMarket.tsx

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Network,
  Users,
  TrendingUp,
  Sparkles,
  Search,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { allianceMarketRepository } from '@/data/allianceMarket/allianceMarketRepository';
import { AllianceMarketCard } from '@/components/allianceMarket/AllianceMarketCard';
import { AllianceMarketDrawer } from '@/components/allianceMarket/AllianceMarketDrawer';
import { AllianceMarketConfigDrawer } from '@/components/allianceMarket/AllianceMarketConfigDrawer';
import type {
  AllianceMarketProfileDTO,
  ProfileType,
  ProfileStatus,
} from '@/domain/allianceMarket/dtos/allianceMarket';

type SortOption = 'compatibility_score' | 'estimated_value' | 'created_at';

const SORT_LABELS: Record<SortOption, string> = {
  compatibility_score: 'Mayor compatibilidad',
  estimated_value: 'Mayor valor estimado',
  created_at: 'Más recientes',
};

export default function AllianceMarket() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProfileType>('alliance');
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('compatibility_score');
  const [selectedProfile, setSelectedProfile] = useState<AllianceMarketProfileDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const companyId = currentCompany?.id ?? '';

  // ── KPIs ──
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['alliance-market-kpis', companyId],
    queryFn: () => allianceMarketRepository.getKPIs(companyId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  });

  // ── Lista de perfiles ──
  const { data: listResult, isLoading: listLoading } = useQuery({
    queryKey: ['alliance-market-profiles', companyId, activeTab, search, industryFilter, statusFilter, sortBy],
    queryFn: () =>
      allianceMarketRepository.list({
        companyId,
        profileType: activeTab,
        search: search || undefined,
        industry: industryFilter !== 'all' ? industryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortDir: 'desc',
        pageSize: 50,
      }),
    enabled: !!companyId,
    staleTime: 1000 * 30,
  });

  // ── Industrias para filtro ──
  const { data: industries = [] } = useQuery({
    queryKey: ['alliance-market-industries', companyId],
    queryFn: () => allianceMarketRepository.getIndustries(companyId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10,
  });

  // ── Mutation: registrar conexión ──
  const connectMutation = useMutation({
    mutationFn: ({
      profileId,
      action,
    }: {
      profileId: string;
      action: 'contacted' | 'saved' | 'discarded' | 'connected';
    }) =>
      allianceMarketRepository.registerConnection(companyId, profileId, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-market-profiles', companyId] });
      queryClient.invalidateQueries({ queryKey: ['alliance-market-kpis', companyId] });
      const msgs: Record<string, string> = {
        contacted: 'Contacto registrado',
        saved: 'Guardado en favoritos',
        discarded: 'Perfil descartado',
        connected: 'Conexión iniciada',
      };
      toast.success(msgs[action] ?? 'Acción registrada');
    },
    onError: () => toast.error('Error al registrar la acción'),
  });

  const profiles = listResult?.data ?? [];

  const handleOpenProfile = useCallback((profile: AllianceMarketProfileDTO) => {
    setSelectedProfile(profile);
    setDrawerOpen(true);
    allianceMarketRepository
      .registerConnection(companyId, profile.id, 'viewed')
      .catch(() => {});
  }, [companyId]);

  const handleConnect = useCallback(
    (profileId: string) => {
      connectMutation.mutate({ profileId, action: 'contacted' });
    },
    [connectMutation]
  );

  const handleDiscard = useCallback(
    (profileId: string) => {
      connectMutation.mutate({ profileId, action: 'discarded' });
      if (selectedProfile?.id === profileId) setDrawerOpen(false);
    },
    [connectMutation, selectedProfile]
  );

  const kpiCards = useMemo(
    () => [
      {
        label: 'Alianzas sugeridas',
        value: kpisLoading ? '—' : (kpis?.totalAlliances ?? 0).toString(),
        sub: 'Perfiles activos',
        icon: Network,
        color: 'text-emerald-600',
      },
      {
        label: 'Clientes potenciales',
        value: kpisLoading ? '—' : (kpis?.totalClients ?? 0).toString(),
        sub: 'Leads identificados',
        icon: Users,
        color: 'text-blue-600',
      },
      {
        label: 'Valor estimado total',
        value: kpisLoading
          ? '—'
          : `$${((kpis?.totalEstimatedValue ?? 0) / 1000).toFixed(0)}K USD`,
        sub: 'Potencial combinado',
        icon: TrendingUp,
        color: 'text-amber-600',
      },
      {
        label: 'Compatibilidad promedio',
        value: kpisLoading ? '—' : `${kpis?.avgCompatibility ?? 0}%`,
        sub: 'Score IA',
        icon: Sparkles,
        color: 'text-purple-600',
      },
    ],
    [kpis, kpisLoading]
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Network className="w-6 h-6 text-emerald-600" />
              Alliance Market
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Alianzas estratégicas y clientes potenciales identificados por IA
            </p>
          </div>
          <div className="flex gap-2">
            <AllianceMarketConfigDrawer
              companyId={companyId}
              onGenerateProfiles={() => {
                queryClient.invalidateQueries({ queryKey: ['alliance-market-profiles', companyId] });
                queryClient.invalidateQueries({ queryKey: ['alliance-market-kpis', companyId] });
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['alliance-market-profiles', companyId] });
                queryClient.invalidateQueries({ queryKey: ['alliance-market-kpis', companyId] });
                toast.info('Actualizando perfiles...');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className="text-2xl font-semibold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Filtros */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileType)}>
            <TabsList>
              <TabsTrigger value="alliance">Alianzas estratégicas</TabsTrigger>
              <TabsTrigger value="client">Clientes potenciales</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-1 flex-wrap gap-2 sm:ml-auto">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa o industria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            {/* Industria */}
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Industria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las industrias</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[190px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de cards */}
        {listLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Network className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No se encontraron perfiles</p>
            <p className="text-xs mt-1">Probá cambiando los filtros o actualizando el market</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <AllianceMarketCard
                key={profile.id}
                profile={profile}
                onOpen={handleOpenProfile}
                onConnect={handleConnect}
                onDiscard={handleDiscard}
                isConnecting={connectMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Count */}
        {!listLoading && profiles.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pb-2">
            Mostrando {profiles.length} de {listResult?.count ?? profiles.length} perfiles
          </p>
        )}
      </div>

      {/* Drawer de detalle */}
      <AllianceMarketDrawer
        profile={selectedProfile}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConnect={handleConnect}
        onDiscard={handleDiscard}
        isConnecting={connectMutation.isPending}
      />
    </Layout>
  );
}
