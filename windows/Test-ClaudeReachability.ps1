<#
.SYNOPSIS
    Explains why this PC became unreachable for a Claude session, and what to fix.

.DESCRIPTION
    Reads the machine's real state - sleep capabilities, power plan, network
    adapter power saving, fast startup, the Windows power event log, the Claude
    processes and the keep-alive agent - and prints a ranked list of findings
    with the exact command that fixes each one.

    Read-only: it changes nothing. Safe to run as a normal user, though a few
    checks return more detail from an elevated prompt.

.PARAMETER Hours
    How far back to read the power event log. Default 48.

.EXAMPLE
    .\Test-ClaudeReachability.ps1

.EXAMPLE
    .\Test-ClaudeReachability.ps1 -Hours 168 | Tee-Object -FilePath report.txt
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 720)][int]$Hours = 48
)

. (Join-Path $PSScriptRoot '_Common.ps1')

$script:Findings = New-Object System.Collections.Generic.List[object]

function Add-Finding {
    param(
        [Parameter(Mandatory)][ValidateSet('Critical', 'Warning', 'Info')][string]$Severity,
        [Parameter(Mandatory)][string]$Title,
        [string]$Fix
    )
    $script:Findings.Add([pscustomobject]@{ Severity = $Severity; Title = $Title; Fix = $Fix })
}

function Write-Section {
    param([string]$Name)
    Write-Host ''
    Write-Host "== $Name " -NoNewline -ForegroundColor Cyan
    Write-Host ('=' * [Math]::Max(0, 60 - $Name.Length)) -ForegroundColor DarkCyan
}

function Write-Item {
    param([string]$Label, $Value, [string]$Color = 'Gray')
    Write-Host ('  {0,-34}' -f $Label) -NoNewline
    Write-Host $Value -ForegroundColor $Color
}

Write-Host ''
Write-Host '  Claude reachability check' -ForegroundColor White
Write-Host "  $env:COMPUTERNAME  -  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
Write-Section 'Sleep capability'
# ---------------------------------------------------------------------------

$modernStandby = Test-CkaModernStandby
Write-Item 'Sleep model' $(if ($modernStandby) { 'Modern Standby (S0 low power idle)' } else { 'Classic sleep (S3) / hibernate' }) `
    $(if ($modernStandby) { 'Yellow' } else { 'Green' })

if ($modernStandby) {
    Add-Finding -Severity Warning `
        -Title 'Modern Standby machine: Windows keeps "sleeping" in a state where apps get suspended and sockets die, even though the PC looks online.' `
        -Fix 'Install the keep-alive agent (it holds a power request while a session is attached). If the machine still drops, see docs/DIAGNOSTIC.md for the PlatformAoAcOverride switch back to S3.'
}

$fastStartup = Test-CkaFastStartup
Write-Item 'Fast startup' $(if ($fastStartup) { 'Enabled' } else { 'Disabled' }) $(if ($fastStartup) { 'Yellow' } else { 'Green' })
if ($fastStartup) {
    Add-Finding -Severity Info `
        -Title 'Fast startup is on, so "Shut down" leaves the PC in a hybrid state that most network cards will not wake from.' `
        -Fix 'Only matters if you want Wake-on-LAN: .\Install-ClaudeKeepAlive.ps1 -DisableFastStartup (elevated).'
}

# ---------------------------------------------------------------------------
Write-Section 'Power plan'
# ---------------------------------------------------------------------------

function Format-Timeout {
    param($Seconds)
    if ($null -eq $Seconds) { return 'unknown' }
    if ($Seconds -eq 0) { return 'Never' }
    '{0} min' -f [Math]::Round($Seconds / 60, 1)
}

$standbyAc   = Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubSleep -SettingGuid $script:CkaGuid.StandbyIdle -Line AC
$standbyDc   = Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubSleep -SettingGuid $script:CkaGuid.StandbyIdle -Line DC
$hibernateAc = Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubSleep -SettingGuid $script:CkaGuid.HibernateIdle -Line AC
$wifiAc      = Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubWireless -SettingGuid $script:CkaGuid.WifiPowerMode -Line AC

Write-Item 'Sleep after (plugged in)' (Format-Timeout $standbyAc) `
    $(if ($null -eq $standbyAc) { 'DarkGray' } elseif ($standbyAc -eq 0) { 'Green' } else { 'Red' })
