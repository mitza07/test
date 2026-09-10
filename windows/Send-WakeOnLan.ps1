<#
.SYNOPSIS
    Wakes a sleeping PC by sending it a Wake-on-LAN magic packet.

.DESCRIPTION
    Run this from any other machine on the same network when the Claude web UI
    says the computer is asleep. The target must have been armed first with
    Install-ClaudeKeepAlive.ps1 -EnableWakeOnLan.

    Wake-on-LAN is a broadcast on the local subnet: it works from another PC,
    a phone or a NAS on the same LAN, and over a VPN only if that VPN bridges
    broadcasts. From the internet it needs a port forward on the router to the
    subnet broadcast address, which many routers refuse.

.PARAMETER Mac
    MAC address of the target's network card. Any separator, or none:
    A1:B2:C3:D4:E5:F6, a1-b2-c3-d4-e5-f6, a1b2c3d4e5f6.

.PARAMETER Broadcast
    Broadcast address to send to. Default 255.255.255.255. On a segmented
    network use the subnet broadcast instead, e.g. 192.168.1.255.

.PARAMETER Port
    UDP port. 9 by default; 7 also works on most cards.

.PARAMETER Count
    How many packets to send. Default 3 - they are cheap and easily lost.

.PARAMETER WaitFor
    Also wait this many seconds for the host to answer a ping. Needs -HostName.

.PARAMETER HostName
    Host name or IP used by -WaitFor to confirm the machine actually came up.

.EXAMPLE
    .\Send-WakeOnLan.ps1 -Mac A1:B2:C3:D4:E5:F6

.EXAMPLE
    .\Send-WakeOnLan.ps1 -Mac a1b2c3d4e5f6 -HostName my-desktop -WaitFor 90
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)][string]$Mac,
    [string]$Broadcast = '255.255.255.255',
    [ValidateRange(1, 65535)][int]$Port = 9,
    [ValidateRange(1, 20)][int]$Count = 3,
    [ValidateRange(0, 600)][int]$WaitFor = 0,
    [string]$HostName
)

$clean = ($Mac -replace '[^0-9A-Fa-f]', '').ToUpper()
if ($clean.Length -ne 12) {
    throw "'$Mac' is not a MAC address: expected 12 hex digits, got $($clean.Length)."
}

$macBytes = for ($i = 0; $i -lt 12; $i += 2) { [Convert]::ToByte($clean.Substring($i, 2), 16) }

# A magic packet is 6 bytes of 0xFF followed by the MAC repeated 16 times.
$packet = New-Object byte[] 102
for ($i = 0; $i -lt 6; $i++) { $packet[$i] = 0xFF }
for ($r = 0; $r -lt 16; $r++) {
    [Array]::Copy($macBytes, 0, $packet, 6 + ($r * 6), 6)
}

$udp = New-Object System.Net.Sockets.UdpClient
try {
    $udp.EnableBroadcast = $true
    $endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Parse($Broadcast)), $Port
    for ($i = 1; $i -le $Count; $i++) {
        [void]$udp.Send($packet, $packet.Length, $endpoint)
        Start-Sleep -Milliseconds 200
    }
    Write-Host "Sent $Count magic packet(s) for $($clean -replace '(..)(?!$)', '$1:') to ${Broadcast}:${Port}" -ForegroundColor Green
} finally {
    $udp.Close()
}

if ($WaitFor -gt 0) {
    if (-not $HostName) {
        Write-Warning '-WaitFor needs -HostName to know what to ping.'
        return
    }
    Write-Host "Waiting up to ${WaitFor}s for $HostName to answer..." -ForegroundColor Gray
    $deadline = (Get-Date).AddSeconds($WaitFor)
    while ((Get-Date) -lt $deadline) {
        if (Test-Connection -ComputerName $HostName -Count 1 -Quiet -ErrorAction SilentlyContinue) {
            Write-Host "$HostName is up." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 3
    }
    Write-Warning "$HostName did not answer within ${WaitFor}s. Check that Wake-on-LAN is armed in the BIOS/UEFI and that fast startup is disabled."
}
