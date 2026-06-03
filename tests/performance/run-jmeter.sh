#!/usr/bin/env bash
#
# Ejecuta el plan JMeter en headless usando un contenedor Docker (justb4/jmeter),
# sin necesidad de instalar JMeter localmente.
#
# Uso:
#   SUPABASE_TOKEN="<JWT>" ./run-jmeter.sh
#   SUPABASE_URL="https://abc.supabase.co" SUPABASE_TOKEN="<JWT>" THREADS=20 DURATION=120 ./run-jmeter.sh
#
# Salida:
#   - reports/jmeter/result.jtl   (CSV crudo)
#   - reports/jmeter/html/        (dashboard HTML)
#   - reports/jmeter/jmeter.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLAN="$SCRIPT_DIR/parkiupar.jmx"

SUPABASE_URL_DEFAULT="https://xqgwetpzuslklycflebu.supabase.co"
SUPABASE_URL="${SUPABASE_URL:-$SUPABASE_URL_DEFAULT}"
SUPABASE_TOKEN="${SUPABASE_TOKEN:-}"
THREADS="${THREADS:-10}"
RAMP="${RAMP:-30}"
DURATION="${DURATION:-60}"

if [[ -z "$SUPABASE_TOKEN" ]]; then
  echo "[warn] SUPABASE_TOKEN no definido. Las peticiones autenticadas devolverán 401."
fi

OUT_DIR="$REPO_ROOT/reports/jmeter"
mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/result.jtl" "$OUT_DIR/jmeter.log"
rm -rf "$OUT_DIR/html"

# Convertir paths Windows (Git Bash) a paths Docker
to_docker_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    echo "$1"
  fi
}

PLAN_DOCKER="$(to_docker_path "$PLAN")"
OUT_DOCKER="$(to_docker_path "$OUT_DIR")"

echo "[info] Plan: $PLAN_DOCKER"
echo "[info] Output: $OUT_DOCKER"
echo "[info] Target: $SUPABASE_URL"
echo "[info] Threads=$THREADS ramp=$RAMP duration=$DURATION"

# MSYS_NO_PATHCONV evita que Git Bash convierta los paths "/plan.jmx" → "C:/Program Files/Git/plan.jmx"
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$PLAN_DOCKER":/plan.jmx \
  -v "$OUT_DOCKER":/out \
  justb4/jmeter:5.5 \
  -n -t /plan.jmx \
  -l /out/result.jtl \
  -j /out/jmeter.log \
  -e -o /out/html \
  -Jsupabase.url="$SUPABASE_URL" \
  -Jsupabase.token="$SUPABASE_TOKEN" \
  -Jthreads="$THREADS" \
  -Jramp="$RAMP" \
  -Jduration="$DURATION"

echo
echo "[done] Reporte HTML: $OUT_DIR/html/index.html"
