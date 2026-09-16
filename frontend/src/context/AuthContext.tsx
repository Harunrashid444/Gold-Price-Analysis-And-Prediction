import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, setToken, setUnauthorizedHandler } from "../api/client";
import { auth } from "../api/endpoints";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been validated against /auth/me. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // A 401 from any request means the token died mid-session — drop the user.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore the session on boot. This runs even with no stored token: the
  // backend also accepts its HTTP-only cookie, so a cookie alone is a valid
  // session and must not be thrown away just because localStorage is empty.
  useEffect(() => {
    const controller = new AbortController();

    auth
      .me(controller.signal)
      .then(({ user: me }) => setUser(me))
      .catch((err: unknown) => {
        // An aborted probe says nothing about the session — React's dev-mode
        // double-effect and fast navigation both cancel it. Clearing the token
        // here would sign out a perfectly valid user.
        if ((err as Error)?.name === "AbortError") return;

        // Only an outright rejection invalidates the session. If the API was
        // simply unreachable we never got an answer, so keep the token: once
        // the backend is back, a reload signs the user straight back in.
        if (err instanceof ApiError && err.status === 401) setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitializing(false);
      });

    return () => controller.abort();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await auth.register({ name, email, password });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      /* clearing the client session matters more than the server ack */
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
