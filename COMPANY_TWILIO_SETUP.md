# 🏢 Company Twilio Setup Guide - Per-Company Configuration

## Overview

Each company has their **own Twilio account** with their own API credentials. This guide explains how companies can:
1. Create/obtain Twilio credentials
2. Add them securely to their company in DSFP Space
3. Test WhatsApp messaging

---

## Step 1: Get Twilio Credentials

### From Your Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign in with your account
3. Navigate to **Account Settings** → **API Keys & Tokens**
4. Copy these values:
   - **Account SID:** `AC...` (starts with AC)
   - **Auth Token:** Long alphanumeric string
5. Go to **Phone Numbers** → **Manage** → **Active Numbers**
6. Find your WhatsApp-enabled phone number or:
   - Create new WhatsApp sender (if not existing)
   - Copy the phone number (format: `+1234567890`)

### Minimum Twilio Requirements

- ✅ Active Twilio account
- ✅ Verified WhatsApp Sender
- ✅ Active API Key
- ✅ Sufficient balance for SMS/WhatsApp API

---

## Step 2: Add Credentials to DSFP Space

### Via Admin Dashboard (Recommended)

1. Go to **Settings** → **Integrations** → **WhatsApp**
2. Click **Add Twilio Credentials**
3. Fill in the form:

| Field | Example | Required |
|-------|---------|----------|
| Account SID | `AC1234567890abcdef1234567890abc` | ✅ Yes |
| Auth Token | `auth_token_here_long_string` | ✅ Yes |
| WhatsApp Phone | `+12015550123` | ✅ Yes |

4. Click **Save**
5. System will:
   - ✅ Encrypt credentials at rest
   - ✅ Test connection with Twilio
   - ✅ Store in company's secure vault
   - ✅ Log access audit trail

### Via Database (If No Admin Panel)

Contact your administrator to run:
```sql
INSERT INTO crm_whatsapp_credentials (
  id,
  company_id, 
  account_sid,
  auth_token,
  phone_number
) VALUES (
  gen_random_uuid(),
  'your-company-uuid',
  'AC...',
  'auth_token_here',
  '+1234567890'
);

-- Manually encrypt (will be done by migration)
SELECT encrypt_whatsapp_credentials(id) 
FROM crm_whatsapp_credentials 
WHERE company_id = 'your-company-uuid';
```

---

## Step 3: Test the Connection

### Send Test WhatsApp Message

1. Go to **CRM** → **Opportunities**
2. Select any opportunity with a customer WhatsApp
3. Click **Enviar Mensaje** → **WhatsApp**
4. Type test message: "¡Hola! Este es un mensaje de prueba."
5. Click **Send**
6. Check response:
   - ✅ **Success:** "Mensaje enviado"
   - ❌ **Error:** Check error message below

### Common Test Scenarios

| Scenario | Test | Expected Result |
|----------|------|-----------------|
| **Valid Message** | Send "Hola" | ✅ Sent to Twilio |
| **Empty Message** | Send "" | ❌ Validation error |
| **Long Message** | 4000 char string | ✅ Sent (Twilio max) |
| **Special Chars** | "Test ñ é ü" | ✅ Supported |
| **Media Placeholder** | "See attached image" | ⚠️ No media yet |

### Verify in Twilio Logs

1. Go to [Twilio Console](https://www.twilio.com/console)
2. **Logs** → **Message Logs**
3. Find your test message (within last 5 min)
4. Check:
   - ✅ `Status: sent` or `delivered`
   - ✅ `Direction: outbound`
   - ✅ From: Your WhatsApp number
   - ✅ To: Customer number

---

## Step 4: Security Best Practices

### For Your Company

**DO ✅**
- Store credentials in your password manager
- Rotate API keys every 90 days
- Monitor Twilio usage for anomalies
- Use Strong Auth on your Twilio account
- Enable 2FA on Twilio account

**DON'T ❌**
- Share API keys via email/chat
- Use personal phone numbers
- Expose keys in code/repos
- Leave credentials in plain text
- Share with unauthorized users

### DSFP Space Security

- 🔒 Credentials encrypted at rest in database
- 🔐 Decrypted only when sending messages
- 📋 All access logged in audit trail
- 👥 Only authorized users access
- 🔄 RLS prevents cross-company access

---

## Step 5: Monitor & Troubleshoot

### Check Message Status

1. Go to **CRM** → **Opportunity** → **Historial**
2. Look for WhatsApp messages:

| Status | Meaning | Next Step |
|--------|---------|-----------|
| `sent` | ✅ Delivered to Twilio | Message on its way |
| `failed` | ❌ Error occurred | Check error message |
| `pending` | ⏳ Still processing | Wait 30 seconds |

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Credenciales no configuradas" | Account SID/Token missing | Add credentials in settings |
| "Invalid Account SID" | Wrong format | Verify starts with `AC` |
| "Invalid Auth Token" | Token expired/wrong | Generate new token in Twilio |
| "Invalid phone number" | Not WhatsApp enabled | Verify in Twilio console |
| "Rate limit exceeded" | Sending too many messages | Wait before retrying |
| "Insufficient balance" | No Twilio credits | Top up account in Twilio |

### Check Audit Trail

**For Admin Only:**
```sql
SELECT * FROM crm_whatsapp_credentials_audit
WHERE credential_id = 'company-cred-uuid'
ORDER BY created_at DESC;
```

Shows:
- Who accessed credentials
- When they accessed
- What action (encrypted, decrypted, updated)

---

## Step 6: Rotate Credentials (Every 90 Days)

### In Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. **Account Settings** → **API Keys & Tokens**
3. Click **Create new API Key**
4. Copy new credentials
5. Delete old API Key (to revoke access)

### Update in DSFP Space

1. Go to **Settings** → **Integrations** → **WhatsApp**
2. Click **Edit**
3. Paste new Account SID and Auth Token
4. Click **Save**
5. Test with new credentials
6. ✅ Old credentials automatically revoked

---

## Troubleshooting Checklist

- [ ] Twilio Account created and verified
- [ ] WhatsApp sender number configured in Twilio
- [ ] Account SID copied (AC...)
- [ ] Auth Token copied (not API Key)
- [ ] Credentials added to DSFP Space
- [ ] Encryption successful (no error)
- [ ] Can send test message
- [ ] Message appears in Twilio Logs
- [ ] Message shows as "delivered" (wait 5+ min)
- [ ] Credentials rotated every 90 days

---

## Need Help?

### Self-Service Resources
- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [Twilio API Keys Guide](https://www.twilio.com/docs/accounts/api/keys)
- [DSFP Space Support Portal](https://support.yourcompany.com)

### Contact Support
- Email: support@yourcompany.com
- Slack: #support-crm
- Ticket: Create in [Support Portal](https://support.yourcompany.com)

**Include in Support Ticket:**
- Company name
- Error message (exact)
- Screenshot of settings
- Last successful message (if any)
- Twilio Account SID (without token)

---

### Security Note 🔒

**Never provide your Twilio Auth Token to support.**  
We only need:
- Account SID
- Error message
- Timestamp

If you accidentally share your token, **immediately generate a new one** in your Twilio account.

---

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** ✅ Ready for Companies to Use  
**Next Process:** Credentials Rotation (Every 90 Days)
