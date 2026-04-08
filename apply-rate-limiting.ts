#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Script automatizado para aplicar Rate Limiting a múltiples edge functions
 * Uso: deno run --allow-read --allow-write apply-rate-limiting.ts
 */

const RATE_LIMITING_IMPORTS = `import { checkRateLimitByIP, extractIP } from "../_shared/rateLimitMiddleware.ts";`;

const ENDPOINTS_TO_UPDATE = [
  {
    path: "supabase/functions/save-stripe-payment-method/index.ts",
    endpoint: "save-stripe-payment-method",
    category: "payment",
    type: "public", // o "authenticated"
  },
  {
    path: "supabase/functions/delete-payment-method/index.ts",
    endpoint: "delete-payment-method",
    category: "payment",
    type: "public",
  },
  {
    path: "supabase/functions/create-stripe-setup-intent/index.ts",
    endpoint: "create-stripe-setup-intent",
    category: "payment",
    type: "public",
  },
  {
    path: "supabase/functions/create-mp-preapproval/index.ts",
    endpoint: "create-mp-preapproval",
    category: "payment",
    type: "public",
  },
  {
    path: "supabase/functions/mp-create-token/index.ts",
    endpoint: "mp-create-token",
    category: "payment",
    type: "public",
  },
  {
    path: "supabase/functions/signup-save-payment-method/index.ts",
    endpoint: "signup-save-payment-method",
    category: "payment",
    type: "public",
  },
  {
    path: "supabase/functions/afip-facturar/index.ts",
    endpoint: "afip-facturar",
    category: "financial",
    type: "authenticated",
  },
  {
    path: "supabase/functions/charge-trial-subscriptions/index.ts",
    endpoint: "charge-trial-subscriptions",
    category: "financial",
    type: "authenticated",
  },
  {
    path: "supabase/functions/afip-auth/index.ts",
    endpoint: "afip-auth",
    category: "financial",
    type: "authenticated",
  },
  {
    path: "supabase/functions/delete-account/index.ts",
    endpoint: "delete-account",
    category: "admin",
    type: "authenticated",
  },
  {
    path: "supabase/functions/reset-database/index.ts",
    endpoint: "reset-database",
    category: "admin",
    type: "authenticated",
  },
  {
    path: "supabase/functions/save-smtp-config/index.ts",
    endpoint: "save-smtp-config",
    category: "admin",
    type: "authenticated",
  },
];

async function processEndpoint(config: typeof ENDPOINTS_TO_UPDATE[0]) {
  console.log(`\n📝 Processing: ${config.endpoint}`);

  try {
    const content = await Deno.readTextFile(config.path);

    // Check if already has rate limiting
    if (content.includes("checkRateLimitByIP") || content.includes("checkRateLimitByUser")) {
      console.log(`  ✅ Already has rate limiting`);
      return;
    }

    // Add import
    let updated = content;
    if (!updated.includes(RATE_LIMITING_IMPORTS)) {
      // Find the last import statement
      const lastImportMatch = content.match(/import\s+.*?from\s+["'].*?["'];?/g);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        updated = updated.replace(
          lastImport,
          `${lastImport}\n${RATE_LIMITING_IMPORTS}`
        );
      }
    }

    // Generate rate limiting code
    const rateLimitCode =
      config.type === "public"
        ? `    // 🔒 RATE LIMITING: Protección contra abuso
    const ip = extractIP(req);
    const rateLimitCheck = await checkRateLimitByIP(ip, "${config.endpoint}", "${config.category}");
    
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimitCheck.message || "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            ...rateLimitCheck.headers 
          } 
        }
      );
    }\n`
        : `    // 🔒 RATE LIMITING: Protección contra abuso
    const rateLimitCheck = await checkRateLimitByUser(userId, "${config.endpoint}", "${config.category}");
    
    if (!rateLimitCheck.allowed) {
      return errorResponse(
        rateLimitCheck.message || "Rate limit exceeded",
        429,
        { headers: rateLimitCheck.headers }
      );
    }\n`;

    // Find first "try" block and insert rate limiting after input validation
    const tryPattern = /try\s*{/;
    const match = updated.match(tryPattern);

    if (match) {
      // Insert after the first validation (rough heuristic)
      const tryIndex = updated.indexOf(match[0]) + match[0].length;
      const afterTry = updated.substring(tryIndex);

      // Find first closing brace or validation pattern
      const validationPattern = /if\s*\(.*?\)\s*{|const\s+/;
      const validationMatch = afterTry.match(validationPattern);

      if (validationMatch) {
        const insertIndex = tryIndex + afterTry.indexOf(validationMatch[0]) + validationMatch[0].length + 1;
        updated = updated.slice(0, insertIndex) + "\n" + rateLimitCode + updated.slice(insertIndex);
      }

      console.log(`  ✅ Rate limiting code added`);
    } else {
      console.log(`  ⚠️  Could not find try block for automatic insertion`);
      return;
    }

    // Write back
    await Deno.writeTextFile(config.path, updated);
    console.log(`  ✅ File updated successfully`);
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 Rate Limiting Auto-Implementation Script");
  console.log("==========================================");
  console.log(`\nProcessing ${ENDPOINTS_TO_UPDATE.length} endpoints...\n`);

  for (const config of ENDPOINTS_TO_UPDATE) {
    await processEndpoint(config);
  }

  console.log("\n✅ Done!");
  console.log("\nNext steps:");
  console.log("1. Review the changes in each file");
  console.log("2. Run tests to verify functionality");
  console.log("3. Commit changes: git add supabase/functions && git commit -m 'feat: apply rate limiting to payment and financial endpoints'");
}

main().catch(console.error);
