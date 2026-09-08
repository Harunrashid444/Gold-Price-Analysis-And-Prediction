# Final Bug Audit — Gold Price Analysis & Prediction

**Date:** 2026-08-28
**Scope:** Python pipeline → `pipeline_results.json` → Node/Express backend → MongoDB → REST API → React frontend readiness.
**Method:** Every phase and endpoint was actually executed, not just read.

---

## What was run

| Check | Command | Result |
|-------|---------|--------|
| Python deps | `python -c "import pandas,numpy,matplotlib,statsmodels,sklearn"` | OK — pandas 3.0.5, numpy 2.5.2, statsmodels 0.14.6, sklearn 1.9.0, Python 3.14.5 |
| Full pipeline | `python main.py` | Phase 1→7 ran end-to-end, plots written, no errors |
| Web export | `python export_web_results.py` | `data/web/pipeline_results.json` regenerated successfully |
| Backend boot | `node src/server.js` | Connected to MongoDB, seeded collections, listening on :5000 |
| Health | `GET /api/health` | `{ ok:true, db:"mongo", emailProvider:"pending" }` |
| Register / Login | `POST /api/auth/register`, `/login` | 201 / 200, returns `{ user, token }` |
| Auth me | `GET /api/auth/me` (Bearer + Cookie) | 200 with user; 401 without token |
| Change password | `POST /api/auth/change-password` | 200, new password works |
| Forgot / Reset | `POST /api/auth/forgot-password`, `/reset-password` | 200, reset token logged, reset succeeds, login with new password works |
| Logout | `POST /api/auth/logout` | 200, clears cookie |
| Data endpoints | `overview, gold/:d, analysis/:d, seasonality/:d, stationarity/:d, models/:d, forecast/:d` | All 200 with correct JSON shapes for `global` and `india` |
| Protected routes | data endpoints without token | 401 |
| Invalid dataset | `GET /api/models/foobar` | 404 `Unknown dataset: foobar...` |
| Unknown route | `GET /api/nope` | 404 `Route not found...` |
| CORS | preflight from `http://localhost:5173` | `Access-Control-Allow-Origin` + `Allow-Credentials: true` |

---

## Findings

### A. BLOCKING BUGS
**None.**

### B. IMPORTANT BUGS
**None.**

### C. MINOR / COSMETIC (left unchanged, per audit rules)

1. **Indian forecast dates land on day 30 instead of true month-end.**
   `src/forecast.py` computes `future_date = last_date + pd.DateOffset(months=step)`.
   The last processed Indian date is `2018-11-30`, so the offset keeps the day component `30`
   → forecast rows read `2018-12-30, 2019-01-30, 2019-02-28, …` instead of `12-31, 01-31, …`.
   The global series is unaffected only because its last date is `2018-08-31`.
   Impact: purely cosmetic date labels. Values are valid ISO dates, strictly increasing,
   and render fine in charts. Not a calculation error. **Not changed.**

2. **`backend/.env` contains a weak dev JWT secret** (`dev-only-change-me-before-any-real-use`).
   It passes the 16-char guard and is fine for a local college demo. The file is **git-ignored
   and not tracked**, so it is not a repository leak. **Not changed.**

3. **`docs/API.md` describes auth as cookie-only.** The implementation accepts *both* a
   `Bearer` header and the `token` cookie (`backend/src/middleware/auth.js`). The doc is not
   *wrong* (cookies do work and are set on login), just incomplete. **Not changed.**

### D. NO ISSUE
- Phase ordering in `main.py` (1→2→3→6→7, with 6 re-running 4+5 and 7 re-running 4) is intentional and documented.
- All file paths use `Path(__file__).resolve().parent…` — run-from-root safe. `pipelineData.js` resolves the JSON via `__dirname`, not CWD.
- `env.js` loads root `.env` then `backend/.env` as override; requires `JWT_SECRET`, enforces ≥16 chars.
- MongoDB failure falls back to an in-memory user store (`db.js` + `userStore.js`); `MEMORY_DB=true` forces it.
- `pipeline_results.json` structure matches every controller access path (`datasets/analysis/seasonality/stationarity/models/forecast`, plus top-level `disclaimer`, `forecastHorizonMonths`, `forecastModelNote`).
- Password hashes never leak: memory + mongo stores both return a `publicUser` projection; `passwordHash` is `select:false` in the schema.
- CORS `origin` is bound to `CLIENT_URL` with `credentials:true` — correct for a local Vite React app.

---

## CHANGES MADE

**`docs/API.md`** — one factually-incorrect line corrected:

```diff
- *(Name is optional. Password must be at least 8 characters and include at least one letter and one number).*
+ *(Name is required and must be 2–80 characters. Password must be at least 8 characters and include at least one letter and one number).*
```

Reason: `registerValidators()` in `backend/src/controllers/authController.js` requires
`name` to be 2–80 characters. A frontend built from the old doc would omit the field and
every registration request would fail validation with `400`.

Re-verified after change: `POST /api/auth/register` without `name` →
`400 {"error":"Validation failed","details":[{"field":"name","message":"Name must be 2–80 characters"}]}`
(matches the corrected doc). `POST /api/auth/register` with a valid `name` → `201`.

---

## PROJECT STATUS

- Python pipeline: **PASS**
- Backend: **PASS**
- MongoDB: **PASS**
- Authentication: **PASS**
- REST API: **PASS**
- Frontend integration readiness: **PASS**
- Documentation: **PASS** (one factual line fixed)
- Git/security: **PASS** (no secrets tracked; `.env` files git-ignored)

## BUGS FOUND
- None blocking. None important. Two cosmetic items (Indian forecast date-of-month label; weak local dev JWT secret) documented above and deliberately left unchanged.

## FINAL VERDICT
**READY FOR FRONTEND.**
