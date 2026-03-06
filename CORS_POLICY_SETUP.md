# Task 9: CORS Restrictive Policy - Setup Guide

## Overview
Replaced wildcard CORS (`*`) with environment-based allowlist for enhanced security.
- **Implementation:** Origin validation against ALLOWED_ORIGINS
- **Fallback:** Development localhost origins if not configured
- **Behavior:** Returns specific origin (not wildcard) for allowed requests

---

## Quick Start

### 1. Set Allowed Origins (Production)

```bash
# Via Supabase CLI
supabase secrets set ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com"

# Via Supabase Dashboard
# Project Settings > Edge Functions > Environment Variables
# Add: ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com
```

### 2. Verify Configuration

```bash
supabase secrets list
# Should show: ALLOWED_ORIGINS
```

### 3. Deploy Edge Function

```bash
supabase functions deploy send-crm-message
```

---

## Configuration Examples

### Production (Single Origin)
```bash
ALLOWED_ORIGINS="https://app.example.com"
```

### Production (Multiple Origins)
```bash
ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com,https://admin.example.com"
```

### Development + Production
```bash
ALLOWED_ORIGINS="https://app.example.com,http://localhost:5173,http://localhost:3000"
```

### Allow All (Backwards Compatibility - NOT RECOMMENDED)
```bash
ALLOWED_ORIGINS="*"
```

---

## Default Behavior (No Configuration)

If `ALLOWED_ORIGINS` is not set or empty, defaults to:
```javascript
[
  "http://localhost:5173",  // Vite default
  "http://localhost:3000",  // Create React App default
  "http://127.0.0.1:5173",  // Localhost IP variant
  "http://127.0.0.1:3000",  // Localhost IP variant
]
```

This allows local development without configuration.

---

## CORS Headers Returned

### For Allowed Origin
```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Max-Age: 86400
```

### For Disallowed Origin
```http
Access-Control-Allow-Origin: https://app.example.com  (first allowed origin as fallback)
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Max-Age: 86400
```

Note: Browser will reject the response if origin doesn't match request origin.

---

## Testing CORS Policy

### Test 1: Allowed Origin (Should Succeed)

```bash
curl -X OPTIONS https://your-project.supabase.co/functions/v1/send-crm-message \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type" \
  -i

# Expected Response:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Methods: POST, OPTIONS
# Access-Control-Max-Age: 86400
```

### Test 2: Disallowed Origin (Should Fail in Browser)

```bash
curl -X OPTIONS https://your-project.supabase.co/functions/v1/send-crm-message \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -i

# Expected Response:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: https://app.example.com  (not malicious-site.com)
# Browser will reject this due to origin mismatch
```

### Test 3: POST Request with Origin

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-crm-message \
  -H "Origin: https://app.example.com" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "log_id": "00000000-0000-0000-0000-000000000000",
    "channel": "email",
    "recipient": "test@example.com",
    "body": "Test message"
  }' \
  -i

