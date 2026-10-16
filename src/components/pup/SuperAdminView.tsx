import { useState } from "react";
import { toast } from "sonner";
import { Download, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, post, toCsv, type AuditLog, type CodeRow, type UserRow } from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Field } from "./AuthDialogs";
import { DataTable, Panel, StatusBadge, Tag, td } from "./shared";

const ACTIONS = ["LOGIN", "REGISTER", "CREATE_ADMIN", "TOGGLE_USER_STATUS", "CHANGE_PASSWORD", "AUTO_APPROVE", "MANUAL_APPROVE", "REJECT", "PICKUP", "RETURN", "CANCEL"];

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

  const refresh = () => {
    api<UserRow[]>("/superadmin/users", { query: { adminEmail } }).then(setUsers).catch(() => {});
    api<CodeRow[]>("/superadmin/codes").then(setCodes).catch(() => {});
    api<AuditLog[]>("/superadmin/audit-logs").then(setLogs).catch(() => {});
  };
  usePolling(refresh, 5000, []);

  const filteredLogs = logs.filter((l) => {
    const s = q.toLowerCase();
    const hit = !s || [l.performedBy, l.action, l.details, l.timestamp].some((v) => v?.toLowerCase().includes(s));
    return hit && (!actionF || l.action === actionF);
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Section registration codes" description="Single-use codes for class presidents.">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const section = String(new FormData(f).get("section")).trim();
              try {
                const d = await post<{ code: string; assignedSection: string }>("/superadmin/codes/generate", { section, adminEmail });
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
            <Button variant="maroon"><KeyRound className="size-4" /> Generate</Button>
          </form>
          {lastCode && (
            <button
              onClick={() => navigator.clipboard.writeText(lastCode).then(() => toast.success("Code copied"))}
              className="mt-4 w-full rounded-lg bg-ink p-4 text-center"
            >
              <p className="text-[10px] uppercase tracking-widest text-ink-foreground/60">New code · click to copy</p>
              <p className="mt-1 font-mono text-xl font-bold text-gold-gradient">{lastCode}</p>
            </button>
          )}
          <div className="mt-4 max-h-72 overflow-y-auto">
            <DataTable head={["Code", "Section", "Status"]} empty={codes.length === 0}>
              {codes.map((c) => (
                <tr key={c.code}>
                  <td className={cn(td, "font-mono text-xs")}>{c.code}</td>
                  <td className={td}>{c.assignedSection}</td>
                  <td className={td}><StatusBadge status={c.used ? "USED" : "UNUSED"} /></td>
                </tr>
              ))}
            </DataTable>
          </div>
        </Panel>

        <Panel
          title="Campus user accounts"
          actions={<Button size="sm" variant="maroon" onClick={() => setCreateOpen(true)}><Plus className="size-3.5" /> Create admin staff</Button>}
        >
          <DataTable head={["Name", "Role", "Section", "Status", ""]} empty={users.length === 0}>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/40">
                <td className={td}><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                <td className={td}><Tag>{u.role.replace("_", " ")}</Tag></td>
                <td className={td}>{u.section || "—"}</td>
                <td className={td}><StatusBadge status={u.active ? "ACTIVE" : "INACTIVE"} /></td>
                <td className={cn(td, "text-right")}>
                  {u.role !== "SUPER_ADMIN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={u.active ? "text-destructive" : "text-success"}
                      onClick={async () => {
                        try {
                          const d = await post(`/superadmin/users/${u.id}/toggle-status`, { adminEmail });
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
            <Input placeholder="Search logs…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-48" />
            <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={actionF} onChange={(e) => setActionF(e.target.value)}>
              <option value="">All actions</option>
              {ACTIONS.map((a) => <option key={a}>{a}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => toCsv(filteredLogs.map((l) => ({ timestamp: l.timestamp, performedBy: l.performedBy, action: l.action, details: l.details })), "pup-audit-trail.csv")}>
              <Download className="size-3.5" /> Export CSV
            </Button>
          </>
        }
      >
        <div className="max-h-[480px] overflow-y-auto">
          <DataTable head={["Time", "Performed by", "Action", "Details"]} empty={filteredLogs.length === 0}>
            {filteredLogs.map((l, i) => (
              <tr key={i} className="hover:bg-muted/40">
                <td className={cn(td, "whitespace-nowrap text-xs text-muted-foreground")}>{l.timestamp?.replace("T", " ").slice(0, 19)}</td>
                <td className={cn(td, "font-medium")}>{l.performedBy || "SYSTEM"}</td>
                <td className={td}><Tag>{l.action}</Tag></td>
                <td className={cn(td, "text-muted-foreground")}>{l.details}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create admin staff</DialogTitle><DialogDescription>New staff can verify pickups and manage inventory.</DialogDescription></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const d = await api("/superadmin/users/create-admin", { method: "POST", query: { adminEmail }, body: { fullName: f.get("fullName"), email: f.get("email"), password: f.get("password") } });
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
            <Button variant="maroon" className="w-full">Create account</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
