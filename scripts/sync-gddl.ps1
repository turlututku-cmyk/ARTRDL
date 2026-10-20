# Syncs each level's tier and AREDL position from GD Demon Ladder (gdladder.com)
# into data/_gddl.json. The site reads that file, so run this again whenever
# GDDL's ratings change, then redeploy.
# Run:  powershell -ExecutionPolicy Bypass -File scripts/sync-gddl.ps1

$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root 'data'
$headers = @{
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    'Accept' = 'application/json'
}

$list = Get-Content -Raw (Join-Path $dataDir '_list.json') | ConvertFrom-Json
$result = [ordered]@{}

foreach ($path in $list) {
    try {
        $levelId = (Get-Content -Raw (Join-Path $dataDir "$path.json") | ConvertFrom-Json).id
        $gddl = Invoke-RestMethod -Uri "https://gdladder.com/api/levels/$levelId" -Headers $headers -TimeoutSec 60
        $tier = if ($null -ne $gddl.Rating) { [int][math]::Round($gddl.Rating) } else { $null }
        $aredl = if ($null -ne $gddl.AREDLPosition) { [int]$gddl.AREDLPosition } else { $null }
        # Exact rating, so levels that round to the same tier can still be ordered
        $rating = if ($null -ne $gddl.Rating) { [math]::Round([double]$gddl.Rating, 4) } else { $null }
        $result[$path] = [ordered]@{ tier = $tier; aredl = $aredl; rating = $rating }
        Write-Output "OK    $path (ID $levelId): tier $tier, AREDL $aredl"
    } catch {
        Write-Output "SKIP  $path : $($_.Exception.Message)"
    }
}

# Write UTF-8 without a BOM, so the browser's JSON parser accepts the file.
$json = $result | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText((Join-Path $dataDir '_gddl.json'), $json, (New-Object System.Text.UTF8Encoding $false))
Write-Output 'Wrote data/_gddl.json'
