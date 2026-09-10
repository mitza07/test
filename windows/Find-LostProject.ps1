<#
.SYNOPSIS
    Finds a project folder and any old Claude Code session transcripts for it,
    including inside Windows.old after a Windows reinstall.

.DESCRIPTION
    Written for the case where a project lives in exactly one place - a local
    folder, never pushed anywhere - and the machine holding it was rebuilt.

    It looks in three places:

      1. Folders whose name matches your keywords, on the user profile, the
         root of every fixed drive, and every Windows.old profile.
      2. Claude Code's own project list. Claude Code keeps one folder per
         project under .claude\projects, named after the project's full path,
         so this recovers the exact original location even when the files
         themselves are gone.
      3. The session transcripts inside those folders. They are plain JSONL,
         so a dead session's conversation is still readable - which is often
         the part worth recovering.

    Read-only. It copies, moves and deletes nothing.

.PARAMETER Keyword
    Words to match, case insensitive. Default: imobil, agenti.

.PARAMETER Depth
    How deep to recurse under each search root. Default 6.

.PARAMETER AllDrives
    Also sweep every fixed drive from its root. Slower, but finds a project
    parked somewhere like D:\Vechi\2024\.

.EXAMPLE
    .\Find-LostProject.ps1

.EXAMPLE
    .\Find-LostProject.ps1 -Keyword imobil, agentie, design -AllDrives

.NOTES
    Safe to copy onto another machine and run there on its own - it depends on
    nothing else in this repository.
#>
[CmdletBinding()]
param(
    [string[]]$Keyword = @('imobil', 'agenti'),
    [ValidateRange(1, 12)][int]$Depth = 6,
    [switch]$AllDrives
)

$pattern = ($Keyword | ForEach-Object { [regex]::Escape($_) }) -join '|'
# Separator-agnostic so the filter can be exercised off Windows too.
$noise = '(?i)[\\/](Windows|Program Files|Program Files \(x86\)|ProgramData|\$Recycle\.Bin|node_modules|\.git|System Volume Information)([\\/]|$)'

function Write-Section {
    param([string]$Name)
    Write-Host ''
    Write-Host "== $Name " -NoNewline -ForegroundColor Cyan
    Write-Host ('=' * [Math]::Max(0, 58 - $Name.Length)) -ForegroundColor DarkCyan
}

function Format-Size {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) { return '{0:N1} GB' -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return '{0:N1} MB' -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return '{0:N0} KB' -f ($Bytes / 1KB) }
    '{0:N0} B' -f $Bytes
}

function Step-CcPath {
    # Walk one level down the REAL tree, consuming as much of the remaining
    # store name as an existing child accounts for. Longest child first, so
    # 'Design-agentie' is tried before 'Design', with backtracking.
    param([string]$Current, [string]$Rest)

    if ([string]::IsNullOrEmpty($Rest)) { return $Current }
    if (-not (Test-Path -LiteralPath $Current)) { return $null }

    $children = @(Get-ChildItem -LiteralPath $Current -Directory -ErrorAction SilentlyContinue |
        Sort-Object { $_.Name.Length } -Descending)

    foreach ($c in $children) {
        $enc = $c.Name -replace '[:\\/]', '-'
        if ($Rest -ieq $enc) { return $c.FullName }
        if ($Rest.StartsWith("$enc-", [StringComparison]::OrdinalIgnoreCase)) {
            $deeper = Step-CcPath -Current $c.FullName -Rest $Rest.Substring($enc.Length + 1)
            if ($deeper) { return $deeper }
        }
    }
    $null
}

