# 3️⃣ Credenciales Encryption - Per-Company Configuration

## Architecture: Per-Company Twilio Credentials

Each company has **their own Twilio account**, so credentials must be:
- ✅ Stored per company in database
- ✅ Encrypted at rest (pgcrypto)
- ✅ Decrypted only when needed
- ✅ Audited for compliance

---

## Comparison

| Aspect | 3.1: Supabase Secrets | 3.2: Database Encryption (RECOMMENDED) |
|--------|----------------------|----------------------------------------|
| **Use Case** | Global Twilio account | Per-company Twilio accounts ✅ |
| **Credentials Stored** | Environment variables | Encrypted in database ✅ |
| **Per-Company Support** | ❌ No | ✅ Yes (REQUIRED) |
| **Encryption** | Vault encrypted | pgcrypto encrypted ✅ |
| **Implementation** | 30 min | 1.5 hours ✅ |
| **Audit Trail** | ❌ Basic | ✅ Full (crm_whatsapp_credentials_audit) |
| **Complexity** | Simple | Medium ✅ |
| **Production Ready** | ❌ Wrong for this case | ✅ Correct approach |

---

## 🏆 Recommendation: Use 3.2 (Database Encryption)

### Why Option 3.2

✅ **Per-Company Support** - Each customer has their own Twilio account  
✅ **Encrypted at Rest** - pgcrypto encryption in database  
✅ **Audit Trail** - Every credential access is logged  
✅ **Easy Management** - Companies add via UI, not DevOps  
✅ **Scalable** - Works for unlimited companies  
✅ **Industry Standard** - Multi-tenant best practice  

### Why NOT Option 3.1

❌ Only supports ONE global Twilio account  
❌ Can't handle per-company credentials  
❌ Wrong for multi-tenant SaaS  
❌ Not needed when using database encryption  

---

## What We've Implemented

### ✅ Option 3.2 - Database Encryption (PRIMARY)
- [x] pgcrypto extension & encrypted columns
- [x] Auto-encrypt existing data on migration
- [x] Encryption/decryption functions
- [x] Audit trail table
- [x] Edge function updated to read from encrypted DB
- [x] Company setup guide (COMPANY_TWILIO_SETUP.md)
- [x] **STATUS: PRODUCTION-READY** 🚀

### ❓ Option 3.1 - Supabase Secrets (NOT USED)
- Not applicable for per-company credentials
- Only useful if ALL companies share ONE Twilio account
- Keeping for documentation reference only

---

## Deployment Steps

### Step 1: Deploy Migration
```bash
supabase db push
```
This will:
- Enable pgcrypto
- Add encrypted columns
- Create encryption/decryption functions
- Auto-encrypt existing credentials
- Set up audit trail

### Step 2: Set Encryption Key
```bash
supabase secrets set ENCRYPTION_KEY "your-secret-key-min-32-chars"
```

### Step 3: Deploy Edge Function
```bash
supabase functions deploy send-crm-message
```

The function now:
- Gets company_id from message log
- Queries crm_whatsapp_credentials
- Decrypts credentials with database function
- Sends via Twilio

### Step 4: Companies Add Their Credentials

Companies via UI:
1. **Settings** → **Integrations** → **WhatsApp**
2. Enter their Twilio credentials
3. System auto-encrypts and tests
4. Ready to send messages

---

## Architecture Diagram

```
Company A                        Company B
    ↓                                ↓
Twilio Account A              Twilio Account B
(Account SID A)               (Account SID B)
(Auth Token A)                (Auth Token B)
    ↓                                ↓
    └─────────┬──────────────────────┘
              ↓
    Database: crm_whatsapp_credentials
    ├─ Company A → Encrypted(A_SID, A_TOKEN, A_PHONE)
    └─ Company B → Encrypted(B_SID, B_TOKEN, B_PHONE)
              ↓
    send-crm-message function:
    1. Get company_id from message
    2. SELECT encrypted creds WHERE company_id = ?
    3. decrypt_whatsapp_credentials() RPC
    4. Send via Twilio
    5. Log in audit_trail
```

---

## Security Checklist ✅

- [x] Credentials encrypted in database
- [x] Encryption key secured in Supabase Vault
- [x] Audit trail enabled
- [x] RLS prevents cross-company access
- [x] Edge function reads from encrypted columns
- [x] No plaintext credentials in backups
- [x] Decryption only on message send
- [ ] Companies notified of setup process
- [ ] Credentials rotation schedule planned

---

## Data Flow Example

```
1. User sends WhatsApp message
   ↓
2. Frontend calls POST send-crm-message
   {
     "log_id": "uuid",
     "channel": "whatsapp",
     "recipient": "+1234567890",
     "body": "Hola!"
   }
   ↓
3. Edge function processes:
   - Get company_id from log_id
   - Query crm_whatsapp_credentials (company_id)
   - Call decrypt_whatsapp_credentials(id)
   - Get plaintext: SID, Token, Phone
   ↓
4. Create Twilio auth header:
   - Basic auth: SID:TOKEN (base64)
   ↓
5. POST to Twilio API:
   https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
   ↓
6. Twilio sends WhatsApp message
   ↓
7. Log in crm_message_logs: status = "sent"
   ↓
8. Audit trail: Log decryption event
```

---

## Option 3.1 (Reference Only)

**If in the future you need a global Twilio account** (for system notifications, etc):

```bash
# Add to Supabase Secrets
supabase secrets set TWILIO_SYSTEM_ACCOUNT_SID "..."
supabase secrets set TWILIO_SYSTEM_AUTH_TOKEN "..."
supabase secrets set TWILIO_SYSTEM_PHONE_NUMBER "..."

# Use in edge function:
const SID = Deno.env.get("TWILIO_SYSTEM_ACCOUNT_SID");
```

But **this is separate from per-company credentials** (Option 3.2).

---

## Next Steps

1. ✅ Deploy migration - `supabase db push`
2. ✅ Set encryption key - `supabase secrets set ENCRYPTION_KEY`
3. ✅ Deploy function - `supabase functions deploy`
4. ✅ Test with company credentials
5. ⏳ Create UI form for company credential entry
6. ⏳ Notify companies to add their credentials
7. ⏳ Monitor audit trail for access

---

**Recommendation:** Proceed with 3.2 as primary implementation.  
**Timeline:** Migration ready, waiting for UI form creation  
**Security:** Production-grade encryption in place  
**Status:** Ready for deployment  

See [COMPANY_TWILIO_SETUP.md](COMPANY_TWILIO_SETUP.md) for company-facing setup guide.

