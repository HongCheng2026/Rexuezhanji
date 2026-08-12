param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F-]{36}$')]
  [string]$OrderId,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^https://')]
  [string]$Endpoint
)

$ErrorActionPreference = 'Stop'
$refundSecret = [Environment]::GetEnvironmentVariable('PAYMENT_ADMIN_HMAC_SECRET')
if ([string]::IsNullOrWhiteSpace($refundSecret)) {
  throw 'PAYMENT_ADMIN_HMAC_SECRET is not set in this process environment.'
}

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
$nonce = [Guid]::NewGuid().ToString('N')
$canonical = "$timestamp`n$nonce`n$OrderId`n"
$hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($refundSecret))
try {
  $signature = [Convert]::ToHexString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($canonical))).ToLowerInvariant()
} finally {
  $hmac.Dispose()
}

$uri = $Endpoint.TrimEnd('/') + '?action=payment-admin-refund'
$headers = @{
  'x-rx-timestamp' = $timestamp
  'x-rx-nonce' = $nonce
  'x-rx-signature' = $signature
}
$body = @{ orderId = $OrderId } | ConvertTo-Json -Compress
$result = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType 'application/json' -Body $body
$result | ConvertTo-Json -Depth 6