function Resolve-CcProjectPath {
    # Claude Code names a store folder after the project path with every
    # separator replaced by a hyphen, which is lossy: 'imobiliare-design'
    # encodes exactly like 'imobiliare\design'. Decoding blindly therefore
    # yields a path that does not exist. So walk the real tree instead and let
    # the directories that exist decide where each hyphen came from.
    param([Parameter(Mandatory)][string]$StoreName)

    $starts = @()
    $m = [regex]::Match($StoreName, '^([A-Za-z])--(.*)$')
    if ($m.Success) {
        $starts += [pscustomobject]@{ Root = ($m.Groups[1].Value + ':\'); Rest = $m.Groups[2].Value }
    } else {
        foreach ($d in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
            $starts += [pscustomobject]@{ Root = $d.Root; Rest = $StoreName.TrimStart('-') }
        }
    }
    foreach ($s in $starts) {
        $hit = Step-CcPath -Current $s.Root -Rest $s.Rest
        if ($hit) { return $hit }
    }
    $null
}

Write-Host ''
Write-Host "  Looking for: $($Keyword -join ', ')" -ForegroundColor White

# ---------------------------------------------------------------------------
# Where to look
# ---------------------------------------------------------------------------

$roots = New-Object System.Collections.Generic.List[object]
$roots.Add([pscustomobject]@{ Path = $env:USERPROFILE; Depth = $Depth })

$oldProfiles = @()
foreach ($drive in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
    $old = Join-Path $drive.Root 'Windows.old\Users'
    if (Test-Path -LiteralPath $old) {
        $oldProfiles += @(Get-ChildItem -LiteralPath $old -Directory -ErrorAction SilentlyContinue)
    }
}
foreach ($p in $oldProfiles) { $roots.Add([pscustomobject]@{ Path = $p.FullName; Depth = $Depth }) }

foreach ($drive in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
    if (-not $drive.Free -and -not $drive.Used) { continue }
    $roots.Add([pscustomobject]@{ Path = $drive.Root; Depth = $(if ($AllDrives) { $Depth } else { 2 }) })
}

Write-Host "  Windows.old profiles found: $($oldProfiles.Count)" -ForegroundColor $(if ($oldProfiles.Count) { 'Green' } else { 'DarkGray' })

# ---------------------------------------------------------------------------
Write-Section 'Matching folders'
# ---------------------------------------------------------------------------

$seen = @{}
$hits = New-Object System.Collections.Generic.List[object]

foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root.Path)) { continue }
    Write-Host "  scanning $($root.Path) ..." -ForegroundColor DarkGray

    $dirs = Get-ChildItem -LiteralPath $root.Path -Directory -Recurse -Depth $root.Depth -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "(?i)$pattern" -and $_.FullName -notmatch $noise }

    foreach ($d in $dirs) {
        if ($seen.ContainsKey($d.FullName)) { continue }
        $seen[$d.FullName] = $true

        $files = @(Get-ChildItem -LiteralPath $d.FullName -File -Recurse -ErrorAction SilentlyContinue)
        $bytes = ($files | Measure-Object -Property Length -Sum).Sum
        $newest = ($files | Sort-Object LastWriteTime -Descending | Select-Object -First 1)

        $hits.Add([pscustomobject]@{
            Path    = $d.FullName
            Files   = $files.Count
            Size    = if ($bytes) { Format-Size $bytes } else { '0 KB' }
            Newest  = if ($newest) { $newest.LastWriteTime } else { $d.LastWriteTime }
            HasGit  = Test-Path -LiteralPath (Join-Path $d.FullName '.git')
        })
    }
}

