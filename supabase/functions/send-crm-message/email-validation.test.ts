// Email Validation Tests for send-crm-message edge function
// Test cases for Task 7 - Email Validation

// Email validation regex (RFC 5322 simplified)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Test cases
const testCases = [
  // Valid emails
  { email: "user@example.com", expected: true, description: "Valid email" },
  { email: "user.name@example.com", expected: true, description: "Email with dot in local part" },
  { email: "user+tag@example.co.uk", expected: true, description: "Email with plus sign" },
  { email: "123@example.com", expected: true, description: "Email with numeric local part" },
  
  // Invalid emails
  { email: "invalid.email", expected: false, description: "Missing @" },
  { email: "@example.com", expected: false, description: "Missing local part" },
  { email: "user@", expected: false, description: "Missing domain" },
  { email: "user @example.com", expected: false, description: "Space in email" },
  { email: "user@example", expected: false, description: "Missing TLD" },
  { email: "", expected: false, description: "Empty email" },
  { email: "user@@example.com", expected: false, description: "Double @" },
];

// Run tests
console.log("=== Email Validation Tests ===\n");

let passedTests = 0;
let failedTests = 0;

testCases.forEach(({ email, expected, description }) => {
  const result = isValidEmail(email);
  const passed = result === expected;
  
  if (passed) {
    passedTests++;
    console.log(`✅ PASS: ${description}`);
    console.log(`   Input: "${email}"`);
  } else {
    failedTests++;
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Input: "${email}"`);
    console.log(`   Expected: ${expected}, Got: ${result}`);
  }
  console.log();
});

// Summary
console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passedTests}/${testCases.length}`);
console.log(`Failed: ${failedTests}/${testCases.length}`);

if (failedTests > 0) {
  console.error("Some tests failed!");
  // Deno.exit(1);
} else {
  console.log("All tests passed! ✅");
}

// Authorization scenario tests
console.log("\n=== Authorization Scenario Tests ===\n");

const authScenarios = [
  {
    name: "Scenario 1: Valid email matching customer",
    recipient: "customer@example.com",
    customerEmail: "customer@example.com",
    shouldPass: true,
    description: "Email exactly matches customer email"
  },
  {
    name: "Scenario 2: Valid email case-insensitive match",
    recipient: "Customer@Example.com",
    customerEmail: "customer@example.com",
    shouldPass: true,
    description: "Case-insensitive match"
  },
  {
    name: "Scenario 3: Different email (unauthorized)",
    recipient: "attacker@example.com",
    customerEmail: "customer@example.com",
    shouldPass: false,
    description: "Email doesn't match customer"
  },
  {
    name: "Scenario 4: Empty customer email",
    recipient: "customer@example.com",
    customerEmail: null,
    shouldPass: false,
    description: "Customer has no email on file"
  }
];

authScenarios.forEach(({ name, recipient, customerEmail, shouldPass, description }) => {
  const matches = !customerEmail 
    ? false 
    : recipient.toLowerCase() === customerEmail.toLowerCase();
  
  const passed = matches === shouldPass;
  
  console.log(`${name}`);
  console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${description}`);
  console.log(`  Recipient: ${recipient}`);
  console.log(`  Customer Email: ${customerEmail || "(null)"}`);
  console.log(`  Match: ${matches}, Expected: ${shouldPass}`);
  console.log();
});

console.log("=== End of Tests ===");
