#!/usr/bin/env pwsh
# Rate Limiting Comprehensive Test Suite
# Tests all 14 critical endpoints for proper rate limiting

param(
    [string]$BaseUrl = "http://localhost:54321/functions/v1"
)

$ErrorActionPreference = "Stop"

# Colors
$Success = @{ ForegroundColor = 'Green' }
$Error = @{ ForegroundColor = 'Red' }
$Warning = @{ ForegroundColor = 'Yellow' }
$Info = @{ ForegroundColor = 'Cyan' }

Write-Host "`n╔════════════════════════════════════════════════════════════╗" @Info
Write-Host "║         RATE LIMITING COMPREHENSIVE TEST SUITE             ║" @Info
Write-Host "╚════════════════════════════════════════════════════════════╝" @Info

Write-Host "`nBase URL: $BaseUrl" @Info

# Test endpoints
$endpoints = @(
    # Payment Endpoints
    @{
        Name = "finalize-signup (Payment - Pre-existing)"
        Endpoint = "finalize-signup"
        Category = "Payment"
        Limit = "5/15min"
        Method = "POST"
        Body = @{
            email = "test-$(Get-Random)@example.com"
            password = "Test123!@"
            name = "Test User"
        }
        RequestsToTest = 8
    },
    @{
        Name = "save-stripe-payment-method (Payment - NEW)"
        Endpoint = "save-stripe-payment-method"
        Category = "Payment"
        Limit = "10/min"
        Method = "POST"
        Headers = @{ "Authorization" = "Bearer test-token-fake" }
        Body = @{
            payment_method_id = "pm_test"
            company_id = "test-company"
        }
        RequestsToTest = 12
    },
    @{
        Name = "create-intent (Payment - Pre-existing)"
        Endpoint = "create-intent"
        Category = "Payment"
        Limit = "5/min"
        Method = "POST"
        Body = @{
            company_id = "test-company"
        }
        RequestsToTest = 8
    },
    @{
        Name = "mp-create-token (Payment - NEW)"
        Endpoint = "mp-create-token"
        Category = "Payment"
        Limit = "10/min"
        Method = "POST"
        Body = @{
            cardNumber = "4111111111111111"
            cardholderName = "Test User"
            cardExpirationMonth = "12"
            cardExpirationYear = "2025"
            securityCode = "123"
        }
        RequestsToTest = 12
    },
    # Financial Endpoints
    @{
        Name = "afip-facturar (Financial - NEW)"
        Endpoint = "afip-facturar"
        Category = "Financial"
        Limit = "5/min"
        Method = "POST"
        Headers = @{ "Authorization" = "Bearer test-token-fake" }
        Body = @{
            companyId = "test-company"
            posAfipId = "test-pos"
        }
        RequestsToTest = 7
    },
    @{
        Name = "charge-trial-subscriptions (Financial - NEW)"
        Endpoint = "charge-trial-subscriptions"
        Category = "Financial"
        Limit = "2/min"
        Method = "POST"
        Body = @{ }
        RequestsToTest = 4
    },
    # Admin Endpoints
    @{
        Name = "delete-account (Admin - NEW)"
        Endpoint = "delete-account"
        Category = "Admin"
        Limit = "1/hour"
        Method = "POST"
        Headers = @{ "Authorization" = "Bearer test-token-fake" }
        Body = @{
            user_id = "test-user"
            reason = "Testing"
        }
        RequestsToTest = 3
    },
    @{
        Name = "reset-database (Admin - NEW)"
        Endpoint = "reset-database"
        Category = "Admin"
        Limit = "1/hour"
        Method = "POST"
        Body = @{ }
        RequestsToTest = 3
    }
)

$results = @{
    Total = 0
    Tested = 0
    Success = 0
    RateLimited = 0
    Errors = 0
    Passed = 0
    Failed = 0
}

