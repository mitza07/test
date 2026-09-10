<#
    Shared helpers for the Claude keep-alive toolkit.
    Dot-sourced by the other scripts in this folder; not meant to be run directly.

    Design notes
    ------------
    * Everything that inspects Windows power state reads the registry or uses
      provider names, never localized powercfg text, so it behaves the same on a
      Romanian, English or any other Windows UI language.
    * Every change made to the machine is written to a restore point file so
      Uninstall-ClaudeKeepAlive.ps1 can put the settings back exactly.
#>

$script:CkaAppName  = 'ClaudeKeepAlive'
$script:CkaTaskName = 'ClaudeKeepAlive'

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

function Get-CkaRoot {
    $root = Join-Path $env:LOCALAPPDATA $script:CkaAppName
    if (-not (Test-Path -LiteralPath $root)) {
        New-Item -ItemType Directory -Path $root -Force | Out-Null
    }
    $root
}

function Get-CkaPath {
    param(
        [Parameter(Mandatory)]
        [ValidateSet('Bin', 'Log', 'Status', 'Restore', 'Launcher')]
        [string]$Kind
    )
    $root = Get-CkaRoot
    switch ($Kind) {
        'Bin'      { Join-Path $root 'bin' }
        'Log'      { Join-Path $root 'keepalive.log' }
        'Status'   { Join-Path $root 'status.json' }
        'Restore'  { Join-Path $root 'restore-point.json' }
        'Launcher' { Join-Path $root 'start-hidden.vbs' }
    }
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

function Write-CkaLog {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('INFO', 'OK', 'WARN', 'ERROR')][string]$Level = 'INFO',
        [switch]$Quiet
    )

    $line = '{0} [{1,-5}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message

    try {
        $log = Get-CkaPath -Kind Log
        $existing = Get-Item -LiteralPath $log -ErrorAction SilentlyContinue
        if ($existing -and $existing.Length -gt 2MB) {
            Move-Item -LiteralPath $log -Destination "$log.1" -Force -ErrorAction SilentlyContinue
        }
        Add-Content -LiteralPath $log -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        # Logging must never break the agent.
    }

    if ($Quiet) { return }

    switch ($Level) {
        'OK'    { Write-Host $line -ForegroundColor Green }
        'WARN'  { Write-Host $line -ForegroundColor Yellow }
        'ERROR' { Write-Host $line -ForegroundColor Red }
        default { Write-Host $line }
    }
}

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

function Test-CkaAdmin {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($id)
        $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch {
        $false
    }
}

function Get-CkaPowerShellExe {
    # Prefer the interpreter we are already running under; fall back to Windows PowerShell.
    $exe = (Get-Process -Id $PID -ErrorAction SilentlyContinue).Path
    if ($exe -and (Test-Path -LiteralPath $exe)) { return $exe }
    Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
}

# ---------------------------------------------------------------------------
# Power configuration (language independent)
# ---------------------------------------------------------------------------

# Well known power setting GUIDs.
$script:CkaGuid = @{
    SubSleep      = '238c9fa8-0aad-41ed-83f4-97be242c8f20'
    StandbyIdle   = '29f6c1db-86da-48c5-9fdb-f2b67b1f44da'  # "Sleep after"
    HibernateIdle = '9d7815a6-7ee4-497e-8888-515a05f02364'  # "Hibernate after"
    SubWireless   = '19cbb8fa-5279-450e-9fac-8a3d5fedd0c1'
    WifiPowerMode = '12bbebe6-58d6-4636-95bb-3217ef867c1a'  # 0 = Maximum Performance
    SubUsb        = '2a737441-1930-4402-8d77-b2bebba308a3'
    UsbSuspend    = '48e6b7a6-50f5-4782-a5d4-53bb8f07e226'  # 0 = Disabled
}

