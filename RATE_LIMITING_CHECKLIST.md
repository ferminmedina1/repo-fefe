# 🔒 RATE LIMITING IMPLEMENTATION CHECKLIST

**Created:** 2026-04-06  
**Status:** Phase 2 - Critical Endpoints Implementation  
**Author:** Autonomous Implementation  

---

## 📊 OVERALL PROGRESS

```
Infrastructure:     ████████████████████ 100% (4/4)
Payment Endpoints:  ██████░░░░░░░░░░░░░░  30% (3/10)
Financial:          ░░░░░░░░░░░░░░░░░░░░   0% (0/3)
Admin:              ░░░░░░░░░░░░░░░░░░░░   0% (0/4)
Medium-Priority:    ░░░░░░░░░░░░░░░░░░░░   0% (0/25+)
─────────────────────────────────────────
TOTAL CRITICAL:     ██████░░░░░░░░░░░░░░  23% (6/17)
```

---

## ✅ COMPLETED

### Infrastructure Layer (4/4)
- [x] [rateLimitConfig.ts](supabase/functions/_shared/rateLimitConfig.ts)
  - 11 categories with distributed limits
  - Endpoint-to-category mapping
  - Special overrides (delete-account, reset-database: 1/hour)

- [x] [rateLimitMiddleware.ts v2](supabase/functions/_shared/rateLimitMiddleware.ts)
  - User-based + IP-based limiting
  - Observability layer (structured logging)
  - Metrics collection (Redis hits/misses/blocks/failures)
  - Retry logic + exponential backoff
  - Memory management (LRU eviction)
  - IP validation (IPv4 regex + proxy headers)
  - Fail-open error handling
  - Rate limit headers (X-RateLimit-*)

- [x] [rateLimitUtils.ts](supabase/functions/_shared/rateLimitUtils.ts)
  - `applyRateLimit()` - universal handler
  - `applyRateLimitUser()` - shorthand
  - `applyRateLimitIP()` - shorthand
  - `addRateLimitHeaders()` - header utility
  - `rateLimitOrContinue()` - validator

- [x] Documentation (3 files)
  - RATE_LIMITING_IMPLEMENTATION_GUIDE.md
  - RATE_LIMITING_STATUS.md
  - RATE_LIMITING_SUMMARY.md

---

## 🔄 IN PROGRESS - PAYMENT ENDPOINTS

### Authentication & Onboarding (Fraud Prevention Focus)

- [x] [finalize-signup](supabase/functions/finalize-signup/index.ts)
  - **Limit:** 5 requests/15 min (auth category)
  - **Type:** IP-based (public endpoint)
  - **Protection:** Prevent credential stuffing/spam signup
  - **Status:** ✅ COMPLETE
  - **Tested:** ❓ Needs validation

- [x] [create-intent](supabase/functions/create-intent/index.ts)
  - **Limit:** 5 requests/min (payment category, custom)
  - **Type:** IP-based (public endpoint) 
  - **Protection:** Prevent payment intent enumeration
  - **Status:** ✅ COMPLETE
  - **Tested:** ❓ Needs validation

- [x] [start-checkout](supabase/functions/start-checkout/index.ts)
  - **Limit:** 10 requests/min (payment category)
  - **Type:** IP-based (initiation phase)
  - **Protection:** Prevent checkout flow abuse
  - **Status:** ✅ SCAFFOLDING COMPLETE
  - **Tested:** ❓ Needs validation

### Payment Method Management (Card Testing Prevention)

- [ ] **[save-stripe-payment-method](supabase/functions/save-stripe-payment-method/index.ts)** 🔴
  - **Limit:** 10 requests/min (payment category)
  - **Type:** IP-based (public endpoint)
  - **Protection:** Prevent card enumeration attack
  - **Action:** Add IP extraction + rate limit check
  - **Estimated Time:** 5 min

- [ ] **[delete-payment-method](supabase/functions/delete-payment-method/index.ts)** 🔴
  - **Limit:** 10 requests/min (payment category)
  - **Type:** User-based (authenticated)
  - **Protection:** Prevent DoS on customer data deletion
  - **Action:** Add user extraction + rate limit check
  - **Estimated Time:** 5 min

- [ ] **[create-stripe-setup-intent](supabase/functions/create-stripe-setup-intent/index.ts)** 🔴
  - **Limit:** 10 requests/min (payment category)
  - **Type:** IP-based
  - **Protection:** Prevent setup intent spam
  - **Action:** Add IP extraction + rate limit check
  - **Estimated Time:** 5 min

- [ ] **[signup-save-payment-method](supabase/functions/signup-save-payment-method/index.ts)** 🔴
  - **Limit:** 5 requests/15 min (auth category)
  - **Type:** IP-based
  - **Protection:** Prevent mass payment method creation during signup
  - **Action:** Add IP extraction + rate limit check
  - **Estimated Time:** 5 min

