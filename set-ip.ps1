# Detecta la IP local y la guarda en .env para que docker-compose la inyecte al contenedor

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
       Where-Object { $_.PrefixOrigin -in @("Dhcp", "Manual") } |
       Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Error "No se pudo detectar la IP local."
    exit 1
}

$envFile = ".env"
$content = Get-Content $envFile -Raw

if ($content -match "HOST_IP=.*") {
    $content = $content -replace "HOST_IP=.*", "HOST_IP=$ip"
} else {
    $content = $content.TrimEnd() + "`nHOST_IP=$ip`n"
}

Set-Content $envFile $content -NoNewline

Write-Host ""
Write-Host "IP guardada: $ip"
Write-Host ""
Write-Host "Comandos:"
Write-Host "  Primera vez:        docker-compose up --build"
Write-Host "  Siguientes veces:   docker-compose up"
Write-Host ""
Write-Host "Accede desde cualquier PC en la red:"
Write-Host "  http://${ip}:5173"
Write-Host ""
