# WP-CLI for the local stack:  .\wp.ps1 plugin list
Push-Location $PSScriptRoot
$lines = & docker compose run --rm -T wpcli @args 2>&1 | ForEach-Object { $_.ToString() }
$code = $LASTEXITCODE
Pop-Location
$skip = $false
foreach ($line in $lines) {
  if ($line -match '^PHP: ') { $skip = $true; continue }
  if ($skip) { if ($line -match '^\)\]$') { $skip = $false }; continue }
  if ($line -match '^\s*Container tkadlcik') { continue }
  $line
}
exit $code
