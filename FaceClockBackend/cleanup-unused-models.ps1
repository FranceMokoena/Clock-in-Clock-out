# Model Cleanup Script
# This script removes unused model files from the models/onnx directory
# 
# REQUIRED FILES (will NOT be deleted):
# - scrfd_500m_bnkps.onnx (face detection)
# - w600k_r50.onnx (face recognition)
# - glint360k_r50.onnx (optional fallback)

Write-Host "🧹 Model Cleanup Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelsDir = Join-Path $scriptDir "models\onnx"

if (-not (Test-Path $modelsDir)) {
    Write-Host "❌ Models directory not found: $modelsDir" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Models directory: $modelsDir" -ForegroundColor Yellow
Write-Host ""

# Check for required files before cleanup
$requiredFiles = @(
    "scrfd_500m_bnkps.onnx",
    "w600k_r50.onnx"
)

Write-Host "🔍 Checking for required files..." -ForegroundColor Yellow
$missingFiles = @()
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $modelsDir $file
    if (Test-Path $filePath) {
        Write-Host "   ✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Missing: $file" -ForegroundColor Yellow
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  WARNING: Some required files are missing!" -ForegroundColor Yellow
    Write-Host "   Missing: $($missingFiles -join ', ')" -ForegroundColor Yellow
    Write-Host "   The app may not work without these files." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue with cleanup anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "❌ Cleanup cancelled." -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "🗑️  Starting cleanup..." -ForegroundColor Yellow
Write-Host ""

$totalSize = 0
$deletedCount = 0

# Function to calculate directory size
function Get-DirectorySize {
    param([string]$Path)
    $size = 0
    if (Test-Path $Path) {
        Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            $size += $_.Length
        }
    }
    return $size
}

# Function to format bytes
function Format-Bytes {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) {
        return "{0:N2} GB" -f ($Bytes / 1GB)
    } elseif ($Bytes -ge 1MB) {
        return "{0:N2} MB" -f ($Bytes / 1MB)
    } elseif ($Bytes -ge 1KB) {
        return "{0:N2} KB" -f ($Bytes / 1KB)
    } else {
        return "$Bytes bytes"
    }
}

# Remove Python training/evaluation code
$dirsToRemove = @(
    "detection",
    "recognition"
)

foreach ($dir in $dirsToRemove) {
    $dirPath = Join-Path $modelsDir $dir
    if (Test-Path $dirPath) {
        $size = Get-DirectorySize -Path $dirPath
        Write-Host "   🗑️  Removing: $dir ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
        Remove-Item -Path $dirPath -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $dirPath)) {
            Write-Host "      ✅ Removed: $dir" -ForegroundColor Green
            $totalSize += $size
            $deletedCount++
        } else {
            Write-Host "      ⚠️  Failed to remove: $dir" -ForegroundColor Red
        }
    }
}

# Remove unused ONNX files
$filesToRemove = @(
    "1k3d68.onnx",
    "2d106det.onnx",
    "det_10g.onnx",
    "genderage.onnx"
)

foreach ($file in $filesToRemove) {
    $filePath = Join-Path $modelsDir $file
    if (Test-Path $filePath) {
        $size = (Get-Item $filePath).Length
        Write-Host "   🗑️  Removing: $file ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
        Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $filePath)) {
            Write-Host "      ✅ Removed: $file" -ForegroundColor Green
            $totalSize += $size
            $deletedCount++
        } else {
            Write-Host "      ⚠️  Failed to remove: $file" -ForegroundColor Red
        }
    }
}

# Remove PaddlePaddle model directories
$paddleDirs = @(
    "mobileface_v1.0_infer",
    "MobileFaceNet_128_v1.0_pretrained"
)

foreach ($dir in $paddleDirs) {
    $dirPath = Join-Path $modelsDir $dir
    if (Test-Path $dirPath) {
        $size = Get-DirectorySize -Path $dirPath
        Write-Host "   🗑️  Removing: $dir ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
        Remove-Item -Path $dirPath -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $dirPath)) {
            Write-Host "      ✅ Removed: $dir" -ForegroundColor Green
            $totalSize += $size
            $deletedCount++
        } else {
            Write-Host "      ⚠️  Failed to remove: $dir" -ForegroundColor Red
        }
    }
}

