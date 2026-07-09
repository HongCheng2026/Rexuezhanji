$ErrorActionPreference = "Stop"

function Assert-InWorkspace([string]$Root, [string]$Path) {
  $resolvedRoot = [System.IO.Path]::GetFullPath($Root)
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to write outside workspace: $resolvedPath"
  }
}

function Reset-Directory([string]$Root, [string]$Path) {
  Assert-InWorkspace $Root $Path
  if (Test-Path -LiteralPath $Path) {
    Get-ChildItem -LiteralPath $Path -Recurse -Force | ForEach-Object {
      $_.Attributes = [System.IO.FileAttributes]::Normal
    }
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Copy-DirectoryContents([string]$Source, [string]$Destination) {
  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Missing source directory: $Source"
  }
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
}

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SourceH5 = Join-Path $Root "src\h5"
$SourceShared = Join-Path $Root "src\shared"
$SourceMiniCommon = Join-Path $Root "src\miniprogram-common"
$RuntimeAssets = Join-Path $Root "assets\runtime"
$Release = Join-Path $Root "release\netlify-h5"
$PackageDir = Join-Path $Root "release\packages"
$Wechat = Join-Path $Root "platforms\wechat-miniprogram"
$Douyin = Join-Path $Root "platforms\douyin-miniprogram"

Reset-Directory $Root $Release
Copy-DirectoryContents $SourceH5 $Release
Copy-DirectoryContents $SourceShared (Join-Path $Release "shared")
Copy-DirectoryContents $SourceShared $Release
Copy-DirectoryContents $RuntimeAssets (Join-Path $Release "assets\runtime")

foreach ($platform in @($Wechat, $Douyin)) {
  if (Test-Path -LiteralPath $platform) {
    Reset-Directory $Root (Join-Path $platform "shared")
    Copy-DirectoryContents $SourceShared (Join-Path $platform "shared")

    if (Test-Path -LiteralPath (Join-Path $SourceMiniCommon "profile.js")) {
      New-Item -ItemType Directory -Path (Join-Path $platform "utils") -Force | Out-Null
      Copy-Item -LiteralPath (Join-Path $SourceMiniCommon "profile.js") -Destination (Join-Path $platform "utils\profile.js") -Force
    }

    if (Test-Path -LiteralPath (Join-Path $SourceMiniCommon "assets\images")) {
      Reset-Directory $Root (Join-Path $platform "assets\images")
      Copy-DirectoryContents (Join-Path $SourceMiniCommon "assets\images") (Join-Path $platform "assets\images")
    }
  }
}

New-Item -ItemType Directory -Path $PackageDir -Force | Out-Null
$ZipPath = Join-Path $PackageDir "netlify-h5.zip"
if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $Release "*") -DestinationPath $ZipPath -Force

Write-Host "Sync complete: src/h5, src/shared, and assets/runtime copied to release/netlify-h5."
