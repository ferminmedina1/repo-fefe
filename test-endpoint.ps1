#!/usr/bin/env pwsh
# Rate Limiting Test Suite - Simple version

param(
    [string]$BaseUrl = "http://localhost:54321/functions/v1",
    [string]$Endpoint = "finalize-signup",
    [int]$Requests = 10
)

Write-Host "Rate Limiting Test" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Endpoint: $Endpoint"
Write-Host "Requests: $Requests"
Write-Host ""

# Test data
$testBody = @{
    email = "test-$(Get-Random)@example.com"
    password = "Test123!@"
    name = "Test User"
} | ConvertTo-Json

$successCount = 0
$rateLimitCount = 0
$errorCount = 0
$headers = @{}

for ($i = 1; $i -le $Requests; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/$Endpoint" `
            -Method POST `
            -Headers @{ "Content-Type" = "application/json" } `
            -Body $testBody `
            -ErrorAction Continue `
            -SkipHttpErrorCheck
        
        if ($response.StatusCode -eq 429) {
            $rateLimitCount++
            if (-not $headers.ContainsKey("X-RateLimit-Limit")) {
                $headers = $response.Headers
            }
            Write-Host -NoNewline "X" -ForegroundColor Red
        } elseif ($response.StatusCode -in 200..299, 400, 401) {
            $successCount++
            Write-Host -NoNewline "." -ForegroundColor Green
        } else {
            $errorCount++
            Write-Host -NoNewline "!" -ForegroundColor Yellow
        }
    } catch {
        $errorCount++
        Write-Host -NoNewline "E" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host ""
Write-Host "Results:" -ForegroundColor Cyan
Write-Host ("Successful: {0}" -f $successCount) -ForegroundColor Green
Write-Host ("Rate Limited (429): {0}" -f $rateLimitCount) -ForegroundColor Yellow
Write-Host ("Errors: {0}" -f $errorCount) -ForegroundColor Red
Write-Host ""

if ($headers.Count -gt 0) {
    Write-Host "Rate Limit Headers:" -ForegroundColor Cyan
    if ($headers["X-RateLimit-Limit"]) {
        Write-Host ("  X-RateLimit-Limit: {0}" -f $headers["X-RateLimit-Limit"])
    }
    if ($headers["X-RateLimit-Remaining"]) {
        Write-Host ("  X-RateLimit-Remaining: {0}" -f $headers["X-RateLimit-Remaining"])
    }
    if ($headers["X-RateLimit-Reset"]) {
        Write-Host ("  X-RateLimit-Reset: {0}" -f $headers["X-RateLimit-Reset"])
    }
}

Write-Host ""
if ($rateLimitCount -gt 0) {
    Write-Host "PASS - Rate limiting is working!" -ForegroundColor Green
} else {
    Write-Host "FAIL - No rate limiting detected" -ForegroundColor Red
}