# Remove PaddlePaddle root file
$paddleFile = "MobileFaceNet_128_v1.0_pretrained.pdparams"
$paddleFilePath = Join-Path $modelsDir $paddleFile
if (Test-Path $paddleFilePath) {
    $size = (Get-Item $paddleFilePath).Length
    Write-Host "   🗑️  Removing: $paddleFile ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
    Remove-Item -Path $paddleFilePath -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $paddleFilePath)) {
        Write-Host "      ✅ Removed: $paddleFile" -ForegroundColor Green
        $totalSize += $size
        $deletedCount++
    }
}

# Remove MXNet model directory
$mxnetDir = "model-y1-test2"
$mxnetDirPath = Join-Path $modelsDir $mxnetDir
if (Test-Path $mxnetDirPath) {
    $size = Get-DirectorySize -Path $mxnetDirPath
    Write-Host "   🗑️  Removing: $mxnetDir ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
    Remove-Item -Path $mxnetDirPath -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $mxnetDirPath)) {
        Write-Host "      ✅ Removed: $mxnetDir" -ForegroundColor Green
        $totalSize += $size
        $deletedCount++
    }
}

# Remove MXNet pickle files
$pklFiles = @(
    "rank_0_softmax_weight_mom.pkl",
    "rank_0_softmax_weight.pkl"
)

foreach ($file in $pklFiles) {
    $filePath = Join-Path $modelsDir $file
    if (Test-Path $filePath) {
        $size = (Get-Item $filePath).Length
        Write-Host "   🗑️  Removing: $file ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
        Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $filePath)) {
            Write-Host "      ✅ Removed: $file" -ForegroundColor Green
            $totalSize += $size
            $deletedCount++
        }
    }
}

# Remove Python utility scripts
$pythonScripts = @(
    "fdensenet.py",
    "fmnasnet.py",
    "fmobilefacenet.py",
    "fmobilenet.py",
    "fresnet.py",
    "gen_megaface.py",
    "mask_renderer.py",
    "memonger.py",
    "memonger_v2.py",
    "remove_noises.py",
    "run.sh",
    "symbol_utils.py",
    "vargfacenet.py",
    "face_align.h"
)

foreach ($file in $pythonScripts) {
    $filePath = Join-Path $modelsDir $file
    if (Test-Path $filePath) {
        $size = (Get-Item $filePath).Length
        Write-Host "   🗑️  Removing: $file ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
        Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $filePath)) {
            Write-Host "      ✅ Removed: $file" -ForegroundColor Green
            $totalSize += $size
            $deletedCount++
        }
    }
}

# Remove empty directories
$emptyDirs = @(
    "buffalo_l"
)

foreach ($dir in $emptyDirs) {
    $dirPath = Join-Path $modelsDir $dir
    if (Test-Path $dirPath) {
        $size = Get-DirectorySize -Path $dirPath
        Write-Host "   🗑️  Removing: $dir ($(Format-Bytes -Bytes $size))" -ForegroundColor Yellow
        Remove-Item -Path $dirPath -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $dirPath)) {
            Write-Host "      ✅ Removed: $dir" -ForegroundColor Green
            $totalSize += $size
            $deletedCount++
        }
    }
}

Write-Host ""
Write-Host "✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "   Files/Directories removed: $deletedCount" -ForegroundColor Green
Write-Host "   Space freed: $(Format-Bytes -Bytes $totalSize)" -ForegroundColor Green
Write-Host ""

# Verify required files still exist
Write-Host "🔍 Verifying required files..." -ForegroundColor Yellow
$allPresent = $true
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $modelsDir $file
    if (Test-Path $filePath) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (MISSING!)" -ForegroundColor Red
        $allPresent = $false
    }
}

Write-Host ""
if ($allPresent) {
    Write-Host "✅ All required files are present. Your app should work correctly." -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Some required files are missing!" -ForegroundColor Yellow
    Write-Host "   Run: npm run download-models" -ForegroundColor Yellow
    Write-Host "   to re-download missing models." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test your app: npm start" -ForegroundColor White
Write-Host "   2. If models are missing, run: npm run download-models" -ForegroundColor White
Write-Host ""

