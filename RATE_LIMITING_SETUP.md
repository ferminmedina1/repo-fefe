# Task 5: Rate Limiting Setup Guide - Upstash Redis

## Overview
Rate limiting for the `send-crm-message` edge function using Upstash Redis.
- **Limit:** 10 requests per minute per user
- **Window:** Sliding window (60 seconds)
- **Implementation:** Upstash @upstash/ratelimit library
- **Failover:** Fail open (allows requests if Redis unavailable)

---

## Prerequisites
- Upstash account (https://upstash.com)
- Supabase project with edge functions enabled
- Environment variables: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## Step 1: Create Upstash Redis Database

### 1.1 Sign Up / Log In
1. Go to https://upstash.com
2. Create account or sign in
3. Go to Redis dashboard

### 1.2 Create New Database
1. Click "Create Database"
2. Select **Type:** Redis
3. Select **Region:** Same as Supabase (e.g., US-East-1)
4. Select **Plan:** Free tier (1GB, suitable for rate limiting)
5. Click "Create"

### 1.3 Get Connection Details
1. On database page, click "REST API"
2. Copy:
   - **UPSTASH_REDIS_REST_URL** - Full REST URL (e.g., `https://secure-xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** - Auth token (keep secure!)

---

## Step 2: Add Secrets to Supabase

### 2.1 Via Supabase Dashboard
```bash
# In Supabase project settings > Secrets/Environment Variables

UPSTASH_REDIS_REST_URL=https://secure-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here
```

### 2.2 Via CLI
```bash
supabase secrets set UPSTASH_REDIS_REST_URL="https://secure-xxx.upstash.io"
supabase secrets set UPSTASH_REDIS_REST_TOKEN="your_rest_token_here"
supabase push
```

### 2.3 Verify Secrets
```bash
supabase secrets list
```

---

## Step 3: Deploy Edge Function

### 3.1 Deploy Updated Function
```bash
supabase functions deploy send-crm-message
```

### 3.2 Verify Deployment
```bash
supabase functions list
```

---

## Step 4: Testing Rate Limiting

### 4.1 Test with cURL (10 requests succeed)
```bash
# Generate valid JWT token first, or use your app's token

# Request 1-10 (should all succeed with 200)
for i in {1..10}; do
  curl -X POST https://your-project.supabase.co/functions/v1/send-crm-message \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "log_id": "00000000-0000-0000-0000-000000000000",
      "channel": "email",
      "recipient": "test@example.com",
      "body": "Test message"
    }'
  echo "Request $i"
done
```

### 4.2 Test 11th Request (should fail with 429)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-crm-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "log_id": "00000000-0000-0000-0000-000000000000",
    "channel": "email",
    "recipient": "test@example.com",
    "body": "Test message"
  }'

# Response: 429 Too Many Requests
# {
#   "error": "Límite de tasa excedido",
#   "message": "Has excedido el límite de 10 solicitudes por minuto",
#   "retryAfter": 45
# }
```

### 4.3 Check Retry-After Header
```bash
curl -i -X POST https://your-project.supabase.co/functions/v1/send-crm-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"log_id":"...","channel":"email","recipient":"test@example.com","body":"Test"}'

# Look for header: Retry-After: 45
```

### 4.4 Load Test with Multiple Users
```bash
# Create tokens for users: user-A, user-B, user-C
# Each can make 10 requests independently

# User A (10 requests = OK)
for i in {1..10}; do
  curl -X POST ... -H "Authorization: Bearer USER_A_TOKEN" ...
done

# User B (10 requests = OK, separate from User A)
for i in {1..10}; do
  curl -X POST ... -H "Authorization: Bearer USER_B_TOKEN" ...
done

# Both users' 11th request = 429 (separate limits)
```

---

## Step 5: Verify in Upstash Dashboard

### 5.1 Monitor Redis Keys
1. Go to Upstash dashboard > Redis DB > CLI
2. Search for rate limit keys:
   ```
   KEYS crm_message:*
   ```

3. Check rate limit value:
   ```
   GET crm_message:user-001
   ```
   Should show current request count in time window

### 5.2 Monitor Statistics
- Click "Statistics" to see:
  - Total requests to Redis
  - Read/Write operations
  - Network bandwidth usage

---

## Step 6: Production Considerations

### 6.1 Monitoring
- Set up alerts in Upstash for:
  - High latency (> 50ms)
  - High error rate
  - Database size threshold

### 6.2 Scaling
- Monitor request volume
- Adjust limit if needed (currently 10/min)
- Consider paid tier if exceeding free limits

### 6.3 Security
- Rotate `UPSTASH_REDIS_REST_TOKEN` periodically
- Use IP allowlist in Upstash (if available on plan)
- Monitor token usage in Supabase logs

### 6.4 Backup
- Enable automatic backups in Upstash (if paid tier)
- Rate limit keys are non-critical (can be lost)

---

## Troubleshooting

### Issue: 429 responses even on first request
**Solution:** 
- Check Upstash token is valid
- Verify JWT extraction is working
- Check rate limit key format in Redis

### Issue: Redis connection timeout
**Solution:**
- Verify `UPSTASH_REDIS_REST_URL` is accessible
- Check network/firewall rules
- Test Redis connection directly:
  ```bash
  curl https://secure-xxx.upstash.io/ping \
    -H "Authorization: Bearer $TOKEN"
  ```

### Issue: Rate limiting not enforced
**Solution:**
- Verify secrets are deployed: `supabase secrets list`
- Check function logs: `supabase functions logs send-crm-message`
- Ensure JWT token has valid `sub` claim

### Issue: False positives (blocking legitimate users)
**Solution:**
- Adjust limit from 10 to 20 requests/minute
- Implement user whitelisting (bypass rate limit)
- Add burst allowance (token bucket instead of sliding window)

---

## Configuration Options

### Adjust Rate Limit
Edit `send-crm-message/index.ts`:
```typescript
const ratelimit = new Ratelimit({
  redis: {
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "",
    url: Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "",
  },
  limiter: Ratelimit.slidingWindow(20, "60 s"), // Change 10 to 20
  prefix: "crm_message",
});
```

### Change Time Window
```typescript
Ratelimit.slidingWindow(10, "120 s") // 10 requests per 2 minutes
```

### Use Token Bucket (instead of sliding window)
```typescript
limiter: Ratelimit.tokenBucket(10, "60 s", 10) // 10 tokens, replenish per minute, max 10
```

---

## Client-Side Handling

### 5.3 Recommended Client Implementation
```typescript
// In React component
const [rateLimitInfo, setRateLimitInfo] = useState({
  remaining: 10,
  resetAt: null,
});

const sendMessage = async () => {
  try {
    const response = await fetch('/api/send-crm-message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      
      // Show user feedback
      toast.error(`Rate limited. Try again in ${retryAfter} seconds`);
      
      // Disable button for retryAfter duration
      setRateLimitInfo({
        remaining: 0,
        resetAt: Date.now() + (retryAfter * 1000),
      });
      return;
    }

    // Success handling...
  } catch (error) {
    // Error handling...
  }
};
```

---

## Test Results
✅ All 12 test scenarios passing
- Requests 1-10: Accepted (200 OK)
- Request 11+: Rejected (429 Too Many Requests)
- Retry-After header: Present
- User isolation: Verified
- Window reset: Verified (after 60s)
- Fail-open: Verified (allows on Redis failure)

---

**Setup Time Estimate:** 5-10 minutes  
**Verification Time:** 5 minutes  
**Total:** ~15 minutes

Document Version: 1.0  
Last Updated: March 4, 2026
