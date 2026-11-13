import { useState, useRef } from "react";
import { toast } from "sonner";
import { Boxes, Clock, Download, Plus, Wrench, Activity, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  api,
  post,
  toCsv,
  type ActivePickup,
  type Booking,
  type Resource,
  type Stats,
} from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Field } from "./AuthDialogs";
import { DataTable, Panel, StatusBadge, Tag, td, UserBanner } from "./shared";
import { ActiveBorrowedItems } from "./ActiveBorrowedItems";

const sel = "h-8 rounded-md border border-input bg-background px-2 text-sm";

export function AdminView() {
  const { user } = useSession();
  const adminEmail = user?.email ?? "";
  const [stats, setStats] = useState<Stats>({});
  const [resources, setResources] = useState<Resource[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Booking | null>(null);
  const [activePickups, setActivePickups] = useState<ActivePickup[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Manage Maintenance Modal State
  const [managingMaint, setManagingMaint] = useState<Resource | null>(null);
  const [damageQty, setDamageQty] = useState(1);
  const [repairQty, setRepairQty] = useState(1);

  // Delete Resource Modal State
  const [deleteResourceTarget, setDeleteResourceTarget] = useState<Resource | null>(null);
  const [deleteQty, setDeleteQty] = useState(1);
  const [deleteAll, setDeleteAll] = useState(false);

  const isFirstMount = useRef(true);

  const refresh = async (showLoadingState = false) => {
    if (isFirstMount.current || showLoadingState) {
      setActiveLoading(true);
    }
    await Promise.allSettled([
      api<Stats>("/admin/dashboard/stats").then(setStats),
      api<Resource[]>("/reservations/resources").then(setResources),
      api<Booking[]>("/admin/reservations/pending").then(setPending),
      api<ActivePickup[]>("/admin/reservations/active-pickups")
        .then((items) => {
          setActivePickups(items);
          setActiveError(null);
        })
        .catch((e) =>
          setActiveError(e instanceof Error ? e.message : "Could not load active borrowed items."),
        )
        .finally(() => {
          setActiveLoading(false);
          isFirstMount.current = false;
        }),
    ]);
  };

  usePolling(refresh, 5000, []);

  const act = async (fn: () => Promise<{ message?: string }>, ok: string) => {
    try {
      const d = await fn();
      toast.success(d?.message || ok);
      refresh(false);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };

  const types = [...new Set(resources.map((r) => r.type))];
  const inv = resources.filter(
    (r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!typeF || r.type === typeF),
  );

  const kpis = [
    {
      label: "Pending reviews",
      v: stats.pending,
      icon: Clock,
      cls: "bg-warning-soft text-warning",
    },
    {
      label: "Items in use",
      v: stats.activePickups,
      icon: Activity,
      cls: "bg-info-soft text-info",
    },
    {
      label: "Maintenance",
      v: stats.maintenance,
      icon: Wrench,
      cls: "bg-danger-soft text-destructive",
    },
    {
      label: "Total facilities",
      v: stats.totalResources,
      icon: Boxes,
      cls: "bg-maroon-gradient text-primary-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, v, icon: I, cls }) => (
          <div key={label} className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className={cn("grid size-9 place-items-center rounded-lg", cls)}>
                <I className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{v ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Verify Token Card */}
      <Panel
        title="Verify Pickup Token & Release Item"
        description="Redeem the student's one-time pickup code to release room keys or campus equipment."
      >
        <form
          className="flex flex-col sm:flex-row gap-3 max-w-xl"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const token = String(new FormData(f).get("token")).trim();
            if (await act(() => post("/admin/pickup", { token, adminEmail }), "Pickup verified."))
              f.reset();
          }}
        >
          <Input
            name="token"
            required
            placeholder="ENTER TOKEN (E.G. TCK-XXXXXXXX)"
            className="font-mono uppercase tracking-wider text-base"
          />
          <Button variant="maroon" className="sm:w-auto w-full whitespace-nowrap px-6">
            Verify & Release
          </Button>
        </form>
      </Panel>

      {/* Active Borrowed Items */}
      <ActiveBorrowedItems
        items={activePickups}
        loading={activeLoading}
        error={activeError}
        adminEmail={adminEmail}
        onRefresh={() => refresh(true)}
      />

      {/* Pending Requests */}
      <Panel
        title="Pending requests"
        description="Conflicting requests waiting for review."
        actions={
          <Button
            size="icon"
            variant="outline"
            title="Refresh pending requests"
            aria-label="Refresh pending requests"
            disabled={activeLoading}
            onClick={() => void refresh(true)}
          >
            <RefreshCw
              className={cn("size-4", activeLoading && "animate-spin motion-reduce:animate-none")}
            />
          </Button>
        }
      >
        <DataTable
          head={["#", "President", "Resource", "Schedule", "Professor", "Purpose", "Actions"]}
          empty={pending.length === 0}
        >
          {pending.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className={cn(td, "w-14 font-medium text-center")}>#{r.id}</td>
              <td className={td}>
                {r.president?.fullName}
                <p className="text-xs text-muted-foreground">{r.president?.section}</p>
              </td>
              <td className={td}>
                {r.resource?.name}{" "}
                <span className="text-xs text-muted-foreground">×{r.requestedQuantity}</span>
              </td>
              <td className={cn(td, "whitespace-nowrap")}>
                {r.reservationDate}
                <p className="text-xs text-muted-foreground">
                  {r.startTime?.slice(0, 5)}–{r.endTime?.slice(0, 5)}
                </p>
              </td>
              <td className={td}>{r.professorName}</td>
              <td className={cn(td, "max-w-48 truncate")}>{r.purpose}</td>
              <td className={cn(td, "whitespace-nowrap text-right")}>
                <div className="inline-flex items-center justify-end gap-2">
                  {/* Approve Button: Matching outline style of Manage button with green border */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    onClick={() =>
                      act(
                        () => post(`/admin/reservations/${r.id}/approve`, { adminEmail }),
                        "Approved.",
                      )
                    }
                  >
                    Approve
                  </Button>

                  {/* Reject Button: Styled in Dark Maroon */}
                  <Button
                    size="sm"
                    variant="maroon"
                    className="h-8 px-3 text-xs font-semibold"
                    onClick={() => setRejecting(r)}
                  >
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      {/* Facilities & Inventory */}
      <Panel
        title="Facilities & inventory"
        actions={
          <>
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-40"
            />
            <select className={sel} value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toCsv(
                  resources.map(({ id, name, type, availableQuantity, totalQuantity, status }) => ({
                    id,
                    name,
                    type,
                    availableQuantity,
                    totalQuantity,
                    status,
                  })),
                  "pup-inventory.csv",
                )
              }
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="maroon" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" /> Add resource
            </Button>
          </>
        }
      >
        <DataTable
          head={["#", "Name", "Type", "Stock", "Status", "Actions"]}
          empty={inv.length === 0}
        >
          {inv.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className={cn(td, "w-14 font-medium text-center")}>#{r.id}</td>
              <td className={cn(td, "font-medium")}>{r.name}</td>
              <td className={cn(td, "w-24 text-center")}>
                <Tag>{r.type}</Tag>
              </td>
              <td className={cn(td, "w-32 text-center whitespace-nowrap")}>
                <span className="font-medium">{r.availableQuantity}</span>
                <span className="text-muted-foreground"> / {r.totalQuantity}</span>
                {(r.maintenanceQuantity ?? 0) > 0 && (
                  <p className="text-[11px] font-semibold text-amber-600">
                    {r.maintenanceQuantity} in maintenance
                  </p>
                )}
              </td>
              <td className={cn(td, "w-32 text-center whitespace-nowrap")}>
                <StatusBadge
                  status={
                    (r.maintenanceQuantity ?? 0) >= r.totalQuantity
                      ? "UNDER_MAINTENANCE"
                      : r.availableQuantity === 0
                        ? "IN_USE"
                        : (r.maintenanceQuantity ?? 0) > 0
                          ? "UNDER_MAINTENANCE"
                          : "AVAILABLE"
                  }
                />
              </td>
              <td className={cn(td, "w-px whitespace-nowrap text-right")}>
                <div className="inline-flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-8 px-2.5 text-xs font-medium",
                      (r.maintenanceQuantity ?? 0) > 0 &&
                        "border-amber-400 text-amber-800 hover:bg-amber-50",
                    )}
                    onClick={() => {
                      setManagingMaint(r);
                      setDamageQty(1);
                      setRepairQty(1);
                    }}
                  >
                    {(r.maintenanceQuantity ?? 0) > 0
                      ? `Manage (${r.maintenanceQuantity})`
                      : "Set maintenance"}
                  </Button>

                  <Button
                    size="sm"
                    variant="maroon"
                    className="h-8 px-2.5 text-xs font-medium inline-flex items-center justify-center gap-1"
                    onClick={() => {
                      setDeleteResourceTarget(r);
                      setDeleteQty(1);
                      setDeleteAll(r.type === "ROOM" || r.totalQuantity <= 1);
                    }}
                  >
                    <Trash2 className="size-3.5 shrink-0" />
                    <span>Delete</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      {/* 1. Manage Maintenance Modal */}
      <Dialog
        open={managingMaint !== null}
        onOpenChange={(open) => !open && setManagingMaint(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Maintenance</DialogTitle>
            <DialogDescription>
              {managingMaint?.name} ({managingMaint?.type})
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-xs">
            <div>
              <span className="text-muted-foreground block">Available</span>
              <strong className="text-sm text-emerald-700">
                {managingMaint?.availableQuantity}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">In Maintenance</span>
              <strong className="text-sm text-amber-700">
                {managingMaint?.maintenanceQuantity ?? 0}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Total Stock</span>
              <strong className="text-sm">{managingMaint?.totalQuantity}</strong>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Action 1: Place working units into maintenance */}
            <div className="rounded-lg border border-[#800000]/25 bg-[#800000]/2 p-3 space-y-2">
              <Label className="text-xs font-semibold text-[#800000] flex items-center gap-1">
                <Wrench className="size-3.5" /> Report Damaged / Send to Maintenance
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  max={managingMaint?.availableQuantity || 1}
                  value={damageQty}
                  onChange={(e) => setDamageQty(Math.max(1, Number(e.target.value)))}
                  className="h-8 w-24 text-center font-bold"
                  disabled={(managingMaint?.availableQuantity ?? 0) <= 0}
                />
                <Button
                  size="sm"
                  variant="maroon"
                  className="w-full text-xs"
                  disabled={(managingMaint?.availableQuantity ?? 0) <= 0}
                  onClick={async () => {
                    const ok = await act(
                      () =>
                        post(
                          `/admin/resources/${managingMaint!.id}/set-maintenance?units=${damageQty}&adminEmail=${encodeURIComponent(adminEmail)}`,
                        ),
                      `${damageQty} unit(s) moved to maintenance.`,
                    );
                    if (ok) setManagingMaint(null);
                  }}
                >
                  Move {damageQty} to Maintenance
                </Button>
              </div>
              {(managingMaint?.availableQuantity ?? 0) <= 0 && (
                <p className="text-[11px] text-muted-foreground">
                  All units are currently in use or already broken.
                </p>
              )}
            </div>

            {/* Action 2: Restore repaired units back into storage */}
            {(managingMaint?.maintenanceQuantity ?? 0) > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                <Label className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                  ✅ Mark Repaired / Return to Available Stock
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    max={managingMaint?.maintenanceQuantity || 1}
                    value={repairQty}
                    onChange={(e) => setRepairQty(Math.max(1, Number(e.target.value)))}
                    className="h-8 w-24 text-center font-bold"
                  />
                  <Button
                    size="sm"
                    variant="success"
                    className="w-full text-xs"
                    onClick={async () => {
                      const ok = await act(
                        () =>
                          post(
                            `/admin/resources/${managingMaint!.id}/repair?units=${repairQty}&adminEmail=${encodeURIComponent(adminEmail)}`,
                          ),
                        `${repairQty} unit(s) repaired and returned to available stock.`,
                      );
                      if (ok) setManagingMaint(null);
                    }}
                  >
                    Restore {repairQty} to Available
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Delete / Reduce Quantity Modal */}
      <Dialog
        open={deleteResourceTarget !== null}
        onOpenChange={(open) => !open && setDeleteResourceTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deleteAll || deleteResourceTarget?.type === "ROOM"
                ? "Delete Resource"
                : "Remove / Discard Equipment"}
            </DialogTitle>
            <DialogDescription>
              {deleteResourceTarget?.name} ({deleteResourceTarget?.type})
            </DialogDescription>
          </DialogHeader>

          {deleteResourceTarget && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border bg-muted/20 p-3 text-xs flex justify-between">
                <span>
                  Total Stock: <strong>{deleteResourceTarget.totalQuantity}</strong>
                </span>
                <span>
                  Available: <strong>{deleteResourceTarget.availableQuantity}</strong>
                </span>
                <span>
                  Maintenance: <strong>{deleteResourceTarget.maintenanceQuantity ?? 0}</strong>
                </span>
              </div>

              {deleteResourceTarget.type === "EQUIPMENT" &&
              deleteResourceTarget.totalQuantity > 1 ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="optPartial"
                      name="delOption"
                      checked={!deleteAll}
                      onChange={() => setDeleteAll(false)}
                      className="accent-[#800000]"
                    />
                    <Label htmlFor="optPartial" className="text-xs font-semibold cursor-pointer">
                      Discard / Remove specific quantity
                    </Label>
                  </div>

                  {!deleteAll && (
                    <div className="pl-5 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Units to remove:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={deleteResourceTarget.totalQuantity}
                          value={deleteQty}
                          onChange={(e) =>
                            setDeleteQty(
                              Math.max(
                                1,
                                Math.min(
                                  deleteResourceTarget.totalQuantity,
                                  Number(e.target.value),
                                ),
                              ),
                            )
                          }
                          className="h-8 w-20 text-center font-bold"
                        />
                        <span className="text-xs text-muted-foreground">
                          of {deleteResourceTarget.totalQuantity}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        *Broken units in maintenance will be decommissioned first.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t">
                    <input
                      type="radio"
                      id="optAll"
                      name="delOption"
                      checked={deleteAll}
                      onChange={() => setDeleteAll(true)}
                      className="accent-[#800000]"
                    />
                    <Label
                      htmlFor="optAll"
                      className="text-xs text-[#800000] font-semibold cursor-pointer"
                    >
                      Delete entire resource completely
                    </Label>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This will permanently delete this room/resource from campus inventory.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteResourceTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="maroon"
              size="sm"
              onClick={async () => {
                if (!deleteResourceTarget) return;
                const qtyParam = deleteAll ? "" : `&quantity=${deleteQty}`;
                const ok = await act(
                  () =>
                    post(
                      `/admin/resources/${deleteResourceTarget.id}/delete?adminEmail=${encodeURIComponent(adminEmail)}${qtyParam}`,
                    ),
                  deleteAll ? "Resource deleted." : `Removed ${deleteQty} unit(s).`,
                );
                if (ok) {
                  setDeleteResourceTarget(null);
                  refresh();
                }
              }}
            >
              <Trash2 className="size-4 mr-1" />{" "}
              {deleteAll ? "Delete Entire Item" : `Remove ${deleteQty} Unit(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Add Resource Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
            <DialogDescription>Register a new room or equipment item.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await act(
                () =>
                  api(`/admin/resources`, {
                    method: "POST",
                    query: { adminEmail },
                    body: {
                      name: f.get("name"),
                      type: f.get("type"),
                      totalQuantity: Number(f.get("qty")),
                    },
                  }),
                "Resource added.",
              );
              if (ok) setAddOpen(false);
            }}
          >
            <Field label="Name" name="name" placeholder="e.g. Computer Laboratory 1" />
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select name="type" className={cn(sel, "h-9 w-full")}>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="ROOM">ROOM</option>
              </select>
            </div>
            <Field label="Total quantity" name="qty" type="number" defaultValue={1} />
            <Button variant="maroon" className="w-full">
              Add resource
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Reject Request Modal */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject request #{rejecting?.id}</DialogTitle>
            <DialogDescription>The class president will see this reason.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!rejecting) return;
              const reason = String(new FormData(e.currentTarget).get("reason"));
              if (
                await act(
                  () => post(`/admin/reservations/${rejecting.id}/reject`, { adminEmail, reason }),
                  "Request rejected.",
                )
              )
                setRejecting(null);
            }}
          >
            <Textarea
              name="reason"
              required
              rows={3}
              placeholder="e.g. Room already reserved for a department event."
            />
            <Button variant="maroon" className="w-full">
              Reject request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