# Expected: 200 OK with Access-Control-Allow-Origin header matching request origin
```

---

## Origin Matching Rules

### ✅ Exact Match Required
```
Allowed: https://app.example.com
Request: https://app.example.com
Result: ✅ ALLOWED
```

### ❌ Case Sensitive
```
Allowed: https://app.example.com
Request: https://APP.example.com
Result: ❌ REJECTED
```

### ❌ Protocol Must Match
```
Allowed: https://app.example.com
Request: http://app.example.com
Result: ❌ REJECTED
```

### ❌ Port Must Match
```
Allowed: http://localhost:5173
Request: http://localhost:3000
Result: ❌ REJECTED
```

### ❌ Subdomains Are Different Origins
```
Allowed: https://app.example.com
Request: https://staging.app.example.com
Result: ❌ REJECTED
```

### ❌ No Trailing Slashes
```
Allowed: https://app.example.com
Request: https://app.example.com/
Result: ❌ REJECTED (origins don't have trailing slashes per spec)
```

---

## Common Scenarios

### Scenario 1: Single Production App
```bash
# App hosted at https://myapp.com
ALLOWED_ORIGINS="https://myapp.com"
```

### Scenario 2: Production + Staging
```bash
# Production: https://app.example.com
# Staging: https://staging.example.com
ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com"
```

### Scenario 3: Multiple Subdomains
```bash
# Main: https://app.example.com
# Admin: https://admin.example.com
# Dashboard: https://dashboard.example.com
ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com,https://dashboard.example.com"
```

### Scenario 4: Custom Domain + Vercel Previews
```bash
# Production: https://myapp.com
# Vercel preview: https://myapp-git-branch.vercel.app
ALLOWED_ORIGINS="https://myapp.com,https://myapp-*.vercel.app"

# Note: Wildcard subdomains NOT supported, must list each explicitly:
ALLOWED_ORIGINS="https://myapp.com,https://myapp-preview1.vercel.app,https://myapp-preview2.vercel.app"
```

### Scenario 5: Local Development + Production
```bash
# Don't set ALLOWED_ORIGINS in production, use separate configs:

# Production (Supabase Secrets):
ALLOWED_ORIGINS="https://app.example.com"

# Development (local .env or not set):
# Falls back to localhost defaults automatically
```

---

## Migration from Wildcard CORS

### Before (Vulnerable)
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ❌ Allows ANY origin
};
```

### After (Secure)
```typescript
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = ALLOWED_ORIGINS.length > 0 
    ? ALLOWED_ORIGINS 
    : DEFAULT_DEV_ORIGINS;

  const isAllowed = requestOrigin && allowedOrigins.some(
    allowed => allowed === requestOrigin || allowed === "*"
  );

  const origin = isAllowed ? requestOrigin : allowedOrigins[0] || "null";

  return {
    "Access-Control-Allow-Origin": origin,  // ✅ Specific origin only
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
```

---

## Troubleshooting

### Issue: CORS errors in browser console

**Error:**
```
Access to fetch at 'https://...supabase.co/functions/v1/send-crm-message' 
from origin 'https://myapp.com' has been blocked by CORS policy
```

**Solution:**
1. Check ALLOWED_ORIGINS includes your app's origin:
   ```bash
   supabase secrets list
   ```

2. Verify origin format is exact:
   ```bash
   # ✅ Correct
   ALLOWED_ORIGINS="https://myapp.com"
   
   # ❌ Wrong (trailing slash)
   ALLOWED_ORIGINS="https://myapp.com/"
   
   # ❌ Wrong (protocol mismatch)
   ALLOWED_ORIGINS="http://myapp.com"  # Should be https
   ```

3. Redeploy edge function:
   ```bash
   supabase functions deploy send-crm-message
   ```

### Issue: Localhost not working

**Solution:**
If ALLOWED_ORIGINS is set in production, add localhost:
```bash
ALLOWED_ORIGINS="https://app.example.com,http://localhost:5173"
```

Or leave ALLOWED_ORIGINS empty/unset for automatic localhost defaults.

### Issue: Vercel preview deployments fail

**Solution:**
Add each preview URL explicitly:
```bash
ALLOWED_ORIGINS="https://app.com,https://myapp-git-feat-branch.vercel.app"
```

Or temporarily use wildcard (NOT recommended for production):
```bash
ALLOWED_ORIGINS="*"
```

### Issue: Mobile app requests blocked

**Solution:**
Mobile apps don't send Origin header. For mobile API access, use:
- API keys (already in place)
- JWT authentication (already in place)
- CORS only affects browser requests

Mobile apps will work without CORS configuration.

---

## Security Best Practices

### ✅ Do
- Use HTTPS origins in production
- List only trusted origins
- Use separate configs for dev/staging/prod
- Keep origin list minimal
- Update origins when deploying new domains

### ❌ Don't
- Use wildcard `*` in production (unless absolutely necessary)
- Include http:// origins in production (use https://)
- Add untrusted third-party origins
- Use overly broad patterns (e.g., `*.com`)
- Forget to update after domain changes

---

## Performance Impact

- **Minimal overhead:** Simple array lookup per request
- **Caching:** Browser caches preflight for 24 hours (Max-Age: 86400)
- **No database queries:** Origin validation is in-memory

---

## Testing Checklist

- [x] 9.1 - Allowed origin accepted
- [x] 9.2 - Disallowed origin rejected
- [x] 9.3 - Missing origin handled
- [x] 9.4 - OPTIONS preflight works
- [x] 9.5 - Wildcard support (if needed)
- [x] 9.6 - Multiple origins work
- [x] 9.7 - Environment parsing works
- [x] 9.8 - Default dev origins fallback
- [x] 9.9 - Case sensitivity enforced
- [x] 9.10 - Protocol matching enforced
- [x] 9.11 - Port matching enforced
- [x] 9.12 - No trailing slashes
- [x] 9.13 - Subdomains as separate origins
- [x] 9.14 - All CORS headers present

**Test Results:** 14/14 PASSING ✅

---

## Implementation Files

```
✅ supabase/functions/send-crm-message/index.ts
   - getCorsHeaders() function added
   - ALLOWED_ORIGINS environment parsing
   - DEFAULT_DEV_ORIGINS fallback
   - Origin validation on each request

✅ supabase/functions/send-crm-message/cors-policy.test.ts
   - 14 comprehensive test scenarios
   - Edge case coverage
   - Security validation
```

---

**Setup Time:** 5 minutes (set environment variable)  
**Deployment Time:** 2 minutes (redeploy edge function)  
**Total:** ~7 minutes

**Document Version:** 1.0  
**Last Updated:** March 6, 2026  
**Security Level:** ✅ ALTO (High Priority Security Fix)
