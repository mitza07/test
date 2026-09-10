<#
.SYNOPSIS
    Makes this PC stay reachable for Claude sessions started from elsewhere.

.DESCRIPTION
    Installs the keep-alive agent and applies the power settings that actually
    matter for "Can't reach your computer":

      1. copies the agent to %LOCALAPPDATA%\ClaudeKeepAlive\bin
      2. stops the machine from sleeping while plugged in
      3. sets the wireless adapter to Maximum Performance on AC, so Wi-Fi does
         not power down the radio under the running session
      4. turns off USB selective suspend on AC, but only when the machine
         reaches the network through a USB adapter
      5. starts the agent at logon and again after every resume from sleep

    Optional, off unless asked for:
      -EnableWakeOnLan     arm the network card so a magic packet wakes the PC
      -DisableFastStartup  required for Wake-on-LAN to work from a full shutdown

    Every value it changes is recorded first in
    %LOCALAPPDATA%\ClaudeKeepAlive\restore-point.json, and
    Uninstall-ClaudeKeepAlive.ps1 puts them all back.

.PARAMETER Mode
    Passed to the agent. Auto (default) holds the machine awake only while a
    Claude session is connected. See ClaudeKeepAlive.ps1 for the other modes.

.PARAMETER SkipPowerPlan
    Install the agent but leave the Windows power plan untouched.

.EXAMPLE
    .\Install-ClaudeKeepAlive.ps1
    The usual install: no sleep on AC while a session is live, agent at logon.

.EXAMPLE
    .\Install-ClaudeKeepAlive.ps1 -EnableWakeOnLan -DisableFastStartup
    Same, plus the PC can be woken remotely with a magic packet. Needs admin.

.NOTES
    Run it as your own user. Administrator is only needed for the power plan,
    Wake-on-LAN and fast startup steps; without it the agent still installs and
    those steps are reported as skipped.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('Auto', 'Running', 'Always')][string]$Mode = 'Auto',
    [ValidateRange(0, 240)][int]$GraceMinutes = 10,
    [switch]$SkipPowerPlan,
    [switch]$SkipAutostart,
    [switch]$EnableWakeOnLan,
    [switch]$DisableFastStartup,
    [switch]$RelaunchClaude
)

. (Join-Path $PSScriptRoot '_Common.ps1')

$isAdmin = Test-CkaAdmin
$skipped = New-Object System.Collections.Generic.List[string]

# Seed the new restore point from the existing one. Without this, a second
# install would record the values the FIRST install already changed - i.e. it
# would happily save "Never" as the original sleep timeout and make the
# uninstall a no-op. The first recorded value always wins.
$restore = @{}
$previousRestore = Get-CkaRestorePoint
if ($previousRestore) {
    foreach ($p in $previousRestore.PSObject.Properties) { $restore[$p.Name] = $p.Value }
}

function Get-OriginalValue {
    param([Parameter(Mandatory)][string]$Key, $Current)
    if ($restore.ContainsKey($Key) -and $null -ne $restore[$Key]) { return $restore[$Key] }
    $Current
}

Write-Host ''
Write-CkaLog "Installing $script:CkaAppName (admin: $isAdmin)" -Level INFO
Write-Host ''

# ---------------------------------------------------------------------------
# 1. Copy the agent somewhere stable
# ---------------------------------------------------------------------------

$bin = Get-CkaPath -Kind Bin
if ($PSCmdlet.ShouldProcess($bin, 'Install agent files')) {
    New-Item -ItemType Directory -Path $bin -Force | Out-Null
    foreach ($file in @('_Common.ps1', 'ClaudeKeepAlive.ps1')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $bin -Force
    }
    Write-CkaLog "Agent installed to $bin" -Level OK
}
$agent = Join-Path $bin 'ClaudeKeepAlive.ps1'
$restore['installedBin'] = $bin

# ---------------------------------------------------------------------------
# 2. Power plan: do not sleep on AC
# ---------------------------------------------------------------------------