Write-Item 'Sleep after (on battery)' (Format-Timeout $standbyDc)
Write-Item 'Hibernate after (plugged)' (Format-Timeout $hibernateAc) `
    $(if ($null -eq $hibernateAc) { 'DarkGray' } elseif ($hibernateAc -eq 0) { 'Green' } else { 'Yellow' })

$wifiLabel = switch ($wifiAc) {
    0       { 'Maximum Performance' }
    1       { 'Low Power Saving' }
    2       { 'Medium Power Saving' }
    3       { 'Maximum Power Saving' }
    $null   { 'unknown / no wireless' }
    default { "value $wifiAc" }
}
Write-Item 'Wi-Fi power saving (plugged)' $wifiLabel $(if ($wifiAc -eq 0 -or $null -eq $wifiAc) { 'Green' } else { 'Yellow' })

if ($null -ne $standbyAc -and $standbyAc -gt 0) {
    Add-Finding -Severity Critical `
        -Title ("The PC sleeps after {0} on mains power. That alone explains 'Can't reach your computer'." -f (Format-Timeout $standbyAc)) `
        -Fix 'powercfg /change standby-timeout-ac 0   (or run .\Install-ClaudeKeepAlive.ps1 elevated)'
}
$usbNics = @(Get-CkaUsbNetworkAdapter)
if ($usbNics.Count -gt 0) {
    $usbSuspend = Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubUsb -SettingGuid $script:CkaGuid.UsbSuspend -Line AC
    $usbLabel = switch ($usbSuspend) {
        0       { 'Disabled' }
        1       { 'Enabled' }
        $null   { 'unknown' }
        default { "value $usbSuspend" }
    }
    Write-Item 'USB selective suspend (plugged)' $usbLabel `
        $(if ($usbSuspend -eq 0) { 'Green' } elseif ($null -eq $usbSuspend) { 'DarkGray' } else { 'Yellow' })

    if ($null -ne $usbSuspend -and $usbSuspend -ne 0) {
        Add-Finding -Severity Warning `
            -Title ("This machine reaches the network over USB ({0}), and USB selective suspend is on - Windows can power the adapter down by itself, which looks exactly like the PC going offline while it is plainly awake." -f $usbNics[0].InterfaceDescription) `
            -Fix 'Run .\Install-ClaudeKeepAlive.ps1 elevated - it turns selective suspend off on AC when the network runs over USB.'
    }
}

if ($null -ne $wifiAc -and $wifiAc -gt 0) {
    Add-Finding -Severity Warning `
        -Title 'The Wi-Fi radio is allowed to enter power saving on mains power, which can drop a long-lived connection.' `
        -Fix 'powercfg /setacvalueindex SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0; powercfg /setactive SCHEME_CURRENT'
}

# ---------------------------------------------------------------------------
Write-Section 'Network adapters'
# ---------------------------------------------------------------------------

$adapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up')
if ($adapters.Count -eq 0) {
    Write-Item 'Adapters up' 'none found' 'Yellow'
} else {
    foreach ($a in $adapters) {
        Write-Item $a.Name ('{0}  -  {1}' -f $a.InterfaceDescription, $a.MacAddress)
        try {
            $wol = [string](Get-NetAdapterPowerManagement -Name $a.Name -ErrorAction Stop).WakeOnMagicPacket
            Write-Item '    Wake on magic packet' $wol $(if ($wol -eq 'Enabled') { 'Green' } else { 'Gray' })
        } catch {
            Write-Item '    Wake on magic packet' 'not reported by this driver' 'DarkGray'
        }

        $mayPowerDown = Test-CkaNicMayPowerDown -InterfaceGuid ([string]$a.InterfaceGuid) `
            -InterfaceDescription ([string]$a.InterfaceDescription)
        if ($null -eq $mayPowerDown) {
            Write-Item '    Windows may power it down' 'unknown' 'DarkGray'
        } else {
            Write-Item '    Windows may power it down' $(if ($mayPowerDown) { 'yes' } else { 'no' }) `
                $(if ($mayPowerDown) { 'Yellow' } else { 'Green' })
            if ($mayPowerDown) {
                Add-Finding -Severity Warning `
                    -Title ("Windows is allowed to power down '{0}' to save energy, which silently kills the relay connection." -f $a.Name) `
                    -Fix ("Device Manager > Network adapters > {0} > Power Management > uncheck 'Allow the computer to turn off this device to save power'." -f $a.Name)
            }
        }
    }
}

# ---------------------------------------------------------------------------
Write-Section 'What happened recently'
# ---------------------------------------------------------------------------

