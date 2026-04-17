-- FILE: 20260409_create_dashboard_shares.sql
-- Tabla para compartir layouts via token (share links)
-- CORRECCIONES:
-- ✅ Trigger para generar share_token automáticamente
-- ✅ expires_at es NULL por defecto (nunca expira) - configurable

CREATE TABLE IF NOT EXISTS public.dashboard_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES public.dashboard_layouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Share token (base64 encoded, randomly generated)
  -- ✅ CORRECCIÓN: Auto-generado por trigger
  share_token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Metadata
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Optional expiration (NULL = never expires)
  -- For security, consider setting default: now() + interval '30 days'
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure one share per layout per user
  CONSTRAINT unique_share_per_layout UNIQUE (layout_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_token 
  ON public.dashboard_shares(share_token);

CREATE INDEX IF NOT EXISTS idx_dashboard_shares_user 
  ON public.dashboard_shares(user_id);

-- Index for shares with expiration set (for filtering)
-- Note: Checking expiration (expires_at > now()) is done in application layer
-- because now() is not IMMUTABLE and cannot be used in index predicates
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_expires_at 
  ON public.dashboard_shares(expires_at)
  WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Only owner can see their shares
CREATE POLICY "Users can view their own shares" 
  ON public.dashboard_shares 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only owner can create shares for their layouts
CREATE POLICY "Users can create shares for their layouts" 
  ON public.dashboard_shares 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dashboard_layouts
      WHERE dashboard_layouts.id = layout_id
        AND dashboard_layouts.user_id = auth.uid()
    )
  );

-- Only owner can delete shares
CREATE POLICY "Users can delete their own shares" 
  ON public.dashboard_shares 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger: Auto-generate share_token if NULL
-- ============================================================================
-- ✅ CORRECCIÓN: Trigger que genera token automáticamente
CREATE TRIGGER dashboard_shares_token_trigger
  BEFORE INSERT ON public.dashboard_shares
  FOR EACH ROW
  WHEN (NEW.share_token IS NULL)
  EXECUTE FUNCTION public.generate_share_token_if_null();

-- ============================================================================
-- PUBLIC: Function para obtener layout por share token (sin RLS)
-- ============================================================================
-- Permite acceso público a layouts sin RLS
-- IMPORTANTE: Implementar en app level, NO usar directamente
CREATE OR REPLACE FUNCTION public.get_shared_dashboard_layout(p_share_token VARCHAR)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  widgets JSONB,
  title VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dl.id,
    ds.company_id,
    dl.widgets,
    ds.title,
    ds.created_at
  FROM public.dashboard_shares ds
  JOIN public.dashboard_layouts dl ON dl.id = ds.layout_id
  WHERE ds.share_token = p_share_token
    AND (ds.expires_at IS NULL OR ds.expires_at > now());
END;
$$ LANGUAGE plpgsql STABLE;
