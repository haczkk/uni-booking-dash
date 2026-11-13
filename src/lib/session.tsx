import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { SessionUser } from "./api";

const KEY = "pup_user";

interface Ctx {
  user: SessionUser | null;
  ready: boolean;
  signIn: (u: SessionUser) => void;
  signOut: () => void;
}

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const signOut = () => {
    sessionStorage.removeItem(KEY);
    setUser(null);
  };

  const signIn = (u: SessionUser) => {
    sessionStorage.setItem(KEY, JSON.stringify(u));
    setUser(u);
  };

  // Real-Time Session Status Poller (Every 5 seconds)
  useEffect(() => {
    if (!user?.id) return;

    const checkSession = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/auth/verify-session?userId=${user.id}`);
        if (!res.ok) return;
        const data = await res.json();

        // 1. Account deleted by Super Admin
        if (!data.exists) {
          signOut();
          toast.error("Your account has been deleted by the Super Administrator.");
          window.location.reload(); // Force view reset
          return;
        }

        // 2. Account deactivated by Super Admin
        if (!data.active) {
          signOut();
          toast.error("Your account has been deactivated. Please contact campus administration.");
          window.location.reload(); // Force view reset
          return;
        }
      } catch (err) {
        // Ignore temporary network disconnects
      }
    };

    const timer = setInterval(checkSession, 5000);
    return () => clearInterval(timer);
  }, [user?.id]);

  return (
    <SessionContext.Provider
      value={{
        user,
        ready,
        signIn,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const c = useContext(SessionContext);
  if (!c) throw new Error("useSession outside provider");
  return c;
}

export function usePolling(fn: () => void, ms: number, deps: unknown[]) {
  useEffect(() => {
    fn();
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
