import { useState } from "react";
import { toast } from "sonner";
import { Boxes, Clock, Download, Plus, Wrench, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, post, toCsv, type Booking, type Resource, type Stats } from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Field } from "./AuthDialogs";
import { DataTable, Panel, StatusBadge, Tag, td } from "./shared";

const sel = "h-8 rounded-md border border-input bg-background px-2 text-sm";

export function AdminView() {
  const { user } = useSession();
  const adminEmail = user!.email;
  const [stats, setStats] = useState<Stats>({});
  const [resources, setResources] = useState<Resource[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Booking | null>(null);

  const refresh = () => {
    api<Stats>("/admin/dashboard/stats").then(setStats).catch(() => {});
    api<Resource[]>("/reservations/resources").then(setResources).catch(() => {});
    api<Booking[]>("/admin/reservations/pending").then(setPending).catch(() => {});
  };
  usePolling(refresh, 5000, []);

  const act = async (fn: () => Promise<{ message?: string }>, ok: string) => {
    try {
      const d = await fn();
      toast.success(d?.message || ok);
      refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };

  const types = [...new Set(resources.map((r) => r.type))];
  const inv = resources.filter((r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!typeF || r.type === typeF));

  const kpis = [
    { label: "Pending reviews", v: stats.pending, icon: Clock, cls: "bg-warning-soft text-warning" },
    { label: "Items in use", v: stats.activePickups, icon: Activity, cls: "bg-info-soft text-info" },
    { label: "Maintenance", v: stats.maintenance, icon: Wrench, cls: "bg-danger-soft text-destructive" },
    { label: "Total facilities", v: stats.totalResources, icon: Boxes, cls: "bg-maroon-gradient text-primary-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, v, icon: I, cls }) => (
          <div key={label} className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className={cn("grid size-9 place-items-center rounded-lg", cls)}><I className="size-4" /></span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{v ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Verify pickup token" description="One-time redemption at the admin desk.">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const token = String(new FormData(f).get("token")).trim();
              if (await act(() => post("/admin/pickup", { token, adminEmail }), "Pickup verified.")) f.reset();
            }}
          >
            <Input name="token" required placeholder="TCK-XXXXXXXX" className="font-mono uppercase" />
            <Button variant="maroon">Verify</Button>
          </form>
        </Panel>
        <Panel title="Return equipment" description="Close out a reservation by its ID.">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const fd = new FormData(f);
              const id = fd.get("rid");
              if (await act(() => post(`/admin/reservations/${id}/return`, { adminEmail, damaged: fd.get("damaged") === "on" }), "Return recorded.")) f.reset();
            }}
          >
            <div className="flex gap-2">
              <Input name="rid" type="number" required placeholder="Reservation ID" />
              <Button variant="secondary">Mark returned</Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox name="damaged" /> Mark damaged / under maintenance
            </label>
          </form>
        </Panel>
      </div>

      <Panel
        title="Pending requests"
        description="Conflicting requests waiting for review."
      >
        <DataTable head={["#", "President", "Resource", "Schedule", "Professor", "Purpose", ""]} empty={pending.length === 0}>
          {pending.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className={cn(td, "font-medium")}>#{r.id}</td>
              <td className={td}>{r.president?.fullName}<p className="text-xs text-muted-foreground">{r.president?.section}</p></td>
              <td className={td}>{r.resource?.name} <span className="text-xs text-muted-foreground">×{r.requestedQuantity}</span></td>
              <td className={td}>{r.reservationDate}<p className="text-xs text-muted-foreground">{r.startTime?.slice(0, 5)}–{r.endTime?.slice(0, 5)}</p></td>
              <td className={td}>{r.professorName}</td>
              <td className={cn(td, "max-w-48 truncate")}>{r.purpose}</td>
              <td className={cn(td, "whitespace-nowrap text-right")}>
                <Button size="sm" variant="success" onClick={() => act(() => post(`/admin/reservations/${r.id}/approve`, { adminEmail }), "Approved.")}>Approve</Button>
                <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => setRejecting(r)}>Reject</Button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel
        title="Facilities & inventory"
        actions={
          <>
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-40" />
            <select className={sel} value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="">All types</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => toCsv(resources.map(({ id, name, type, availableQuantity, totalQuantity, status }) => ({ id, name, type, availableQuantity, totalQuantity, status })), "pup-inventory.csv")}>
              <Download className="size-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="maroon" onClick={() => setAddOpen(true)}><Plus className="size-3.5" /> Add resource</Button>
          </>
        }
      >
        <DataTable head={["#", "Name", "Type", "Stock", "Status", ""]} empty={inv.length === 0}>
          {inv.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className={cn(td, "font-medium")}>#{r.id}</td>
              <td className={cn(td, "font-medium")}>{r.name}</td>
              <td className={td}><Tag>{r.type}</Tag></td>
              <td className={td}>
                <span className="font-medium">{r.availableQuantity}</span>
                <span className="text-muted-foreground"> / {r.totalQuantity}</span>
              </td>
              <td className={td}><StatusBadge status={r.status} /></td>
              <td className={cn(td, "text-right")}>
                <Button size="sm" variant="outline" onClick={() => act(() => post(`/admin/resources/${r.id}/toggle-maintenance`, { adminEmail }), "Status updated.")}>
                  {r.status === "AVAILABLE" ? "Set maintenance" : "Set available"}
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add resource</DialogTitle><DialogDescription>Register a new room or equipment item.</DialogDescription></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await act(() => api(`/admin/resources`, { method: "POST", query: { adminEmail }, body: { name: f.get("name"), type: f.get("type"), totalQuantity: Number(f.get("qty")) } }), "Resource added.");
              if (ok) setAddOpen(false);
            }}
          >
            <Field label="Name" name="name" placeholder="Epson Projector" />
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select name="type" className={cn(sel, "h-9 w-full")}>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="ROOM">ROOM</option>
              </select>
            </div>
            <Field label="Total quantity" name="qty" type="number" defaultValue={1} />
            <Button variant="maroon" className="w-full">Add resource</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject request #{rejecting?.id}</DialogTitle><DialogDescription>The class president will see this reason.</DialogDescription></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason"));
              if (await act(() => post(`/admin/reservations/${rejecting!.id}/reject`, { adminEmail, reason }), "Request rejected.")) setRejecting(null);
            }}
          >
            <Textarea name="reason" required rows={3} placeholder="Room already reserved for a department event." />
            <Button variant="destructive" className="w-full">Reject request</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
