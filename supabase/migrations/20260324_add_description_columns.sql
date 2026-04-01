-- ============================================================
-- ADD: Agregar columnas de descripción faltantes
-- ============================================================

-- Agregar columnas de contexto de empresa
ALTER TABLE alliance_market_scoring_config
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS products_summary TEXT,
ADD COLUMN IF NOT EXISTS market_positioning TEXT;

-- Crear índice para búsquedas más rápidas por company_id
CREATE INDEX IF NOT EXISTS idx_amsc_company_id_v2
ON alliance_market_scoring_config(company_id);
