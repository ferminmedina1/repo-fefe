# 🔐 Option 3.2: Encrypt Twilio Credentials in Database

## Overview

This document explains how to use encrypted credentials stored in the database as an alternative to Supabase Secrets (Option 3.1).

### When to Use This Option

**Use Option 3.2 if:**
- ✅ You need per-company Twilio credentials
- ✅ Your infrastructure requires credentials in the database
- ✅ You want encrypted-at-rest with key rotation

**Use Option 3.1 (Supabase Secrets) if:**
- ✅ You have centralized Twilio credentials (same account for all customers)
- ✅ You want maximum security (recommended for production)
- ✅ You want easy credential rotation without database changes

---

## Architecture

### Option 3.1 (Already Implemented - Recommended)
```
Supabase Vault (encrypted)
     ↓
Environment Variables
     ↓
send-crm-message function
     ↓
Twilio API
```
**Benefits:** No DB queries, credentials isolated, easy rotation  
**Best for:** Production environments

### Option 3.2 (This Document - Alternative)
```
Database: crm_whatsapp_credentials
     ↓ (encrypted columns)
pgp_sym_decrypt() function
     ↓
Edge Function (or Service)
     ↓
Twilio API
```
**Benefits:** Per-customer credentials, audit trail  
**Best for:** Multi-tenant scenarios with per-customer settings

---

## Implementation Steps

### Step 1: Deploy Migration

The migration file `20260303_encrypt_twilio_credentials.sql` includes:
- ✅ pgcrypto extension
- ✅ Encrypted columns
- ✅ Encryption/decryption functions
- ✅ Auto-migration of existing data
- ✅ Audit trail

Deploy the migration:
```bash
supabase db push
```

### Step 2: Set Encryption Key in Supabase

The encryption key should be stored as a Supabase Secret:

```bash
supabase secrets set ENCRYPTION_KEY "your-super-secret-key-64-chars-min"
```

**Or via Dashboard:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → Vault
3. Add secret `ENCRYPTION_KEY` with a strong value

### Step 3: Verify Encryption Works

Test encryption in SQL Editor:
```sql
-- This query will show decrypted credentials
SELECT 
  id,
  company_id,
  * FROM decrypt_whatsapp_credentials('credential-uuid-here');
```

Expected output:
```
id         | account_sid           | auth_token            | phone_number
-----------|----------------------|----------------------|----------
uuid       | ACxxxxxxxxxxxxxxx... | xxxxxxxxxxxxx...     | +12015550123
```

### Step 4: Update Edge Function (Alternative Implementation)

If you want to use encrypted database credentials instead of Supabase Secrets:

```typescript
// supabase/functions/send-crm-message/index.ts (Alternative - not recommended)

if (channel === "whatsapp") {
  const { data: logRow } = await supabase
    .from("crm_message_logs")
    .select("company_id")
    .eq("id", log_id)
    .single();

  const companyId = logRow?.company_id as string | undefined;
  if (!companyId) {
    // ... error handling
  }

  // Get encrypted credentials and decrypt them
  const { data: decrypted, error: decryptError } = await supabase
    .rpc('decrypt_whatsapp_credentials', { row_id: credential_id });

  if (decryptError || !decrypted) {
    // ... error handling
  }

  const TWILIO_ACCOUNT_SID = decrypted[0].account_sid;
  const TWILIO_AUTH_TOKEN = decrypted[0].auth_token;
  const TWILIO_PHONE_NUMBER = decrypted[0].phone_number;

  // Continue with Twilio API call...
}
```

**⚠️ Note:** This requires the encryption key to be available in the database environment, which is less secure than Option 3.1.

---

## Database Schema After Migration

### crm_whatsapp_credentials Table

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| company_id | UUID | Company reference |
| account_sid | TEXT | ⚠️ Plaintext (deprecated, kept for backwards compat) |
| auth_token | TEXT | ⚠️ Plaintext (deprecated) |
| phone_number | TEXT | ⚠️ Plaintext (deprecated) |
| account_sid_encrypted | BYTEA | ✅ Encrypted SID |
| auth_token_encrypted | BYTEA | ✅ Encrypted token |
| phone_number_encrypted | BYTEA | ✅ Encrypted number |
| encrypted_at | TIMESTAMP | When encryption occurred |
| is_encrypted | BOOLEAN | Flag: encrypted or not |

### Functions Available

#### `encrypt_credential(plaintext, key)`
Encrypts a single credential value.
```sql
SELECT encrypt_credential('secret', 'encryption-key');
-- Returns: encrypted BYTEA
```

#### `decrypt_credential(ciphertext, key)`
Decrypts a single credential value.
```sql
SELECT decrypt_credential(encrypted_column, 'encryption-key');
-- Returns: plaintext value
```

#### `encrypt_whatsapp_credentials(row_id)`
Encrypts all credentials in a specific row.
```sql
SELECT encrypt_whatsapp_credentials('uuid');
-- Updates the row with encrypted values
```

