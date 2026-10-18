import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider, useSession } from "@/lib/session";
import { Navbar } from "@/components/pup/Navbar";
import { Landing } from "@/components/pup/Landing";
import { AuthDialogs } from "@/components/pup/AuthDialogs";
import { PresidentView } from "@/components/pup/PresidentView";
import { AdminView } from "@/components/pup/AdminView";
import { SuperAdminView } from "@/components/pup/SuperAdminView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PUP San Pedro · Equipment & Room Reservation" },
      { name: "description", content: "Reserve rooms and equipment at PUP San Pedro Campus with live availability and official pickup vouchers." },
      { property: "og:title", content: "PUP San Pedro · Equipment & Room Reservation" },
      { property: "og:description", content: "Live availability, pickup vouchers and admin operations for PUP San Pedro Campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SessionProvider>
      <App />
      <Toaster richColors position="top-right" />
    </SessionProvider>
  ),
});

const TABS: Record<string, { id: string; label: string; title: string }[]> = {
  CLASS_PRESIDENT: [{ id: "pres", label: "Reservations", title: "Reservations" }],
  ADMIN: [{ id: "admin", label: "Operations", title: "Operations" }],
  SUPER_ADMIN: [
    { id: "super", label: "Home", title: "Home" },
    { id: "admin", label: "Operations", title: "Operations" },
    { id: "pres", label: "Reservations", title: "Reservations" },
  ],
};

function App() {
  const { user, ready } = useSession();
  const [mode, setMode] = useState<"login" | "register" | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const tabs = user ? TABS[user.role] ?? [] : [];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <div className="min-h-screen bg-background">
      {ready && !user && <Landing onRegister={() => setMode("register")} />}
      {user && current && (
        <>
          <Navbar tabs={tabs} active={current.id} onTab={setTab} />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <h1 className="mb-5 px-2 text-3xl font-normal text-foreground">{current.title}</h1>
            <section className="rounded-sm bg-card shadow-card">
              <div className="border-b px-6 py-4 text-lg font-bold uppercase text-brand-red">
                {user.fullName} ({user.email})
              </div>
              <div className="p-6">
                {current.id === "super" && <SuperAdminView />}
                {current.id === "admin" && <AdminView />}
                {current.id === "pres" && <PresidentView />}
              </div>
            </section>
          </main>
        </>
      )}
      <AuthDialogs mode={mode} setMode={setMode} />
    </div>
  );
}
