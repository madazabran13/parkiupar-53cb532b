# Pruebas de performance — ParkiUpar

Plan JMeter contra Edge Functions críticas de Supabase. Se ejecuta vía
**Docker** (`justb4/jmeter:5.5`) para no exigir JMeter instalado local.

## Ejecución headless

```bash
# Default: SUPABASE_URL apunta al proyecto remoto, sin token (recibirás 401, útil para validar conectividad)
bash tests/performance/run-jmeter.sh

# Con token de admin/conductor (recomendado para medir rendimiento real)
SUPABASE_TOKEN="$(supabase auth get-session --json | jq -r .access_token)" \
  bash tests/performance/run-jmeter.sh

# Parametrizado
SUPABASE_URL="https://abc.supabase.co" \
SUPABASE_TOKEN="<JWT>" \
THREADS=20 RAMP=60 DURATION=180 \
  bash tests/performance/run-jmeter.sh
```

O desde npm:

```bash
npm run test:performance
```

## Endpoints cubiertos

| Endpoint | Método | Notas |
|---|---|---|
| `/functions/v1/parking?status=active` | GET | Lista sesiones activas |
| `/functions/v1/capacity` | GET | Estado de capacidad |
| `/functions/v1/reservations` | GET | Lista de reservas |
| `/functions/v1/payments?type=all` | GET | Historial de pagos |

## Salida

```
reports/jmeter/
├── result.jtl       # CSV crudo
├── jmeter.log       # log de ejecución
└── html/
    └── index.html   # Dashboard HTML (open this)
```

## Lectura del reporte

- **APDEX**: > 0.85 OK. Si está rojo, latencia degradada.
- **Throughput / Response time**: revisa picos por endpoint en *Charts → Response Times Over Time*.
- **Errores**: tabla *Errors* — codes 401/403 = problema de token, 5xx = problema de servidor.
