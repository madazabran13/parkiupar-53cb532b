# QA — ParkiUpar

Documento de referencia para el equipo de QA. Describe la pirámide de pruebas, los comandos para ejecutarlas localmente, dónde aterrizan los reportes y el flujo de ramas Dev → QA → main.

> Stack bajo prueba: SPA React 19 + Vite 6 + TypeScript en `src/`, y Edge Functions Deno en `supabase/functions/`.

---

## 1. Pirámide de pruebas

| Nivel | Tipo | Herramienta | Alcance | Comando |
| ----- | ---- | ----------- | ------- | ------- |
| 1 | Unitarias front | Vitest 4 + @vitest/coverage-v8 | `src/lib/utils/*`, `src/services/*` puros | `npm run test:unit` |
| 1' | Unitarias back | Deno test | `supabase/functions/_shared/*` | `npm run test:back` |
| 2 | Componente | Vitest + React Testing Library + user-event | `src/components/*.tsx` aislados | `npm run test:component` |
| 3 | Integración front | Vitest + MSW (mock de fetch) | `src/lib/api.ts` contra handlers HTTP | `npm run test:integration` |
| 3' | Integración back | Deno test + stack Supabase local | Edge Functions contra Postgres + GoTrue locales | `npm run test:back:integration` |
| 4 | Mutación | StrykerJS + vitest-runner | Lógica crítica de `pricing/validators/formatters` | `npm run test:mutation` |
| 5 | E2E (headless CI) | Playwright (Chromium) | Flujos completos servidos por `vite preview` | `npm run test:e2e` |
| 5b | E2E (debug / autoría) | Cypress (Chrome) | Mismos flujos, runner interactivo y time-travel debugger | `npm run test:cypress:open` |
| 6 | Performance | JMeter (vía Docker) | Endpoints Supabase bajo carga | `npm run test:performance` |
| 7 | Calidad estática | SonarQube CE local + sonar-scanner-cli | Bugs, smells, cobertura, duplicación | `npm run sonar:up && npm run sonar:scan` |

Cobertura mínima fijada en `vitest.config.ts`:

- `src/lib/utils/validators.ts`: 100% líneas / 100% branches / 100% funciones
- `src/lib/utils/pricing.ts`: 90% líneas / 80% branches / 100% funciones
- `src/lib/utils/formatters.ts`: 80% líneas / 70% branches / 100% funciones

Umbral de mutación (Stryker): `break: 60`, `high: 80`, `low: 60`.

---

## 2. Cómo correr cada nivel

Todos los comandos asumen Node 20+, npm 10+, Docker Desktop arriba y, para back, Deno 1.45+.

### 2.1 Unitarias front (nivel 1)

```bash
npm install            # solo la primera vez
npm run test:unit
```

Para ver el dashboard interactivo: `npm run test:ui`.

### 2.2 Unitarias back (nivel 1')

```bash
# requiere Deno instalado
#   PowerShell: irm https://deno.land/install.ps1 | iex
npm run test:back
```

Cubre helpers compartidos: `auth.ts`, `cors.ts`, `response.ts`.

### 2.3 Componentes (nivel 2)

```bash
npm run test:component
```

Usa jsdom 26 + React Testing Library. Los tests viven junto al componente con sufijo `.test.tsx`.

### 2.4 Integración front (nivel 3)

```bash
npm run test:integration
```

MSW intercepta `${SUPABASE_URL}/functions/v1/*` desde `src/test/msw/handlers.ts`. El lifecycle está armado en `src/test/setup.ts` (`beforeAll → listen`, `afterEach → resetHandlers`, `afterAll → close`).

Para sobrescribir un handler en un test:

```ts
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

server.use(
  http.get(`${env.SUPABASE_URL}/functions/v1/capacity`, () =>
    HttpResponse.json({ data: null, error: { message: "boom" } }, { status: 500 })
  ),
);
```

### 2.5 Integración back (nivel 3')

Requiere stack local levantado:

