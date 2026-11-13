import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  next7Days,
  post,
  SLOTS,
  slotState,
  type Availability,
  type Booking,
  type Resource,
} from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { DataTable, Panel, StatusBadge, td, UserBanner } from "./shared";
import { VoucherDialog } from "./Voucher";

const HOURS = Array.from({ length: 15 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);
const sel =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function PresidentView() {
  const { user } = useSession();
  const days = useMemo(next7Days, []);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceId, setResourceId] = useState<number | "">("");
  const [date, setDate] = useState(days[0]!.iso);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");
  const [av, setAv] = useState<Availability | null>(null);
  const [avErr, setAvErr] = useState("");
  const [mine, setMine] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [voucher, setVoucher] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState<number | "">(1);

  // Sort Rooms alphabetically A to Z
  const sortedRooms = useMemo(() => {
    return resources.filter((r) => r.type === "ROOM").sort((a, b) => a.name.localeCompare(b.name));
  }, [resources]);

  // Sort Equipment alphabetically A to Z
  const sortedEquipment = useMemo(() => {
    return resources
      .filter((r) => r.type === "EQUIPMENT")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resources]);

  const selectedResource = resources.find((r) => r.id === resourceId);

  const loadResources = () => {
    api<Resource[]>("/reservations/resources")
      .then((r) => {
        setResources(r);
        // If no resource selected yet, pick the first working one
        setResourceId((prevId) => {
          if (!prevId) {
            const first = r.find((x) => x.status !== "UNDER_MAINTENANCE");
            return first ? first.id : "";
          }
          // If the currently selected resource was just placed under maintenance by an admin,
          // automatically switch the view to a functional room!
          const current = r.find((x) => x.id === prevId);
          if (current && current.status === "UNDER_MAINTENANCE") {
            const nextWorking = r.find((x) => x.status !== "UNDER_MAINTENANCE");
            if (nextWorking) {
              toast.info(
                `${current.name} was placed under maintenance. Switched to ${nextWorking.name}.`,
              );
              return nextWorking.id;
            }
          }
          return prevId;
        });
      })
      .catch(() => {});
  };

  // Poll resources alongside availability so maintenance changes reflect in real-time
  usePolling(loadResources, 5000, []);

  const loadAv = () => {
    if (!resourceId) return;
    void api<Availability>("/reservations/availability", { query: { resourceId, date } })
      .then((d) => (setAv(d), setAvErr("")))
      .catch((e) => setAvErr(e.message));
  };
  usePolling(loadAv, 5000, [resourceId, date]);

  const loadMine = () =>
    api<Booking[]>("/reservations/my-reservations", { query: { presidentId: user!.id } })
      .then(setMine)
      .catch(() => {});
  usePolling(loadMine, 5000, [user?.id]);

  const filtered = mine.filter((r) => {
    const s = q.toLowerCase();
    const hit =
      !s ||
      [r.resourceName, r.professorName, r.purpose, r.reservationDate].some((v) =>
        v?.toLowerCase().includes(s),
      );
    return hit && (!statusF || r.status === statusF);
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resourceId) {
      toast.error("Please select a room or equipment to reserve.");
      return;
    }
    if (end <= start) {
      toast.error("End time must be after start time.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);

    // Guaranteed safe quantity
    const isRoom = selectedResource?.type === "ROOM";
    const finalQuantity = isRoom ? 1 : Math.max(1, Number(qty) || 1);

    try {
      const d = await api<{ status: string; message: string }>("/reservations/request", {
        body: {
          presidentId: user!.id,
          resourceId: Number(resourceId),
          reservationDate: date,
          startTime: start + ":00",
          endTime: end + ":00",
          professorName: f.get("professor"),
          purpose: f.get("purpose"),
          requestedQuantity: finalQuantity,
        },
      });
      if (d.status === "AUTO_APPROVED")
        toast.success("Reservation auto-approved!", { description: d.message });
      else toast.warning("Sent to admin for review", { description: d.message });
      (e.target as HTMLFormElement).reset();
      setQty(1);
      loadAv();
      loadMine();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: number) => {
    try {
      await post(`/reservations/${id}/cancel`, { presidentId: user!.id });
      toast.success("Reservation cancelled.");
      loadMine();
      loadAv();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Panel
          title="Reserve a resource"
          description="Requests without conflicts are approved instantly."
        >
          <form onSubmit={submit} className="space-y-4">
            {/* Two Separated Alphabetical Dropdowns without SELECTED tag */}
            <div className="space-y-3">
              {/* Dropdown 1: Rooms & Facilities */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Room / Laboratory</Label>
                <select
                  className={sel}
                  value={selectedResource?.type === "ROOM" ? resourceId : ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setResourceId(val);
                    setQty(1);
                  }}
                >
                  <option value="">-- Select a Room or Laboratory --</option>
                  {sortedRooms.map((r) => (
                    <option
                      key={r.id}
                      value={r.id}
                      disabled={
                        r.status === "UNDER_MAINTENANCE" ||
                        (r.maintenanceQuantity ?? 0) >= r.totalQuantity
                      }
                    >
                      {r.name}{" "}
                      {r.status === "UNDER_MAINTENANCE" ||
                      (r.maintenanceQuantity ?? 0) >= r.totalQuantity
                        ? "— [UNDER MAINTENANCE]"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Equipment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Campus Equipment</Label>
                <select
                  className={sel}
                  value={selectedResource?.type === "EQUIPMENT" ? resourceId : ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setResourceId(val);
                    if (qty === "" || qty < 1) setQty(1);
                  }}
                >
                  <option value="">-- Select Campus Equipment --</option>
                  {sortedEquipment.map((r) => {
                    const isBroken =
                      r.status === "UNDER_MAINTENANCE" ||
                      (r.maintenanceQuantity ?? 0) >= r.totalQuantity;
                    const usable = Math.max(0, r.totalQuantity - (r.maintenanceQuantity ?? 0));
                    return (
                      <option key={r.id} value={r.id} disabled={isBroken}>
                        {r.name} ({usable} of {r.totalQuantity} usable){" "}
                        {isBroken ? "— [UNDER MAINTENANCE]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => (
                  <button
                    type="button"
                    key={d.iso}
                    onClick={() => setDate(d.iso)}
                    className={cn(
                      "rounded-lg border py-1.5 text-center transition",
                      date === d.iso
                        ? "border-primary bg-primary text-primary-foreground shadow-elegant"
                        : "hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    <span className="block text-[10px] uppercase opacity-70">{d.day}</span>
                    <span className="block text-sm font-semibold">{d.num}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <select className={sel} value={start} onChange={(e) => setStart(e.target.value)}>
                  {HOURS.slice(0, -1).map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <select className={sel} value={end} onChange={(e) => setEnd(e.target.value)}>
                  {HOURS.slice(1).map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="professor">Professor</Label>
                <Input
                  id="professor"
                  name="professor"
                  required
                  placeholder="e.g. Prof. Juan de la Cruz"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qty">Qty</Label>
                <Input
                  id="qty"
                  name="qty"
                  type="number"
                  min={1}
                  max={
                    selectedResource?.type === "EQUIPMENT"
                      ? selectedResource.totalQuantity
                      : undefined
                  }
                  value={qty}
                  onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="1"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                name="purpose"
                rows={2}
                required
                placeholder="Course - Activity (e.g. Programming 3 - Discussion)"
              />
            </div>
            <Button
              type="submit"
              variant="maroon"
              className="w-full"
              disabled={busy || !resourceId}
            >
              {busy ? "Submitting…" : "Submit reservation"}
            </Button>
          </form>
        </Panel>

        <Panel
          title="Hourly timetable"
          description={`${resources.find((r) => r.id === resourceId)?.name ?? "Select a resource"} · ${date}`}
          actions={
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success" />
                Free
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-destructive" />
                Booked
              </span>
            </div>
          }
        >
          {avErr && (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{avErr}</p>
          )}
          {resources.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No campus facilities or equipment have been registered for this school year yet.
            </p>
          )}
          {resources.length > 0 && !resourceId && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Please select a resource above to view its timetable.
            </p>
          )}
          {resourceId && !av && !avErr && (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading schedule…</p>
          )}
          {av && resources.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {SLOTS.map((s) => {
                const st = slotState(av, s.start, s.end);
                const isSelectedRange = start <= s.start && end > s.start;
                return st.booked ? (
                  <div
                    key={s.start}
                    className="rounded-lg border border-destructive/20 bg-danger-soft p-3 text-destructive select-none"
                  >
                    <p className="text-sm font-semibold">
                      {s.start}–{s.end}
                    </p>
                    <p className="mt-1 truncate text-xs">{st.conflict?.professor ?? "Reserved"}</p>
                  </div>
                ) : (
                  <div
                    key={s.start}
                    className={cn(
                      "rounded-lg border border-success/20 bg-success-soft p-3 text-left text-success select-none",
                      isSelectedRange && "ring-2 ring-success ring-offset-1 font-semibold",
                    )}
                  >
                    <p className="text-sm font-semibold">
                      {s.start}–{s.end}
                    </p>
                    <p className="mt-1 text-xs font-normal">
                      {st.isRoom ? "Available" : `${st.left} left`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="My bookings"
        actions={
          <>
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-44"
            />
            <select
              className={cn(sel, "h-8 w-40")}
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
            >
              <option value="">All statuses</option>
              {[
                "AUTO_APPROVED",
                "APPROVED",
                "PENDING",
                "PICKED_UP",
                "RETURNED",
                "CANCELLED",
                "REJECTED",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </>
        }
      >
        <DataTable
          head={["Resource", "Schedule", "Professor", "Status", "Actions"]}
          empty={filtered.length === 0}
        >
          {filtered.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className={td}>
                <p className="font-medium">{r.resourceName}</p>
                <p className="text-xs text-muted-foreground">{r.purpose}</p>
              </td>
              <td className={td}>
                {r.reservationDate}
                <p className="text-xs text-muted-foreground">
                  {r.startTime?.slice(0, 5)}–{r.endTime?.slice(0, 5)}
                </p>
              </td>
              <td className={td}>{r.professorName}</td>

              {/* Status column: Shows the badge + exact reason if cancelled/rejected */}
              <td className={td}>
                <StatusBadge status={r.status} />
                {r.cancellationReason && (r.status === "CANCELLED" || r.status === "REJECTED") && (
                  <p className="text-[11px] font-medium text-[#800000] mt-1 max-w-56 leading-tight">
                    {r.cancellationReason}
                  </p>
                )}
              </td>

              {/* Centered Actions Column: Maroon Cancel button + clean View Pass button */}
              <td className={cn(td, "text-center whitespace-nowrap w-px")}>
                <div className="inline-flex items-center justify-center gap-2">
                  {(r.status === "AUTO_APPROVED" || r.status === "APPROVED") && r.pickupToken && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-medium"
                      onClick={() => setVoucher(r)}
                    >
                      <Ticket className="size-3.5 mr-1" />
                      View pass
                    </Button>
                  )}
                  {["AUTO_APPROVED", "APPROVED", "PENDING"].includes(r.status) && (
                    <Button
                      size="sm"
                      variant="maroon"
                      className="h-8 px-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1"
                      onClick={() => cancel(r.id)}
                    >
                      <X className="size-3.5 shrink-0" />
                      Cancel
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <VoucherDialog booking={voucher} onClose={() => setVoucher(null)} />
    </div>
  );
}
