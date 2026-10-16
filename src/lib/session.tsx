import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  return (
    <SessionContext.Provider
      value={{
        user,
        ready,
        signIn: (u) => {
          sessionStorage.setItem(KEY, JSON.stringify(u));
          setUser(u);
        },
        signOut: () => {
          sessionStorage.removeItem(KEY);
          setUser(null);
        },
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

/** Calls fn now and every `ms` while mounted. */
export function usePolling(fn: () => void, ms: number, deps: unknown[]) {
  useEffect(() => {
    fn();
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
