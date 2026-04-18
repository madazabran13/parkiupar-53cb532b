# Auto-detect the host machine's local IP and start all services

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual" } |
       Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
       Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Error "No se pudo detectar la IP local."
    exit 1
}

$env:HOST_IP = $ip
Write-Host "IP detectada: $ip"
Write-Host "Frontend: http://${ip}:5173"
Write-Host "Gateway:  http://${ip}:8080"

docker-compose up --build $args
