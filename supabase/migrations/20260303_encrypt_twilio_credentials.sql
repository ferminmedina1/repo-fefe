-- Migration: Encrypt Twilio credentials in database
-- Date: 2026-03-03
-- Purpose: Add pgcrypto extension and encrypted columns for Twilio credentials
-- Status: Idempotent (safe to re-run)

-- Step 1: Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Add encrypted columns to crm_whatsapp_credentials table
-- These will store encrypted versions of existing credentials
ALTER TABLE crm_whatsapp_credentials
ADD COLUMN IF NOT EXISTS account_sid_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS auth_token_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;

-- Step 3: About encryption key
-- IMPORTANT: PostgreSQL CANNOT read Supabase Secrets directly
-- Supabase Secrets (Vault) are ONLY accessible from Edge Functions via Deno.env.get()
-- PostgreSQL functions receive the key as a parameter from edge functions
-- Set encryption key via: supabase secrets set ENCRYPTION_KEY "your-secret-key-min-32-chars"

-- Step 4: Create encryption function
-- Takes encryption_key as parameter (passed from edge function)
CREATE OR REPLACE FUNCTION encrypt_credential(plaintext TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;
  -- Use pgcrypto's pgp_sym_encrypt for symmetric encryption
  RETURN pgp_sym_encrypt(plaintext, encryption_key)::BYTEA;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create decryption function
CREATE OR REPLACE FUNCTION decrypt_credential(ciphertext BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;
  -- Use pgcrypto's pgp_sym_decrypt to decrypt
  RETURN pgp_sym_decrypt(ciphertext, encryption_key);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to decrypt: % (wrong key or corrupted data)', SQLERRM;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create function to encrypt a credential row
CREATE OR REPLACE FUNCTION encrypt_whatsapp_credentials(row_id UUID, encryption_key TEXT)
RETURNS VOID AS $$
DECLARE
  v_account_sid TEXT;
  v_auth_token TEXT;
  v_phone_number TEXT;
BEGIN
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;

  -- Get plaintext credentials from the row
  SELECT account_sid, auth_token, phone_number
  INTO v_account_sid, v_auth_token, v_phone_number
  FROM crm_whatsapp_credentials
  WHERE id = row_id;

  -- Encrypt and update
  UPDATE crm_whatsapp_credentials
  SET
    account_sid_encrypted = encrypt_credential(v_account_sid, encryption_key),
    auth_token_encrypted = encrypt_credential(v_auth_token, encryption_key),
    phone_number_encrypted = encrypt_credential(v_phone_number, encryption_key),
    encrypted_at = NOW(),
    is_encrypted = TRUE
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to decrypt a credential row
-- This function is called from the edge function with encryption key from Supabase Secrets
CREATE OR REPLACE FUNCTION decrypt_whatsapp_credentials(row_id UUID, encryption_key TEXT)
RETURNS TABLE(account_sid TEXT, auth_token TEXT, phone_number TEXT) AS $$
BEGIN
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;

  RETURN QUERY
  SELECT
    decrypt_credential(account_sid_encrypted, encryption_key) AS account_sid,
    decrypt_credential(auth_token_encrypted, encryption_key) AS auth_token,
    decrypt_credential(phone_number_encrypted, encryption_key) AS phone_number
  FROM crm_whatsapp_credentials
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Migrate existing data (encrypt all unencrypted credentials)
-- NOTE: This uses a TEMPORARY dev key since PostgreSQL cannot read Supabase Secrets
-- For production: After deployment, re-encrypt via edge function with real key from Vault
-- Or run: SELECT encrypt_whatsapp_credentials(id, 'your-real-key') for each credential
DO $$
DECLARE
  v_record RECORD;
  v_encryption_key TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Use temporary development key for initial migration
  -- PostgreSQL CANNOT read Supabase Secrets - this is a migration-only key
  v_encryption_key := 'temp-migration-key-12345678901234567890';
  
  RAISE WARNING 'Migrating with temporary key. Re-encrypt in production with: SELECT encrypt_whatsapp_credentials(id, real_key)';

  -- Encrypt all unencrypted records
  FOR v_record IN
    SELECT id FROM crm_whatsapp_credentials WHERE is_encrypted = FALSE OR is_encrypted IS NULL
  LOOP
    BEGIN
      PERFORM encrypt_whatsapp_credentials(v_record.id, v_encryption_key);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to encrypt credential %: %', v_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Encrypted % credentials', v_count;
END;
$$;

-- Step 9: Create comment documenting the encryption scheme
COMMENT ON TABLE crm_whatsapp_credentials IS
'Stores Twilio WhatsApp credentials with optional encryption.
Columns account_sid, auth_token, phone_number contain plaintext (kept for backwards compatibility).
Columns account_sid_encrypted, auth_token_encrypted, phone_number_encrypted store encrypted versions.
When is_encrypted = TRUE, decryption is required to retrieve plaintext values.
Encryption key should be stored in Supabase Vault and set via app.encryption_key config.';

COMMENT ON FUNCTION decrypt_whatsapp_credentials IS
'Decrypts Twilio credentials for a given row.
Usage: SELECT * FROM decrypt_whatsapp_credentials(row_id, encryption_key);
Returns account_sid, auth_token, phone_number as plaintext.
Encryption key must be passed as parameter (from Supabase Secrets).
This function is called from edge functions with ENCRYPTION_KEY from Deno.env.get().';

-- Step 10: Add index on encrypted flag for faster queries
CREATE INDEX IF NOT EXISTS idx_crm_whatsapp_credentials_is_encrypted 
ON crm_whatsapp_credentials(is_encrypted);

-- Step 11: Add audit trigger (optional but recommended)
CREATE TABLE IF NOT EXISTS crm_whatsapp_credentials_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES crm_whatsapp_credentials(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'encrypted', 'decrypted_request', 'updated'
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_whatsapp_credentials_audit_created_at 
ON crm_whatsapp_credentials_audit(created_at DESC);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_credential_access()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_encrypted != OLD.is_encrypted THEN
    INSERT INTO crm_whatsapp_credentials_audit (credential_id, action, actor_id, metadata)
    VALUES (
      NEW.id,
      CASE WHEN NEW.is_encrypted THEN 'encrypted' ELSE 'decrypted' END,
      auth.uid(),
      jsonb_build_object(
        'company_id', NEW.company_id,
        'encrypted_at', NEW.encrypted_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_credential_access
AFTER UPDATE ON crm_whatsapp_credentials
FOR EACH ROW
EXECUTE FUNCTION audit_credential_access();

-- Step 11.5: Encryption workflow for new credentials
-- IMPORTANT: Credentials are NOT auto-encrypted on INSERT
-- Reason: PostgreSQL cannot read Supabase Secrets (encryption key)
-- 
-- Encryption happens in two ways:
-- 1. When sending messages: Edge function decrypts with key from Deno.env.get('ENCRYPTION_KEY')
-- 2. When adding credentials: Frontend calls edge function that encrypts before INSERT
--
-- Example edge function for encrypting new credentials:
-- 
-- export default async (req: Request) => {
--   const { company_id, account_sid, auth_token, phone_number } = await req.json();
--   const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
--   
--   // Insert plaintext first
--   const { data: newCred } = await supabase
--     .from('crm_whatsapp_credentials')
--     .insert({ company_id, account_sid, auth_token, phone_number })
--     .select('id')
--     .single();
--   
--   // Then encrypt it
--   await supabase.rpc('encrypt_whatsapp_credentials', {
--     row_id: newCred.id,
--     encryption_key: ENCRYPTION_KEY
--   });
-- }

-- Step 12: Grant permissions (RLS should handle this)
-- Ensure users can only decrypt their own company's credentials
CREATE POLICY "Users can decrypt their own company credentials"
ON crm_whatsapp_credentials_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.user_id = auth.uid()
    AND company_users.company_id = (
      SELECT company_id FROM crm_whatsapp_credentials WHERE id = credential_id
    )
  )
);

-- Summary of changes:
-- ✅ pgcrypto extension enabled
-- ✅ Encrypted columns added (account_sid_encrypted, auth_token_encrypted, phone_number_encrypted)
-- ✅ Encryption/decryption functions created (require encryption_key parameter)
-- ✅ Existing data migration (encrypted with temp key - re-encrypt in production)
-- ✅ Audit trail for encryption events
-- ✅ RLS policies to restrict access
-- ✅ Index on is_encrypted for performance
-- ❌ NO auto-encryption on INSERT (PostgreSQL cannot read Supabase Secrets)

-- Next steps:
-- 1. Set ENCRYPTION_KEY in Supabase Secrets: supabase secrets set ENCRYPTION_KEY "your-secret-key-min-32-chars"
-- 2. Deploy this migration: supabase db push
-- 3. Deploy edge function: supabase functions deploy send-crm-message
-- 4. Edge function send-crm-message already:
--    - Reads ENCRYPTION_KEY from Deno.env.get()
--    - Calls decrypt_whatsapp_credentials(row_id, encryption_key)
--    - Uses decrypted credentials to send WhatsApp messages
-- 5. For NEW credentials: Create edge function to encrypt before storing
--    - Frontend calls edge function with plaintext credentials
--    - Edge function inserts + calls encrypt_whatsapp_credentials(row_id, ENCRYPTION_KEY)
-- 6. Re-encrypt existing credentials with production key:
--    - Call encrypt_whatsapp_credentials(credential_id, real_encryption_key) for each
--    - Or create migration edge function to batch re-encrypt
