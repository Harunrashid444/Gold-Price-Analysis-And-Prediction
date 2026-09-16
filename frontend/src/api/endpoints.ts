/**
 * Typed wrappers for every route the backend actually exposes
 * (backend/src/routes/auth.js and backend/src/routes/api.js).
 * Components never call fetch directly — they go through here.
 */
import { request } from "./client";
import type {
  AnalysisResponse,
  AuthResponse,
  DatasetKey,
  ForecastResponse,
  GoldSeriesResponse,
  ModelsResponse,
  OverviewResponse,
  SeasonalityResponse,
  StationarityResponse,
  User,
} from "./types";

/* ---------------- auth ---------------- */

export const auth = {
  register: (input: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
      skipAuthRedirect: true,
    }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: input,
      skipAuthRedirect: true,
    }),

  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  me: (signal?: AbortSignal) =>
    request<{ user: User }>("/auth/me", { skipAuthRedirect: true, signal }),
};

/* ---------------- analysis ---------------- */

export const data = {
  overview: (signal?: AbortSignal) => request<OverviewResponse>("/overview", { signal }),

  gold: (dataset: DatasetKey, signal?: AbortSignal) =>
    request<GoldSeriesResponse>(`/gold/${dataset}`, { signal }),

  analysis: (dataset: DatasetKey, signal?: AbortSignal) =>
    request<AnalysisResponse>(`/analysis/${dataset}`, { signal }),

  seasonality: (dataset: DatasetKey, signal?: AbortSignal) =>
    request<SeasonalityResponse>(`/seasonality/${dataset}`, { signal }),

  stationarity: (dataset: DatasetKey, signal?: AbortSignal) =>
    request<StationarityResponse>(`/stationarity/${dataset}`, { signal }),

  models: (dataset: DatasetKey, signal?: AbortSignal) =>
    request<ModelsResponse>(`/models/${dataset}`, { signal }),

  forecast: (dataset: DatasetKey, signal?: AbortSignal) =>
    request<ForecastResponse>(`/forecast/${dataset}`, { signal }),
};
