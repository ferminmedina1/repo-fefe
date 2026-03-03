# 🔐 Twilio Credentials Setup - Supabase Secrets

## Overview

This guide explains how to securely store Twilio credentials in Supabase Secrets instead of in the database (crm_whatsapp_credentials table).

**Why Supabase Secrets?**
- ✅ Encrypted at rest
- ✅ Not exposed in backups
- ✅ Access controlled
- ✅ Audit trail of access
- ✅ Credentials never leave edge function environment

---

## Step 1: Get Current Twilio Credentials

Your current Twilio credentials are stored in the `crm_whatsapp_credentials` table. 

### Option A: Query from Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Run:
```sql
SELECT * FROM crm_whatsapp_credentials LIMIT 1;
```

**Copy these values:**
- `account_sid` → Will become `TWILIO_ACCOUNT_SID`
- `auth_token` → Will become `TWILIO_AUTH_TOKEN`
- `phone_number` → Will become `TWILIO_PHONE_NUMBER`

### Option B: Ask your Twilio account owner
If you don't have database access, ask for:
- Account SID
- Auth Token
- Phone Number (WhatsApp sender)

---

## Step 2: Add Secrets to Supabase

### Option A: Via Supabase CLI (Recommended)

**Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

**Login to Supabase:**
```bash
supabase login
```

**Set environment variables:**

For Development:
```bash
supabase secrets set TWILIO_ACCOUNT_SID "your_account_sid_here"
supabase secrets set TWILIO_AUTH_TOKEN "your_auth_token_here"
supabase secrets set TWILIO_PHONE_NUMBER "+1234567890"
```

For Production:
```bash
supabase secrets set --project-id "prod_project_id" \
  TWILIO_ACCOUNT_SID "your_account_sid_here"
supabase secrets set --project-id "prod_project_id" \
  TWILIO_AUTH_TOKEN "your_auth_token_here"
supabase secrets set --project-id "prod_project_id" \
  TWILIO_PHONE_NUMBER "+1234567890"
```

### Option B: Via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** → **Vault**
4. Click **New Secret**
5. Add three secrets:

| Name | Value | Example |
|------|-------|---------|
| `TWILIO_ACCOUNT_SID` | Your Account SID | `AC1234567890abcdef1234567890abcdef` |
| `TWILIO_AUTH_TOKEN` | Your Auth Token | `1234567890abcdef1234567890abcdef` |
| `TWILIO_PHONE_NUMBER` | Your WhatsApp Phone | `+12015550123` |

---

## Step 3: Verify Secrets are Set

```bash
# List all secrets (values are hidden)
supabase secrets list
```

Expected output:
```
name                  | value
----------------------|----------
TWILIO_ACCOUNT_SID    | ●●●●●●●●
TWILIO_AUTH_TOKEN     | ●●●●●●●●
TWILIO_PHONE_NUMBER   | ●●●●●●●●
```

---

## Step 4: Deploy Updated Edge Function

The edge function has been updated to read credentials from environment variables.

### Deploy via Supabase CLI:
```bash
supabase functions deploy send-crm-message
```

### Or via Supabase Dashboard:
1. Go to **Functions** → **send-crm-message**
2. Click **Deploy**

---

## Step 5: Test the Connection

### Test via cURL:
```bash
curl -X POST https://your-supabase-url/functions/v1/send-crm-message \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "log_id": "test-log-id",
    "channel": "whatsapp",
    "recipient": "+12015550124",
    "body": "Test message from new secrets setup"
  }'
```

Expected response (success):
```json
{
  "success": true,
  "provider_id": "SM1234567890abcdef1234567890abcdef"
}
```

Expected response (error - missing secrets):
```json
{
  "error": "Credenciales Twilio no configuradas"
}
```

### Test from Application:
1. Go to CRM → Select an opportunity
2. Click **Enviar Mensaje** → **WhatsApp**
3. Send a test message
4. Check **Historial** → Should show "sent" status

---

## Step 6: Rotate Old Credentials (Security)

⚠️ **IMPORTANT:** Once you confirm the new secrets are working, rotate your Twilio credentials for security.

### In Twilio Dashboard:
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Click **Account** → **API Keys & Tokens**
3. Find your current API Key
4. Click **Delete** next to it
5. Click **Create new API Key** to generate a fresh one
6. **Copy the new credentials**
7. Update Supabase Secrets with the new values

### Revoke old database credentials:
```sql
-- Optional: Delete old credentials from database
DELETE FROM crm_whatsapp_credentials;

-- Or if you want to keep for reference, mark as deprecated:
-- UPDATE crm_whatsapp_credentials SET is_active = false;
```

---

## Step 7: Verify Clean-up

### Check that old credentials are no longer in database:
```sql
SELECT COUNT(*) FROM crm_whatsapp_credentials;
-- Should return 0 if deleted, or show deprecated entries
```

### Check that edge function logs show secrets are working:
1. Go to **Functions** → **send-crm-message** → **Logs**
2. Look for successful WhatsApp sends
3. Should see messages being sent without database lookups

---

## Troubleshooting

### Error: "Credenciales Twilio no configuradas"
**Cause:** Secrets not set or not deployed  
**Solution:**
1. Verify secrets are set: `supabase secrets list`
2. Redeploy function: `supabase functions deploy send-crm-message`
3. Wait 30 seconds and retry

### Error: "Invalid Account SID"
**Cause:** Wrong Account SID format  
**Solution:** Verify format is like `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (not just the project SID)

### Error: "Invalid Auth Token"
**Cause:** Auth token is rotated or expired  
**Solution:** Generate new API Key in Twilio Dashboard and update Supabase Secret

### Function still reading from database
**Cause:** Old function version in cache  
**Solution:**
1. Go to **Functions** → **send-crm-message**
2. Click **Force redeploy**
3. Wait for deployment to complete

---

## Before & After Comparison

### BEFORE (Insecure - Credentials in Database)
```
Database (crm_whatsapp_credentials table)
     ↓
Edge Function reads credentials
     ↓
Use Twilio API
```

**Risks:**
- 🔴 Credentials visible in database backups
- 🔴 No encryption at rest
- 🔴 Hard to rotate without app changes
- 🔴 Harder to audit access

### AFTER (Secure - Credentials in Supabase Secrets)
```
Supabase Vault (Encrypted)
     ↓ (via environment variables)
Edge Function environment
     ↓
Use Twilio API
```

**Benefits:**
- ✅ Encrypted at rest
- ✅ Not in backups
- ✅ Easy credential rotation
- ✅ Access audit trail
- ✅ No database queries needed
- ✅ Credentials isolated in function environment

---

## Additional Security Notes

1. **Never commit secrets to git** - Use environment variables
2. **Rotate credentials regularly** - Recommended: Every 90 days
3. **Use different keys per environment** - Development vs Production
4. **Monitor access logs** - Check function logs for errors
5. **Use RLS on crm_message_logs** - Don't expose sent messages to unauthorized users

---

## Support

If you encounter issues:
1. Check Supabase Function logs
2. Verify Twilio credentials are correct in Supabase Secrets
3. Ensure edge function has been deployed
4. Contact DevOps: [slack/email]

---

**Documentation Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** ✅ Ready for Implementation
