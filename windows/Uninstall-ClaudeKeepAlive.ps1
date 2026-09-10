<#
.SYNOPSIS
    Removes the keep-alive agent and puts every changed setting back.

.DESCRIPTION
    Reverses Install-ClaudeKeepAlive.ps1 using the restore point it wrote:
    the sleep and hibernate timeouts, the wireless power saving mode, fast
    startup and the Wake-on-LAN state of each adapter all return to the values
    they had before the install.

    Settings whose original value was never recorded are left alone rather than
    guessed at.

.PARAMETER Purge
    Also delete %LOCALAPPDATA%\ClaudeKeepAlive, including the log.

.EXAMPLE
    .\Uninstall-ClaudeKeepAlive.ps1

.EXAMPLE
    .\Uninstall-ClaudeKeepAlive.ps1 -Purge
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$Purge
)

. (Join-Path $PSScriptRoot '_Common.ps1')

$isAdmin = Test-CkaAdmin
Write-Host ''
Write-CkaLog "Uninstalling $script:CkaAppName (admin: $isAdmin)" -Level INFO

# ---------------------------------------------------------------------------
# 1. Stop the running agent
# ---------------------------------------------------------------------------

$running = @()
try {
    $running = @(Get-CimInstance -ClassName Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match 'ClaudeKeepAlive\.ps1' -and $_.ProcessId -ne $PID })
} catch {
    Write-CkaLog 'Could not enumerate processes; stop the agent manually if it is still running.' -Level WARN
}

foreach ($p in $running) {
    if ($PSCmdlet.ShouldProcess("pid $($p.ProcessId)", 'Stop agent')) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        Write-CkaLog "Stopped agent process $($p.ProcessId)." -Level OK
    }
}

# ---------------------------------------------------------------------------
# 2. Remove the autostart entries
# ---------------------------------------------------------------------------

if (Get-ScheduledTask -TaskName $script:CkaTaskName -ErrorAction SilentlyContinue) {
    if ($PSCmdlet.ShouldProcess($script:CkaTaskName, 'Unregister scheduled task')) {
        try {
            Unregister-ScheduledTask -TaskName $script:CkaTaskName -Confirm:$false -ErrorAction Stop
            Write-CkaLog 'Scheduled task removed.' -Level OK
        } catch {
            Write-CkaLog "Could not remove the scheduled task: $($_.Exception.Message)" -Level ERROR
        }
    }
}

foreach ($path in @((Join-Path ([Environment]::GetFolderPath('Startup')) 'ClaudeKeepAlive.lnk'), (Get-CkaPath -Kind Launcher))) {
    if (Test-Path -LiteralPath $path) {
        if ($PSCmdlet.ShouldProcess($path, 'Remove')) {
            Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
            Write-CkaLog "Removed $path" -Level OK
        }
    }
}

# ---------------------------------------------------------------------------
# 3. Restore the settings
# ---------------------------------------------------------------------------

$restore = Get-CkaRestorePoint

if (-not $restore) {
    Write-CkaLog 'No restore point found - nothing to roll back.' -Level WARN
} elseif (-not $isAdmin) {
    Write-CkaLog 'Not elevated: power settings were left as they are. Re-run this script as administrator to restore them.' -Level WARN
} else {

    function Restore-Timeout {
        param([string]$Label, [string]$PowercfgKey, $Seconds)
        if ($null -eq $Seconds) {
            Write-CkaLog "$Label had no recorded value; leaving it unchanged." -Level INFO
            return
        }
        $minutes = [int][Math]::Round([double]$Seconds / 60)
        if ($PSCmdlet.ShouldProcess($Label, "Restore to $minutes min")) {
            & powercfg.exe /change $PowercfgKey $minutes | Out-Null
            Write-CkaLog "$Label restored to $(if ($minutes -eq 0) { 'Never' } else { "$minutes min" })." -Level OK
        }
    }

    Restore-Timeout -Label 'Sleep after (AC)'     -PowercfgKey 'standby-timeout-ac'   -Seconds $restore.standbyTimeoutAcSeconds
    Restore-Timeout -Label 'Hibernate after (AC)' -PowercfgKey 'hibernate-timeout-ac' -Seconds $restore.hibernateTimeoutAcSeconds

    if ($null -ne $restore.wifiPowerModeAc -and $PSCmdlet.ShouldProcess('Wireless power saving (AC)', 'Restore')) {
        & powercfg.exe /setacvalueindex SCHEME_CURRENT $script:CkaGuid.SubWireless $script:CkaGuid.WifiPowerMode ([int]$restore.wifiPowerModeAc) 2>$null | Out-Null
        & powercfg.exe /setactive SCHEME_CURRENT 2>$null | Out-Null
        Write-CkaLog "Wireless power saving (AC) restored to index $($restore.wifiPowerModeAc)." -Level OK
    }

    if ($null -ne $restore.hiberbootEnabled -and $PSCmdlet.ShouldProcess('Fast startup', 'Restore')) {
        Set-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' `
            -Name 'HiberbootEnabled' -Value ([int]$restore.hiberbootEnabled) -Type DWord
        Write-CkaLog "Fast startup restored to $($restore.hiberbootEnabled)." -Level OK
    }

    foreach ($a in @($restore.wolAdapters)) {
        if (-not $a -or -not $a.name) { continue }
        if ($a.previousWakeOnMagicPacket -notin @('Enabled', 'Disabled')) { continue }
        if ($PSCmdlet.ShouldProcess($a.name, "Restore Wake-on-LAN to $($a.previousWakeOnMagicPacket)")) {
            try {
                Set-NetAdapterPowerManagement -Name $a.name -WakeOnMagicPacket $a.previousWakeOnMagicPacket -ErrorAction Stop
                Write-CkaLog "$($a.name): Wake-on-LAN restored to $($a.previousWakeOnMagicPacket)." -Level OK
            } catch {
                Write-CkaLog "$($a.name): could not restore Wake-on-LAN ($($_.Exception.Message))." -Level WARN
            }
        }
    }
}

# ---------------------------------------------------------------------------
# 4. Clean up
# ---------------------------------------------------------------------------

if ($Purge) {
    $root = Get-CkaRoot
    if ($PSCmdlet.ShouldProcess($root, 'Delete')) {
        Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed $root" -ForegroundColor Green
    }
} else {
    Write-CkaLog "Log and restore point kept in $(Get-CkaRoot) - use -Purge to delete them too." -Level INFO
}

Write-Host ''