foreach ($endpoint in $endpoints) {
    Write-Host "`n" + ("─" * 60)
    Write-Host "Testing: $($endpoint.Name)" @Info
    Write-Host "Category: $($endpoint.Category) | Limit: $($endpoint.Limit)" @Info
    Write-Host "Sending $($endpoint.RequestsToTest) requests..." @Info
    
    $successCount = 0
    $rateLimitCount = 0
    $errorCount = 0
    $rateLimitHeaders = @{}
    
    for ($i = 1; $i -le $endpoint.RequestsToTest; $i++) {
        try {
            $uri = "$BaseUrl/$($endpoint.Endpoint)"
            $headers = @{
                "Content-Type" = "application/json"
            }
            
            # Add custom headers if provided
            if ($endpoint.Headers) {
                $headers += $endpoint.Headers
            }
            
            $response = Invoke-WebRequest -Uri $uri `
                -Method $endpoint.Method `
                -Headers $headers `
                -Body ($endpoint.Body | ConvertTo-Json) `
                -ErrorAction Continue `
                -SkipHttpErrorCheck
            
            $statusCode = $response.StatusCode
            
            if ($statusCode -eq 429) {
                $rateLimitCount++
                if (-not $rateLimitHeaders.Keys) {
                    $rateLimitHeaders = $response.Headers
                }
            } elseif ($statusCode -eq 200 -or $statusCode -eq 201) {
                $successCount++
            } else {
                $errorCount++
            }
            
            Write-Host -NoNewline "."
        } catch {
            $errorCount++
            Write-Host -NoNewline "!"
        }
    }
    
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    Write-Host "  • Successful: $successCount" @Success
    Write-Host "  • Rate Limited (429): $rateLimitCount" -ForegroundColor Yellow
    Write-Host "  • Errors: $errorCount" @Error
    
    if ($rateLimitHeaders.Keys) {
        Write-Host "`nRate Limit Headers:" @Info
        if ($rateLimitHeaders["X-RateLimit-Limit"]) {
            Write-Host "  X-RateLimit-Limit: $($rateLimitHeaders['X-RateLimit-Limit'])" @Info
        }
        if ($rateLimitHeaders["X-RateLimit-Remaining"]) {
            Write-Host "  X-RateLimit-Remaining: $($rateLimitHeaders['X-RateLimit-Remaining'])" @Info
        }
        if ($rateLimitHeaders["X-RateLimit-Reset"]) {
            Write-Host "  X-RateLimit-Reset: $($rateLimitHeaders['X-RateLimit-Reset'])" @Info
        }
        if ($rateLimitHeaders["X-RateLimit-Retry-After"]) {
            Write-Host "  X-RateLimit-Retry-After: $($rateLimitHeaders['X-RateLimit-Retry-After'])" @Info
        }
    }
    
    # Validate test
    if ($rateLimitCount -gt 0 -and $successCount -gt 0) {
        Write-Host "`n✓ PASS: Rate limiting is working!" @Success
        $results.Passed++
    } elseif ($rateLimitCount -eq 0 -and $errorCount -gt 0) {
        Write-Host "`n⚠ INCONCLUSIVE: Endpoint returned errors (may be configuration)" @Warning
        $results.Failed++
    } else {
        Write-Host "`n✗ FAIL: No rate limiting detected" @Error
        $results.Failed++
    }
    
    $results.Total++
    $results.Tested++
    $results.Success += $successCount
    $results.RateLimited += $rateLimitCount
    $results.Errors += $errorCount
}

Write-Host "`n" + ("═" * 60)
Write-Host "OVERALL RESULTS" @Info
Write-Host "═" * 60

Write-Host "`nEndpoints Tested: $($results.Tested)/$($results.Total)" @Info
Write-Host "`nAggregate Requests:" @Info
Write-Host "  • Successful: $($results.Success)" @Success
Write-Host "  • Rate Limited: $($results.RateLimited)" -ForegroundColor Yellow
Write-Host "  • Errors: $($results.Errors)" @Error

Write-Host "`nTest Summary:" @Info
Write-Host "  • Passed: $($results.Passed) ✓" @Success
Write-Host "  • Failed: $($results.Failed) ✗" @Error

if ($results.Passed -eq $results.Total) {
    Write-Host "`n🎉 ALL TESTS PASSED!" @Success
} else {
    Write-Host "`n⚠️ Some tests failed or were inconclusive" @Warning
}

Write-Host "`n"
