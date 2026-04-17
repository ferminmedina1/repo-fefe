# Payment Endpoints - Rate Limiting Implementation Plan

## Analysis Summary

| Endpoint | Status | Type | Auth | Pattern | Changes Needed |
|----------|--------|------|------|---------|-----------------|
| finalize-signup | ✅ DONE | IP-based | Public | Already implemented | None - verify working |
| create-intent | ✅ DONE | IP-based | Public | Already implemented | None - verify working |
| start-checkout | ✅ DONE | IP-based | Public | Already implemented | None - verify working |
| save-stripe-payment-method | ⏳ TODO | User-based | Auth | Extract user + call checkRateLimitByUser | Add import + add check after auth |
| delete-payment-method | ⏳ TODO | User-based | Auth | Extract user + call checkRateLimitByUser | Add import + add check after auth |
| create-stripe-setup-intent | ⏳ TODO | User-based | Auth | Extract user + call checkRateLimitByUser | Add import + add check after auth |
| create-mp-preapproval | ⏳ TODO | ? | ? | TBD | TBD |
| mp-create-token | ⏳ TODO | ? | ? | TBD | TBD |
| signup-save-payment-method | ⏳ TODO | ? | ? | TBD | TBD |
| get-intent-status | ⏳ TODO | IP-based | Public? | Extract IP + call checkRateLimitByIP | Add import + add check after cors |
| mark-intent-ready | ⏳ TODO | IP-based | Public? | Extract IP + call checkRateLimitByIP | Add import + add check after cors |

## Key Endpoints to Complete

### Tier 1: High-Priority Payment Flow Endpoints (7 total)

1. **save-stripe-payment-method** ⏳
   - **Current:** Authenticated (checks authHeader)
   - **Pattern:** User-based limiting
   - **Implementation:** Extract userId from auth, use checkRateLimitByUser
   - **Limit:** 10/min (payment category)
   - **Risk:** Card testing attack (testing valid card numbers)
   - **Change:** Add import + check after user profile retrieval

2. **delete-payment-method** ⏳
   - **Current:** Authenticated (checks authHeader)
   - **Pattern:** User-based limiting
   - **Limit:** 10/min (payment category)
   - **Change:** Add import + check after user retrieval

3. **create-stripe-setup-intent** ⏳
   - **Current:** Unknown - needs inspection
   - **Pattern:** Likely authenticated
   - **Limit:** 10/min (payment category)
   - **Risk:** Setup intent enumeration

4. **create-mp-preapproval** ⏳
   - **Current:** Unknown - needs inspection
   - **Pattern:** Likely MercadoPago flow
   - **Limit:** 10/min (payment category)

5. **mp-create-token** ⏳
   - **Current:** Unknown - needs inspection
   - **Pattern:** Likely MercadoPago tokenization
   - **Limit:** 10/min (payment category)

6. **signup-save-payment-method** ⏳
   - **Current:** Unknown - needs inspection
   - **Pattern:** Part of signup flow - likely IP-based
   - **Limit:** 5/15min (auth category) or 10/min (payment category)

7. **get-intent-status** + **mark-intent-ready** ⏳
   - **Current:** Unknown - needs inspection
   - **Pattern:** Status polling - likely IP-based
   - **Limit:** 30/min (payment category) - combined

## Implementation Pattern

### For Authenticated (User-Based) Endpoints:

```typescript
// 1. Add import
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

// 2. Extract user ID (after existing auth check)
const userId = user.id; // from existing: const { data: { user }, ... } = await supabaseUser.auth.getUser();

// 3. Add rate limit check after user validation
const rateLimitCheck = await checkRateLimitByUser(userId, "endpoint-name", "payment");

if (!rateLimitCheck.allowed) {
  return json(
    { error: rateLimitCheck.message, code: "RATE_LIMIT_EXCEEDED" },
    429
  );
}
```

### For Public (IP-Based) Endpoints:

```typescript
// 1. Add import
import { checkRateLimitByIP, extractIP } from "../_shared/rateLimitMiddleware.ts";

// 2. Extract IP early (after cors check)
const ip = extractIP(req);

// 3. Add rate limit check early in handler
const rateLimitCheck = await checkRateLimitByIP(ip, "endpoint-name", "payment");

if (!rateLimitCheck.allowed) {
  return json(
    { error: rateLimitCheck.message, code: "RATE_LIMIT_EXCEEDED" },
    429
  );
}
```

## Next Steps

1. Inspect all 7 endpoints to determine auth type (public vs auth)
2. Prepare multi-file replacement batch
3. Execute replacements
4. Validate each endpoint returns 429 after limit exceeded
5. Commit with message: "feat: apply rate limiting to payment endpoints (prevent card testing)"

---

*Created during session*: Autonomous implementation phase