$since = (Get-Date).AddHours(-$Hours)
$labels = @{
    42   = 'sleep     - system entered sleep'
    107  = 'resume    - system resumed from sleep'
    41   = 'CRASH     - rebooted without a clean shutdown'
    109  = 'shutdown  - kernel initiated a shutdown/restart'
    1    = 'wake      - resume, with the wake source'
    1074 = 'shutdown  - requested by an application'
}

$events = @()
foreach ($spec in @(
    @{ Provider = 'Microsoft-Windows-Kernel-Power';          Ids = @(41, 42, 107, 109) },
    @{ Provider = 'Microsoft-Windows-Power-Troubleshooter';  Ids = @(1) },
    @{ Provider = 'User32';                                  Ids = @(1074) }
)) {
    try {
        $events += Get-WinEvent -FilterHashtable @{
            LogName      = 'System'
            ProviderName = $spec.Provider
            Id           = $spec.Ids
            StartTime    = $since
        } -ErrorAction Stop
    } catch {
        # No matching events in the window - that is a normal result, not an error.
    }
}

$events = @($events | Sort-Object TimeCreated -Descending)
if ($events.Count -eq 0) {
    Write-Item "Power events (last ${Hours}h)" 'none' 'Green'
} else {
    Write-Host "  Last $([Math]::Min(12, $events.Count)) of $($events.Count) power events in ${Hours}h:" -ForegroundColor Gray
    foreach ($e in ($events | Select-Object -First 12)) {
        $label = if ($labels.ContainsKey([int]$e.Id)) { $labels[[int]$e.Id] } else { "id $($e.Id)" }
        $color = switch ([int]$e.Id) { 41 { 'Red' } 42 { 'Yellow' } 1074 { 'Yellow' } default { 'DarkGray' } }
        Write-Host ('    {0:yyyy-MM-dd HH:mm}  {1}' -f $e.TimeCreated, $label) -ForegroundColor $color
    }

    $sleeps = @($events | Where-Object { $_.Id -eq 42 })
    if ($sleeps.Count -gt 0) {
        Add-Finding -Severity Critical `
            -Title ("The machine went to sleep {0} time(s) in the last {1}h - most recently {2:yyyy-MM-dd HH:mm}. Any attached session died there." -f $sleeps.Count, $Hours, $sleeps[0].TimeCreated) `
            -Fix 'Install the keep-alive agent so a live session blocks sleep: .\Install-ClaudeKeepAlive.ps1'
    }
    if (@($events | Where-Object { $_.Id -eq 41 }).Count -gt 0) {
        Add-Finding -Severity Critical `
            -Title 'The PC rebooted at least once without a clean shutdown (Kernel-Power 41): power loss, overheating or a driver crash.' `
            -Fix 'Unrelated to Claude but worth chasing - check Reliability Monitor (perfmon /rel) around that timestamp.'
    }
    if (@($events | Where-Object { $_.Id -eq 1074 }).Count -gt 0) {
        Add-Finding -Severity Warning `
            -Title 'An application requested a shutdown or restart - typically Windows Update installing overnight.' `
            -Fix 'Settings > Windows Update > Advanced options > set active hours, or turn off automatic restart.'
    }
}

function Show-PowercfgProbe {
    param([string]$Label, [string]$Switch)
    try {
        # powercfg needs elevation for /requests; an empty result is normal there.
        $out = @(& powercfg.exe $Switch 2>$null | Where-Object { $_ -and $_.Trim() })
        if ($out.Count -eq 0) { return }
        Write-Host ''
        Write-Host "  ${Label}:" -ForegroundColor Gray
        foreach ($line in ($out | Select-Object -First 14)) { Write-Host "    $line" -ForegroundColor DarkGray }
    } catch {
        # Nothing here is worth failing the whole report over.
    }
}

Show-PowercfgProbe -Label 'Last wake source'    -Switch '/lastwake'
Show-PowercfgProbe -Label 'Holding it awake now' -Switch '/requests'

# ---------------------------------------------------------------------------
Write-Section 'Claude'
# ---------------------------------------------------------------------------

$procs = Get-CkaClaudeProcess
Write-Item 'Claude processes running' $procs.Count $(if ($procs.Count -gt 0) { 'Green' } else { 'Red' })

