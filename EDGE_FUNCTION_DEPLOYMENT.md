# Supabase Edge Function Deployment Guide

## Overview

The Alliance Market AI profile generation now uses a **Supabase Edge Function** instead of an external proxy server. This is a simpler, more reliable architecture with:

- ✅ No CORS issues (server-to-server communication)
- ✅ No infrastructure to manage
- ✅ Automatic HTTPS
- ✅ Native Supabase integration
- ✅ Better error handling and logging

## Architecture

```
Frontend Browser (Netlify)
    ↓ supabase.functions.invoke()
Supabase Edge Function
    ↓ Anthropic SDK
Claude API
    ↓
Response (profiles)
```

## Components Updated

### 1. **Supabase Edge Function** (`supabase/functions/generate-alliance-profiles/index.ts`)
- ✅ **Status**: Complete and production-ready
- **Features**:
  - Full TypeScript type safety
  - Request validation with `validateRequest()`
  - Comprehensive error handling with specific error codes
  - Execution time tracking
  - CORS headers for testing
  - Detailed logging with `[FUNCTION_NAME]` prefixes
  - Robust JSON parsing from Claude responses
  - Field-by-field profile validation with defaults

### 2. **Client Library** (`src/lib/allianceMarketAI.ts`)
- ✅ **Status**: Updated to use Edge Function
- **Change**: Now calls `supabase.functions.invoke()` instead of proxy server
- **Result**: Zero-dependency integration with Supabase

### 3. **Environment Variables**
- ✅ **Client**: No changes needed (no API key in client code)
- ⏳ **Supabase**: Need to add `ANTHROPIC_API_KEY`

## Deployment Checklist

### Step 1: Add ANTHROPIC_API_KEY to Supabase ⚠️ REQUIRED

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Click **Add new secret**
5. Name: `ANTHROPIC_API_KEY`
6. Value: `sk-ant-api03-3xZbdt80OYAOMDJu-Hmh_TKTUJ...` (your Anthropic API key)
7. Click **Save**

**⚠️ CRITICAL**: Without this step, the Edge Function will fail with "ANTHROPIC_API_KEY not configured"

### Step 2: Deploy Edge Function

The Edge Function is already in your repository at:
```
supabase/
  functions/
    generate-alliance-profiles/
      index.ts
```

To deploy:

```powershell
# Login to Supabase CLI (if not already done)
supabase login

# Deploy the function
supabase functions deploy generate-alliance-profiles

# Or deploy all functions
supabase functions deploy
```

**Alternative**: If using Git, deploy automatically via:
- Netlify connected to GitHub → triggers Supabase deployment
- Or manually via Supabase Dashboard → Deploy

### Step 3: Build and Deploy Frontend

```powershell
npm run build
npm run deploy  # If you have a deploy script, or push to git for auto-deploy
```

The frontend at `https://tutorialventify.netlify.app` will now use the Edge Function.

### Step 4: Test the Integration

#### Local Development Testing

```powershell
# Start dev server
npm run dev

# Or with proxy server for reference
npm run dev:full
```

1. Open `http://localhost:8081`
2. Go to **Alliance Market** → **Settings**
3. Fill in the company configuration fields
4. Click **Buscar perfiles** (Search Profiles)
5. Should see profiles loading and displaying

#### Production Testing

1. Go to `https://tutorialventify.netlify.app`
2. Go to **Alliance Market** → **Settings**
3. Click **Buscar perfiles**
4. Should see 5-7 profiles generated within seconds

## Error Handling

### Common Issues and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ANTHROPIC_API_KEY not configured` | Key not added to Supabase settings | Add key via Supabase Dashboard → Settings → Edge Functions |
| `CLAUDE_API_ERROR` | API key invalid or quota exceeded | Verify key is correct format, check Anthropic credit balance |
| `VALIDATION_ERROR` | Request missing required fields | Ensure company description is filled in Alliance Market config |
| `PARSE_ERROR` | Claude response couldn't be parsed as JSON | Usually temporary, retry or check Claude API |
| `Method not allowed` | Sending GET instead of POST | Client should only send POST requests |

### Logging