if ($SkipPowerPlan) {
    $skipped.Add('power plan (-SkipPowerPlan)')
} elseif (-not $isAdmin) {
    $skipped.Add('power plan (needs an elevated PowerShell)')
} elseif ($PSCmdlet.ShouldProcess('active power scheme', 'Disable sleep on AC')) {

    $restore['standbyTimeoutAcSeconds']   = Get-OriginalValue 'standbyTimeoutAcSeconds'   (Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubSleep -SettingGuid $script:CkaGuid.StandbyIdle   -Line AC)
    $restore['hibernateTimeoutAcSeconds'] = Get-OriginalValue 'hibernateTimeoutAcSeconds' (Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubSleep -SettingGuid $script:CkaGuid.HibernateIdle -Line AC)
    $restore['wifiPowerModeAc']           = Get-OriginalValue 'wifiPowerModeAc'           (Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubWireless -SettingGuid $script:CkaGuid.WifiPowerMode -Line AC)

    & powercfg.exe /change standby-timeout-ac 0   | Out-Null
    & powercfg.exe /change hibernate-timeout-ac 0 | Out-Null
    Write-CkaLog 'Sleep and hibernate on AC set to Never (battery behaviour untouched).' -Level OK

    & powercfg.exe /setacvalueindex SCHEME_CURRENT $script:CkaGuid.SubWireless $script:CkaGuid.WifiPowerMode 0 2>$null | Out-Null
    & powercfg.exe /setactive SCHEME_CURRENT 2>$null | Out-Null
    Write-CkaLog 'Wireless adapter power saving on AC set to Maximum Performance.' -Level OK

    # Only when the machine actually talks to the network over a USB adapter:
    # selective suspend would otherwise power the dongle down on its own, and
    # turning it off for every USB device costs power for no benefit.
    $usbNics = @(Get-CkaUsbNetworkAdapter)
    if ($usbNics.Count -gt 0) {
        $restore['usbSelectiveSuspendAc'] = Get-OriginalValue 'usbSelectiveSuspendAc' `
            (Get-CkaPowerIndex -SubGuid $script:CkaGuid.SubUsb -SettingGuid $script:CkaGuid.UsbSuspend -Line AC)

        & powercfg.exe /setacvalueindex SCHEME_CURRENT $script:CkaGuid.SubUsb $script:CkaGuid.UsbSuspend 0 2>$null | Out-Null
        & powercfg.exe /setactive SCHEME_CURRENT 2>$null | Out-Null
        Write-CkaLog ("USB selective suspend disabled on AC - network runs over USB ({0})." -f ($usbNics[0].InterfaceDescription)) -Level OK
    }
}

# ---------------------------------------------------------------------------
# 3. Wake-on-LAN (opt in)
# ---------------------------------------------------------------------------

if ($EnableWakeOnLan) {
    if (-not $isAdmin) {
        $skipped.Add('Wake-on-LAN (needs an elevated PowerShell)')
    } elseif ($PSCmdlet.ShouldProcess('network adapters', 'Enable Wake-on-LAN')) {

        # Keep whatever a previous install already recorded for these adapters.
        $armed = New-Object System.Collections.Generic.List[object]
        if ($restore.ContainsKey('wolAdapters') -and $restore['wolAdapters']) {
            foreach ($old in @($restore['wolAdapters'])) {
                if ($old -and $old.name) { $armed.Add(@{ name = $old.name; previousWakeOnMagicPacket = $old.previousWakeOnMagicPacket }) }
            }
        }
        $alreadyRecorded = @($armed | ForEach-Object { $_.name })

        $adapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up')

        foreach ($a in $adapters) {
            $previous = $null
            try {
                $pm = Get-NetAdapterPowerManagement -Name $a.Name -ErrorAction Stop
                $previous = [string]$pm.WakeOnMagicPacket
                Set-NetAdapterPowerManagement -Name $a.Name -WakeOnMagicPacket Enabled -ErrorAction Stop
            } catch {
                try {
                    Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName 'Wake on Magic Packet' `
                        -DisplayValue 'Enabled' -ErrorAction Stop
                } catch {
                    Write-CkaLog "$($a.Name): driver does not expose Wake-on-Magic-Packet." -Level WARN
                    continue
                }
            }

            & powercfg.exe /deviceenablewake $a.InterfaceDescription 2>$null | Out-Null
            if ($alreadyRecorded -notcontains $a.Name) {
                $armed.Add(@{ name = $a.Name; previousWakeOnMagicPacket = $previous })
            }
            Write-CkaLog ("{0} armed for Wake-on-LAN - MAC {1}" -f $a.Name, $a.MacAddress) -Level OK
        }

        $restore['wolAdapters'] = @($armed)
        if ($armed.Count -gt 0) {
            Write-Host ''
            Write-CkaLog 'Save the MAC address above - Send-WakeOnLan.ps1 and tools/wake-claude-pc.sh need it.' -Level INFO
        }
    }
}