function Get-CkaUsbNetworkAdapter {
    <#
        Network adapters attached over USB. They matter because USB selective
        suspend can power the dongle down on its own, independently of the
        adapter's own power management - which looks exactly like the machine
        going offline while it is plainly awake.
    #>
    try {
        @(Get-NetAdapter -Physical -ErrorAction Stop | Where-Object {
            ($_.PSObject.Properties.Name -contains 'PnPDeviceID' -and $_.PnPDeviceID -like 'USB\*') -or
            $_.InterfaceDescription -match '(?i)\bUSB\b'
        })
    } catch {
        @()
    }
}

function Get-CkaActiveSchemeGuid {
    # powercfg output is localized, but a GUID is a GUID in every language.
    try {
        $out = (& powercfg.exe /getactivescheme 2>$null) -join ' '
    } catch {
        return $null
    }
    $m = [regex]::Match($out, '[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}')
    if ($m.Success) { $m.Value } else { $null }
}

function Get-CkaPowerIndex {
    <#
        Returns the current value of a power setting for the active scheme, or
        $null when it cannot be determined. Reads the registry first (never
        localized); falls back to parsing the hex values out of powercfg, whose
        numbers keep their order regardless of UI language.
    #>
    param(
        [Parameter(Mandatory)][string]$SubGuid,
        [Parameter(Mandatory)][string]$SettingGuid,
        [ValidateSet('AC', 'DC')][string]$Line = 'AC'
    )

    $scheme = Get-CkaActiveSchemeGuid
    if (-not $scheme) { return $null }

    $valueName = if ($Line -eq 'AC') { 'ACSettingIndex' } else { 'DCSettingIndex' }
    $key = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes\$scheme\$SubGuid\$SettingGuid"

    try {
        $item = Get-ItemProperty -LiteralPath $key -Name $valueName -ErrorAction Stop
        return [int64]$item.$valueName
    } catch {
        # Setting was never customised for this scheme - fall through.
    }

    try {
        $out = (& powercfg.exe /query $scheme $SubGuid $SettingGuid 2>$null) -join "`n"
        $hits = [regex]::Matches($out, '0x[0-9a-fA-F]+')
        # The last two hex numbers printed are the current AC then DC index.
        if ($hits.Count -ge 2) {
            $idx = if ($Line -eq 'AC') { $hits.Count - 2 } else { $hits.Count - 1 }
            return [Convert]::ToInt64($hits[$idx].Value.Substring(2), 16)
        }
    } catch {
        # Nothing else to try.
    }

    $null
}

function Test-CkaModernStandby {
    # CsEnabled = 1 means the machine uses Modern Standby (S0 low power idle)
    # instead of classic S3 sleep. This is the single most useful fact when a
    # laptop "sleeps" but looks like it should have stayed online.
    try {
        $v = Get-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' -Name 'CsEnabled' -ErrorAction Stop
        [bool]$v.CsEnabled
    } catch {
        $false
    }
}

function Test-CkaNicMayPowerDown {
    <#
        True when Windows is allowed to switch the adapter off to save power -
        the "Allow the computer to turn off this device to save power" checkbox
        in Device Manager, which silently kills a long-lived connection.

        That checkbox is stored as bit 0x08 of PnPCapabilities on the adapter's
        driver key: bit set means power management is disabled for the device.
        A missing value means the default, which is "allowed".

        Returns $null when the adapter cannot be matched to a driver key.
    #>
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$InterfaceGuid,
        [string]$InterfaceDescription
    )

    # The registry stores NetCfgInstanceId braced and upper case; Get-NetAdapter
    # may hand back either form. Compare canonical shapes, not raw strings.
    $wanted = ($InterfaceGuid -replace '[{}]', '').Trim()

    $classRoot = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}'
    try {
        $subKeys = @(Get-ChildItem -LiteralPath $classRoot -ErrorAction Stop)
    } catch {
        # Unreadable driver key - report "unknown" rather than guessing.
        return $null
    }

    $readCaps = {
        param($Props)
        $caps = if ($null -ne $Props.PnPCapabilities) { [int]$Props.PnPCapabilities } else { 0 }
        (-not ($caps -band 0x08))
    }

    $all = @()
    foreach ($sub in $subKeys) {
        $props = Get-ItemProperty -LiteralPath $sub.PSPath -ErrorAction SilentlyContinue
        if ($props) { $all += $props }
    }

    if ($wanted) {
        foreach ($props in $all) {
            $have = ([string]$props.NetCfgInstanceId -replace '[{}]', '').Trim()
            if ($have -and $have -eq $wanted) { return (& $readCaps $props) }
        }
    }

    # USB and other hot-plugged adapters do not always expose a matching
    # NetCfgInstanceId, so fall back to the driver description - but only when
    # exactly one key matches, otherwise we would be guessing.
    if ($InterfaceDescription) {
        $byDesc = @($all | Where-Object { $_.DriverDesc -and $_.DriverDesc -eq $InterfaceDescription })
        if ($byDesc.Count -eq 1) { return (& $readCaps $byDesc[0]) }
    }

    $null
}

