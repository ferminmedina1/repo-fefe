#!/usr/bin/env pwsh
Write-Host "🎯 SPOTLIGHT VALIDATION" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$total = 5

Write-Host "1. Checking CSS Animation..." -ForegroundColor Yellow
if (Test-Path "src\components\learning\TutorialRunner.tsx") {
  $content = Get-Content "src\components\learning\TutorialRunner.tsx" -Raw
  if ($content.Contains("@keyframes spotlight-pulse")) {
    Write-Host "   ✅ Animation found" -ForegroundColor Green
    $passed++
  }
}
$total--

Write-Host "2. Checking DOM Injection..." -ForegroundColor Yellow
if ($content.Contains("spotlight-pulse-animation")) {
  Write-Host "   ✅ DOM injection found" -ForegroundColor Green
  $passed++
}
$total--

Write-Host "3. Checking Joyride Config..." -ForegroundColor Yellow
if ($content.Contains("overlayColor") -and $content.Contains("borderRadius")) {
  Write-Host "   ✅ Joyride config found" -ForegroundColor Green
  $passed++
}
$total--

Write-Host "4. Checking Tutorial Modules..." -ForegroundColor Yellow
if (Test-Path "src\lib\tutorial\config.ts") {
  $configContent = Get-Content "src\lib\tutorial\config.ts" -Raw
  $moduleCount = [regex]::Matches($configContent, "id: '").Count
  Write-Host "   ✅ Found: $moduleCount modules" -ForegroundColor Green
  if ($moduleCount -ge 15) {
    $passed++
  }
}
$total--

Write-Host "5. Production Build..." -ForegroundColor Yellow
Write-Host "   Building..." -ForegroundColor Cyan
$buildSuccess = npm run build 2>&1 | Select-Object -Last 1
if ($LASTEXITCODE -eq 0) {
  Write-Host "   ✅ Build successful" -ForegroundColor Green
  $passed++
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Result: $passed / 5 checks passed" -ForegroundColor Cyan

if ($passed -eq 5) {
  Write-Host "🎉 SPOTLIGHT 100% READY!" -ForegroundColor Green
} else {
  Write-Host "⚠️  Some checks need review" -ForegroundColor Yellow
}
