# App Mundial 2026

Web app híbrida para seguir el **FIFA World Cup 2026**: calendario completo (datos estáticos) y resultados/clasificación actualizados desde scripts de servidor.

Interfaz en español con identidad visual **#Somos26**.

## Arquitectura

```
Datos fijos (TheStatsAPI + openfootball)
  → scripts/import-static-data.js
  → public/data/base-*.json

Datos dinámicos (Football-Data.org, solo servidor)
  → scripts/update-results.js
  → scripts/update-standings.js
  → public/data/live-*.json

Fusión
  → scripts/build-app-data.js
  → public/data/app-data.json

Frontend (solo fetch local)
  → public/js/dataService.js lee data/app-data.json (ruta relativa)
```

El token `FOOTBALL_DATA_TOKEN` **nunca** llega al navegador.

## Requisitos

- [Node.js](https://nodejs.org/) 18+
- Token gratuito en [Football-Data.org](https://www.football-data.org/) (para resultados y clasificación)

## Configuración rápida

```bash
# 1. Variables de entorno
cp .env.example .env
# Edita .env y añade FOOTBALL_DATA_TOKEN=tu_token

# 2. Importar calendario, equipos y estadios
npm run import:static

# 3. (Opcional) Actualizar resultados y clasificación
npm run update:all

# 4. Arrancar servidor
npm start
# → http://localhost:3001
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run import:static` | Descarga calendario TheStatsAPI, valida con openfootball |
| `npm run update:results` | Actualiza `live-results.json` desde Football-Data.org |
| `npm run update:standings` | Actualiza `live-standings.json` |
| `npm run build:data` | Fusiona todo en `app-data.json` |
| `npm run update:all` | results + standings + build (para cron) |
| `npm run setup` | import:static + build:data (primera instalación) |
| `npm start` | Sirve `public/` en localhost:3001 |

## Estructura

```
appMundial/
├── public/
│   ├── index.html
│   ├── css/styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── dataService.js
│   │   ├── renderMatches.js
│   │   ├── renderGroups.js
│   │   ├── filters.js
│   │   └── merge.js
│   └── data/
│       ├── base-fixtures.json
│       ├── base-teams.json
│       ├── base-stadiums.json
│       ├── live-results.json
│       ├── live-standings.json
│       └── app-data.json
├── scripts/
│   ├── import-static-data.js
│   ├── update-results.js
│   ├── update-standings.js
│   ├── build-app-data.js
│   └── lib/
├── server.js
├── load-env.js
└── .env.example
```

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `FOOTBALL_DATA_TOKEN` | Token Football-Data.org — **solo en servidor** |
| `PORT` | Puerto local (default: 3001) |

## Comportamiento ante fallos

- Si Football-Data.org falla, los scripts **conservan** el último `live-*.json` válido.
- El frontend sigue mostrando el calendario completo desde datos estáticos.
- Cada JSON incluye `lastUpdated` para saber cuándo se actualizó.

## Despliegue gratuito (GitHub Pages)

Hosting recomendado: **GitHub Pages + GitHub Actions** (0 €, HTTPS, funciona en móvil).

### 1. Subir el repositorio

```bash
git init
git add .
git commit -m "App Mundial 2026"
git remote add origin https://github.com/TU_USUARIO/app-mundial-2026.git
git push -u origin main
```

### 2. Configurar secret

En GitHub: **Settings → Secrets and variables → Actions → New repository secret**

- Nombre: `FOOTBALL_DATA_TOKEN`
- Valor: tu token de [Football-Data.org](https://www.football-data.org/)

### 3. Activar GitHub Pages

En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**

### 4. Primera carga de datos

Opción A — localmente antes del push:

```bash
npm run setup
npm run update:all
git add public/data/
git commit -m "chore: initial data"
git push
```

Opción B — tras el push, en la pestaña **Actions**, ejecuta manualmente el workflow **Update WC26 data**.

### 5. URL pública

Tras el primer deploy: `https://TU_USUARIO.github.io/app-mundial-2026/`

Los workflows en [`.github/workflows/`](.github/workflows/) hacen lo siguiente:

| Workflow | Función |
|----------|---------|
| `update-data.yml` | Cada 15 min actualiza los JSON y hace commit |
| `deploy-pages.yml` | Publica la carpeta `public/` en GitHub Pages |

## Acceso desde móvil

1. Abre la URL de GitHub Pages en Chrome (Android) o Safari (iPhone).
2. **Android:** Menú ⋮ → "Añadir a pantalla de inicio".
3. **iPhone:** Compartir → "Añadir a pantalla de inicio".
4. La app queda como icono en la pantalla de inicio (PWA ligera vía `manifest.json`).

La interfaz está optimizada para móvil: menú hamburguesa, tarjetas apiladas, tablas con scroll horizontal y botones táctiles de 44px.

## Actualización automática (cron local)

Para ejecutar periódicamente en tu máquina:

```bash
npm run update:all
```

En producción, GitHub Actions ejecuta `update:all` automáticamente (ver sección Despliegue).

## Fuentes de datos

| Dato | Fuente | Dónde |
|------|--------|-------|
| Calendario, estadios, grupos | [TheStatsAPI](https://www.thestatsapi.com/world-cup/data) | `base-*.json` |
| Validación cruzada | [openfootball](https://github.com/openfootball/worldcup.json) | import script |
| Resultados y clasificación | [Football-Data.org](https://www.football-data.org/) | `live-*.json` |

## Licencia y atribución

Datos de calendario: TheStatsAPI (atribución requerida). Datos en vivo: Football-Data.org bajo sus términos. FIFA World Cup 2026™ es marca de FIFA.