### Mercado Pago Integration (Alternative Payment Flow)

- [ ] **[create-mp-preapproval](supabase/functions/create-mp-preapproval/index.ts)** 🔴
  - **Limit:** 10 requests/min (payment category)
  - **Type:** IP-based
  - **Protection:** Prevent MP subscription enumeration
  - **Action:** Add IP extraction + rate limit check
  - **Estimated Time:** 5 min

- [ ] **[mp-create-token](supabase/functions/mp-create-token/index.ts)** 🔴
  - **Limit:** 10 requests/min (payment category)
  - **Type:** IP-based
  - **Protection:** Prevent MP token creation abuse
  - **Action:** Add IP extraction + rate limit check
  - **Estimated Time:** 5 min

### Additional Payment Operations

- [ ] **[get-intent-status](supabase/functions/get-intent-status/index.ts)** & **[mark-intent-ready](supabase/functions/mark-intent-ready/index.ts)** 🔴
  - **Limit:** 30 requests/min (payment category)
  - **Type:** IP-based (status polling)
  - **Protection:** Prevent status enumeration
  - **Action:** Add IP extraction + rate limit check to both
  - **Estimated Time:** 10 min

---

## 🚨 PENDING - FINANCIAL ENDPOINTS (CRITICAL - REAL MONEY)

- [ ] **[afip-facturar](supabase/functions/afip-facturar/index.ts)** 🔴 **CRITICAL**
  - **Limit:** 5 requests/min (financial category, special)
  - **Type:** User-based (authenticated, real invoice generation)
  - **Protection:** Prevent invoice spam/manipulation
  - **Risk:** ⚠️ GENERATES REAL INVOICES - HIGH FRAUD RISK
  - **Action:** Add user extraction + rate limit + audit logging
  - **Estimated Time:** 10 min (needs audit log)

- [ ] **[charge-trial-subscriptions](supabase/functions/charge-trial-subscriptions/index.ts)** 🔴 **CRITICAL**  
  - **Limit:** 2 requests/min (financial category, special)
  - **Type:** User-based (authenticated, real charges)
  - **Protection:** Prevent financial charges abuse
  - **Risk:** ⚠️ CHARGES CUSTOMER CARDS - HIGHEST PRIORITY
  - **Action:** Add user extraction + rate limit + audit logging
  - **Estimated Time:** 10 min (needs audit log)

- [ ] **[afip-auth](supabase/functions/afip-auth/index.ts)** 🔴
  - **Limit:** 5 requests/min (financial category)
  - **Type:** User-based (authenticated)
  - **Protection:** Prevent credential enumeration
  - **Action:** Add user extraction + rate limit check
  - **Estimated Time:** 5 min

---

## 🔐 PENDING - ADMIN ENDPOINTS (CRITICAL - DESTRUCTIVE)

- [ ] **[delete-account](supabase/functions/delete-account/index.ts)** 🔴 **CRITICAL**
  - **Limit:** 1 request/hour (admin category, special)
  - **Type:** User-based (authenticated, irreversible)
  - **Protection:** Prevent accidental/malicious account deletion
  - **Risk:** ⚠️ DATA DESTRUCTION - IMPLEMENT WITH AUDIT LOG
  - **Action:** Add user extraction + rate limit + MANDATORY audit logging
  - **Estimated Time:** 15 min (with audit)

- [ ] **[reset-database](supabase/functions/reset-database/index.ts)** 🔴 **CRITICAL**
  - **Limit:** 1 request/hour (admin category, special)
  - **Type:** Admin-only (authenticated, destructive testing)
  - **Protection:** Prevent accidental testing data loss
  - **Risk:** ⚠️ FULL DATABASE RESET - HIGHEST RISK OPERATION
  - **Action:** Add admin validation + rate limit + audit logging
  - **Estimated Time:** 15 min (with extra validation)

- [ ] **[save-smtp-config](supabase/functions/save-smtp-config/index.ts)** 🔴
  - **Limit:** 10 requests/hour (admin category)
  - **Type:** Admin-only (authenticated)
  - **Protection:** Prevent config spam/manipulation
  - **Action:** Add admin validation + rate limit
  - **Estimated Time:** 10 min

- [ ] **[update-platform-support-ticket-status](supabase/functions/update-platform-support-ticket-status/index.ts)** 🔴
  - **Limit:** 30 requests/min (admin category)
  - **Type:** Admin-only (authenticated)
  - **Protection:** Prevent support system spam
  - **Action:** Add admin validation + rate limit
  - **Estimated Time:** 10 min

---

## ⏳ PENDING - MEDIUM PRIORITY (25+ endpoints)