#### `decrypt_whatsapp_credentials(row_id)`
Returns decrypted credentials for a row (for viewing/debugging only).
```sql
SELECT * FROM decrypt_whatsapp_credentials('uuid');
-- Returns: account_sid, auth_token, phone_number (plaintext)
```

---

## Audit Trail

After encryption, all access is logged in `crm_whatsapp_credentials_audit` table:

```sql
SELECT * FROM crm_whatsapp_credentials_audit
WHERE credential_id = 'uuid'
ORDER BY created_at DESC;
```

Columns:
- `id` - Audit entry ID
- `credential_id` - Which credential was accessed
- `action` - 'encrypted', 'decrypted_request', 'updated'
- `actor_id` - Which user performed the action
- `created_at` - Timestamp
- `metadata` - Additional context (company_id, etc)

---

## Recommendation: Hybrid Approach

We recommend using **both options together**:

1. **Option 3.1 (Secrets)** - For edge function environment
   - Credentials here are for the edge function to use
   - No database queries needed
   - Maximum security

2. **Option 3.2 (Database)** - For per-company credentials
   - Keep encrypted for companies that need custom Twilio accounts
   - Use decryption only when needed
   - Provides audit trail of who accessed what

### Example Hybrid Flow:
```
1. Send WhatsApp message via UI
2. Edge function checks: 
   - Is there an environment-based key? → Use Option 3.1 (fast ✅)
   - If not, query database: → Use Option 3.2 (slower, but works)
3. Encrypt audit log entry
4. Send to Twilio
```

---

## Migration Rollback

If you need to rollback (not recommended in production):

```bash
# This will NOT automatically undo the migration
# You must manually revert by:

# 1. Backing up encrypted data
-- SELECT * INTO crm_whatsapp_credentials_backup FROM crm_whatsapp_credentials;

# 2. Dropping the functions and triggers
-- DROP TRIGGER IF EXISTS trigger_audit_credential_access ON crm_whatsapp_credentials;
-- DROP FUNCTION IF EXISTS audit_credential_access;
-- DROP FUNCTION IF EXISTS decrypt_whatsapp_credentials;
-- DROP FUNCTION IF EXISTS encrypt_whatsapp_credentials;

# 3. Dropping the encrypted columns
-- ALTER TABLE crm_whatsapp_credentials 
-- DROP COLUMN IF EXISTS account_sid_encrypted,
-- DROP COLUMN IF EXISTS auth_token_encrypted,
-- DROP COLUMN IF EXISTS phone_number_encrypted,
-- DROP COLUMN IF EXISTS encrypted_at,
-- DROP COLUMN IF EXISTS is_encrypted;

# 4. Dropping the audit table
-- DROP TABLE IF EXISTS crm_whatsapp_credentials_audit;

# 5. Drop pgcrypto (only if not used elsewhere)
-- DROP EXTENSION IF EXISTS pgcrypto;
```

---

## Performance Considerations

### Encryption/Decryption Overhead
- **Encrypt:** ~5-10ms per credential
- **Decrypt:** ~5-10ms per credential
- **Index lookup:** <1ms (with index on is_encrypted)

### Optimization Tips
1. **Cache decrypted values** in memory (short-lived, <5min)
2. **Batch decrypt** multiple credentials if needed
3. **Use index** on `is_encrypted` flag (already created)
4. **Monitor audit table** size (prune old entries if needed)

---

## Security Best Practices

1. **Rotate encryption key every 90 days**
   ```bash
   supabase secrets set ENCRYPTION_KEY "new-secret-key"
   supabase db push  # Re-encrypt with new key
   ```

2. **Restrict database access**
   - Only service roles should have decrypt permissions
   - Use RLS to prevent cross-tenant access

3. **Monitor audit logs**
   - Check `crm_whatsapp_credentials_audit` daily
   - Alert on suspicious access patterns

4. **Never log plaintext credentials**
   - The migration prevents this automatically
   - Edge functions should never console.log credentials

5. **Use strong encryption keys**
   - Minimum 32 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Generated by a cryptography library (not manually)

---

## Next Steps

1. ✅ Deploy migration: `supabase db push`
2. ✅ Set encryption key: `supabase secrets set ENCRYPTION_KEY "..."`
3. ✅ Verify encryption: Test the SQL queries above
4. ✅ Update edge function (optional - use Option 3.1 instead)
5. ✅ Monitor audit trail
6. ⏳ Plan key rotation schedule

---

**Related Documentation:**
- [Option 3.1: Supabase Secrets](TWILIO_CREDENTIALS_SETUP.md)
- [Supabase Encryption Documentation](https://supabase.com/docs/guides/auth/encryption)
- [pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)

**Status:** ✅ Ready for Implementation  
**Date Created:** March 3, 2026  
**Migration File:** `supabase/migrations/20260303_encrypt_twilio_credentials.sql`