```bash
supabase start                       # docker compose interno, aplica migraciones
export SUPABASE_LOCAL_URL=http://127.0.0.1:54321
export ADMIN_JWT=<jwt admin seed>
export CONDUCTOR_JWT=<jwt conductor seed>
npm run test:back:integration
```

Si las env vars no están presentes los tests se saltan automáticamente (no rompen el pipeline).

### 2.6 Mutación (nivel 4)

```bash
npm run test:mutation
```

Stryker corre vitest por mutante con `coverageAnalysis: perTest`. Si el score baja de 60 el comando falla.

### 2.7 E2E (nivel 5)

Tenemos **dos runners E2E** en paralelo, atacando la misma SPA servida por `vite preview` en `:4173`:

| Runner | Cuándo usarlo | Ventaja |
| ------ | ------------- | ------- |
| **Playwright** | CI headless, smoke rápido, auth con storageState | Multi-browser, paralelismo nativo, fixtures sólidos |
| **Cypress** | Desarrollo local, debugging de un flujo nuevo, demos QA | Time-travel debugger, runner interactivo, comandos custom |

#### 2.7.1 Playwright

Primera vez:

```bash
npx playwright install chromium
```

Después:

```bash
npm run test:e2e            # headless, levanta vite preview automático en :4173
npm run test:e2e:ui         # modo inspector
npm run test:e2e:report     # abre el último HTML report
```

Los specs viven en `tests/e2e/specs/`. El spec autenticado (`reservation-authenticated.spec.ts`) requiere `E2E_USER` y `E2E_PASS`; si no están, se saltea.

#### 2.7.2 Cypress

Primera vez no necesita instalar browsers (usa Chrome del host o Electron bundled).

```bash
npm run build                 # cypress corre contra el bundle preview
npm run test:cypress          # headless, JUnit en reports/junit/, video en reports/cypress/videos
npm run test:cypress:open     # runner interactivo con time-travel
```

`start-server-and-test` levanta `vite preview` antes y lo mata al terminar — no hace falta dejar otro shell.

Los specs viven en `tests/cypress/e2e/*.cy.ts`. Comando custom disponible:

```ts
cy.loginViaSupabase();   // hace login programático vs auth/v1/token y setea localStorage
```

Para que ese comando funcione exportá antes:

```bash
export CYPRESS_SUPABASE_URL=https://<proj>.supabase.co
export CYPRESS_SUPABASE_ANON_KEY=<anon>
export CYPRESS_E2E_USER=<email>
export CYPRESS_E2E_PASS=<pass>
```

Sin esas vars, el spec autenticado (`reservation-authenticated.cy.ts`) se saltea.

### 2.8 Performance (nivel 6)

Corre dentro del contenedor `justb4/jmeter:5.5`, no requiere instalar JMeter en el host.

```bash
SUPABASE_URL=https://<proj>.supabase.co \
SUPABASE_TOKEN=<jwt> \
THREADS=20 RAMP=30 DURATION=120 \
npm run test:performance
```

Parámetros (`-J`) que acepta el plan:

- `supabase.url`  — host base (default placeholder)
- `supabase.token` — JWT bearer
- `threads` — usuarios concurrentes (default 10)
- `ramp` — segundos para alcanzar threads (default 30)
- `duration` — duración total en segundos (default 60)

> Nota Windows/Git Bash: el wrapper exporta `MSYS_NO_PATHCONV=1` para que `/plan.jmx` no se traduzca a `C:/Program Files/Git/plan.jmx` al pasarlo a Docker.

### 2.9 Calidad estática (nivel 7)

```bash
npm run sonar:up                                  # SonarQube CE en :9000
# crear token en http://localhost:9000 (admin/admin)
export SONAR_TOKEN=<token>
npm run test:coverage                             # genera lcov
npm run test:back:coverage                        # opcional, lcov del back
npm run sonar:scan
npm run sonar:down                                # apaga el contenedor
```

`sonar-project.properties` ya apunta a:

- `sonar.javascript.lcov.reportPaths=reports/coverage/front/lcov.info`
- `sonar.testExecutionReportPaths=reports/junit/front.junit.xml`

---

