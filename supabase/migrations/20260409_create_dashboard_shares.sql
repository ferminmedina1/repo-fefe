-- Dashboard Shares: Simple share links without complex permissions
CREATE TABLE IF NOT EXISTS dashboard_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Share token (base64 encoded UUID)
  share_token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Metadata
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(layout_id, user_id)
);

CREATE INDEX idx_dashboard_shares_token ON dashboard_shares(share_token);
CREATE INDEX idx_dashboard_shares_user ON dashboard_shares(user_id);
CREATE INDEX idx_dashboard_shares_active ON dashboard_shares(expires_at) WHERE expires_at IS NULL OR expires_at > now();

ALTER TABLE dashboard_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shares"
  ON dashboard_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create shares for their layouts"
  ON dashboard_shares FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM dashboard_layouts
      WHERE dashboard_layouts.id = layout_id
        AND dashboard_layouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own shares"
  ON dashboard_shares FOR DELETE
  USING (auth.uid() = user_id);

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(gen_random_bytes(12), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate token on insert
CREATE OR REPLACE FUNCTION set_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_shares_token_trigger
BEFORE INSERT ON dashboard_shares
FOR EACH ROW
EXECUTE FUNCTION set_share_token();
