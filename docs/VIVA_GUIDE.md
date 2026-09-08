# Viva / Inspection Support Guide
### Gold Price Analysis & Prediction using Time Series Modeling (MCA Mini Project)

This document helps you explain and defend the project during a viva. It covers the
big picture, every phase, the backend, the database, the API, and the most likely
examiner questions with ready answers.

---

## 1. One-paragraph project summary

> The project analyses historical gold prices for two markets — **global (USD, World Gold
> Council, 1978–2018, monthly)** and **India (INR, scraped daily and resampled to monthly,
> 2011–2018)** — and forecasts the next 12 months. A Python pipeline (`main.py`) runs seven
> phases: data preparation, exploratory trend/seasonality analysis, stationarity testing
> (ADF + ACF/PACF), Multiple Regression, SARIMA, model comparison (R²/RMSE), and a future
> forecast using whichever model actually performed better. A separate script
> (`export_web_results.py`) serialises all pipeline outputs into a single
> `data/web/pipeline_results.json`. A **Node.js/Express** backend reads that JSON, stores
> users and results in **MongoDB** (with an in-memory fallback), provides **JWT
> authentication**, and exposes a **REST API** that a **React** frontend consumes.

---

## 2. Architecture / data flow

```
 raw CSVs                 Python pipeline (src/*.py, orchestrated by main.py)
 data/raw/         ─────►  Phase 1 prepare_data  ─►  data/processed/*.csv
                          Phase 2 analysis (EDA, trend, seasonality, wedding season)
                          Phase 3 stationarity (ADF test, ACF/PACF, differencing order d)
                          Phase 4 regression (Multiple Linear Regression on lag features)
                          Phase 5 sarima (SARIMA candidates, pick lowest test RMSE)
                          Phase 6 evaluation (R²/RMSE comparison table, declare winner)
                          Phase 7 forecast (recursive 12-month forecast with winner model)
                                        │
                    export_web_results.py  (wraps the same functions, no re-implementation)
                                        ▼
                          data/web/pipeline_results.json   ← single hand-off file
                                        │
   Node/Express backend (backend/src)   ▼
                          pipelineData.js  loads + caches the JSON
                          seedPipeline.js  copies series/metrics/forecast into MongoDB
                          authController + JWT middleware  →  /api/auth/*
                          analysisController              →  /api/overview, /api/gold/:d, ...
                                        │
                                        ▼
                          React frontend  (fetch with credentials + Bearer token)
```

**Key design choice:** Python does *all* the maths. The backend never re-computes a model —
it only serves what the pipeline produced. This keeps the ML reproducible and the API thin.

---

## 3. Phase-by-phase explanation

### Phase 1 — Data preparation (`src/prepare_data.py`)
- **Global:** already monthly and clean. Standardises column names (`Name→Date`,
  `US dollar→Price_USD`), parses dates, sorts, drops a stray unnamed index column.
  Asserts unique dates and no missing prices.
- **India:** the synopsis *claims* monthly, but the raw file is actually **daily**
  (2011-01-01 to 2018-11-16). It is resampled to **calendar month-end mean** (`resample("ME").mean()`).
  Raw daily data is preserved untouched in `data/raw/`.
- Output: `data/processed/global_gold_monthly.csv`, `data/processed/indian_gold_monthly.csv`.

### Phase 2 — EDA / trend & seasonality (`src/analysis.py`)
- Plots the price series with a moving-average trend line (12-month global, 6-month India).
- Yearly averages and **average price by calendar month** (seasonality).
- **Wedding-season check** (India): months `[3,4,10,11,12]` vs the rest. Reports the
  percentage difference and whether wedding months dominate the top-3 highest months.
  Deliberately phrased as *correlation, not causation*.

### Phase 3 — Stationarity & ACF/PACF (`src/stationarity.py`)
- **ADF (Augmented Dickey–Fuller) test.** H0 = series has a unit root (non-stationary).
  p-value < 0.05 ⇒ stationary.
- Differences the series repeatedly (max `d=2`) until ADF says stationary; records the
  differencing order `d`.
- **Log-transform check:** only prefers `log(price)` if it needs *fewer* differences than
  the raw series — otherwise keeps raw (simpler).
- Saves ACF and PACF plots of the final stationary series (needed to choose SARIMA orders).