if ($DisableFastStartup) {
    if (-not $isAdmin) {
        $skipped.Add('fast startup (needs an elevated PowerShell)')
    } elseif ($PSCmdlet.ShouldProcess('HiberbootEnabled', 'Disable fast startup')) {
        $key = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power'
        $restore['hiberbootEnabled'] = Get-OriginalValue 'hiberbootEnabled' `
            ((Get-ItemProperty -LiteralPath $key -Name 'HiberbootEnabled' -ErrorAction SilentlyContinue).HiberbootEnabled)
        Set-ItemProperty -LiteralPath $key -Name 'HiberbootEnabled' -Value 0 -Type DWord
        Write-CkaLog 'Fast startup disabled (a full shutdown is now a real shutdown, so WoL works).' -Level OK
    }
}

# ---------------------------------------------------------------------------
# 4. Autostart: at logon and after every resume
# ---------------------------------------------------------------------------

function Register-CkaScheduledTask {
    param([string]$AgentPath, [string]$AgentArgs)

    $psExe = Get-CkaPowerShellExe
    $action = New-ScheduledTaskAction -Execute $psExe `
        -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" {1}' -f $AgentPath, $AgentArgs)

    $triggers = @(New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME")

    # Also fire when Windows reports a resume from sleep, so a session that
    # reconnects after the lid opens finds the agent already running.
    try {
        $class = Get-CimClass -ClassName MSFT_TaskEventTrigger -Namespace Root/Microsoft/Windows/TaskScheduler -ErrorAction Stop
        $onResume = New-CimInstance -CimClass $class -ClientOnly
        $onResume.Enabled = $true
        $onResume.Subscription = '<QueryList><Query Id="0" Path="System"><Select Path="System">' +
            "*[System[Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and (EventID=1)]]" +
            '</Select></Query></QueryList>'
        $triggers += $onResume
    } catch {
        Write-CkaLog 'Could not add the resume-from-sleep trigger; logon trigger only.' -Level WARN
    }

    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -StartWhenAvailable -MultipleInstances IgnoreNew `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

    $task = New-ScheduledTask -Action $action -Trigger $triggers -Settings $settings -Principal $principal `
        -Description 'Keeps this PC awake while a Claude session is connected to it.'

    Register-ScheduledTask -TaskName $script:CkaTaskName -InputObject $task -Force -ErrorAction Stop | Out-Null
}

function Register-CkaStartupShortcut {
    param([string]$AgentPath, [string]$AgentArgs)

    $psExe = Get-CkaPowerShellExe
    $vbs = Get-CkaPath -Kind Launcher

    # WScript.Shell.Run with intWindowStyle 0 starts the agent with no console
    # window at all; "" is how a literal quote is escaped inside a VBS string.
    $command = '""{0}"" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{1}"" {2}' -f $psExe, $AgentPath, $AgentArgs
    @(
        "' Starts the Claude keep-alive agent without a visible window."
        'Set sh = CreateObject("WScript.Shell")'
        ('sh.Run "{0}", 0, False' -f $command)
    ) | Set-Content -LiteralPath $vbs -Encoding ASCII

    $startup = Join-Path ([Environment]::GetFolderPath('Startup')) 'ClaudeKeepAlive.lnk'
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($startup)
    $lnk.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
    $lnk.Arguments = '"{0}"' -f $vbs
    $lnk.Description = 'Keeps this PC awake while a Claude session is connected.'
    $lnk.Save()

    $startup
}

$autostartKind = 'none'
if ($SkipAutostart) {
    $skipped.Add('autostart (-SkipAutostart)')
} elseif ($PSCmdlet.ShouldProcess('autostart entry', 'Register the keep-alive agent')) {

    $agentArgs = '-Mode {0} -GraceMinutes {1} -Quiet' -f $Mode, $GraceMinutes
    if ($RelaunchClaude) { $agentArgs += ' -RelaunchClaude' }

    try {
        Register-CkaScheduledTask -AgentPath $agent -AgentArgs $agentArgs
        $autostartKind = 'ScheduledTask'
        Write-CkaLog "Scheduled task '$script:CkaTaskName' registered (at logon and on resume)." -Level OK
    } catch {
        Write-CkaLog "Scheduled task refused ($($_.Exception.Message.Trim())); using the Startup folder instead." -Level WARN
        try {
            $lnk = Register-CkaStartupShortcut -AgentPath $agent -AgentArgs $agentArgs
            $autostartKind = 'StartupFolder'
            Write-CkaLog "Startup shortcut created: $lnk" -Level OK
        } catch {
            Write-CkaLog "Could not register any autostart entry: $($_.Exception.Message)" -Level ERROR
        }
    }
}
$restore['autostart'] = $autostartKind

# ---------------------------------------------------------------------------
# 5. Save the restore point and start the agent now
# ---------------------------------------------------------------------------

if ($PSCmdlet.ShouldProcess('restore point', 'Save')) {
    $path = Save-CkaRestorePoint -Data $restore
    Write-CkaLog "Restore point saved to $path" -Level OK
}

if ($autostartKind -eq 'ScheduledTask' -and $PSCmdlet.ShouldProcess($script:CkaTaskName, 'Start now')) {
    try {
        Start-ScheduledTask -TaskName $script:CkaTaskName -ErrorAction Stop
        Write-CkaLog 'Agent started.' -Level OK
    } catch {
        Write-CkaLog "Agent will start at next logon: $($_.Exception.Message)" -Level WARN
    }
}

Write-Host ''
if ($skipped.Count -gt 0) {
    Write-CkaLog 'Skipped:' -Level WARN
    foreach ($s in $skipped) { Write-Host "    - $s" -ForegroundColor Yellow }
    Write-Host ''
}

if (Test-CkaModernStandby) {
    Write-CkaLog 'This machine uses Modern Standby - read docs/DIAGNOSTIC.md before trusting the fix.' -Level WARN
}

Write-CkaLog 'Done. Verify with:  .\Test-ClaudeReachability.ps1' -Level OK
Write-Host ''
