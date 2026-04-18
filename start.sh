#!/bin/bash
# Auto-detect the host machine's local IP and start all services

HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

if [ -z "$HOST_IP" ]; then
  HOST_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
fi

if [ -z "$HOST_IP" ]; then
  echo "ERROR: No se pudo detectar la IP local." >&2
  exit 1
fi

export HOST_IP
echo "IP detectada: $HOST_IP"
echo "Frontend: http://$HOST_IP:5173"
echo "Gateway:  http://$HOST_IP:8080"

docker-compose up --build "$@"
