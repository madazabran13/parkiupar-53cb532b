#!/bin/sh
set -e

if [ -z "$HOST_IP" ]; then
  echo "[entrypoint] ERROR: HOST_IP no esta definida." >&2
  exit 1
fi

GATEWAY_URL="http://${HOST_IP}:8080"
echo "[entrypoint] Gateway URL: $GATEWAY_URL"

# Replace the build-time placeholder with the real gateway URL in all compiled JS files
find /app/dist/assets -name "*.js" | while read file; do
  sed -i "s|__GATEWAY_PLACEHOLDER__|${GATEWAY_URL}|g" "$file"
done

echo "[entrypoint] Frontend listo en http://${HOST_IP}:5173"

exec npx vite preview --host 0.0.0.0 --port 5173
