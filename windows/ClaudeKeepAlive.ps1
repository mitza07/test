<#
.SYNOPSIS
    Keeps this PC reachable while a Claude session is attached to it.

.DESCRIPTION
    Sessions started from claude.ai, the phone app or another machine run on
    THIS computer. When Windows puts the machine to sleep the relay connection
    dies and the web UI shows "Can't reach your computer - it may be asleep or
    offline".

    This agent holds a power request (SetThreadExecutionState) only while a
    Claude session is actually connected, then releases it after a grace
    period, so the machine still sleeps normally when nobody is using it.

    It deliberately does NOT keep the display on - the screen going dark is
    fine, only the system must stay up.

.PARAMETER Mode
    Auto   - stay awake only while Claude is running and connected (default).
    Running- stay awake while a Claude process exists, connected or not.
    Always - stay awake for as long as the agent runs.

.PARAMETER PollSeconds
    How often to re-evaluate. Default 30.

.PARAMETER GraceMinutes
    How long to keep the machine awake after the last activity. Default 10.

.PARAMETER RelaunchClaude
    Restart Claude Desktop if it is not running (useful after a resume that
    killed the app). Off by default.

.PARAMETER KeepDisplayOn
    Also keep the display awake. Off by default.

.PARAMETER Once
    Evaluate a single time, print the decision and exit. Use this to test.

.EXAMPLE
    .\ClaudeKeepAlive.ps1 -Once
    Show what the agent would decide right now.

.EXAMPLE
    .\ClaudeKeepAlive.ps1 -Mode Always -GraceMinutes 0
    Hold the machine awake unconditionally until Ctrl+C.
#>
[CmdletBinding()]
param(
    [ValidateSet('Auto', 'Running', 'Always')][string]$Mode = 'Auto',
    [ValidateRange(5, 600)][int]$PollSeconds = 30,
    [ValidateRange(0, 240)][int]$GraceMinutes = 10,
    [switch]$RelaunchClaude,
    [switch]$KeepDisplayOn,
    [switch]$Once,
    [switch]$Quiet
)

. (Join-Path $PSScriptRoot '_Common.ps1')

# ---------------------------------------------------------------------------
# Win32 power request
# ---------------------------------------------------------------------------

if (-not ('Cka.Power' -as [type])) {
    Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace Cka
{
    public static class Power
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern uint SetThreadExecutionState(uint esFlags);

        public const uint ES_CONTINUOUS        = 0x80000000;
        public const uint ES_SYSTEM_REQUIRED   = 0x00000001;
        public const uint ES_DISPLAY_REQUIRED  = 0x00000002;
        public const uint ES_AWAYMODE_REQUIRED = 0x00000040;
    }
}
'@
}

function Set-CkaExecutionState {
    <#
        Applies or releases the power request. Away mode is not supported on
        Modern Standby machines, so a failure is retried without it.
    #>
    param([bool]$Awake, [bool]$Display)

    if (-not $Awake) {
        [void][Cka.Power]::SetThreadExecutionState([Cka.Power]::ES_CONTINUOUS)
        return $true
    }

    $base = [Cka.Power]::ES_CONTINUOUS -bor [Cka.Power]::ES_SYSTEM_REQUIRED
    if ($Display) { $base = $base -bor [Cka.Power]::ES_DISPLAY_REQUIRED }

    $withAway = $base -bor [Cka.Power]::ES_AWAYMODE_REQUIRED
    if ([Cka.Power]::SetThreadExecutionState($withAway) -ne 0) { return $true }
    if ([Cka.Power]::SetThreadExecutionState($base) -ne 0) { return $true }

    Write-CkaLog 'SetThreadExecutionState failed; the machine may still sleep.' -Level ERROR -Quiet:$Quiet
    $false
}

# ---------------------------------------------------------------------------
# Decision
# ---------------------------------------------------------------------------

