import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type SessionUser } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Seal } from "./shared";

type Mode = "login" | "register" | null;

export function AuthDialogs({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { signIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onLogin = (f: FormData) =>
    run(async () => {
      const data = await api<{ user: SessionUser }>("/auth/login", {
        body: { email: f.get("email"), password: f.get("password") },
      });
      signIn(data.user);
      setMode(null);
      toast.success(`Welcome back, ${data.user.fullName}!`);
    });

  const onRegister = (f: FormData) =>
    run(async () => {
      const data = await api<{ message: string }>("/auth/register-president", {
        body: {
          fullName: f.get("fullName"),
          email: f.get("email"),
          password: f.get("password"),
          registrationCode: String(f.get("code")).trim(),
        },
      });
      toast.success(data.message || "Registration complete. You can now sign in.");
      setMode("login");
    });

  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && (setMode(null), setErr(""))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <Seal className="mb-2 size-12 text-base" />
          <DialogTitle className="font-display text-2xl">
            {mode === "register" ? "Register as Class President" : "Sign in to the portal"}
          </DialogTitle>
          <DialogDescription>
            {mode === "register"
              ? "Use the single-use section code issued by the Super Admin."
              : "Use your PUP webmail and password."}
          </DialogDescription>
        </DialogHeader>
        <form
          key={mode}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            mode === "register" ? onRegister(f) : onLogin(f);
          }}
        >
          {mode === "register" && (
            <Field label="Full name" name="fullName" placeholder="Juan Dela Cruz" />
          )}
          <Field label="PUP email" name="email" type="email" placeholder="you@iskolarngbayan.pup.edu.ph" />
          <Field label="Password" name="password" type="password" />
          {mode === "register" && (
            <Field label="Section registration code" name="code" placeholder="SEC-BSIT-3-1-XXXX" />
          )}
          {err && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{err}</p>}
          <Button type="submit" variant="maroon" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "register" ? "Already registered?" : "Class president without an account?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => (setErr(""), setMode(mode === "register" ? "login" : "register"))}
            >
              {mode === "register" ? "Sign in" : "Register"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} />
    </div>
  );
}

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useSession();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), setErr(""))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Your current password is verified securely on the server.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (f.get("newPassword") !== f.get("confirm")) return setErr("New passwords do not match.");
            setBusy(true);
            setErr("");
            try {
              await api("/auth/change-password", {
                body: { userId: user?.id, currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") },
              });
              toast.success("Password updated successfully!");
              onOpenChange(false);
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Current password" name="currentPassword" type="password" />
          <Field label="New password" name="newPassword" type="password" />
          <Field label="Confirm new password" name="confirm" type="password" />
          {err && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{err}</p>}
          <Button type="submit" variant="maroon" className="w-full" disabled={busy}>
            Update password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
