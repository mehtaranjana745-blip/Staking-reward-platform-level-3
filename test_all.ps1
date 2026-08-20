Write-Host "Running smart contract tests..." -ForegroundColor Cyan
Push-Location contracts
cargo test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Smart contract tests failed!" -ForegroundColor Red
    Pop-Location
    Exit 1
}
Pop-Location

Write-Host "`nRunning frontend vitest unit tests..." -ForegroundColor Cyan
Push-Location frontend
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend tests failed!" -ForegroundColor Red
    Pop-Location
    Exit 1
}
Pop-Location

Write-Host "`nAll tests passed successfully!" -ForegroundColor Green
