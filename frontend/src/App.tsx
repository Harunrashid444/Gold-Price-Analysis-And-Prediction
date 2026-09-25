import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { SeasonalityPage } from "./pages/SeasonalityPage";
import { StationarityPage } from "./pages/StationarityPage";
import { ModelsPage } from "./pages/ModelsPage";
import { ForecastPage } from "./pages/ForecastPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/seasonality" element={<SeasonalityPage />} />
          <Route path="/stationarity" element={<StationarityPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
        </Route>
      </Route>

      {/* Signed-in users landing on "/" get the dashboard instead of marketing. */}
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
