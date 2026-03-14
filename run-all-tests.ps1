# Script para ejecutar todos los tests del Security Sprint
# Autor: Security Sprint Team
# Fecha: March 6, 2026

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  Security Sprint - Automated Test Suite" -ForegroundColor Cyan
Write-Host "  Testing Tasks 1, 4, 5, 7, 9 (73 total test cases)" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# Cambiar al directorio del proyecto
$projectRoot = "c:\Users\juanm\OneDrive\Desktop\Trabajo\App Finanzas\Main\dsfp_space"
Set-Location $projectRoot

# Definir tests a ejecutar
$tests = @(
    @{ 
        Name = "Task 1: XSS Prevention"; 
        Path = "supabase/functions/send-crm-message/sanitization.test.ts";
        Count = 10;
        Description = "HTML sanitization and XSS attack prevention"
    },
    @{ 
        Name = "Task 4: Input Validation"; 
        Path = "supabase/functions/send-crm-message/input-validation.test.ts";
        Count = 14;
        Description = "Zod schema validation for all request fields"
    },
    @{ 
        Name = "Task 5: Rate Limiting"; 
        Path = "supabase/functions/send-crm-message/rate-limiting.test.ts";
        Count = 12;
        Description = "Upstash Redis rate limiting per user"
    },
    @{ 
        Name = "Task 7: Email Validation"; 
        Path = "supabase/functions/send-crm-message/email-validation.test.ts";
        Count = 15;
        Description = "Email format validation and authorization checks"
    },
    @{ 
        Name = "Task 9: CORS Restrictive Policy"; 
        Path = "supabase/functions/send-crm-message/cors-policy.test.ts";
        Count = 14;
        Description = "CORS origin allowlist with exact matching"
    }
)

$passed = 0
$failed = 0
$testResults = @()

$totalTests = ($tests | Measure-Object -Property Count -Sum).Sum

Write-Host "Starting test execution...`n" -ForegroundColor Yellow
Write-Host "Total test files: $($tests.Count)" -ForegroundColor White
Write-Host "Total test cases: $totalTests`n" -ForegroundColor White

# Ejecutar cada suite de tests
foreach ($test in $tests) {
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "  $($test.Name) - $($test.Count) tests" -ForegroundColor Cyan
    Write-Host "  $($test.Description)" -ForegroundColor Gray
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $startTime = Get-Date
    
    # Ejecutar test con Deno
    deno test --allow-net --allow-env $test.Path 2>&1 | Tee-Object -Variable output
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    $testResult = @{
        Name = $test.Name
        Path = $test.Path
        Count = $test.Count
        Duration = [math]::Round($duration, 2)
        Status = if ($LASTEXITCODE -eq 0) { "PASSED" } else { "FAILED" }
        ExitCode = $LASTEXITCODE
    }
    
    $testResults += $testResult
    
    if ($LASTEXITCODE -eq 0) {
        $passed++
        Write-Host "`n[PASSED] in $($testResult.Duration)s`n" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "`n[FAILED] in $($testResult.Duration)s`n" -ForegroundColor Red
    }
}

# Resumen final
Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "                      TEST SUMMARY" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""

$totalDuration = ($testResults | Measure-Object -Property Duration -Sum).Sum

Write-Host "Test Files Executed: $($tests.Count)" -ForegroundColor White
Write-Host "Total Test Cases: $totalTests" -ForegroundColor White
Write-Host "Total Duration: $([math]::Round($totalDuration, 2))s`n" -ForegroundColor White

Write-Host "Results:" -ForegroundColor White
Write-Host "  [PASS] Passed: $passed / $($tests.Count)" -ForegroundColor Green
Write-Host "  [FAIL] Failed: $failed / $($tests.Count)" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host ""

# Mostrar detalle de cada test
Write-Host "Detailed Results:" -ForegroundColor White
Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
foreach ($result in $testResults) {
    $statusColor = if ($result.Status -eq "PASSED") { "Green" } else { "Red" }
    $statusIcon = if ($result.Status -eq "PASSED") { "[PASS]" } else { "[FAIL]" }
    
    Write-Host "  $statusIcon " -NoNewline -ForegroundColor $statusColor
    Write-Host "$($result.Name) " -NoNewline -ForegroundColor White
    Write-Host "- $($result.Count) tests, $($result.Duration)s" -ForegroundColor Gray
}
Write-Host ""

# Verificar si todos pasaron
if ($failed -eq 0) {
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  ALL TESTS PASSED! Security Sprint is ready for production!" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Review manual tests in TESTING_GUIDE.md" -ForegroundColor White
    Write-Host "  2. Verify RLS policies (Task 2)" -ForegroundColor White
    Write-Host "  3. Test credentials encryption (Task 3)" -ForegroundColor White
    Write-Host "  4. Validate audit logs (Task 8)" -ForegroundColor White
    Write-Host "  5. Proceed with Task 10 (Error Handling Improvements)" -ForegroundColor White
    exit 0
} else {
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "  [!] SOME TESTS FAILED! Review output above." -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check TESTING_GUIDE.md for common issues" -ForegroundColor White
    Write-Host "  2. Verify environment variables are set (UPSTASH_*, ALLOWED_ORIGINS)" -ForegroundColor White
    Write-Host "  3. Ensure Deno is installed and up to date" -ForegroundColor White
    Write-Host "  4. Review individual test output above for specific errors" -ForegroundColor White
    exit 1
}