### Notifications (10+ endpoints)
- [ ] send-bulk-email (5/min)
- [ ] send-crm-notification (30/min) - already has Upstash
- [ ] send-alert-email (30/min)
- [ ] send-low-credit-alert (30/min)
- [ ] send-payment-reminder (30/min)
- [ ] send-promotional-email (10/min)
- [ ] send-compliance-notice (5/min)
- [ ] send-support-notification (30/min)
- [ ] send-system-alert (50/min)
- [ ] send-user-notification (50/min)

### Integrations (5+)
- [ ] integrations-get-credentials (20/min)
- [ ] integrations-save-credentials (20/min)
- [ ] integrations-ml-start (10/min)
- [ ] integrations-delete (10/min)
- [ ] integrations-test (10/min)

### Webhooks (2)
- [ ] mercadopago-webhook (50/min by IP)
- [ ] webhooks-google-forms (50/min by IP)

### Bulk Operations (5+)
- [ ] bulk-import (10/min)
- [ ] bulk-export (10/min)
- [ ] bulk-delete (5/min)
- [ ] bulk-update (10/min)
- [ ] bulk-email (5/min)

### Other
- [ ] Various data mutations and queries

---

## 🧪 VALIDATION CHECKLIST

### Before Committing Each Batch:

- [ ] **Code Quality**
  - All endpoints have identical patterns
  - No hardcoded limits (use rateLimitConfig)
  - Error messages user-friendly
  - No console.log spam

- [ ] **Error Handling**
  - 429 responses include all X-RateLimit-* headers
  - Error messages don't leak internal details
  - Clear retry-after guidance

- [ ] **Testing**
  - Make 10+ requests to endpoint within 1 minute
  - Verify 429 response after limit exceeded
  - Verify headers present: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Retry-After

- [ ] **Performance**
  - Latency increase <2ms per request
  - In-memory cache hit rate >85%
  - No memory leaks (monitor heap size over 1000 requests)

- [ ] **Security**
  - No user IDs/tokens in error responses
  - IP spoofing protected (regex validation)
  - Redis connection failures don't break service (fallback works)

---

## 📋 RECOMMENDED EXECUTION ORDER

**Session 1: Payment Endpoints (Critical - 30 min)**
1. save-stripe-payment-method
2. delete-payment-method
3. create-stripe-setup-intent
4. create-mp-preapproval
5. mp-create-token
6. signup-save-payment-method
7. get-intent-status + mark-intent-ready
→ Commit: "feat: apply rate limiting to payment endpoints (prevent card testing)"

**Session 2: Financial + Admin (Critical - 25 min)**
1. afip-facturar (with audit logging)
2. charge-trial-subscriptions (with audit logging)
3. afip-auth
4. delete-account (with extra protections)
5. reset-database (with extra protections)
6. save-smtp-config
7. update-platform-support-ticket-status
→ Commit: "feat: apply rate limiting to financial and admin endpoints (protect sensitive ops)"

**Session 3: Notifications + Integrations (High - 30 min)**
→ Systematic implementation of remaining medium-priority endpoints
→ Commit: "feat: apply rate limiting to notifications and integrations"

**Session 4: Webhooks + Bulk (Medium - 20 min)**
→ Systematic implementation of webhooks and bulk operations
→ Commit: "feat: apply rate limiting to webhooks and bulk operations"

**Session 5: Testing + Monitoring**
→ Load test entire stack
→ Verify metrics collection
→ Monitor production for 24h

---

## 🎯 SUCCESS CRITERIA

- [x] Infrastructure layer complete and tested
- [ ] All 17 critical endpoints protected (10 payment + 3 financial + 4 admin)
- [ ] All responses include correct rate limit headers
- [ ] Load test: 3x limit concurrency → proper 429s
- [ ] Fallback: Redis unavailable → memory-based limiting works
- [ ] Metrics: Collection working for all endpoints
- [ ] Documentation: Implementation guide updated
- [ ] Audit Log: Financial/Admin operations logged
- [ ] Monitoring: Dashboard shows rate limit metrics

---

## 📞 NOTES FOR CONTINUATION

If session ends, next continuation should:
1. Review this checklist status
2. Continue from next unchecked item
3. Use identical pattern established in finalize-signup + create-intent
4. Verify all 429 responses before each commit
5. Test with concurrent requests tool (artillery, wrk, or Postman)
6. Keep session memory updated with progress

**Key Pattern to Remember:**
```typescript
// For IP-based (public)
const ip = extractIP(req);
const rateLimitCheck = await checkRateLimitByIP(ip, "endpoint-name", "category");
if (!rateLimitCheck.allowed) { return 429_response; }

// For user-based (authenticated)  
const rateLimitCheck = await checkRateLimitByUser(userId, "endpoint-name", "category");
if (!rateLimitCheck.allowed) { return 429_response; }
```

---

**Auto-generated:** 2026-04-06 14:30 UTC
**Last Updated:** Session Start
**Maintained By:** Autonomous Implementation
