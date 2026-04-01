-- ============================================================
-- FIX: Alliance Market Scoring Config - Crear/Actualizar tabla
-- ============================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS alliance_market_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  -- Contexto de la empresa
  company_description TEXT,
  products_summary TEXT,
  market_positioning TEXT,

  -- Pesos del scoring
  weight_shared_customers INTEGER DEFAULT 35,
  weight_market_overlap INTEGER DEFAULT 30,
  weight_objective_alignment INTEGER DEFAULT 20,
  weight_operational_synergy INTEGER DEFAULT 15,

  -- Industrias y relaciones de interés
  target_industries TEXT[] DEFAULT '{}',
  target_relation_types TEXT[] DEFAULT '{}',
  min_compatibility_threshold INTEGER DEFAULT 65,

  -- Keywords para búsqueda IA
  ai_search_keywords TEXT[] DEFAULT '{}',

  -- Estado de generación
  ai_generation_status TEXT DEFAULT 'pending' CHECK (ai_generation_status IN ('pending', 'generating', 'completed', 'failed')),
  last_ai_generation_at TIMESTAMPTZ,

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_amsc_company_id 
ON alliance_market_scoring_config(company_id);

-- Crear trigger para updated_at si no existe
CREATE OR REPLACE FUNCTION update_alliance_market_scoring_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_amsc_updated_at ON alliance_market_scoring_config;
CREATE TRIGGER trg_amsc_updated_at
  BEFORE UPDATE ON alliance_market_scoring_config
  FOR EACH ROW EXECUTE FUNCTION update_alliance_market_scoring_config_updated_at();

-- RLS
ALTER TABLE alliance_market_scoring_config ENABLE ROW LEVEL SECURITY;

-- Policy: solo usuarios de la empresa pueden ver su config
DROP POLICY IF EXISTS "amsc_company_access" ON alliance_market_scoring_config;
CREATE POLICY "amsc_company_access" ON alliance_market_scoring_config
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
