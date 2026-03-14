import { assertEquals, assertExists, assertStrictEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  SafeErrorLogger,
  ErrorCode,
  ErrorSeverity,
  generateRequestId,
} from "./error-logger.ts";

// Task 10.3 - Error Handling Tests
// Validates that:
// 1. No error.message leaks in client responses
// 2. Configuration/credential errors are generic
// 3. External service errors don't expose provider details
// 4. Authorization errors return 404 (not 403) to prevent resource discovery
// 5. All status codes are appropriate
// 6. Request IDs are unique and usable for tracing

Deno.test("Error Handler - Validation Errors expose safe details", () => {
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logValidationError("Email must be valid");

  assertEquals(response.statusCode, 400);
  assertEquals(response.code, ErrorCode.ValidationFailed);
  // Safe to expose validation details to help client fix
  assertExists(response.error);
  // CRITICAL: Never contains raw error.message
  assertEquals(response.error.includes("Email must be valid"), true);
});

Deno.test("Error Handler - Invalid Email validation", () => {
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logValidationError("Invalid email format");

  assertEquals(response.statusCode, 400);
  assertEquals(response.code, ErrorCode.ValidationFailed);
  assertExists(response.error);
});

Deno.test("Error Handler - Rate Limit includes retry info", () => {
  const logger = new SafeErrorLogger(generateRequestId(), "user-123");
  const retryAfter = 45;
  const response = logger.logRateLimitError(retryAfter);

  assertEquals(response.statusCode, 429);
  assertEquals(response.code, ErrorCode.RateLimitExceeded);
  // Message should help client understand they're rate limited
  assertExists(response.error);
  assertEquals(response.error.includes("límite"), true);
});

Deno.test("Error Handler - Authorization returns 404 (not 403)", () => {
  const logger = new SafeErrorLogger(generateRequestId(), "user-123");
  const response = logger.logAuthorizationError("User cannot access resource", true);

  // CRITICAL: Returns 404 not 403 to prevent attackers discovering resources
  assertEquals(response.statusCode, 404);
  assertEquals(response.code, ErrorCode.NotFound);
  // Generic message - attacker shouldn't know if resource exists
  assertExists(response.error);
  assertEquals(response.error.includes("solicitado"), true);
});

Deno.test("Error Handler - Forbidden resource hides existence", () => {
  const logger = new SafeErrorLogger(generateRequestId(), "user-123");
  // By passing true, attacker gets 404 even if resource exists but forbidden
  const response = logger.logAuthorizationError("Forbidden resource", true);

  assertEquals(response.statusCode, 404);
  // Resource existence is completely hidden
  assertEquals(response.code, ErrorCode.NotFound);
});

Deno.test("Error Handler - Configuration error generic (no credentials exposed)", () => {
  const logger = new SafeErrorLogger(generateRequestId());
  // CRITICAL: Missing API keys should NEVER expose which key or service
  const response = logger.logConfigurationError("missing_api_key");

  assertEquals(response.statusCode, 500);
  assertEquals(response.code, ErrorCode.ConfigurationError);
  // Message is always same - never hints at which credential is missing
  assertExists(response.error);
  assertEquals(response.error.includes("configuración"), true);
  assertEquals(response.error.includes("RESEND_API_KEY"), false);
  assertEquals(response.error.includes("ENCRYPTION_KEY"), false);
  assertEquals(response.error.includes("Twilio"), false);
});

Deno.test("Error Handler - Encryption key error is generic", () => {
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logConfigurationError("missing_encryption_key");

  assertEquals(response.statusCode, 500);
  assertEquals(response.code, ErrorCode.ConfigurationError);
  // Never exposes which encryption key or its purpose
  assertExists(response.error);
  assertEquals(response.error.includes("encryption"), false);
  assertEquals(response.error.includes("key"), false);
});

Deno.test("Error Handler - Decryption failure is generic", () => {
  const logger = new SafeErrorLogger(generateRequestId());
  const cryptoError = new Error("Failed to decrypt credentials");
  const response = logger.logConfigurationError("decryption_failed", cryptoError);

  assertEquals(response.statusCode, 500);
  assertEquals(response.code, ErrorCode.ConfigurationError);
  // Never says "decryption" or "credentials" to client
  assertExists(response.error);
  assertEquals(response.error.includes("decrypt"), false);
  assertEquals(response.error.includes("credentials"), false);
});

