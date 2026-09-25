# Frontend — Gold Price Analytics

React + TypeScript + Vite + Tailwind CSS interface for the existing project API.
It renders what the Python pipeline produced; it does not recompute any analysis.

---

## Running it

The frontend needs the Express API running first.

```bash
# 1. API (from the repository root)
cd backend
npm install
npm start          # http://localhost:5000
```

```bash
# 2. Frontend (from the repository root)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Open http://localhost:5173.

> The backend's CORS allow-list is its `CLIENT_URL`, which defaults to
> `http://localhost:5173` — the Vite port this project is configured to use.
> If you change the frontend port, set `CLIENT_URL` in `backend/.env` to match.

### Other commands

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally (port 4173)
```

> `npm run preview` serves on **port 4173**, which the backend's CORS allow-list does
> not include. To exercise the production build against the API, set
> `CLIENT_URL=http://localhost:4173` in `backend/.env` and restart the backend.
> Without that you will see a CORS error in the console and stay on the landing page —
> that is the allow-list working, not a bug.

---

## Configuration

The API base URL is the only setting, read from an environment variable — it is
never hardcoded in components.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Base URL of the Express API, no trailing slash |

`.env` is git-ignored. A local one is already present with the default above; copy
`.env.example` to `.env` if you ever need to recreate or change it.

---

## Structure

```
src/
  api/
    types.ts        Response types mirroring the actual controllers
    client.ts       fetch wrapper: base URL, JWT header, error envelope, 401 handling
    endpoints.ts    One typed function per route — components never call fetch
  context/
    AuthContext     Session state, login/register/logout, boot restore
    DatasetContext  The shared Global/India selection
  hooks/useApi.ts   Loading / error / data with abort-on-change
  components/
    ui/             Button, Field, Panel, Section, Stat, Badge, states, Async
    charts/         ChartKit (shared axis/tooltip/legend) + one file per chart
    layout/         AppShell, sidebar/drawer, dataset switcher, route guards
  pages/            One file per screen
  lib/format.ts     Date, currency and metric formatting
```

### API layer

Every screen goes through `useApi` + `Async`, so loading, error and empty
states are handled in one place rather than repeated per page:

```tsx
const state = useApi(signal => data.models(dataset, signal), [dataset]);

<Async state={state}>{result => /* render */}</Async>
```

Switching dataset aborts the in-flight request, so a fast toggle cannot let a
stale response overwrite a newer one.

---

## Authentication

Uses the existing backend flow unchanged (`/api/auth/*`). No new auth system.

- `login` / `register` return `{ user, token }` **and** set an HTTP-only cookie.
- The token is kept in `localStorage` and sent as `Authorization: Bearer …`;
  requests also run with `credentials: "include"` so the cookie works too.
- On boot the app calls `/auth/me` to restore the session. It does this **even
  with no stored token**, because the cookie alone is a valid session.
- The token is cleared only on a real `401`. If the API is simply unreachable we
  never got an answer, so the session is kept and a reload restores it.
- Analysis routes are wrapped in `ProtectedRoute`; unauthenticated visitors are
  redirected to `/login` and returned to their original destination afterwards.

---

## Screens

| Route | Pipeline phase | Shows |
|---|---|---|
| `/` | — | Landing page (redirects to the dashboard when signed in) |
| `/login`, `/register` | — | Authentication |
| `/dashboard` | — | Both markets, latest values, all model scores |
| `/analysis` | 2 | Historical price + trend, yearly and monthly averages |
| `/seasonality` | 2 | Calendar-month pattern, wedding-season check (India only) |
| `/stationarity` | 3 | ADF tables, differencing order, ACF and PACF |
| `/models` | 4–6 | Regression vs SARIMA, R², RMSE, actual vs predicted |
| `/forecast` | 7 | 12-month projection with bounds |

Global/India switching applies to every screen except the dashboard, which
always shows both. The selection persists across reloads.

---

## Notes on presenting the data honestly

The interface deliberately does not overstate the results:

- The wedding-season section reports whatever the pipeline concluded. With the
  current data that is a **+0.79% difference**, labelled *“Weak / inconclusive”*,
  with the pipeline's own conclusion and its no-causation caveat shown verbatim.
- `weddingSeason` is `null` for the global series, which renders an explicit
  “not applicable” state rather than a blank panel.
- A negative R² (SARIMA on the global series scores −0.0019) is shown in full and
  explained as *worse than a flat average*, not hidden or clamped.
- Forecasts are labelled as model estimates, and the band is described as an
  approximate `± 1.96 × RMSE` margin, not a rigorous prediction interval.
- The winning model is described as the outcome of this project's own evaluation.

---

## Design

A single light theme: warm paper ground, ink typography, hairline rules, and a
restrained brass accent used mainly for the active state and the Indian series.
Serif (Source Serif 4) for headings, Inter for UI, tabular figures wherever
numbers are aligned. Charts share one axis/tooltip/legend system defined in
`components/charts/ChartKit.tsx`.
