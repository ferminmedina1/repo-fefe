import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateAllianceProfilesWithClaude } from '@/lib/allianceMarketAI';

interface AllianceMarketConfig {
  id: string;
  company_id: string;
  company_description: string | null;
  products_summary: string | null;
  market_positioning: string | null;
  target_industries: string[];
  target_relation_types: string[];
  ai_search_keywords: string[];
  ai_generation_status?: string;
  last_ai_generation_at?: string;
}

interface AllianceMarketConfigDrawerProps {
  companyId: string;
  onConfigUpdated?: (config: AllianceMarketConfig) => void;
  onGenerateProfiles?: () => void;
}

const RELATION_TYPES = {
  alliance: [
    'co-distribucion',
    'integracion-tecnologica',
    'referidos',
    'proveedor-estrategico',
    'bundling',
    'canal-de-ventas',
  ],
  client: [
    'cliente-potencial',
    'lead-calificado',
    'oportunidad-directa',
  ],
};

const INDUSTRIES = [
  'Retail',
  'Distribución',
  'Tecnología',
  'Logística',
  'Manufactura',
  'Servicios',
  'E-commerce',
  'Finanzas',
  'Marketing',
  'Consulting',
  'Otra',
];

export function AllianceMarketConfigDrawer({
  companyId,
  onConfigUpdated,
  onGenerateProfiles,
}: AllianceMarketConfigDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState<AllianceMarketConfig | null>(null);

  const [formData, setFormData] = useState({
    company_description: '',
    products_summary: '',
    market_positioning: '',
    target_industries: [] as string[],
    target_relation_types: [] as string[],
    ai_search_keywords: [] as string[],
  });

  // Load config
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, companyId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alliance_market_scoring_config')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
        setFormData({
          company_description: data.company_description || '',
          products_summary: data.products_summary || '',
          market_positioning: data.market_positioning || '',
          target_industries: data.target_industries || [],
          target_relation_types: data.target_relation_types || [],
          ai_search_keywords: data.ai_search_keywords || [],
        });
      } else {
        // Create default config
        const { data: newConfig, error: createError } = await supabase
          .from('alliance_market_scoring_config')
          .insert({
            company_id: companyId,
            weight_shared_customers: 35,
            weight_market_overlap: 30,
            weight_objective_alignment: 20,
            weight_operational_synergy: 15,
          })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error loading configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.company_description) {
        toast.error('Company description is required');
        return;
      }

      const { error } = await supabase
        .from('alliance_market_scoring_config')
        .update(formData)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Configuration saved successfully');
      if (onConfigUpdated) {
        onConfigUpdated({ ...config, ...formData } as AllianceMarketConfig);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateProfiles = async () => {
    if (!formData.company_description) {
      toast.error('Por favor completa la descripción de tu empresa primero');
      return;
    }

    setGenerating(true);

    try {
      toast.loading('🔍 Buscando perfiles con Claude IA...');
      
      console.log('Starting profile generation for company:', companyId);
      console.log('API Key available:', !!import.meta.env.VITE_ANTHROPIC_API_KEY);

      // Generate profiles using Claude (via Supabase Edge Function or direct API)
      const profiles = await generateAllianceProfilesWithClaude(
        companyId,
        formData.company_description,
        formData.products_summary || 'No especificado',
        formData.target_industries,
        formData.target_relation_types,
        formData.ai_search_keywords
      );

      console.log('Profiles generated:', profiles.length);

      if (!profiles || profiles.length === 0) {
        throw new Error('No se encontraron perfiles');
      }

      // 1️⃣ Eliminar perfiles anteriores sugeridos por IA
      const { data: oldProfiles } = await supabase
        .from('alliance_market_profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'suggested')
        .eq('is_ai_generated', true);

      if (oldProfiles && oldProfiles.length > 0) {
        await supabase
          .from('alliance_market_profiles')
          .delete()
          .in('id', oldProfiles.map(p => p.id));
      }

      // 2️⃣ Insertar nuevos perfiles
      const now = new Date();
      const { data, error } = await supabase
        .from('alliance_market_profiles')
        .insert(
          profiles.map((profile) => ({
            ...profile,
            company_id: companyId,
            is_ai_generated: true,
            status: 'suggested',
            created_at: now,
            updated_at: now,
            last_ai_refresh_at: now,
          }))
        )
        .select();

      if (error) {
        throw error;
      }

      // 3️⃣ Actualizar estado de generación
      await supabase
        .from('alliance_market_scoring_config')
        .update({
          ai_generation_status: 'completed',
          last_ai_generation_at: now,
        })
        .eq('company_id', companyId);

      toast.dismiss();
      toast.success(
        `✨ ¡Encontrados ${profiles.length} perfiles! ${oldProfiles?.length || 0} anteriores eliminados`
      );

      if (onGenerateProfiles) {
        onGenerateProfiles();
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error buscando perfiles:', error);

      let errorMsg = 'Error buscando perfiles';
      if (error instanceof Error) {
        errorMsg = error.message;
        if (errorMsg.includes('API')) {
          errorMsg = 'Error en Claude API - verifica tu clave ANTHROPIC_API_KEY';
        } else if (errorMsg.includes('JSON')) {
          errorMsg = 'Error procesando respuesta de Claude - intenta de nuevo';
        }
      }

      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const toggleIndustry = (industry: string) => {
    setFormData((prev) => ({
      ...prev,
      target_industries: prev.target_industries.includes(industry)
        ? prev.target_industries.filter((i) => i !== industry)
        : [...prev.target_industries, industry],
    }));
  };

  const toggleRelationType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      target_relation_types: prev.target_relation_types.includes(type)
        ? prev.target_relation_types.filter((rt) => rt !== type)
        : [...prev.target_relation_types, type],
    }));
  };

  const addKeyword = (keyword: string) => {
    if (keyword && !formData.ai_search_keywords.includes(keyword)) {
      setFormData((prev) => ({
        ...prev,
        ai_search_keywords: [...prev.ai_search_keywords, keyword],
      }));
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      ai_search_keywords: prev.ai_search_keywords.filter((k) => k !== keyword),
    }));
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Alliance Config
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="min-h-screen flex items-start justify-end">
            <div className="w-full max-w-xl bg-white rounded-l-lg shadow-lg">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="border-b px-6 py-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Alliance Market Config
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    ✕
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Company Description */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Company Description *
                        </label>
                        <Textarea
                          placeholder="Describe your company: what you do, mission, vision, specialties, unique value proposition..."
                          value={formData.company_description}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              company_description: e.target.value,
                            }))
                          }
                          className="min-h-24"
                        />
                        <p className="text-xs text-gray-500">
                          Claude AI will use this to find compatible allies
                        </p>
                      </div>

                      {/* Products Summary */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Products/Services Summary
                        </label>
                        <Textarea
                          placeholder="Main products, categories, price range, digital/physical, target market..."
                          value={formData.products_summary}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              products_summary: e.target.value,
                            }))
                          }
                          className="min-h-20"
                        />
                      </div>

                      {/* Market Positioning */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Market Positioning
                        </label>
                        <Input
                          placeholder="e.g., Premium, Accessible, Scalable, B2B, B2C..."
                          value={formData.market_positioning}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              market_positioning: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {/* Target Industries */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">
                          Target Industries for Matches
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {INDUSTRIES.map((industry) => (
                            <Badge
                              key={industry}
                              variant={
                                formData.target_industries.includes(industry)
                                  ? 'default'
                                  : 'outline'
                              }
                              className="cursor-pointer"
                              onClick={() => toggleIndustry(industry)}
                            >
                              {industry}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Target Relation Types */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">
                          Seeking Alliance Types
                        </label>
                        <div className="space-y-2">
                          {Object.entries(RELATION_TYPES).map(([type, values]) => (
                            <div key={type}>
                              <p className="text-xs font-medium mb-2 capitalize">
                                {type} Relations:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {values.map((val) => (
                                  <Badge
                                    key={val}
                                    variant={
                                      formData.target_relation_types.includes(
                                        val
                                      )
                                        ? 'default'
                                        : 'outline'
                                    }
                                    className="cursor-pointer text-xs"
                                    onClick={() => toggleRelationType(val)}
                                  >
                                    {val}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Search Keywords */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">
                          AI Search Keywords
                        </label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="Add keyword..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addKeyword(
                                  (e.target as HTMLInputElement).value
                                );
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.ai_search_keywords.map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeKeyword(keyword)}
                            >
                              {keyword} ✕
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          e.g., "distributors", "retailers", "integrators",
                          "B2B platforms"
                        </p>
                      </div>

                      {/* Last Generation Status */}
                      {config?.last_ai_generation_at && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="pt-4">
                            <p className="text-sm">
                              Last generated:{' '}
                              {new Date(
                                config.last_ai_generation_at
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-600">
                              Status: {config.ai_generation_status}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 flex gap-3 bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={saving || generating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || generating || !formData.company_description}
                    className="gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Save Config
                  </Button>
                  <Button
                    onClick={handleGenerateProfiles}
                    disabled={generating || !formData.company_description}
                    className="gap-2"
                  >
                    {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Buscar perfiles
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