## 3. Reportes

Toda la salida se centraliza en `reports/` (ignorada por git).

| Reporte | Ruta | Formato |
| ------- | ---- | ------- |
| Cobertura front (HTML) | `reports/coverage/front/index.html` | Browser |
| Cobertura front (lcov) | `reports/coverage/front/lcov.info` | Sonar/CI |
| Cobertura back (lcov) | `reports/coverage/back/lcov.info` | Sonar/CI |
| JUnit front | `reports/junit/front.junit.xml` | CI |
| JUnit E2E | `reports/junit/e2e.junit.xml` | CI |
| Stryker HTML | `reports/mutation/html/index.html` | Browser |
| Stryker JSON | `reports/mutation/mutation.json` | CI |
| Playwright HTML | `reports/playwright/html/index.html` | `npm run test:e2e:report` |
| Cypress JUnit | `reports/junit/cypress-*.junit.xml` | CI |
| Cypress videos | `reports/cypress/videos/` | Browser |
| Cypress screenshots (solo en fallos) | `reports/cypress/screenshots/` | Browser |
| JMeter HTML | `reports/jmeter/html/index.html` | Browser |
| JMeter JTL | `reports/jmeter/result.jtl` | CI / análisis |
| SonarQube | `http://localhost:9000/dashboard?id=parkiupar` | Browser |

---

## 4. Cómo interpretar los reportes

### 4.1 Cobertura (Vitest v8)

Abrí `reports/coverage/front/index.html`. Mirá la columna **Branches** primero — son las que más mutantes sobreviven. Si una utilidad bajó de su umbral, el comando habrá fallado con el archivo y línea exactos.

### 4.2 Mutación (Stryker)

Reporte HTML en `reports/mutation/html/`. Cada mutante tiene estado:

- **Killed** ✅ — al menos un test falló con la mutación. Ideal.
- **Survived** ⚠️ — la mutación pasó todos los tests. Falta un caso negativo.
- **NoCoverage** ❌ — la línea no la cubre ningún test. Sumá un test.
- **Timeout** — el test tardó >TimeoutMS; suele revelar un bucle.

Si el score global cae bajo 60 hay que agregar tests antes de mergear a QA.

### 4.3 Playwright

`reports/playwright/html/`. Cada test fallido trae trace + video + screenshot. `npm run test:e2e:report` abre el index.

### 4.3.1 Cypress

`reports/cypress/videos/` contiene un MP4 por spec (siempre). `reports/cypress/screenshots/` solo aparece cuando hay fallos. JUnit por spec en `reports/junit/cypress-*.junit.xml` para ingestar en Sonar/Azure DevOps.

### 4.4 JMeter

`reports/jmeter/html/index.html`. Las pestañas relevantes:

- **Statistics**: latencia p90/p95, throughput, % error.
- **Errors**: causas si % error > 0.
- **Response Times Over Time**: detecta degradación durante el ramp-up.

Umbrales sugeridos en pre-prod: p95 < 500 ms, error rate < 1%.

### 4.5 SonarQube

Dashboard en `http://localhost:9000/dashboard?id=parkiupar`. Métricas a vigilar:

- **Quality Gate**: pasa/falla global.
- **Bugs / Vulnerabilities / Hotspots**: triage por severidad.
- **Coverage**: cruzado con el lcov subido.
- **Duplications**: > 3% es señal de refactor.

---

## 5. Flujo de ramas Dev → QA → main

```
feature/* → Dev → QA → main
```

| Rama | Propósito | Protecciones esperadas |
| ---- | --------- | ---------------------- |
| `feature/*` | Trabajo individual. PR a Dev. | Ninguna. |
| `Dev` | Integración continua. Acepta PRs de features. | Build + unit + component verdes. |
| `QA` | Validación end-to-end. Solo recibe PR desde Dev. | **Protegida**: requiere PR, status checks (niveles 1–5 + sonar), 1 aprobación QA, no force-push. |
| `main` | Producción. Solo recibe PR desde QA. | Protegida: requiere PR desde QA, todos los niveles incluyendo performance, 1 aprobación tech-lead. |

