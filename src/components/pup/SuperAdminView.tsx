import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, KeyRound, Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, post, toCsv, type AuditLog, type CodeRow, type UserRow } from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Field } from "./AuthDialogs";
import { DataTable, Panel, StatusBadge, Tag, td, UserBanner } from "./shared";

const ACTIONS = [
  "LOGIN",
  "REGISTER",
  "CREATE_ADMIN",
  "DELETE_ADMIN",
  "TOGGLE_USER_STATUS",
  "CHANGE_PASSWORD",
  "AUTO_APPROVE",
  "MANUAL_APPROVE",
  "REJECT",
  "PICKUP",
  "RETURN",
  "CANCEL",
  "ACADEMIC_YEAR_RESET",
];

export function SuperAdminView() {
  const { user } = useSession();
  const adminEmail = user!.email;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [lastCode, setLastCode] = useState("");
  const [q, setQ] = useState("");
  const [actionF, setActionF] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteCodeTarget, setDeleteCodeTarget] = useState<CodeRow | null>(null);

  const deleteAdmin = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const d = await post(`/superadmin/users/${deleteTarget.id}/delete`, { adminEmail });
      toast.success(d?.message || "Administrator account deleted.");
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCode = async () => {
    if (!deleteCodeTarget) return;
    setBusy(true);
    try {
      const d = await post(`/superadmin/codes/${deleteCodeTarget.id}/delete`, { adminEmail });
      toast.success(d?.message || "Registration code deleted.");
      if (lastCode === deleteCodeTarget.code) setLastCode("");
      setDeleteCodeTarget(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resetYear = async () => {
    setBusy(true);
    try {
      const d = await post(`/superadmin/reset-academic-year`, { adminEmail });
      toast.success(d?.message || "System reset for the new school year.");
      setResetOpen(false);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const refresh = () => {
    api<UserRow[]>("/superadmin/users", { query: { adminEmail } })
      .then(setUsers)
      .catch(() => {});
    api<CodeRow[]>("/superadmin/codes")
      .then(setCodes)
      .catch(() => {});
    api<AuditLog[]>("/superadmin/audit-logs")
      .then(setLogs)
      .catch(() => {});
  };
  usePolling(refresh, 5000, []);

  const filteredLogs = logs.filter((l) => {
    const s = q.toLowerCase();
    const hit =
      !s ||
      [l.performedBy, l.action, l.details, l.timestamp].some((v) => v?.toLowerCase().includes(s));
    return hit && (!actionF || l.action === actionF);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">Super Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Accounts, codes, and system-wide actions.</p>
        </div>
        {/* Academic Year Rollover in Dark Maroon */}
        <Button variant="maroon" size="sm" onClick={() => setResetOpen(true)}>
          <AlertTriangle className="size-4" /> Academic Year Rollover
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel
          title="Section registration codes"
          description="Single-use codes for class presidents."
        >
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const section = String(new FormData(f).get("section")).trim();
              try {
                const d = await post<{ code: string; assignedSection: string }>(
                  "/superadmin/codes/generate",
                  { section, adminEmail },
                );
                setLastCode(d.code);
                toast.success(`Generated ${d.code} for ${d.assignedSection}`);
                f.reset();
                refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Input name="section" required placeholder="BSIT 3-1" />
            <Button variant="maroon">
              <KeyRound className="size-4" /> Generate
            </Button>
          </form>
          {/* Clean, Simple Neutral Card (No gold outline) */}
          {lastCode && (
            <div className="mt-3.5 rounded-lg border bg-card p-3 text-card-foreground">
              <div className="flex items-center justify-between pb-1.5 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Newly Generated Code
                </span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active &bull; Unused
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                <span className="font-mono text-lg font-bold tracking-wider text-[#800000]">
                  {lastCode}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-semibold text-[#800000] border-[#800000]/30 hover:bg-[#800000]/10"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(lastCode)
                      .then(() => toast.success("Code copied to clipboard!"));
                  }}
                >
                  <Copy className="size-3 mr-1" /> Copy
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
                Provide this code to the designated class president to complete registration.
              </p>
            </div>
          )}

          {/* Section Codes Table with Delete Option for Unused Codes */}
          <div className="mt-4 max-h-72 overflow-y-auto">
            <DataTable head={["Code", "Section", "Status", ""]} empty={codes.length === 0}>
              {codes.map((c) => (
                <tr key={c.code} className="hover:bg-muted/40">
                  <td className={cn(td, "font-mono text-xs")}>{c.code}</td>
                  <td className={td}>{c.assignedSection}</td>
                  <td className={td}>
                    <StatusBadge status={c.used ? "USED" : "UNUSED"} />
                  </td>
                  <td className={cn(td, "w-px whitespace-nowrap text-right")}>
                    {!c.used && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-[#800000] hover:bg-[#800000]/10"
                        title="Delete unused code"
                        onClick={() => setDeleteCodeTarget(c)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </Panel>

        <Panel
          title="Campus user accounts"
          actions={
            <Button size="sm" variant="maroon" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> Create admin staff
            </Button>
          }
        >
          <DataTable
            head={["Name", "Role", "Section", "Status", "Actions"]}
            empty={users.length === 0}
          >
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/40">
                <td className={td}>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className={td}>
                  <Tag>{u.role.replace("_", " ")}</Tag>
                </td>
                <td className={td}>{u.section || "—"}</td>
                <td className={td}>
                  <StatusBadge status={u.active ? "ACTIVE" : "INACTIVE"} />
                </td>
                {/* Organized Action Buttons: Flex row with gap-2 and matching maroon colors */}
                <td className={cn(td, "text-right whitespace-nowrap")}>
                  <div className="inline-flex items-center justify-end gap-2">
                    {u.role !== "SUPER_ADMIN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-8 px-3 text-xs font-semibold inline-flex items-center justify-center transition-colors",
                          u.active
                            ? "text-[#800000] border-[#800000]/40 hover:bg-[#800000]/10 hover:text-[#800000]"
                            : "text-emerald-700 border-emerald-300 hover:bg-emerald-50",
                        )}
                        onClick={async () => {
                          try {
                            const d = await post(`/superadmin/users/${u.id}/toggle-status`, {
                              adminEmail,
                            });
                            toast.success(d?.message || "Account updated.");
                            refresh();
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        {u.active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                    {u.role !== "SUPER_ADMIN" && (
                      <Button
                        size="sm"
                        variant="maroon"
                        className="h-8 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="size-3.5 shrink-0" />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <Panel
        title="Audit trail"
        description="Chronological record of all system activity."
        actions={
          <>
            <Input
              placeholder="Search logs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-48"
            />
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={actionF}
              onChange={(e) => setActionF(e.target.value)}
            >
              <option value="">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toCsv(
                  filteredLogs.map((l) => ({
                    timestamp: l.timestamp,
                    performedBy: l.performedBy,
                    action: l.action,
                    details: l.details,
                  })),
                  "pup-audit-trail.csv",
                )
              }
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
          </>
        }
      >
        <div className="max-h-120 overflow-y-auto">
          <DataTable
            head={["Time", "Performed by", "Action", "Details"]}
            empty={filteredLogs.length === 0}
          >
            {filteredLogs.map((l, i) => (
              <tr key={i} className="hover:bg-muted/40">
                <td className={cn(td, "whitespace-nowrap text-xs text-muted-foreground")}>
                  {l.timestamp?.replace("T", " ").slice(0, 19)}
                </td>
                <td className={cn(td, "font-medium")}>{l.performedBy || "SYSTEM"}</td>
                <td className={td}>
                  <Tag>{l.action}</Tag>
                </td>
                <td className={cn(td, "text-muted-foreground")}>{l.details}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Panel>

      {/* Modal: Create Admin */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create admin staff</DialogTitle>
            <DialogDescription>
              New staff can verify pickups and manage inventory.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const d = await api("/superadmin/users/create-admin", {
                  method: "POST",
                  query: { adminEmail },
                  body: {
                    fullName: f.get("fullName"),
                    email: f.get("email"),
                    password: f.get("password"),
                  },
                });
                toast.success(d?.message || "Admin created.");
                setCreateOpen(false);
                refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Field label="Full name" name="fullName" />
            <Field label="Email" name="email" type="email" />
            <Field label="Temporary password" name="password" type="password" />
            <Button variant="maroon" className="w-full">
              Create account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Confirmation (In Dark Maroon) */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this{" "}
              {deleteTarget?.role.replace("_", " ").toLowerCase()} account?
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm">
              <span className="font-medium">{deleteTarget.fullName}</span>{" "}
              <span className="text-muted-foreground">({deleteTarget.email})</span>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="maroon" onClick={deleteAdmin} disabled={busy}>
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Academic Year Rollover Confirmation (In Dark Maroon) */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[#800000]" /> Academic Year Rollover
            </DialogTitle>
            <DialogDescription>
              This will clear all graduating Class President accounts, past reservation records,
              expired section codes from the previous school year, all equipment inventory, and all
              audit logs. Staff and Super Admin accounts will remain intact.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="maroon" onClick={resetYear} disabled={busy}>
              Confirm & Reset for New School Year
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Registration Code Modal */}
      <Dialog
        open={deleteCodeTarget !== null}
        onOpenChange={(open) => !open && setDeleteCodeTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Registration Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this unused registration code?
            </DialogDescription>
          </DialogHeader>

          {deleteCodeTarget && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Registration Code
              </span>
              <p className="font-mono font-bold text-base text-[#800000] mt-0.5">
                {deleteCodeTarget.code}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Assigned Section: <strong>{deleteCodeTarget.assignedSection}</strong>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteCodeTarget(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="maroon" size="sm" onClick={handleDeleteCode} disabled={busy}>
              <Trash2 className="size-4 mr-1" /> Delete Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