if ($procs.Count -eq 0) {
    Add-Finding -Severity Critical `
        -Title 'No Claude process is running on this PC, so nothing can accept a remote session no matter how awake the machine is.' `
        -Fix 'Start Claude Desktop and leave it running and signed in.'
} else {
    $connected = Test-CkaClaudeConnected -ProcessId @($procs | ForEach-Object { $_.Id })
    Write-Item 'Holding an HTTPS connection' $connected $(if ($connected) { 'Green' } else { 'Yellow' })
    if (-not $connected) {
        Add-Finding -Severity Warning `
            -Title 'Claude is running but has no established HTTPS connection - it is signed out, blocked by a firewall/VPN, or the network is down.' `
            -Fix 'Open Claude Desktop and check it is signed in; if you use a VPN or corporate proxy, confirm claude.ai is reachable through it.'
    }
}

$tcp = $null
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('claude.ai', 443, $null, $null)
    $tcp = $async.AsyncWaitHandle.WaitOne(5000) -and $client.Connected
    $client.Close()
} catch {
    $tcp = $false
}
Write-Item 'TCP 443 to claude.ai' $(if ($tcp) { 'reachable' } else { 'NOT reachable' }) $(if ($tcp) { 'Green' } else { 'Red' })
if (-not $tcp) {
    Add-Finding -Severity Critical `
        -Title 'This PC cannot open a connection to claude.ai on port 443.' `
        -Fix 'Check the network, the firewall and any VPN or proxy before blaming power settings.'
}

# ---------------------------------------------------------------------------
Write-Section 'Keep-alive agent'
# ---------------------------------------------------------------------------

$task = Get-ScheduledTask -TaskName $script:CkaTaskName -ErrorAction SilentlyContinue
$startupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'ClaudeKeepAlive.lnk'
$hasStartup = Test-Path -LiteralPath $startupLnk

if ($task) {
    Write-Item 'Autostart' "scheduled task ($($task.State))" 'Green'
} elseif ($hasStartup) {
    Write-Item 'Autostart' 'startup folder shortcut' 'Green'
} else {
    Write-Item 'Autostart' 'not installed' 'Yellow'
    Add-Finding -Severity Warning `
        -Title 'The keep-alive agent is not installed, so nothing stops Windows from sleeping under a live session.' `
        -Fix '.\Install-ClaudeKeepAlive.ps1'
}

$statusPath = Get-CkaPath -Kind Status
if (Test-Path -LiteralPath $statusPath) {
    try {
        $status = Get-Content -LiteralPath $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $age = (Get-Date).ToUniversalTime() - [datetime]::Parse($status.updatedUtc).ToUniversalTime()
        Write-Item 'Agent heartbeat' ('{0:N0} s ago' -f $age.TotalSeconds) $(if ($age.TotalMinutes -lt 5) { 'Green' } else { 'Yellow' })
        Write-Item 'Currently holding awake' $status.holdingAwake $(if ($status.holdingAwake) { 'Green' } else { 'Gray' })
        if ($age.TotalMinutes -ge 5) {
            Add-Finding -Severity Warning `
                -Title 'The agent has not updated its heartbeat for over 5 minutes - it is probably not running.' `
                -Fix 'Start-ScheduledTask -TaskName ClaudeKeepAlive   (or log out and back in)'
        }
    } catch {
        Write-Item 'Agent heartbeat' 'status file unreadable' 'Yellow'
    }
}

# ---------------------------------------------------------------------------
Write-Section 'Verdict'
# ---------------------------------------------------------------------------

if ($script:Findings.Count -eq 0) {
    Write-Host ''
    Write-Host '  Nothing found. This PC should stay reachable.' -ForegroundColor Green
    Write-Host '  If a session still drops, it is the network side, not this machine.' -ForegroundColor DarkGray
} else {
    $order = @{ Critical = 0; Warning = 1; Info = 2 }
    $n = 0
    foreach ($f in ($script:Findings | Sort-Object { $order[$_.Severity] })) {
        $n++
        $color = switch ($f.Severity) { 'Critical' { 'Red' } 'Warning' { 'Yellow' } default { 'DarkGray' } }
        Write-Host ''
        Write-Host ('  {0}. [{1}] {2}' -f $n, $f.Severity.ToUpper(), $f.Title) -ForegroundColor $color
        if ($f.Fix) { Write-Host "     fix: $($f.Fix)" -ForegroundColor Gray }
    }
}

Write-Host ''
Write-Host '  Full sleep report (why the machine really woke or slept):' -ForegroundColor DarkGray
Write-Host '    powercfg /sleepstudy   /  powercfg /energy' -ForegroundColor DarkGray
Write-Host ''