### 5.1 Pasos para abrir PR Dev → QA

1. En `Dev`, asegurate que CI esté verde: niveles 1, 1', 2, 3.
2. Localmente correr el smoke E2E: `npm run test:e2e`.
3. Abrir PR `Dev → QA` con título `qa: <feature>` y checklist:
   - [ ] Tests unitarios y componentes pasan
   - [ ] Cobertura front no bajó del umbral
   - [ ] Mutation score ≥ 60
   - [ ] E2E smoke verde
   - [ ] Migraciones Supabase aplicadas en stage QA
4. QA ejecuta en local los niveles 5, 6 y 7 con datos seed.
5. Al aprobar, merge con **squash** (mantiene historia limpia para revertir).

### 5.2 Pasos para promover QA → main

1. PR `QA → main` solo después de cerrar el cycle (todos los niveles verdes).
2. Adjuntar al PR los reportes de JMeter y SonarQube (links o screenshots).
3. Tech-lead aprueba; merge con **merge commit** para preservar la historia de QA.
4. Tag inmediato `vX.Y.Z` para trigger del despliegue prod.

---

## 6. Estructura de archivos de QA

```
.
├── docs/QA.md                          # este documento
├── sonar-project.properties            # config scanner
├── stryker.config.mjs                  # config mutation
├── vitest.config.ts                    # config front (unit/component/integration)
├── src/
│   ├── lib/utils/*.test.ts             # unitarias
│   ├── lib/api.test.ts                 # integración con MSW
│   ├── components/*.test.tsx           # componentes
│   └── test/
│       ├── setup.ts                    # hooks RTL + MSW
│       └── msw/{handlers,server}.ts    # mocks HTTP
├── supabase/functions/
│   ├── deno.json                       # tasks test / test:coverage / test:integration
│   ├── _shared/*.test.ts               # unitarias back
│   └── tests/integration/*.int.test.ts # integración back
└── tests/
    ├── e2e/
    │   ├── playwright.config.ts
    │   └── specs/*.spec.ts
    ├── cypress/
    │   ├── cypress.config.ts
    │   ├── support/{e2e,commands}.ts
    │   ├── fixtures/
    │   └── e2e/*.cy.ts
    ├── performance/
    │   ├── parkiupar.jmx
    │   ├── run-jmeter.sh
    │   └── README.md
    └── sonar/docker-compose.sonar.yml
```

---

## 7. Pre-requisitos por nivel

| Nivel | Herramienta extra | Instalación |
| ----- | ----------------- | ----------- |
| 1, 2, 3, 4 | Node 20 + npm 10 | `nvm install 20` |
| 1', 3' | Deno 1.45+ | `irm https://deno.land/install.ps1 \| iex` |
| 3' | Supabase CLI | `npm i -g supabase` |
| 5 | Browsers Playwright | `npx playwright install chromium` |
| 6, 7 | Docker Desktop | https://www.docker.com/products/docker-desktop |

---

## 8. Troubleshooting rápido

- **`Cannot find package 'jsdom'`**: ejecutar `npm install` (la dep está en devDependencies, jsdom 26 — no actualizar a 27 por incompatibilidad CJS/ESM con Node 20).
- **JMeter falla con `/plan.jmx: no such file`** en Git Bash: el wrapper ya pasa `MSYS_NO_PATHCONV=1`; si lo invocás manualmente, exportá esa variable.
- **Stryker: `vitest config not found`**: corré `npm run test:run` primero para confirmar que vitest arranca; Stryker reusa la misma config.
- **Playwright cuelga en CI**: el `webServer` espera que `vite preview` levante en `:4173`. Confirmá que `npm run build` corrió antes.
- **Sonar `JAVA_HOME` warnings**: el scanner usa la imagen oficial, no necesita Java en el host. Verificá que `docker ps` muestre `sonarqube` healthy.
- **Tests back se saltan**: faltan `SUPABASE_LOCAL_URL` / `ADMIN_JWT`. Exportalos antes de `npm run test:back:integration`.
