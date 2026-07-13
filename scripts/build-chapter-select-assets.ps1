[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $repoRoot "assets/runtime/ui/chapter-select-v2"
$masterRoot = Join-Path $assetRoot "masters"
$specPath = Join-Path $assetRoot "layout-spec.json"
$cssPath = Join-Path $repoRoot "src/h5/ui/chapterSelectLayout.generated.css"
$layout = Get-Content -LiteralPath $specPath -Raw -Encoding UTF8 | ConvertFrom-Json
$magick = (Get-Command magick -ErrorAction Stop).Source

New-Item -ItemType Directory -Force -Path $masterRoot | Out-Null

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Export-Asset {
  param(
    [string]$Name,
    [int]$Width,
    [int]$Height,
    [string]$Svg
  )

  $svgPath = Join-Path $masterRoot ($Name + ".svg")
  $pngPath = Join-Path $assetRoot ($Name + ".png")
  Write-Utf8NoBom -Path $svgPath -Content $Svg
  & $magick -background none $svgPath -alpha on -strip -define png:color-type=6 $pngPath
  if ($LASTEXITCODE -ne 0) { throw "Failed to export $Name" }

  $info = (& $magick identify -format "%w %h %[channels]" $pngPath).Trim()
  $parts = $info -split "\s+"
  if ($parts.Count -lt 3 -or [int]$parts[0] -ne $Width -or [int]$parts[1] -ne $Height) {
    throw "Invalid dimensions for ${Name}: $info"
  }
  if ($parts[2] -notmatch "a") { throw "Missing alpha channel for ${Name}: $info" }

  $edgeSamples = @(
    (& $magick $pngPath -alpha extract -crop "${Width}x1+0+0" -format "%[fx:maxima]" info:),
    (& $magick $pngPath -alpha extract -crop "${Width}x1+0+$($Height - 1)" -format "%[fx:maxima]" info:),
    (& $magick $pngPath -alpha extract -crop "1x${Height}+0+0" -format "%[fx:maxima]" info:),
    (& $magick $pngPath -alpha extract -crop "1x${Height}+$($Width - 1)+0" -format "%[fx:maxima]" info:)
  )
  foreach ($sample in $edgeSamples) {
    $edgeAlpha = [double]::Parse($sample.Trim(), [System.Globalization.CultureInfo]::InvariantCulture)
    if ($edgeAlpha -gt 0.001) { throw "Asset ${Name} touches its outer canvas edge" }
  }
}

function New-PanelSvg {
  param([int]$Width, [int]$Height, [string]$DividerMarkup = "")
  $right = $Width - 2
  $bottom = $Height - 2
  $innerRight = $Width - 12
  $innerBottom = $Height - 12
  return @"
<svg xmlns="http://www.w3.org/2000/svg" width="$Width" height="$Height" viewBox="0 0 $Width $Height">
  <defs>
    <linearGradient id="panel-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#071827" stop-opacity="0.98"/>
      <stop offset="1" stop-color="#020b14" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="panel-stroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4d9bc2"/>
      <stop offset="0.5" stop-color="#294e69"/>
      <stop offset="1" stop-color="#4d9bc2"/>
    </linearGradient>
  </defs>
  <path d="M10 2 H$right L$($Width - 2) 10 V$($Height - 10) L$right $bottom H10 L2 $($Height - 10) V10 Z" fill="url(#panel-fill)" stroke="url(#panel-stroke)" stroke-width="2"/>
  <path d="M12 8 H$innerRight M12 $innerBottom H$innerRight" fill="none" stroke="#15344a" stroke-width="1" opacity="0.8"/>
  <path d="M2 34 V10 L10 2 H42 M$($Width - 42) 2 H$right L$($Width - 2) 10 V34" fill="none" stroke="#65d9f0" stroke-width="2" opacity="0.55"/>
  <path d="M15 3 H61 M3 15 V54 M$($Width - 61) 3 H$($Width - 15) M$($Width - 3) 15 V54" fill="none" stroke="#d6a94d" stroke-width="2" opacity="0.88"/>
  $DividerMarkup
</svg>
"@
}

function New-TabSvg {
  param([string]$State)
  $fillTop = "#0a1d2b"
  $fillBottom = "#04101b"
  $stroke = "#355b73"
  $accent = "#5d9bb9"
  if ($State -eq "active") {
    $fillTop = "#0a4b4a"
    $fillBottom = "#073235"
    $stroke = "#54f0dc"
    $accent = "#73fff0"
  } elseif ($State -eq "locked") {
    $fillTop = "#07121c"
    $fillBottom = "#030a11"
    $stroke = "#263b4b"
    $accent = "#405a6b"
  }
  return @"
<svg xmlns="http://www.w3.org/2000/svg" width="145" height="84" viewBox="0 0 145 84">
  <defs>
    <linearGradient id="tab-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="$fillTop"/>
      <stop offset="1" stop-color="$fillBottom"/>
    </linearGradient>
  </defs>
  <path d="M8 2 H137 L143 8 V68 L129 82 H8 L2 76 V8 Z" fill="url(#tab-fill)" stroke="$stroke" stroke-width="2"/>
  <path d="M10 7 H133 L138 12 V65" fill="none" stroke="#8db6cd" stroke-width="1" opacity="0.2"/>
  <path d="M3 65 V76 L8 81 H119" fill="none" stroke="$accent" stroke-width="2" opacity="0.85"/>
  <path d="M132 4 H138 L141 7 V15" fill="none" stroke="$accent" stroke-width="2"/>
  <path d="M128 81 L141 68 V77 L137 81 Z" fill="$accent" opacity="0.9"/>
</svg>
"@
}

function New-ButtonSvg {
  param([int]$Width, [string]$State)
  $right = $Width - 2
  $topRight = $Width - 10
  $bottom = 76
  $fillTop = "#071827"
  $fillBottom = "#030d17"
  $stroke = "#4c87aa"
  $accent = "#69c7dc"
  if ($State -eq "primary") {
    $fillTop = "#42d8c3"
    $fillBottom = "#18aa9f"
    $stroke = "#9afff1"
    $accent = "#d4fff8"
  } elseif ($State -eq "disabled") {
    $fillTop = "#07111a"
    $fillBottom = "#03090f"
    $stroke = "#294052"
    $accent = "#385568"
  }
  return @"
<svg xmlns="http://www.w3.org/2000/svg" width="$Width" height="78" viewBox="0 0 $Width 78">
  <defs>
    <linearGradient id="button-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="$fillTop"/>
      <stop offset="1" stop-color="$fillBottom"/>
    </linearGradient>
  </defs>
  <path d="M10 2 H$topRight L$right 10 V68 L$topRight $bottom H10 L2 68 V10 Z" fill="url(#button-fill)" stroke="$stroke" stroke-width="2"/>
  <path d="M12 7 H$($Width - 12) M12 71 H$($Width - 12)" fill="none" stroke="$accent" stroke-width="1" opacity="0.38"/>
  <path d="M3 24 V10 L10 3 H35 M$($Width - 35) 3 H$topRight L$right 10 V24" fill="none" stroke="$accent" stroke-width="2" opacity="0.78"/>
</svg>
"@
}

$rowsCss = (($layout.rows | ForEach-Object { "${_}px" }) -join " ")
$detailColumnsCss = (($layout.detail.columns | ForEach-Object { "${_}px" }) -join " ")
$actionColumnsCss = (($layout.actions.columns | ForEach-Object { "${_}px" }) -join " ")
$generatedCss = @"
/* Generated by scripts/build-chapter-select-assets.ps1 from layout-spec.json. */
.campaign-map-canvas {
  --campaign-design-width: $($layout.canvas.width)px;
  --campaign-design-height: $($layout.canvas.height)px;
  --campaign-content-x: $($layout.content.x)px;
  --campaign-content-y: $($layout.content.y)px;
  --campaign-content-width: $($layout.content.width)px;
  --campaign-content-height: $($layout.content.height)px;
  --campaign-layout-gap: $($layout.content.gap)px;
  --campaign-layout-rows: $rowsCss;
  --campaign-tab-count: $($layout.tabs.count);
  --campaign-tab-width: $($layout.tabs.width)px;
  --campaign-tab-height: $($layout.tabs.height)px;
  --campaign-tab-gap: $($layout.tabs.gap)px;
  --campaign-tab-padding-x: $($layout.tabs.paddingX)px;
  --campaign-header-height: $($layout.header.height)px;
  --campaign-route-height: $($layout.rows[2])px;
  --campaign-detail-height: $($layout.detail.height)px;
  --campaign-detail-columns: $detailColumnsCss;
  --campaign-action-height: $($layout.actions.height)px;
  --campaign-action-columns: $actionColumnsCss;
  --campaign-action-gap: $($layout.actions.gap)px;
  --campaign-crest-size: $($layout.crest.width)px;
}
"@
Write-Utf8NoBom -Path $cssPath -Content $generatedCss

$dividerPositions = New-Object System.Collections.Generic.List[int]
$cursor = 0
for ($index = 0; $index -lt $layout.detail.columns.Count - 1; $index += 1) {
  $cursor += [int]$layout.detail.columns[$index]
  $dividerPositions.Add($cursor)
}
$dividerMarkup = ($dividerPositions | ForEach-Object {
  '<rect x="' + $_ + '" y="16" width="1" height="126" fill="#4d8caf" opacity="0.72"/>'
}) -join "`n  "

$screenWidth = [int]$layout.canvas.width
$screenHeight = [int]$layout.canvas.height
$screenSvg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="$screenWidth" height="$screenHeight" viewBox="0 0 $screenWidth $screenHeight">
  <defs>
    <linearGradient id="shell-stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5ac7e8"/>
      <stop offset="0.5" stop-color="#244760"/>
      <stop offset="1" stop-color="#5ac7e8"/>
    </linearGradient>
  </defs>
  <path d="M36 8 H1564 L1592 36 V864 L1564 892 H36 L8 864 V36 Z" fill="none" stroke="url(#shell-stroke)" stroke-width="2" opacity="0.82"/>
  <path d="M48 20 H1552 M20 48 V852 M1580 48 V852 M48 880 H1552" fill="none" stroke="#14344a" stroke-width="1"/>
  <path d="M8 96 V36 L36 8 H96 M1504 8 H1564 L1592 36 V96 M8 804 V864 L36 892 H96 M1504 892 H1564 L1592 864 V804" fill="none" stroke="#62d9ef" stroke-width="2" opacity="0.5"/>
</svg>
"@
Export-Asset -Name "screen-shell" -Width $screenWidth -Height $screenHeight -Svg $screenSvg

$headerSvg = New-PanelSvg -Width ([int]$layout.header.width) -Height ([int]$layout.header.height)
Export-Asset -Name "chapter-header-frame" -Width ([int]$layout.header.width) -Height ([int]$layout.header.height) -Svg $headerSvg

$detailSvg = New-PanelSvg -Width ([int]$layout.detail.width) -Height ([int]$layout.detail.height) -DividerMarkup $dividerMarkup
Export-Asset -Name "chapter-detail-frame" -Width ([int]$layout.detail.width) -Height ([int]$layout.detail.height) -Svg $detailSvg

Export-Asset -Name "tab-normal" -Width 145 -Height 84 -Svg (New-TabSvg -State "normal")
Export-Asset -Name "tab-active" -Width 145 -Height 84 -Svg (New-TabSvg -State "active")
Export-Asset -Name "tab-locked" -Width 145 -Height 84 -Svg (New-TabSvg -State "locked")

$crestSvg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="crest-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#17334a"/>
      <stop offset="1" stop-color="#06111e"/>
    </linearGradient>
    <linearGradient id="crest-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff2a8"/>
      <stop offset="0.48" stop-color="#e7b94e"/>
      <stop offset="1" stop-color="#8e5e18"/>
    </linearGradient>
  </defs>
  <path d="M48 8 L88 42 L82 72 L48 88 L14 72 L8 42 Z" fill="url(#crest-fill)" stroke="#315e7b" stroke-width="2"/>
  <path d="M48 12 L84 43 L76 66 L48 82 L20 66 L12 43 Z" fill="none" stroke="url(#crest-gold)" stroke-width="4"/>
  <path d="M48 23 L72 45 L48 69 L24 45 Z" fill="#071522" stroke="url(#crest-gold)" stroke-width="4"/>
  <path d="M48 32 L53 41 L64 45 L53 50 L48 60 L43 50 L32 45 L43 41 Z" fill="#fff4b5" stroke="#d7a43b" stroke-width="2"/>
  <path d="M22 73 L37 82 M74 73 L59 82" fill="none" stroke="#42cbe0" stroke-width="3" opacity="0.8"/>
</svg>
"@
Export-Asset -Name "chapter-crest-gold" -Width 96 -Height 96 -Svg $crestSvg

Export-Asset -Name "button-secondary" -Width 450 -Height 78 -Svg (New-ButtonSvg -Width 450 -State "secondary")
Export-Asset -Name "button-primary" -Width 604 -Height 78 -Svg (New-ButtonSvg -Width 604 -State "primary")
Export-Asset -Name "button-disabled" -Width 450 -Height 78 -Svg (New-ButtonSvg -Width 450 -State "disabled")

Write-Host "Chapter-select assets rebuilt from $specPath"
Write-Host "Detail dividers: $($dividerPositions -join ', ')"
