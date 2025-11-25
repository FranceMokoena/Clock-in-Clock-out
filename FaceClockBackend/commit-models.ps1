# PowerShell script to commit ONNX models to git for Render deployment

Write-Host "🔍 Checking for ONNX model files..." -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if models directory exists
if (-not (Test-Path "models\onnx")) {
    Write-Host "❌ Error: models\onnx directory not found" -ForegroundColor Red
    exit 1
}

# Check for required models
$requiredModels = @("scrfd_10g_gnkps_fp32.onnx", "scrfd_500m_bnkps.onnx", "w600k_r50.onnx")
$foundModels = @()

foreach ($model in $requiredModels) {
    $modelPath = "models\onnx\$model"
    if (Test-Path $modelPath) {
        $sizeMB = [math]::Round((Get-Item $modelPath).Length / 1MB, 2)
        Write-Host "✅ Found: $model ($sizeMB MB)" -ForegroundColor Green
        $foundModels += $modelPath
    } else {
        Write-Host "⚠️  Missing: $model" -ForegroundColor Yellow
    }
}

if ($foundModels.Count -eq 0) {
    Write-Host "❌ No required models found!" -ForegroundColor Red
    Write-Host "💡 Run: npm run download-models" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📦 Adding models to git..." -ForegroundColor Cyan

# Force add models (gitignore will be overridden)
foreach ($model in $foundModels) {
    git add -f $model
    Write-Host "   ✅ Added: $model" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Committing..." -ForegroundColor Cyan
git commit -m "Add ONNX models for Render deployment"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Nothing to commit (models may already be committed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Done! Now push to GitHub:" -ForegroundColor Green
Write-Host "   git push" -ForegroundColor White
Write-Host ""
Write-Host "🌐 After pushing, Render will automatically redeploy with models included." -ForegroundColor Cyan

