$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$stageRoot = Join-Path $workspaceRoot '.tmp/xampp-purchase-deploy'
$xamppRoot = 'C:/Users/Justine Karl/OneDrive/Desktop/xamppppp'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $xamppRoot 'htdocs/vetrix'))
$manifest = Get-Content -LiteralPath (Join-Path $stageRoot 'deployment-manifest.json') -Raw | ConvertFrom-Json
if (!(Test-Path -LiteralPath (Join-Path $stageRoot 'database-before.sql'))) { throw 'Database backup is missing.' }
# Refuse stale patches: another editor may have changed the live site during testing.
foreach ($entry in $manifest) {
    $target = [IO.Path]::GetFullPath((Join-Path $siteRoot $entry.path))
    if (!$target.StartsWith($siteRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Deployment path is outside the site.' }
    if ($entry.before) {
        if (!(Test-Path -LiteralPath $target) -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.before) { throw ('Live file changed since backup: ' + $entry.path) }
    } elseif (Test-Path -LiteralPath $target) { throw ('A new deployment file already exists: ' + $entry.path) }
    $source = Join-Path (Join-Path $stageRoot 'payload') $entry.path
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.after) { throw ('Payload changed after review: ' + $entry.path) }
    if ($entry.path.EndsWith('.php')) {
        $check = & (Join-Path $xamppRoot 'php/php.exe') -l $source
        if ($LASTEXITCODE -ne 0) { throw $check }
    }
}
$iniPath = Join-Path $xamppRoot 'mysql/bin/my.ini'
$iniBefore = Join-Path $stageRoot 'mysql-before.ini'
if ((Get-FileHash -LiteralPath $iniPath).Hash -ne (Get-FileHash -LiteralPath $iniBefore).Hash) { throw 'MySQL configuration changed since backup.' }
$ini = [IO.File]::ReadAllText($iniPath)
$iniAfter = [regex]::Replace($ini, '(?m)(\[mysqld\][\s\S]*?^max_allowed_packet\s*=\s*)1M[ \t]*(?=\r?$)', '${1}8M')
if ($iniAfter -eq $ini) { throw 'Expected the inspected 1 MB server packet limit.' }
$env:VETRIX_DEPLOY_SITE = $siteRoot
& (Join-Path $xamppRoot 'php/php.exe') (Join-Path $PSScriptRoot 'migrate-xampp-purchases.php')
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed; live application files were not copied.' }
[IO.File]::WriteAllText($iniPath, $iniAfter, (New-Object Text.UTF8Encoding($false)))
foreach ($entry in $manifest) {
    $target = Join-Path $siteRoot $entry.path
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path (Join-Path $stageRoot 'payload') $entry.path) -Destination $target
}
foreach ($entry in $manifest) {
    if ((Get-FileHash -LiteralPath (Join-Path $siteRoot $entry.path)).Hash.ToLowerInvariant() -ne $entry.after) { throw ('Post-copy verification failed: ' + $entry.path) }
}
[IO.File]::WriteAllText((Join-Path $stageRoot 'applied-at.txt'), (Get-Date -Format o))
Write-Output ('Applied and verified ' + $manifest.Count + ' files at ' + $siteRoot)