function Test-CkaFastStartup {
    try {
        $key = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power'
        $v = Get-ItemProperty -LiteralPath $key -Name 'HiberbootEnabled' -ErrorAction Stop
        [bool]$v.HiberbootEnabled
    } catch {
        $false
    }
}

# ---------------------------------------------------------------------------
# Claude process discovery
# ---------------------------------------------------------------------------

function Get-CkaClaudeProcess {
    <#
        Returns the Claude desktop app process plus any Claude Code CLI
        processes (which run under node.exe on Windows).
    #>
    $found = @()

    $found += Get-Process -Name 'claude' -ErrorAction SilentlyContinue

    try {
        $cim = Get-CimInstance -ClassName Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
        foreach ($p in $cim) {
            if ($p.CommandLine -and $p.CommandLine -match '(?i)claude') {
                $proc = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
                if ($proc) { $found += $proc }
            }
        }
    } catch {
        # Reading Win32_Process command lines can be restricted; the process
        # name check above is still a useful signal on its own.
    }

    @($found | Sort-Object -Property Id -Unique)
}

function Test-CkaClaudeConnected {
    <#
        True when at least one of the given processes holds an established
        HTTPS connection - a good proxy for "a session is actually attached".
        When the connection table cannot be read we deliberately return $true:
        staying awake by mistake is far cheaper than dropping a live session.
    #>
    param([int[]]$ProcessId)

    if (-not $ProcessId -or $ProcessId.Count -eq 0) { return $false }

    try {
        $conns = Get-NetTCPConnection -State Established -ErrorAction Stop
    } catch {
        return $true
    }

    foreach ($c in $conns) {
        if ($c.RemotePort -eq 443 -and $ProcessId -contains [int]$c.OwningProcess) {
            return $true
        }
    }
    $false
}

function Get-CkaClaudeDesktopExe {
    # Claude Desktop installs per user; newest version folder wins.
    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'AnthropicClaude'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Claude')
    )
    foreach ($root in $roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        $exe = Get-ChildItem -LiteralPath $root -Filter 'claude.exe' -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if ($exe) { return $exe.FullName }
    }
    $null
}

# ---------------------------------------------------------------------------
# Restore point (so every change is reversible)
# ---------------------------------------------------------------------------

function Get-CkaRestorePoint {
    $path = Get-CkaPath -Kind Restore
    if (Test-Path -LiteralPath $path) {
        try {
            return (Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json)
        } catch {
            Write-CkaLog "Restore point at $path is unreadable, ignoring it." -Level WARN
        }
    }
    $null
}

function Save-CkaRestorePoint {
    param([Parameter(Mandatory)][hashtable]$Data)
    $path = Get-CkaPath -Kind Restore
    $Data['savedUtc'] = (Get-Date).ToUniversalTime().ToString('o')
    ($Data | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $path -Encoding UTF8
    $path
}
