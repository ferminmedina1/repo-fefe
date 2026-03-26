import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateAllianceProfilesWithClaude } from '@/lib/allianceMarketAI';
import { clsx } from 'clsx';

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

function formatRelationType(type: string): string {
  return type.replace(/-/g, ' ');
}

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
  const [dailyAttempts, setDailyAttempts] = useState(0);
  const [lastAttemptDate, setLastAttemptDate] = useState<string>('');

  const [formData, setFormData] = useState({
    company_description: '',
    products_summary: '',
    market_positioning: '',
    target_industries: [] as string[],
    target_relation_types: [] as string[],
    ai_search_keywords: [] as string[],
  });

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadDailyAttempts();
    }
  }, [isOpen, companyId]);

  const loadDailyAttempts = () => {
    const key = `alliance-attempts-${companyId}`;
    const stored = localStorage.getItem(key);
    const today = new Date().toISOString().split('T')[0];
    
    if (stored) {
      const { attempts, date } = JSON.parse(stored);
      if (date === today) {
        setDailyAttempts(attempts);
        setLastAttemptDate(date);
      } else {
        // Reset for new day
        localStorage.setItem(key, JSON.stringify({ attempts: 0, date: today }));
        setDailyAttempts(0);
        setLastAttemptDate(today);
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ attempts: 0, date: today }));
      setDailyAttempts(0);
      setLastAttemptDate(today);
    }
  };

  const incrementDailyAttempts = () => {
    const key = `alliance-attempts-${companyId}`;
    const today = new Date().toISOString().split('T')[0];
    const newAttempts = dailyAttempts + 1;
    localStorage.setItem(key, JSON.stringify({ attempts: newAttempts, date: today }));
    setDailyAttempts(newAttempts);
  };

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

      toast.success('Configuración guardada');
      if (onConfigUpdated) {
        onConfigUpdated({ ...config, ...formData } as AllianceMarketConfig);
      }

      await handleGenerateProfiles();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateProfiles = async () => {
    if (!formData.company_description) {
      toast.error('Por favor completa la descripción de tu empresa primero');
      return;
    }

    if (dailyAttempts >= 3) {
      toast.error('Has alcanzado el límite diario de 3 búsquedas. Intenta mañana.');
      return;
    }

    setGenerating(true);

    try {
      toast.loading('🔍 Buscando perfiles con Claude IA...');
      
      console.log('Starting profile generation for company:', companyId);
      console.log('API Key available:', !!import.meta.env.VITE_ANTHROPIC_API_KEY);

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

      // Increment attempts on successful generation
      incrementDailyAttempts();

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

      await supabase
        .from('alliance_market_scoring_config')
        .update({
          ai_generation_status: 'completed',
          last_ai_generation_at: now,
        })
        .eq('company_id', companyId);

      toast.dismiss();
      toast.success(
        `✨ ¡Encontrados ${profiles.length} perfiles! Acciones previas se mantienen.`
      );

      if (onGenerateProfiles) {
        onGenerateProfiles();
      }

      setIsOpen(false);
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

  const gradientStyle = {
    background: 'linear-gradient(90deg, rgb(37, 99, 235) 0%, rgb(147, 51, 234) 100%)',
  };

  const contentGradientStyle = {
    background: 'linear-gradient(180deg, transparent 0%, transparent 50%, rgb(219, 234, 254) 100%)',
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="min-h-screen flex items-start justify-end">
            <div className="w-full max-w-xl bg-white dark:bg-slate-950 rounded-l-2xl shadow-2xl flex flex-col h-screen">
              {/* Clean White Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex justify-between items-center rounded-tl-2xl bg-white dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alliance Market</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Búsquedas disponibles: {3 - dailyAttempts}/3</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  X
                </Button>
              </div>

              {/* Clean White Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-950">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        Descripción de tu Empresa *
                      </label>
                      <Textarea
                        placeholder="Describe tu empresa: qué haces, misión, visión, especialidades, propuesta única..."
                        value={formData.company_description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            company_description: e.target.value,
                          }))
                        }
                        className="min-h-24 border-slate-200 dark:border-slate-700 rounded-lg transition-all"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Claude IA usará esto para encontrar aliados compatibles
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        Resumen de Productos/Servicios
                      </label>
                      <Textarea
                        placeholder="Productos principales, categorías, rango de precios, digital/físico, mercado objetivo..."
                        value={formData.products_summary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            products_summary: e.target.value,
                          }))
                        }
                        className="min-h-20 border-slate-200 dark:border-slate-700 rounded-lg transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                        Posicionamiento en Mercado
                      </label>
                      <Input
                        placeholder="Ej: Premium, Accesible, Escalable, B2B, B2C..."
                        value={formData.market_positioning}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            market_positioning: e.target.value,
                          }))
                        }
                        className="border-slate-200 dark:border-slate-700 transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Industrias Objetivo
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {INDUSTRIES.map((industry) => (
                          <Badge
                            key={industry}
                            variant={formData.target_industries.includes(industry) ? 'default' : 'outline'}
                            className={clsx(
                              'cursor-pointer transition-all duration-200',
                              formData.target_industries.includes(industry)
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'hover:border-emerald-400 hover:text-emerald-600'
                            )}
                            onClick={() => toggleIndustry(industry)}
                          >
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                        Tipos de Relación Buscada
                      </label>
                      <div className="space-y-3">
                        {Object.entries(RELATION_TYPES).map(([type, values]) => (
                          <div key={type}>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                              {type === 'alliance' ? 'Alianzas' : 'Clientes'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {values.map((val) => (
                                <Badge
                                  key={val}
                                  variant={formData.target_relation_types.includes(val) ? 'default' : 'outline'}
                                  className={clsx(
                                    'cursor-pointer text-xs transition-all duration-200',
                                    formData.target_relation_types.includes(val)
                                      ? 'bg-purple-600 text-white shadow-lg'
                                      : 'hover:border-purple-400 hover:text-purple-600'
                                  )}
                                  onClick={() => toggleRelationType(val)}
                                >
                                  {formatRelationType(val)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-600"></span>
                        Palabras Clave para búsqueda IA
                      </label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Ej: distribuidores, retailers, integradores..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addKeyword((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className="border-slate-200 dark:border-slate-700 transition-all"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.ai_search_keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="cursor-pointer bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800 transition-all"
                            onClick={() => removeKeyword(keyword)}
                          >
                            {keyword} X
                          </Badge>
                        ))}
                      </div>
                      {formData.ai_search_keywords.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Presiona Enter para agregar palabras clave...
                        </p>
                      )}
                    </div>

                    {config?.last_ai_generation_at && (
                      <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="pt-4">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Última generación: {new Date(config.last_ai_generation_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Status: {config.ai_generation_status}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>

              {/* Clean White Footer */}
              <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-3 bg-white dark:bg-slate-950 rounded-bl-2xl">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={saving || generating}
                  className="border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || generating || !formData.company_description || dailyAttempts >= 3}
                  className="gap-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-all disabled:opacity-50"
                  title={dailyAttempts >= 3 ? 'Has alcanzado el límite diario de 3 búsquedas' : ''}
                >
                  {(saving || generating) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {dailyAttempts >= 3 ? 'Límite alcanzado' : 'Actualizar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
                        value={formData.company_description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            company_description: e.target.value,
                          }))
                        }
                        className="min-h-24 border-slate-200 dark:border-slate-700 rounded-lg transition-all"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Claude IA usará esto para encontrar aliados compatibles
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        Resumen de Productos/Servicios
                      </label>
                      <Textarea
                        placeholder="Productos principales, categorías, rango de precios, digital/físico, mercado objetivo..."
                        value={formData.products_summary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            products_summary: e.target.value,
                          }))
                        }
                        className="min-h-20 border-slate-200 dark:border-slate-700 rounded-lg transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                        Posicionamiento en Mercado
                      </label>
                      <Input
                        placeholder="Ej: Premium, Accesible, Escalable, B2B, B2C..."
                        value={formData.market_positioning}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            market_positioning: e.target.value,
                          }))
                        }
                        className="border-slate-200 dark:border-slate-700 transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Industrias Objetivo
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {INDUSTRIES.map((industry) => (
                          <Badge
                            key={industry}
                            variant={formData.target_industries.includes(industry) ? 'default' : 'outline'}
                            className={clsx(
                              'cursor-pointer transition-all duration-200',
                              formData.target_industries.includes(industry)
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'hover:border-emerald-400 hover:text-emerald-600'
                            )}
                            onClick={() => toggleIndustry(industry)}
                          >
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                        Tipos de Relación Buscada
                      </label>
                      <div className="space-y-3">
                        {Object.entries(RELATION_TYPES).map(([type, values]) => (
                          <div key={type}>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                              {type === 'alliance' ? 'Alianzas' : 'Clientes'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {values.map((val) => (
                                <Badge
                                  key={val}
                                  variant={formData.target_relation_types.includes(val) ? 'default' : 'outline'}
                                  className={clsx(
                                    'cursor-pointer text-xs transition-all duration-200',
                                    formData.target_relation_types.includes(val)
                                      ? 'bg-purple-600 text-white shadow-lg'
                                      : 'hover:border-purple-400 hover:text-purple-600'
                                  )}
                                  onClick={() => toggleRelationType(val)}
                                >
                                  {formatRelationType(val)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-600"></span>
                        Palabras Clave para búsqueda IA
                      </label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Ej: distribuidores, retailers, integradores..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addKeyword((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className="border-slate-200 dark:border-slate-700 transition-all"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.ai_search_keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="cursor-pointer bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800 transition-all"
                            onClick={() => removeKeyword(keyword)}
                          >
                            {keyword} X
                          </Badge>
                        ))}
                      </div>
                      {formData.ai_search_keywords.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Presiona Enter para agregar palabras clave...
                        </p>
                      )}
                    </div>

                    {config?.last_ai_generation_at && (
                      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                        <CardContent className="pt-4">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Última generación: {new Date(config.last_ai_generation_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Status: {config.ai_generation_status}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>

              <div className="border-t px-6 py-4 flex gap-3 bg-slate-50 dark:bg-slate-900 rounded-bl-2xl">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={saving || generating}
                  className="border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || generating || !formData.company_description}
                  className="gap-2 flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg transition-all disabled:opacity-50"
                >
                  {(saving || generating) && <Loader2 className="h-4 w-4 animate-spin" />}
                  Actualizar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
