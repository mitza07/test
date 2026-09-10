#!/usr/bin/env bash
#
# wake-claude-pc.sh - wake a sleeping PC with a Wake-on-LAN magic packet.
#
# For when the Claude web UI says "Can't reach your computer" and you are not
# in front of the machine. Runs anywhere with bash: Linux, macOS, a NAS, or a
# phone with Termux - as long as it is on the same network as the target.
#
# The target must be armed first, on Windows:
#     .\Install-ClaudeKeepAlive.ps1 -EnableWakeOnLan -DisableFastStartup
#
# Usage:
#     ./wake-claude-pc.sh AA:BB:CC:DD:EE:FF
#     ./wake-claude-pc.sh -b 192.168.1.255 -w my-desktop AA:BB:CC:DD:EE:FF
#
set -euo pipefail

BROADCAST="255.255.255.255"
PORT=9
COUNT=3
WAIT_HOST=""
WAIT_SECONDS=90

usage() {
    # Reprint the header comment, stopping at the first line of real code.
    awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print; next } NR > 2 { exit }' "$0"
    cat <<'USAGE'

Options:
  -b ADDR    broadcast address (default 255.255.255.255; use the subnet
             broadcast such as 192.168.1.255 on a segmented network)
  -p PORT    UDP port (default 9; 7 also works on most cards)
  -c N       how many packets to send (default 3)
  -w HOST    after sending, ping HOST until it answers
  -t SECS    how long to wait for -w (default 90)
  -h         this help
USAGE
}

while getopts 'b:p:c:w:t:h' opt; do
    case "$opt" in
        b) BROADCAST="$OPTARG" ;;
        p) PORT="$OPTARG" ;;
        c) COUNT="$OPTARG" ;;
        w) WAIT_HOST="$OPTARG" ;;
        t) WAIT_SECONDS="$OPTARG" ;;
        h) usage; exit 0 ;;
        *) usage >&2; exit 2 ;;
    esac
done
shift $((OPTIND - 1))

if [ $# -lt 1 ]; then
    echo "error: missing MAC address" >&2
    usage >&2
    exit 2
fi

# Accept any separator, or none at all. The dash must stay last inside the
# bracket-free tr set, otherwise ':-.' is read as a (reversed) range.
mac_raw="$1"
mac=$(printf '%s' "$mac_raw" | tr -d ':.-' | tr '[:lower:]' '[:upper:]')

if ! printf '%s' "$mac" | grep -Eq '^[0-9A-F]{12}$'; then
    echo "error: '$mac_raw' is not a MAC address (need 12 hex digits)" >&2
    exit 2
fi

# A magic packet is 6 bytes of 0xFF followed by the MAC repeated 16 times.
payload="FFFFFFFFFFFF"
for _ in $(seq 1 16); do
    payload="${payload}${mac}"
done
escaped=$(printf '%s' "$payload" | sed 's/../\\x&/g')

send_with_bash() {
    # bash can open a UDP socket directly; no netcat or python needed.
    exec 3<>"/dev/udp/${BROADCAST}/${PORT}" 2>/dev/null || return 1
    # shellcheck disable=SC2059  # $escaped is a format string of \xNN escapes
    printf "$escaped" >&3
    exec 3>&-
    return 0
}

send_with_python() {
    command -v python3 >/dev/null 2>&1 || return 1
    python3 - "$mac" "$BROADCAST" "$PORT" <<'PY'
import socket, sys
mac, broadcast, port = sys.argv[1], sys.argv[2], int(sys.argv[3])
packet = b"\xff" * 6 + bytes.fromhex(mac) * 16
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
s.sendto(packet, (broadcast, port))
s.close()
PY
}

pretty_mac=$(printf '%s' "$mac" | sed 's/../&:/g; s/:$//')
sent=0
for _ in $(seq 1 "$COUNT"); do
    if send_with_bash || send_with_python; then
        sent=$((sent + 1))
    fi
    sleep 0.2
done

if [ "$sent" -eq 0 ]; then
    echo "error: could not send the packet (no bash /dev/udp and no python3)" >&2
    exit 1
fi

echo "Sent $sent magic packet(s) for $pretty_mac to ${BROADCAST}:${PORT}"

if [ -n "$WAIT_HOST" ]; then
    echo "Waiting up to ${WAIT_SECONDS}s for ${WAIT_HOST} to answer..."
    deadline=$(( $(date +%s) + WAIT_SECONDS ))
    while [ "$(date +%s)" -lt "$deadline" ]; do
        if ping -c 1 -W 2 "$WAIT_HOST" >/dev/null 2>&1; then
            echo "${WAIT_HOST} is up."
            exit 0
        fi
        sleep 3
    done
    echo "${WAIT_HOST} did not answer within ${WAIT_SECONDS}s." >&2
    echo "Check Wake-on-LAN in the BIOS/UEFI and that fast startup is off." >&2
    exit 1
fi