### Phase 4 — Multiple Regression (`src/regression.py`)
- Features (all shifted so the current month's price is never used to predict itself):
  `lag_1`, `lag_2`, `ma_3` (3-month MA of past prices), `ma_12` (12-month MA of past prices).
- First 12 rows dropped (needed for `ma_12`).
- **Chronological 80/20 split** (no shuffling — it is time-series data).
- `sklearn.linear_model.LinearRegression`. Reports coefficients, R², RMSE on the test set.

### Phase 5 — SARIMA (`src/sarima.py`)
- **SARIMA = Seasonal ARIMA** = ARIMA(p,d,q) + seasonal (P,D,Q,s) with s=12 (yearly).
- A *small, ACF/PACF-informed* candidate list per series (no big grid search) — e.g. global
  tries `ARIMA(1,1,0)`, `(0,1,1)`, `(1,1,1)`, and one seasonal `(1,1,1)(1,0,0,12)`.
- Test window is **aligned to Phase 4's test dates** (same 12-month warm-up + 80/20 split)
  so Phase 6 compares both models on the identical window.
- Picks the candidate with the **lowest test RMSE**. `statsmodels.tsa.statespace.sarimax.SARIMAX`.

### Phase 6 — Model comparison (`src/evaluation.py`)
- Builds an R²/RMSE table for Regression vs SARIMA for each series.
- **Winner = lowest test RMSE.** In the current data, **Multiple Regression wins for both
  series** — SARIMA produces one static multi-step forecast across a long test horizon and
  drifts, while regression re-anchors on each month's real recent prices.

### Phase 7 — Future forecast (`src/forecast.py`)
- Refits the winning model (**Multiple Regression**) on the **full** history.
- **Recursive forecasting:** predict next month → feed that prediction back in as the latest
  "known" price → build next month's lag/MA features → repeat for 12 months.
- Confidence band: `predicted ± 1.96 × (Phase 4 test RMSE)` — explicitly labelled an
  *approximate* band, not a rigorous prediction interval.

### Web export (`export_web_results.py`)
- Imports the same Phase 2–7 functions — **does not re-implement any model** — and
  serialises everything (with NumPy/pandas types converted to native JSON) into
  `data/web/pipeline_results.json`.

---

## 4. Backend (Node.js / Express)

| Concern | Where | Notes |
|--------|-------|-------|
| Entry point | `backend/src/server.js` | loads env → loads pipeline JSON → CORS → JSON body → cookies → DB connect → seed → routes → error handler → listen |
| Env loading | `config/env.js` | root `.env` then `backend/.env` override; **requires `JWT_SECRET` (≥16 chars)** |
| DB | `config/db.js` | `mongoose.connect`; on failure or `MEMORY_DB=true` → in-memory user store |
| User store | `services/userStore.js` | two implementations (mongo / memory) with the same interface; passwords hashed with **bcryptjs, cost 12**; `passwordHash` never returned to clients |
| Auth | `controllers/authController.js` | JWT signed with `{ sub: userId }`; set as HTTP-only cookie **and** returned in the JSON body |
| Auth middleware | `middleware/auth.js` | accepts `Authorization: Bearer <token>` **or** the `token` cookie |
| Validation | `express-validator` + `middleware/validate.js` | returns `400 { error:"Validation failed", details:[...] }` |
| Errors | `middleware/errorHandler.js` | `HttpError(status, message)`; unknown route → `404 Route not found` |
| Pipeline data | `services/pipelineData.js` | loads + **caches** `data/web/pipeline_results.json`; throws a clear message if it is missing |
| Seeding | `services/seedPipeline.js` | only when DB mode is `mongo`; wipes + re-inserts `GoldPrice`, `ModelResult`, `Forecast` per dataset |

**Run the backend:**
```bash
cd backend
npm install
npm start        # or: npm run dev  (node --watch)
```

---

## 5. MongoDB

- Connection string in `backend/.env` → `MONGODB_URI` (default `mongodb://127.0.0.1:27017/gold_price_analysis`).
- Collections: `users` (auth), plus `goldprices`, `modelresults`, `forecasts` (seeded from the pipeline JSON on every startup).
- **Fallback:** if MongoDB is not running, the server logs a warning and switches to an
  in-memory user store so the demo still works. Set `MEMORY_DB=true` to do this on purpose.
- Why both? MongoDB shows real persistence/auth; the fallback guarantees the project runs
  on any machine during evaluation even without a Mongo install.

---

## 6. REST API (all under `/api`)

### Auth (`/api/auth`)
| Method & path | Auth | Purpose |
|---|---|---|
| `POST /register` | – | create account. Body: `name` (2–80, **required**), `email`, `password` (≥8, letter+number). Returns `{ user, token }`, sets cookie. |
| `POST /login` | – | returns `{ user, token }`, sets cookie |
| `POST /logout` | – | clears cookie |
| `GET /me` | ✔ | current user `{ user: { id, name, email, ... } }` |
| `POST /change-password` | ✔ | `currentPassword`, `newPassword` |
| `POST /forgot-password` | – | always `200` (no email enumeration); reset link logged to console when SMTP is unset |
| `POST /reset-password` | – | `token`, `password` |

### Data & analysis (`/api`, **all require auth**)
| Path | Returns |
|---|---|
| `GET /overview` | `{ disclaimer, forecastHorizonMonths, datasets, winners, metrics }` |
| `GET /gold/:dataset` | `{ dataset, series:[{date,price}] }` |
| `GET /analysis/:dataset` | `{ dataset, historical, yearly, monthly }` |
| `GET /seasonality/:dataset` | `{ dataset, monthly, weddingSeason }` |
| `GET /stationarity/:dataset` | `{ dataset, logNeeded, seriesUsed, differencingOrder, rawHistory, logHistory, acf, pacf, explanation }` |
| `GET /models/:dataset` | `{ dataset, winner, regression, sarima, comparison }` |
| `GET /forecast/:dataset` | `{ dataset, historical, model, horizonMonths, points, disclaimer, forecastModelNote }` |
| `GET /health` | `{ ok, db, emailProvider }` |

`:dataset` accepts `global`, `india` (and `indian` as an alias). Unknown → `404`.

---

## 7. Frontend (React + TypeScript + Vite + Tailwind)

Located in `frontend/`. It **consumes** the API and renders the pipeline's results —
it performs no analysis of its own. See `frontend/README.md` for full detail.

**Run it:** `cd frontend && npm install && npm run dev` → http://localhost:5173
(the backend must already be running on port 5000).

- **Base URL:** read from `VITE_API_BASE_URL` (default `http://localhost:5000/api`) —
  configured in one place, never hardcoded in components.
- **CORS:** the backend allows exactly `CLIENT_URL` (default `http://localhost:5173`,
  the Vite port) with `credentials: true`. Change both together if you change the port.
- **Auth:** login/register return `{ user, token }` and set an HTTP-only cookie. The app
  sends `Authorization: Bearer <token>` and also `credentials: "include"`, so either
  mechanism works. On boot it calls `/auth/me` to restore the session — including when
  localStorage is empty, since the cookie alone is a valid session.
- **Protected routes:** `ProtectedRoute` redirects unauthenticated visitors to `/login`
  and returns them to their original destination after signing in.
- **Pages:** landing, login, register, dashboard, analysis, seasonality, stationarity,
  model comparison, forecast — mapped to pipeline phases in the sidebar (P2, P3, P4–6, P7).
- **Dataset switching:** one Global/India control in the top bar drives every analysis
  page; the choice persists across reloads.
- **Charts:** Recharts, with a shared axis/tooltip/legend system so every chart matches.

**Likely question — "does the frontend recompute anything?"**
No. All numbers come from `data/web/pipeline_results.json` via the API. The frontend
formats and plots them; it never fits a model or runs a statistical test.

---

## 8. Likely examiner questions & answers

**Q: Why Multiple Regression *and* SARIMA?**
A: The synopsis asks for both. They are complementary: regression is a simple supervised
model on engineered lag features; SARIMA is a classical statistical time-series model.
Phase 6 compares them fairly on the same test window and reports whichever actually wins.

**Q: Which model won and why?**
A: Multiple Regression, for both series (lower test RMSE). SARIMA makes one static
multi-step forecast over a long test horizon and drifts away from the actuals, whereas the
regression model is re-fed the real recent prices each month, so it stays anchored.

**Q: What is stationarity and how did you test it?**
A: A stationary series has statistical properties (mean, variance, autocorrelation) that do
not change over time. We used the **ADF test**: null hypothesis = unit root (non-stationary);
p-value below 0.05 ⇒ reject ⇒ stationary. We difference the series until it becomes
stationary and record the order `d`.

**Q: What do ACF and PACF tell you?**
A: ACF (autocorrelation) and PACF (partial autocorrelation) plots suggest the AR order `p`
(PACF cut-off) and MA order `q` (ACF cut-off) for ARIMA/SARIMA. We used them to pick a
*small* set of sensible candidate orders instead of brute-forcing a grid.

**Q: Why resample the Indian data?**
A: The synopsis says it is monthly, but the raw file is daily. We take the monthly mean so
both datasets share the same monthly granularity. The raw daily file is kept unchanged.

**Q: Is the forecast band a real confidence interval?**
A: No, and we say so explicitly. It is `prediction ± 1.96 × test RMSE` — a simple,
explainable approximation suitable for a mini-project, not a rigorous statistical interval.

**Q: How is future forecasting done without future feature values?**
A: Recursively. We predict month t+1, then treat that prediction as the latest known price
to build the lag/moving-average features for t+2, and so on for 12 months.

**Q: Why a separate `pipeline_results.json` instead of the backend calling Python?**
A: Separation of concerns and reproducibility. Python owns all analysis; the JSON is a
stable contract; the backend stays a thin, fast API with no Python runtime dependency.

**Q: How does authentication work?**
A: On register/login the server signs a JWT (`HS256`, payload `{ sub: userId }`) with
`JWT_SECRET`, sets it as an HTTP-only cookie and also returns it in the body. Protected
routes run `requireAuth`, which verifies the token from the `Bearer` header or the cookie
and attaches `req.userId`.

**Q: Are passwords stored safely?**
A: Yes — hashed with bcrypt (cost 12). The hash field is `select: false` in the schema and
is stripped from every response by a `publicUser` projection.

**Q: What happens if MongoDB is down?**
A: The server logs a warning and falls back to an in-memory user store so the demo still
runs. `MEMORY_DB=true` selects this deliberately.

**Q: How do you prevent email enumeration on forgot-password?**
A: The endpoint always returns `200` with the same message whether or not the email exists.

**Q: Is there data leakage in the regression features?**
A: No. Every feature is `shift(1)` or more — it only uses information available *before* the
month being predicted. The train/test split is chronological, never shuffled.

**Q: Any known limitations?**
A: (1) Small datasets, especially India (~95 monthly points). (2) The forecast band is
approximate. (3) SARIMA candidate search is intentionally tiny. (4) Data ends in 2018 — this
is a historical academic study, not a live price service (stated in the `disclaimer`).
(5) In the Indian 12-month forecast, the date labels fall on day-30 rather than the exact
month-end (e.g. `2019-01-30`) — a cosmetic labelling quirk of the date offset; the values
and ordering are correct.

---

## 9. How to run the whole thing (demo script)

```bash
# 1. Python pipeline (from repo root)
pip install -r requirements.txt
python main.py                 # runs Phase 1..7, prints results, writes plots/
python export_web_results.py   # writes data/web/pipeline_results.json

# 2. Backend
cd backend
npm install
copy .env.example .env         # (Windows)  — then edit JWT_SECRET
npm start                      # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev                    # http://localhost:5173

# 4. Quick API smoke test
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" ^
     -d "{\"name\":\"Demo User\",\"email\":\"demo@test.com\",\"password\":\"Password1\"}"
```

**Demo flow for the viva:** open http://localhost:5173 → Create account → the dashboard
shows both markets → switch Global/India in the top bar → walk Price Analysis →
Seasonality → Stationarity → Model Comparison → Forecast → Sign out.

---

## 10. File map (what to point at during the viva)

| Topic | File |
|---|---|
| Orchestration | `main.py` |
| Data prep | `src/prepare_data.py` |
| EDA / seasonality | `src/analysis.py` |
| Stationarity / ADF / ACF-PACF | `src/stationarity.py` |
| Multiple Regression | `src/regression.py` |
| SARIMA | `src/sarima.py` |
| Model comparison | `src/evaluation.py` |
| Future forecast | `src/forecast.py` |
| JSON export for web | `export_web_results.py` |
| API server | `backend/src/server.js` |
| Auth logic | `backend/src/controllers/authController.js`, `backend/src/middleware/auth.js` |
| Data endpoints | `backend/src/controllers/analysisController.js` |
| DB + fallback | `backend/src/config/db.js`, `backend/src/services/userStore.js` |
| API reference | `docs/API.md` |
| Frontend API layer | `frontend/src/api/` (`client.ts`, `endpoints.ts`, `types.ts`) |
| Frontend auth | `frontend/src/context/AuthContext.tsx`, `components/layout/ProtectedRoute.tsx` |
| Frontend screens | `frontend/src/pages/` |
| Frontend charts | `frontend/src/components/charts/` |
| Frontend notes | `frontend/README.md` |
| This audit | `docs/FINAL_BUG_AUDIT.md` |
