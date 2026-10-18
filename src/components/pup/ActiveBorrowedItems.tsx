import { useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { post, type ActivePickup } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DataTable, Panel, Tag, td } from "./shared";

export function ActiveBorrowedItems({ items, loading, error, adminEmail, onRefresh }: {
  items: ActivePickup[];
  loading: boolean;
  error: string | null;
  adminEmail: string;
  onRefresh: () => Promise<unknown>;
}) {
  const [returning, setReturning] = useState<ActivePickup | null>(null);
  const [damaged, setDamaged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirmReturn = async () => {
    if (!returning || submitting) return;
    setSubmitting(true);
    try {
      await post(`/admin/reservations/${returning.id}/return`, { adminEmail, damaged });
      toast.success(`Reservation #${returning.id} returned successfully!`);
      setReturning(null);
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not return this reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Panel title={<span className="text-primary">Active Borrowed Items (Currently in Use)</span>} actions={
        <Button size="icon" variant="outline" title="Refresh active borrowed items" aria-label="Refresh active borrowed items" disabled={loading} onClick={() => void onRefresh()}>
          <RefreshCw className={cn("size-4", loading && "animate-spin motion-reduce:animate-none")} />
        </Button>
      }>
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        {loading && items.length === 0 ? <p role="status" className="py-8 text-center text-muted-foreground">Loading borrowed items…</p> : (
          <DataTable head={["Reservation ID", "Borrower", "Resource", "Schedule", "Pickup Token", "Action"]}>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{error ? "Active borrowed items could not be loaded." : "No resources currently checked out."}</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/40">
                <td className={td}><span className="inline-flex rounded-sm bg-primary px-2.5 py-1 font-semibold text-primary-foreground">#{item.id}</span></td>
                <td className={td}>{item.presidentName}<p className="text-xs text-muted-foreground">{item.section}</p></td>
                <td className={td}><p className="mb-1 font-medium">{item.resourceName}</p><Tag>{item.resourceType}</Tag><span className="ml-2 text-muted-foreground">×{item.quantity}</span></td>
                <td className={cn(td, "whitespace-nowrap")}>{item.reservationDate}<p className="text-xs text-muted-foreground">{item.startTime.slice(0, 5)} to {item.endTime.slice(0, 5)}</p></td>
                <td className={cn(td, "whitespace-nowrap font-mono text-xs")}>{item.pickupToken}</td>
                <td className={td}><Button size="sm" variant="maroon" onClick={() => { setDamaged(false); setReturning(item); }}><RotateCcw className="size-3.5" />Return Item</Button></td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
      <Dialog open={returning !== null} onOpenChange={(open) => { if (!open && !submitting) setReturning(null); }}>
        <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => { if (submitting) e.preventDefault(); }} onPointerDownOutside={(e) => { if (submitting) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Return reservation #{returning?.id}</DialogTitle>
            <DialogDescription>{returning?.resourceName} · {returning?.resourceType} · Quantity: {returning?.quantity}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">{returning?.presidentName}<span className="ml-2 text-muted-foreground">{returning?.section}</span></p>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={damaged} disabled={submitting} onCheckedChange={(value) => setDamaged(value === true)} />Mark as Damaged / Needs Maintenance</label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={submitting} onClick={() => setReturning(null)}>Cancel</Button>
            <Button variant="maroon" disabled={submitting} onClick={() => void confirmReturn()}><RotateCcw className="size-4" />{submitting ? "Returning…" : "Confirm Return"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}