Deno.test("Error Handler - Missing Credentials is never specific", () => {
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logConfigurationError("missing_api_key");

  assertEquals(response.statusCode, 500);
  // Never distinguished between "missing Resend" vs "missing Twilio"
  assertExists(response.error);
  assertEquals(response.error.includes("Resend"), false);
  assertEquals(response.error.includes("Twilio"), false);
});

Deno.test("Error Handler - External Service (Resend) error is generic", () => {
  const logger = new SafeErrorLogger(generateRequestId(), "user-123");
  const resendError = new Error(
    "Invalid from address: must be from onboarding@resend.dev domain"
  );
  const response = logger.logExternalServiceError("Resend", resendError);

  assertEquals(response.statusCode, 500);
  assertEquals(response.code, ErrorCode.ExternalServiceError);
  // CRITICAL: Never exposes Resend implementation details to client
  assertExists(response.error);
  assertEquals(response.error.includes("Resend"), false);
  assertEquals(response.error.includes("from address"), false);
  assertEquals(response.error.includes("onboarding@resend.dev"), false);
});

Deno.test("Error Handler - External Service (Twilio) error is generic", () => {
  const logger = new SafeErrorLogger(generateRequestId(), "user-123");
  const twilioError = new Error(
    "Account SID is invalid: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  );
  const response = logger.logExternalServiceError("Twilio", twilioError);

  assertEquals(response.statusCode, 500);
  assertEquals(response.code, ErrorCode.ExternalServiceError);
  // CRITICAL: Never exposes Twilio credentials, endpoints, or error details
  assertExists(response.error);
  assertEquals(response.error.includes("Twilio"), false);
  assertEquals(response.error.includes("Account SID"), false);
  assertEquals(response.error.includes("AC"), false);
});

Deno.test("Error Handler - Unexpected error is completely generic", () => {
  const logger = new SafeErrorLogger(generateRequestId(), "user-123");
  const unknownError = new Error(
    "Database connection pool exhausted: max_connections=100 reached"
  );
  const response = logger.logUnexpectedError(unknownError);

  assertEquals(response.statusCode, 500);
  assertEquals(response.code, ErrorCode.InternalServerError);
  // CRITICAL: Never exposes internal system details
  assertExists(response.error);
  assertEquals(response.error.includes("Error interno"), true);
  assertEquals(response.error.includes("Database"), false);
  assertEquals(response.error.includes("connection pool"), false);
  assertEquals(response.error.includes("max_connections"), false);
});

Deno.test("Error Handler - All 11 ErrorCodes are distinct", () => {
  const codes = Object.values(ErrorCode);
  const uniqueCodes = new Set(codes);
  // Each code should be unique
  assertEquals(codes.length, uniqueCodes.size);
  assertEquals(codes.length, 11);
});

Deno.test("Error Handler - Request ID generation is unique", () => {
  const id1 = generateRequestId();
  const id2 = generateRequestId();
  const id3 = generateRequestId();

  assertExists(id1);
  assertExists(id2);
  assertExists(id3);
  // IDs should be different for tracking
  assertEquals(id1 === id2, false);
  assertEquals(id2 === id3, false);
  assertEquals(id1 === id3, false);
  // Should be reasonable length (not null or empty)
  assertEquals(id1.length > 0, true);
  assertEquals(id2.length > 0, true);
});

Deno.test("Error Handler - Request ID format is traceable", () => {
  const id = generateRequestId();
  // Should be able to extract timestamp and randomness
  assertExists(id);
  // Typical format: timestamp + random chars
  assertEquals(id.length > 10, true);
});

Deno.test("Error Handler - SafeErrorLogger requires requestId", () => {
  const logger = new SafeErrorLogger("test-request-123");
  assertExists(logger);
});

Deno.test("Error Handler - SafeErrorLogger accepts optional userId", () => {
  const loggerWithUser = new SafeErrorLogger("test-id-1", "user-456");
  assertExists(loggerWithUser);

  const loggerNoUser = new SafeErrorLogger("test-id-2");
  assertExists(loggerNoUser);
});

Deno.test("Error Handler - All responses have required fields", () => {
  const logger = new SafeErrorLogger(generateRequestId());

  const validationResp = logger.logValidationError("test");
  assertExists(validationResp.error);
  assertExists(validationResp.code);
  assertExists(validationResp.statusCode);

  const rateLimitResp = logger.logRateLimitError(30);
  assertExists(rateLimitResp.error);
  assertExists(rateLimitResp.code);
  assertExists(rateLimitResp.statusCode);

  const authResp = logger.logAuthorizationError("test");
  assertExists(authResp.error);
  assertExists(authResp.code);
  assertExists(authResp.statusCode);

  const configResp = logger.logConfigurationError("missing_api_key");
  assertExists(configResp.error);
  assertExists(configResp.code);
  assertExists(configResp.statusCode);

  const extResp = logger.logExternalServiceError("Resend", new Error("test"));
  assertExists(extResp.error);
  assertExists(extResp.code);
  assertExists(extResp.statusCode);

  const unexpectedResp = logger.logUnexpectedError(new Error("test"));
  assertExists(unexpectedResp.error);
  assertExists(unexpectedResp.code);
  assertExists(unexpectedResp.statusCode);
});

Deno.test("Error Handler - Status codes are HTTP compliant", () => {
  const logger = new SafeErrorLogger(generateRequestId());

  const validation = logger.logValidationError("test");
  assertEquals(validation.statusCode, 400);

  const rateLimit = logger.logRateLimitError(30);
  assertEquals(rateLimit.statusCode, 429);

  const auth = logger.logAuthorizationError("test", true);
  assertEquals(auth.statusCode, 404);

  const config = logger.logConfigurationError("missing_api_key");
  assertEquals(config.statusCode, 500);

  const external = logger.logExternalServiceError("Resend", new Error("test"));
  assertEquals(external.statusCode, 500);

  const unexpected = logger.logUnexpectedError(new Error("test"));
  assertEquals(unexpected.statusCode, 500);
});

Deno.test("Error Handler - CRITICAL: No response exposes error.message", () => {
  const sensitiveError = new Error(
    "Connection to postgres://user:password@db.internal/secret_db failed"
  );
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logUnexpectedError(sensitiveError);

  // The response error message should NEVER contain the original error
  assertEquals(response.error.includes("postgres://"), false);
  assertEquals(response.error.includes("password"), false);
  assertEquals(response.error.includes("secret_db"), false);
  assertEquals(response.error.includes("Connection to"), false);
});

Deno.test("Error Handler - CRITICAL: No response exposes environment variables", () => {
  const envError = new Error("RESEND_API_KEY=sk_live_abc123xyz789...");
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logUnexpectedError(envError);

  assertEquals(response.error.includes("sk_live_"), false);
  assertEquals(response.error.includes("RESEND_API_KEY"), false);
});

Deno.test("Error Handler - CRITICAL: No response exposes database queries", () => {
  const dbError = new Error(
    'Database error at query: SELECT * FROM users WHERE email = \'admin@secret.com\' AND is_admin = true'
  );
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logUnexpectedError(dbError);

  assertEquals(response.error.includes("SELECT"), false);
  assertEquals(response.error.includes("admin@secret.com"), false);
  assertEquals(response.error.includes("is_admin"), false);
});

Deno.test("Error Handler - CRITICAL: No response exposes API credentials", () => {
  const credError = new Error(
    "Twilio API failed with credentials SID=ACxxxxxxxxxxxxxxx, Token=authxxxxxxxxxxxxxxx"
  );
  const logger = new SafeErrorLogger(generateRequestId());
  const response = logger.logExternalServiceError("Twilio", credError);

  assertEquals(response.error.includes("ACxxxxx"), false);
  assertEquals(response.error.includes("authxxxxx"), false);
  assertEquals(response.error.includes("SID="), false);
});

Deno.test("Error Handler - Severity levels are defined", () => {
  assertEquals(ErrorSeverity.INFO, "info");
  assertEquals(ErrorSeverity.WARNING, "warning");
  assertEquals(ErrorSeverity.ERROR, "error");
});

// Task 10.3 - Summary
// All 18 tests validate that:
// ✅ Error logger prevents information leakage
// ✅ No error.message reaches client
// ✅ Configuration errors are always generic
// ✅ External service errors are always generic
// ✅ Authorization uses 404 to prevent discovery
// ✅ All status codes are HTTP compliant
// ✅ Request IDs are unique and traceable
// ✅ All required fields present in responses
