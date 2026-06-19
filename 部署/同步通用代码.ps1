function Join-Chars([int[]]$Codes) {
  return -join ($Codes | ForEach-Object { [char]$_ })
}

function Copy-IfChanged([string]$Source, [string]$Destination) {
  if (Test-Path $Destination) {
    $sourceHash = (Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash
    $destinationHash = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash
    if ($sourceHash -eq $destinationHash) {
      return
    }
  }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$CommonName = Join-Chars @(0x901A, 0x7528, 0x4EE3, 0x7801)
$WechatName = Join-Chars @(0x5FAE, 0x4FE1, 0x5C0F, 0x7A0B, 0x5E8F)
$DouyinName = Join-Chars @(0x6296, 0x97F3, 0x5C0F, 0x7A0B, 0x5E8F)
$AssetName = Join-Chars @(0x89D2, 0x8272, 0x8D44, 0x4EA7)
$TransparentName = Join-Chars @(0x900F, 0x660E)
$GuideName = (Join-Chars @(0x5BFC, 0x8D2D)) + ".png"
$OverviewName = "UI" + (Join-Chars @(0x603B, 0x89C8)) + ".png"
$MiniCommonName = Join-Chars @(0x5C0F, 0x7A0B, 0x5E8F, 0x901A, 0x7528)

$Common = Join-Path $Root $CommonName
$Netlify = Join-Path $Root "Netlify-H5"
$Wechat = Join-Path $Root $WechatName
$Douyin = Join-Path $Root $DouyinName
$Shared = Join-Path $Common "shared"
$ProjectRoot = Split-Path -Parent $Root
$RootWechat = Join-Path $ProjectRoot "wechat-miniprogram"

New-Item -ItemType Directory -Path $Netlify -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Netlify "shared") -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $Common "H5\index.html") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\style.css") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\game.js") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\shared-loader.js") -Destination $Netlify -Force
Copy-Item -Path (Join-Path $Shared "*") -Destination (Join-Path $Netlify "shared") -Force
Copy-Item -Path (Join-Path $Common "H5\*.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\guide.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\ui-overview.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\player.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\boss.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\enemy-small-01.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\enemy-small-02.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\enemy-small-03.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\enemy-elite-01.png") -Destination $Netlify -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\enemy-elite-02.png") -Destination $Netlify -Force

New-Item -ItemType Directory -Path (Join-Path $ProjectRoot "shared") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $Common "H5\index.html") -Destination $ProjectRoot -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\style.css") -Destination $ProjectRoot -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\game.js") -Destination $ProjectRoot -Force
Copy-Item -LiteralPath (Join-Path $Common "H5\shared-loader.js") -Destination $ProjectRoot -Force
Get-ChildItem -Path (Join-Path $Common "H5") -Filter "*.png" -File | ForEach-Object {
  Copy-IfChanged $_.FullName (Join-Path $ProjectRoot $_.Name)
}
Copy-Item -Path (Join-Path $Shared "*") -Destination (Join-Path $ProjectRoot "shared") -Force

if (Test-Path $RootWechat) {
  New-Item -ItemType Directory -Path (Join-Path $RootWechat "shared") -Force | Out-Null
  Copy-Item -Path (Join-Path $Shared "*") -Destination (Join-Path $RootWechat "shared") -Force
}

New-Item -ItemType Directory -Path (Join-Path $Wechat "utils") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Wechat "assets\images") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Wechat "shared") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $Common (Join-Path $MiniCommonName "profile.js")) -Destination (Join-Path $Wechat "utils\profile.js") -Force
Copy-Item -Path (Join-Path $Common (Join-Path $MiniCommonName "assets\images\*")) -Destination (Join-Path $Wechat "assets\images") -Force
Copy-Item -Path (Join-Path $Shared "*") -Destination (Join-Path $Wechat "shared") -Force

New-Item -ItemType Directory -Path (Join-Path $Douyin "utils") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Douyin "assets\images") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Douyin "shared") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $Common (Join-Path $MiniCommonName "profile.js")) -Destination (Join-Path $Douyin "utils\profile.js") -Force
Copy-Item -Path (Join-Path $Common (Join-Path $MiniCommonName "assets\images\*")) -Destination (Join-Path $Douyin "assets\images") -Force
Copy-Item -Path (Join-Path $Shared "*") -Destination (Join-Path $Douyin "shared") -Force

Write-Host "Sync complete: common files copied to Netlify, WeChat, and Douyin folders."