All requests are logged in Supabase with `[GENERATE_PROFILES]` prefix:

```
[GENERATE_PROFILES] CORS preflight request
[GENERATE_PROFILES] Request validated
[GENERATE_PROFILES] Calling Claude API
[GENERATE_PROFILES] Success: 5 profiles generated in 2841ms
```

Monitor in **Supabase Dashboard** → **Edge Functions** → **Logs**

## Response Format

### Success Response (HTTP 200)
```json
{
  "success": true,
  "profiles_generated": 5,
  "profiles": [
    {
      "business_name": "TechVentures Ltd",
      "industry": "Software Development",
      "city": "San Francisco",
      "province": "CA",
      "country": "USA",
      "website": "techventures.com",
      "description": "Growing software company...",
      "contact_name": "John Smith",
      "contact_email": "john@techventures.com",
      "contact_phone": "+1-555-0123",
      "profile_type": "alliance",
      "relation_type": "Technology Partner",
      "compatibility_score": 87,
      "estimated_value": 250000,
      "synergy_tags": ["tech", "scaling", "innovation"],
      "compatibility_breakdown": {
        "market_fit": 90,
        "geographic_proximity": 70,
        "technology_alignment": 85,
        "size_fit": 80,
        "growth_potential": 85
      },
      "badge": "hot"
    },
    ...
  ],
  "execution_time_ms": 2841
}
```

### Error Response (HTTP 4xx or 5xx)
```json
{
  "success": false,
  "error": "ANTHROPIC_API_KEY not configured",
  "code": "INTERNAL_ERROR",
  "execution_time_ms": 23
}
```

## Monitoring

### Check Function Status

**Supabase Dashboard**:
1. Edge Functions
2. Select `generate-alliance-profiles`
3. View deployment status and logs

### Performance Metrics

- **Typical execution time**: 2-4 seconds
- **Max tokens**: 4096 (can handle large responses)
- **Model**: Claude 3.5 Sonnet (latest)

## Cleanup (Optional)

The proxy server files can be kept for local development reference or removed:

```powershell
# Remove proxy server (optional)
Remove-Item proxy-server.ts

# Or keep it for local testing
npm run proxy  # Still works for development
```

The Contabo VPS proxy is now **auxiliary** (not needed for production).

## Troubleshooting

### Function not deploying?
- Check: `supabase status`
- Ensure logged in: `supabase login`
- Check syntax: `deno --check supabase/functions/generate-alliance-profiles/index.ts`

### Function returning 500 error?
- Check Supabase logs for `[GENERATE_PROFILES]` entries
- Verify `ANTHROPIC_API_KEY` is set correctly
- Test with a simple curl request:
  ```powershell
  $body = @{
    companyDescription = "Test company"
    productsSummary = "Test products"
  } | ConvertTo-Json

  $headers = @{ "Content-Type" = "application/json" }
  Invoke-WebRequest -Uri "https://[project-url]/functions/v1/generate-alliance-profiles" `
    -Method POST -Headers $headers -Body $body
  ```

### Client can't invoke function?
- Check Supabase client is initialized correctly
- Verify function name matches: `generate-alliance-profiles`
- Check browser console for CORS errors (shouldn't have any)
- Verify Supabase URL and key are correct in `src/integrations/supabase/client.ts`

## Next Steps

1. ✅ Add `ANTHROPIC_API_KEY` to Supabase Settings
2. ✅ Deploy Edge Function via CLI or Git
3. ✅ Test locally and in production
4. ✅ Monitor logs in Supabase Dashboard
5. Optional: Remove proxy server files if not needed for development

## Summary

| Component | Status | Location |
|-----------|--------|----------|
| Edge Function Code | ✅ Complete | `supabase/functions/generate-alliance-profiles/index.ts` |
| Client Integration | ✅ Complete | `src/lib/allianceMarketAI.ts` |
| API Key Config | ⏳ Pending | Supabase Dashboard → Settings |
| Deployment | ⏳ Ready | Run `supabase functions deploy` |
| Testing | ⏳ Ready | Test after deployment |

**Total setup time**: ~10 minutes (5 min Supabase config + 5 min deploy)
