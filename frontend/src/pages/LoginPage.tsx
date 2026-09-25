import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Field } from "../components/ui/primitives";
import { AuthLayout } from "./AuthLayout";
import { FormAlert } from "./FormAlert";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fieldErrors = error?.fieldErrors ?? {};
  // 401 is a credential failure, not a per-field problem — show it as a banner.
  const banner = error && error.status !== 400 ? error.message : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Sign-in failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access the analysis, model comparison and forecast for both markets."
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-medium text-brass underline underline-offset-2 hover:text-ink">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {banner && <FormAlert message={banner} />}

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />

        <Button type="submit" loading={submitting} fullWidth className="mt-1">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
