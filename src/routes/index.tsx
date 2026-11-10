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
      {
        name: "description",
        content:
          "Reserve rooms and equipment at PUP San Pedro Campus with live availability and official pickup vouchers.",
      },
      { property: "og:title", content: "PUP San Pedro · Equipment & Room Reservation" },
      {
        property: "og:description",
        content:
          "Live availability, pickup vouchers and admin operations for PUP San Pedro Campus.",
      },
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
  const tabs = user ? (TABS[user.role] ?? []) : [];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const isPresident = user?.role === "CLASS_PRESIDENT";

  return (
    <div className="min-h-screen bg-background">
      {ready && !user && <Landing onRegister={() => setMode("register")} />}
      {user && current && (
        <>
          <Navbar tabs={tabs} active={current.id} onTab={setTab} />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
            <h1 className="px-2 text-3xl font-normal text-foreground">{current.title}</h1>

            {/* Clean User Profile Banner for ALL Accounts (Picture 1) */}
            <div className="rounded-xl border bg-card p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#800000]">
                  {isPresident ? "Authorized Class President" : user.role.replace("_", " ")}
                </span>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  {user.fullName}
                </h2>
              </div>

              {/* Right side metadata */}
              <div className="flex flex-wrap items-center gap-8 text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    PUP Webmail
                  </p>
                  <p className="mt-0.5 font-medium text-xs sm:text-sm text-foreground">
                    {user.email}
                  </p>
                </div>

                {/* Class Section ONLY shows for Class Presidents */}
                {isPresident && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Class Section
                    </p>
                    <p className="mt-0.5 font-medium text-xs sm:text-sm text-foreground">
                      {user.section ?? "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Views container (Red bar deleted!) */}
            <section className="rounded-sm bg-card shadow-card">
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
