<#
.SYNOPSIS
    Finds a disconnected Claude Code session on this machine and prints the exact
    command that resumes it.

.DESCRIPTION
    A session whose page on claude.ai says "Can't reach your computer" is a
    bridge session: its agent runs inside a `claude` CLI process on THIS machine,
    and the web page is only a window onto it. Nothing server-side can revive it.
    It becomes reachable again only when the CLI here resumes it.

    Claude Code stores one folder per project under .claude\projects, named after
    the project's full path with the separators replaced by hyphens, and one
    .jsonl transcript per session inside it. This script reads that store,
    resolves each entry back to a real folder, and prints the command to run.

    Resolving the folder is done by walking the real directory tree, guided by
    the stored name - never by decoding it. Decoding turns every hyphen into a
    backslash, so any project whose own path contains a hyphen would decode to a
    path that does not exist, and the printed command would send you nowhere.

    Read-only. It resumes nothing by itself; it tells you what to run.

.PARAMETER Keyword
    Highlight and pick entries matching these words. Default: imobil, agenti.

.PARAMETER All
    List every project in the store, not just the matches.

.EXAMPLE
    .\Resume-LostSession.ps1

.EXAMPLE
    .\Resume-LostSession.ps1 -Keyword facturare -All
#>
[CmdletBinding()]
param(
    [string[]]$Keyword = @('imobil', 'agenti'),
    [switch]$All
)

$pattern = ($Keyword | ForEach-Object { [regex]::Escape($_) }) -join '|'

function Step-CcPath {
    <#
        Walk one level down the REAL directory tree, consuming as much of the
        remaining store name as an existing child accounts for.

        Longest child first: when both 'Design' and 'Design-agentie' exist, the
        longer one has to be tried first, and a wrong guess backtracks.
    #>
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
    <#
        Turn a store folder name back into the real path it was made from.

        Claude Code builds the name by replacing every separator with a hyphen,
        which is lossy: a project called 'Design-agentie' encodes exactly like a
        folder 'Design\agentie'. Decoding blindly therefore produces a path that
        does not exist, and a `cd` command pointing at nothing.

        So this does not decode. It walks the real tree and lets the directories
        that actually exist decide where each hyphen came from.
    #>
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

# ---------------------------------------------------------------------------
# 1. Read the session store, including any left behind by a Windows reinstall
# ---------------------------------------------------------------------------

$storeRoots = @(Join-Path $env:USERPROFILE '.claude\projects')
if (Test-Path -LiteralPath 'C:\Windows.old\Users') {
    foreach ($p in (Get-ChildItem -LiteralPath 'C:\Windows.old\Users' -Directory -ErrorAction SilentlyContinue)) {
        $storeRoots += (Join-Path $p.FullName '.claude\projects')
    }
}

$entries = @()
foreach ($root in $storeRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($d in (Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue)) {
        $sessions = @(Get-ChildItem -LiteralPath $d.FullName -Filter *.jsonl -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending)
        if ($sessions.Count -eq 0) { continue }
        $entries += [pscustomobject]@{
            StoreName = $d.Name
            Sessions  = $sessions.Count
            Newest    = $sessions[0].LastWriteTime
            Uuid      = $sessions[0].BaseName
            Folder    = $null
            FromOld   = $root -like '*Windows.old*'
        }
    }
}

if ($entries.Count -eq 0) {
    Write-Host ''
    Write-Host '  No Claude Code session store on this machine.' -ForegroundColor Red
    Write-Host '  Nothing here can be resumed. If C:\Windows.old is gone too, the local' -ForegroundColor Gray
    Write-Host '  transcripts went with the reinstall - the conversation stays readable' -ForegroundColor Gray
    Write-Host '  on claude.ai, but the session can never be re-hosted.' -ForegroundColor Gray
    return
}

# ---------------------------------------------------------------------------
# 2. Resolve each entry to a real folder, by encoding candidates and matching
# ---------------------------------------------------------------------------

foreach ($e in $entries) {
    $e.Folder = Resolve-CcProjectPath -StoreName $e.StoreName
}

# ---------------------------------------------------------------------------
# 3. Report
# ---------------------------------------------------------------------------

$shown = if ($All) { $entries } else { @($entries | Where-Object { $_.StoreName -match "(?i)$pattern" }) }
if ($shown.Count -eq 0) { $shown = $entries }

Write-Host ''
Write-Host ('  {0,-16} {1,8}  {2,-14} {3}' -f 'Last used', 'Sessions', 'Project folder', 'Path') -ForegroundColor DarkGray
foreach ($e in ($shown | Sort-Object Newest -Descending)) {
    $hit = $e.StoreName -match "(?i)$pattern"
    $state = if ($e.Folder) { 'found' } else { 'NOT FOUND' }
    $shownPath = if ($e.Folder) { $e.Folder } else { $e.StoreName }
    Write-Host ('  {0,-16} {1,8}  {2,-14} {3}{4}' -f `
        ('{0:yyyy-MM-dd HH:mm}' -f $e.Newest), $e.Sessions, $state, $shownPath,
        $(if ($e.FromOld) { '   [Windows.old]' } else { '' })) `
        -ForegroundColor $(if ($hit) { 'Green' } else { 'Gray' })
}

# ---------------------------------------------------------------------------
# 4. The command
# ---------------------------------------------------------------------------

$target = @($entries | Where-Object { $_.StoreName -match "(?i)$pattern" } | Sort-Object Newest -Descending)[0]

Write-Host ''
if (-not $target) {
    Write-Host '  Nothing matched your keywords. Re-run with -All and pick the project by eye:' -ForegroundColor Yellow
    Write-Host '    .\Resume-LostSession.ps1 -All' -ForegroundColor Gray
    Write-Host '  then resume it with:  cd "<folder>" ; claude --resume <uuid>' -ForegroundColor Gray
    return
}

if ($target.FromOld) {
    Write-Host '  The transcript is in Windows.old, i.e. from the install you replaced.' -ForegroundColor Yellow
    Write-Host '  Copy the store folder into your current profile first:' -ForegroundColor Yellow
    Write-Host ('    Copy-Item -Recurse "{0}" "{1}"' -f `
        (Join-Path (Split-Path $target.StoreName -Parent) $target.StoreName), `
        (Join-Path $env:USERPROFILE ('.claude\projects\' + $target.StoreName))) -ForegroundColor Gray
    Write-Host ''
}

if ($target.Folder) {
    Write-Host '  RUN THIS:' -ForegroundColor Green
    Write-Host ('    cd "{0}" ; claude --resume {1}' -f $target.Folder, $target.Uuid) -ForegroundColor White
} else {
    Write-Host '  The transcript survived but the project folder itself is gone.' -ForegroundColor Yellow
    Write-Host '  Claude Code keys a session to its folder, so recreate it, then resume:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  RUN THIS:' -ForegroundColor Green
    Write-Host ('    mkdir "<calea proiectului>" ; cd "<calea proiectului>" ; claude --resume {0}' -f $target.Uuid) -ForegroundColor White
    Write-Host ''
    Write-Host ('  Store folder name, for working out the original path: {0}' -f $target.StoreName) -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '  Run it from a NORMAL terminal in that folder - not from C:\Windows\system32.' -ForegroundColor DarkGray
Write-Host '  Claude Code scopes sessions per folder, so the working directory decides' -ForegroundColor DarkGray
Write-Host '  which sessions it can even see. Administrator is fine but not required.' -ForegroundColor DarkGray
Write-Host ''
