import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type SessionUser } from "@/lib/api";
import { useSession } from "@/lib/session";
import heroAsset from "@/assets/pup-san-pedro-campus.jpg.asset.json";
import { Seal } from "./shared";

export function Landing({ onRegister }: { onRegister: () => void }) {
  const { signIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_1fr]">
      <img
        src="/pup-san-pedro-campus.jpg"
        alt="PUP San Pedro campus building"
        className="hidden size-full object-cover lg:block"
      />
      <div className="flex flex-col items-center justify-center bg-card px-6 py-12 text-center">
        <Seal className="size-24" />
        <h1 className="mt-4 text-3xl font-semibold text-foreground">
          Room and Equipment Reservation System
        </h1>
        <p className="mt-2 text-lg">Sign in to start your session</p>
        <form
          className="mt-5 w-full max-w-md space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setErr("");
            try {
              const data = await api<{ user: SessionUser }>("/auth/login", {
                body: { email: f.get("email"), password: f.get("password") },
              });
              signIn(data.user);
              toast.success(`Welcome back, ${data.user.fullName}!`);
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            name="email"
            type="email"
            required
            placeholder="Student Webmail"
            className="h-12 text-lg"
          />
          <Input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="h-12 text-lg"
          />
          {err && (
            <p className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-destructive">{err}</p>
          )}
          <Button
            type="submit"
            variant="sis"
            className="h-12 w-full rounded-none text-lg"
            disabled={busy}
          >
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 space-y-1 text-lg">
          <button onClick={onRegister} className="font-semibold text-brand-red hover:underline">
            Register as Class President
          </button>
          <p>
            <span className="text-brand-red">
              A Reservation Tool for Rooms and Campus Equipment{" "}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
