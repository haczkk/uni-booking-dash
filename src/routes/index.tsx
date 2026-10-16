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

function App() {
  const { user, ready } = useSession();
  const [mode, setMode] = useState<"login" | "register" | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSignIn={() => setMode("login")} />
      {ready && !user && <Landing onSignIn={() => setMode("login")} onRegister={() => setMode("register")} />}
      {user && (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {user.role === "CLASS_PRESIDENT" && <PresidentView />}
          {user.role === "ADMIN" && <AdminView />}
          {user.role === "SUPER_ADMIN" && (
            <Tabs defaultValue="super">
              <TabsList className="mb-6">
                <TabsTrigger value="super">Super admin</TabsTrigger>
                <TabsTrigger value="admin">Operations</TabsTrigger>
                <TabsTrigger value="pres">Reservations</TabsTrigger>
              </TabsList>
              <TabsContent value="super"><SuperAdminView /></TabsContent>
              <TabsContent value="admin"><AdminView /></TabsContent>
              <TabsContent value="pres"><PresidentView /></TabsContent>
            </Tabs>
          )}
        </main>
      )}
      <AuthDialogs mode={mode} setMode={setMode} />
    </div>
  );
}
