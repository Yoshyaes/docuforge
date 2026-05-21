param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

# Sentinel pre-pass: protect competitor and squatter URLs from the bulk replace
$sentinels = @(
    @{ keep = 'docuforge.app'; sent = "`u{E000}KEEP_DF_APP`u{E000}" },
    @{ keep = 'npmjs.com/package/docuforge'; sent = "`u{E000}KEEP_NPM_SQ`u{E000}" },
    @{ keep = 'pypi.org/project/docuforge'; sent = "`u{E000}KEEP_PYPI_SQ`u{E000}" },
    @{ keep = 'github.com/douglasrubims/docuforge'; sent = "`u{E000}KEEP_NPM_OWN`u{E000}" },
    @{ keep = 'github.com/ishowshao/DocuForge'; sent = "`u{E000}KEEP_PYPI_OWN`u{E000}" }
)

# Substitutions in dependency order (longer/more-qualified patterns first)
$subs = @(
    @{ find = 'getdocuforge.dev'; repl = 'getdeckle.dev' },
    @{ find = '@docuforge/react-pdf'; repl = '@deckle/react-pdf' },
    @{ find = '@docuforge/sdk'; repl = '@deckle/sdk' },
    @{ find = 'github.com/Yoshyaes/docuforge'; repl = 'github.com/Yoshyaes/deckle' },
    @{ find = 'github.com/docuforge/docuforge-go'; repl = 'github.com/Yoshyaes/deckle/packages/sdk-go' },
    @{ find = 'github.com/docuforge'; repl = 'github.com/Yoshyaes/deckle' },
    @{ find = 'twitter.com/docuforge'; repl = 'twitter.com/getdeckle' },
    @{ find = 'df_live_'; repl = 'dk_live_' },
    @{ find = 'df_test_'; repl = 'dk_test_' },
    @{ find = 'DOCUFORGE_'; repl = 'DECKLE_' },
    @{ find = 'DOCUFORGE'; repl = 'DECKLE' },
    @{ find = 'DocuForge'; repl = 'Deckle' },
    @{ find = 'docuForge'; repl = 'deckle' },
    @{ find = 'docu-forge'; repl = 'deckle' },
    @{ find = 'docu_forge'; repl = 'deckle' },
    @{ find = 'docuforge'; repl = 'deckle' }
)

# Path exclusions: never touch these
$excludePathFragments = @(
    'deckle_rebrand/', 'deckle_rebrand\',
    '.claude/', '.claude\',
    'audits/', 'audits\',
    'scripts/rebrand.ps1'
)

$excludeFileNames = @('pnpm-lock.yaml', 'package-lock.json', 'go.sum')
$excludeExtensions = @('.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz', '.lock')

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$files = git ls-files | Where-Object {
    $path = $_
    foreach ($frag in $excludePathFragments) { if ($path -like "*$frag*") { return $false } }
    $name = Split-Path -Leaf $path
    if ($excludeFileNames -contains $name) { return $false }
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    if ($excludeExtensions -contains $ext) { return $false }
    return $true
}

Write-Host "Scanning $($files.Count) candidate files..." -ForegroundColor Cyan

$report = New-Object System.Collections.Generic.List[object]
$totalSubs = 0

foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }

    $content = [System.IO.File]::ReadAllText($file)
    $original = $content

    # Quick exit: no docuforge-shaped string, no df_/DOCUFORGE_ env var/prefix, skip
    if ($content -notmatch '[Dd][Oo][Cc][Uu][Ff][Oo][Rr][Gg][Ee]|df_(live|test)_|DOCUFORGE_') { continue }

    foreach ($pair in $sentinels) { $content = $content.Replace($pair.keep, $pair.sent) }
    $perFile = 0
    foreach ($sub in $subs) {
        $before = $content
        $content = $content.Replace($sub.find, $sub.repl)
        if ($content -ne $before) {
            $matches = ([regex]::Matches($before, [regex]::Escape($sub.find))).Count
            $perFile += $matches
        }
    }
    foreach ($pair in $sentinels) { $content = $content.Replace($pair.sent, $pair.keep) }

    if ($content -ne $original) {
        $report.Add([PSCustomObject]@{ File = $file; Subs = $perFile })
        $totalSubs += $perFile
        if ($Apply) {
            [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
        }
    }
}

Write-Host ""
$report | Sort-Object Subs -Descending | Format-Table -AutoSize
Write-Host "Files affected: $($report.Count)" -ForegroundColor Yellow
Write-Host "Total substitutions: $totalSubs" -ForegroundColor Yellow

if (-not $Apply) {
    Write-Host ""
    Write-Host "[DRY RUN] No files written. Re-run with -Apply to commit changes." -ForegroundColor Magenta
}