function Get-CkaActivity {
    $procs = Get-CkaClaudeProcess
    $ids = @($procs | ForEach-Object { $_.Id })

    $connected = if ($ids.Count -gt 0) { Test-CkaClaudeConnected -ProcessId $ids } else { $false }

    $active = switch ($Mode) {
        'Always'  { $true }
        'Running' { $ids.Count -gt 0 }
        default   { $ids.Count -gt 0 -and $connected }
    }

    [pscustomobject]@{
        Active       = $active
        Connected    = $connected
        ProcessCount = $ids.Count
        ProcessIds   = $ids
    }
}

function Write-CkaStatus {
    param([Parameter(Mandatory)][hashtable]$State)
    try {
        ($State | ConvertTo-Json -Depth 4) |
            Set-Content -LiteralPath (Get-CkaPath -Kind Status) -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        # Status file is a convenience for the diagnostic script, never critical.
    }
}

function Start-CkaClaudeDesktop {
    $exe = Get-CkaClaudeDesktopExe
    if (-not $exe) {
        Write-CkaLog 'Claude Desktop executable not found; cannot relaunch.' -Level WARN -Quiet:$Quiet
        return
    }
    try {
        Start-Process -FilePath $exe -ErrorAction Stop
        Write-CkaLog "Relaunched Claude Desktop: $exe" -Level OK -Quiet:$Quiet
    } catch {
        Write-CkaLog "Failed to relaunch Claude Desktop: $($_.Exception.Message)" -Level ERROR -Quiet:$Quiet
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if ($Once) {
    $a = Get-CkaActivity
    Write-CkaLog ("Mode={0} processes={1} connected={2} -> would {3}" -f `
        $Mode, $a.ProcessCount, $a.Connected, $(if ($a.Active) { 'STAY AWAKE' } else { 'allow sleep' })) `
        -Level $(if ($a.Active) { 'OK' } else { 'INFO' })
    return
}

Write-CkaLog "Agent started (pid $PID, mode $Mode, poll ${PollSeconds}s, grace ${GraceMinutes}m)." -Level OK -Quiet:$Quiet
if (Test-CkaModernStandby) {
    Write-CkaLog 'Modern Standby (S0) detected - see docs/DIAGNOSTIC.md, the power request alone may not be enough.' -Level WARN -Quiet:$Quiet
}

$holding = $false
$lastActive = $null

try {
    while ($true) {
        $activity = Get-CkaActivity
        $now = Get-Date

        if ($activity.Active) { $lastActive = $now }

        $withinGrace = $lastActive -and (($now - $lastActive).TotalMinutes -lt $GraceMinutes)
        $shouldHold = $activity.Active -or $withinGrace

        if ($shouldHold -ne $holding) {
            if (Set-CkaExecutionState -Awake $shouldHold -Display $KeepDisplayOn.IsPresent) {
                $holding = $shouldHold
                $msg = if ($shouldHold) {
                    "Holding the machine awake ({0} Claude process(es), connected={1})." -f $activity.ProcessCount, $activity.Connected
                } else {
                    'Released the power request; Windows may sleep normally now.'
                }
                Write-CkaLog $msg -Level OK -Quiet:$Quiet
            }
        } elseif ($holding) {
            # Refresh periodically: some drivers only honour a recent request.
            [void](Set-CkaExecutionState -Awake $true -Display $KeepDisplayOn.IsPresent)
        }

        if ($RelaunchClaude -and $activity.ProcessCount -eq 0) { Start-CkaClaudeDesktop }

        Write-CkaStatus -State @{
            pid           = $PID
            mode          = $Mode
            holdingAwake  = $holding
            active        = $activity.Active
            connected     = $activity.Connected
            processCount  = $activity.ProcessCount
            lastActiveUtc = if ($lastActive) { $lastActive.ToUniversalTime().ToString('o') } else { $null }
            updatedUtc    = $now.ToUniversalTime().ToString('o')
            graceMinutes  = $GraceMinutes
        }

        Start-Sleep -Seconds $PollSeconds
    }
} finally {
    [void][Cka.Power]::SetThreadExecutionState([Cka.Power]::ES_CONTINUOUS)
    Write-CkaLog 'Agent stopped; power request released.' -Level INFO -Quiet:$Quiet
}
