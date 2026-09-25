import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Field } from "../components/ui/primitives";
import { AuthLayout } from "./AuthLayout";
import { FormAlert } from "./FormAlert";

/** Mirrors registerValidators() in backend/src/controllers/authController.js
 *  so the user sees the rule before the server repeats it. */
function validate(name: string, email: string, password: string) {
  const errors: Record<string, string> = {};

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    errors.name = "Name must be 2–80 characters";
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Password must include a letter and a number";
  }

  return errors;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const fieldErrors = { ...(error?.fieldErrors ?? {}), ...localErrors };
  // 409 (duplicate email) and connection failures belong in the banner.
  const banner = error && error.status !== 400 ? error.message : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const found = validate(name, email, password);
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setError(null);

    try {
      await register(name.trim(), email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Registration is required because every analysis endpoint on the API is protected."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brass underline underline-offset-2 hover:text-ink">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {banner && <FormAlert message={banner} />}

        <Field
          label="Name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setLocalErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={fieldErrors.name || undefined}
          required
        />

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLocalErrors((prev) => ({ ...prev, email: "" }));
          }}
          error={fieldErrors.email || undefined}
          required
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setLocalErrors((prev) => ({ ...prev, password: "" }));
          }}
          error={fieldErrors.password || undefined}
          hint="At least 8 characters, including one letter and one number."
          required
        />

        <Button type="submit" loading={submitting} fullWidth className="mt-1">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