if ($hits.Count -eq 0) {
    Write-Host ''
    Write-Host '  Nothing matched. Try wider keywords, e.g.:' -ForegroundColor Yellow
    Write-Host '    .\Find-LostProject.ps1 -Keyword imobil, agentie, design, proiect -AllDrives' -ForegroundColor Gray
} else {
    Write-Host ''
    Write-Host ('  {0,-16} {1,6} {2,9}  {3,-4} {4}' -f 'Last change', 'Files', 'Size', 'Git', 'Path') -ForegroundColor DarkGray
    foreach ($h in ($hits | Sort-Object Newest -Descending)) {
        Write-Host ('  {0,-16} {1,6} {2,9}  {3,-4} {4}' -f `
            ('{0:yyyy-MM-dd HH:mm}' -f $h.Newest), $h.Files, $h.Size, $(if ($h.HasGit) { 'yes' } else { 'no' }), $h.Path)
    }
}

# ---------------------------------------------------------------------------
Write-Section 'Claude Code project history'
# ---------------------------------------------------------------------------

# Claude Code names each project folder after the project's full path, so this
# recovers the original location even when the files are long gone.
$projectRoots = @(Join-Path $env:USERPROFILE '.claude\projects')
foreach ($p in $oldProfiles) { $projectRoots += (Join-Path $p.FullName '.claude\projects') }

$projects = @()
foreach ($pr in $projectRoots) {
    if (-not (Test-Path -LiteralPath $pr)) { continue }
    foreach ($d in (Get-ChildItem -LiteralPath $pr -Directory -ErrorAction SilentlyContinue)) {
        $sessions = @(Get-ChildItem -LiteralPath $d.FullName -Filter *.jsonl -ErrorAction SilentlyContinue)
        $real = Resolve-CcProjectPath -StoreName $d.Name
        $projects += [pscustomobject]@{
            Real     = $real
            # Only shown when the folder is gone and cannot be resolved.
            Guess    = ($d.Name -replace '^([A-Za-z])--', '$1:\') -replace '-', '\'
            Sessions = $sessions.Count
            Newest   = if ($sessions) { ($sessions | Sort-Object LastWriteTime -Descending)[0].LastWriteTime } else { $d.LastWriteTime }
            Folder   = $d.FullName
        }
    }
}

if ($projects.Count -eq 0) {
    Write-Host '  No Claude Code project history found on this machine.' -ForegroundColor DarkGray
    if ($oldProfiles.Count -eq 0) {
        Write-Host '  Windows.old is gone too, so nothing to recover from the old install here.' -ForegroundColor Yellow
    }
} else {
    Write-Host "  $($projects.Count) project(s) Claude Code has worked in:" -ForegroundColor Gray
    Write-Host ''
    Write-Host ('  {0,-16} {1,8}  {2}' -f 'Last used', 'Sessions', 'Project path') -ForegroundColor DarkGray
    foreach ($pj in ($projects | Sort-Object Newest -Descending | Select-Object -First 25)) {
        $label = if ($pj.Real) { $pj.Real } else { '? ' + $pj.Guess }
        Write-Host ('  {0,-16} {1,8}  {2}' -f ('{0:yyyy-MM-dd HH:mm}' -f $pj.Newest), $pj.Sessions, $label) `
            -ForegroundColor $(if ($pj.Real) { 'Gray' } else { 'DarkGray' })
    }
    Write-Host ''
    Write-Host '  A path with no "?" was resolved against folders that really exist.' -ForegroundColor DarkGray
    Write-Host '  A "?" means the folder is gone, so the path is only decoded from the' -ForegroundColor DarkGray
    Write-Host '  store name - every hyphen becomes a backslash, which is wrong for any' -ForegroundColor DarkGray
    Write-Host '  project whose own name contains one.' -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
Write-Section 'Transcripts mentioning your keywords'
# ---------------------------------------------------------------------------

# The transcripts are plain JSONL, so a dead session's conversation is still
# readable even though the session itself can never be reconnected.
$transcripts = New-Object System.Collections.Generic.List[object]
foreach ($p in $projects) {
    foreach ($f in (Get-ChildItem -LiteralPath $p.Folder -Filter *.jsonl -ErrorAction SilentlyContinue)) {
        try {
            if (Select-String -LiteralPath $f.FullName -Pattern $pattern -List -ErrorAction SilentlyContinue) {
                $transcripts.Add([pscustomobject]@{
                    When = $f.LastWriteTime
                    Size = Format-Size $f.Length
                    File = $f.FullName
                })
            }
        } catch {
            # An unreadable transcript is not worth failing the whole search over.
        }
    }
}

if ($transcripts.Count -eq 0) {
    Write-Host '  None found.' -ForegroundColor DarkGray
} else {
    Write-Host "  $($transcripts.Count) transcript(s) mention your keywords - the old conversation is in here:" -ForegroundColor Green
    Write-Host ''
    Write-Host ('  {0,-16} {1,9}  {2}' -f 'When', 'Size', 'Transcript') -ForegroundColor DarkGray
    foreach ($t in ($transcripts | Sort-Object When -Descending | Select-Object -First 15)) {
        Write-Host ('  {0,-16} {1,9}  {2}' -f ('{0:yyyy-MM-dd HH:mm}' -f $t.When), $t.Size, $t.File)
    }
    Write-Host ''

    $best = ($transcripts | Sort-Object When -Descending)[0]
    Write-Host '  Read the most recent one as plain text:' -ForegroundColor Gray
    Write-Host ("    Get-Content '{0}' | ForEach-Object {{ (`$_ | ConvertFrom-Json).message.content }} | Out-File `$HOME\Desktop\sesiune-veche.txt" -f $best.File) -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
Write-Section 'Next'
# ---------------------------------------------------------------------------

Write-Host '  Once you know which folder is the real one, get it off this disk:' -ForegroundColor Gray
Write-Host ''
Write-Host '    cd <folder>' -ForegroundColor DarkGray
Write-Host '    git init && git add -A && git commit -m "Import existing project"' -ForegroundColor DarkGray
Write-Host '    git remote add origin https://github.com/<user>/<repo>.git' -ForegroundColor DarkGray
Write-Host '    git push -u origin main' -ForegroundColor DarkGray
Write-Host ''
