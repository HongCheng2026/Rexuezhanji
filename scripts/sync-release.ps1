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
$SourceShell = Join-Path $SourceH5 "Shell"
$RuntimeAssets = Join-Path $Root "assets\runtime"
$Release = Join-Path $Root "release\netlify-h5"
$PackageDir = Join-Path $Root "release\packages"

Reset-Directory $Root $Release
Copy-DirectoryContents $SourceH5 $Release
Copy-DirectoryContents $RuntimeAssets (Join-Path $Release "assets\runtime")
$releaseTestPage = Join-Path $Release "Shell\test.html"
if (Test-Path -LiteralPath $releaseTestPage) {
  Remove-Item -LiteralPath $releaseTestPage -Force
}
$legacyContactQr = Join-Path $Release "assets\runtime\social\contact\wechat-qr.jpg"
if (Test-Path -LiteralPath $legacyContactQr) {
  Remove-Item -LiteralPath $legacyContactQr -Force
}

# Netlify serves release/index.html. The actual game frame remains in Shell/
# so every source-relative module path stays identical between local and cloud.
$rootIndex = (Get-Content -LiteralPath (Join-Path $SourceShell "index.html") -Raw -Encoding UTF8)
$rootIndex = $rootIndex.Replace('data-src="game-frame.html"', 'data-src="Shell/game-frame.html"')
$rootIndex = $rootIndex.Replace('src="../Game/', 'src="Game/')
Set-Content -LiteralPath (Join-Path $Release "index.html") -Value $rootIndex -Encoding UTF8
Copy-Item -LiteralPath (Join-Path $SourceShell "viewport.css") -Destination (Join-Path $Release "viewport.css") -Force

New-Item -ItemType Directory -Path $PackageDir -Force | Out-Null
$ZipPath = Join-Path $PackageDir "netlify-h5.zip"
if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $Release "*") -DestinationPath $ZipPath -Force

Write-Host "Sync complete: layered H5 source and runtime assets copied to release/netlify-h5."
