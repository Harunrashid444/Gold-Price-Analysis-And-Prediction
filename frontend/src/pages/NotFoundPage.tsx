import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "../components/layout/Brand";

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md text-center">
        <BrandMark className="mx-auto" />
        <p className="eyebrow mt-6">Error 404</p>
        <h1 className="mt-3 font-serif text-[1.75rem] leading-tight font-semibold text-ink">
          This page does not exist
        </h1>
        <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-2">
          The address you followed is not part of this application.
        </p>
        <Link
          to={user ? "/dashboard" : "/"}
          className="mt-7 inline-flex rounded-[3px] border border-ink bg-ink px-5 py-2.5 text-[0.8125rem] font-medium text-canvas transition-colors hover:bg-black"
        >
          {user ? "Back to overview" : "Back to start"}
        </Link>
      </div>
    </div>
  );
}
