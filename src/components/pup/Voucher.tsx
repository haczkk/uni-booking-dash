import { toast } from "sonner";
import { Copy, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Seal, StatusBadge } from "./shared";

export function VoucherDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const { user } = useSession();
  if (!booking) return null;
  const token = booking.pickupToken ?? "";
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(token)}`;
  const rows = [
    ["Borrower", user?.fullName ?? "Class President"],
    ["Section", user?.section ?? "N/A"],
    ["Resource", booking.resourceName ?? booking.resource?.name ?? "—"],
    ["Date", booking.reservationDate],
    ["Time", `${booking.startTime?.slice(0, 5)} – ${booking.endTime?.slice(0, 5)}`],
    ["Professor", booking.professorName],
    ["Quantity", String(booking.quantity ?? booking.requestedQuantity ?? 1)],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Reservation voucher</DialogTitle>
        <div id="printable-voucher" className="overflow-hidden rounded-lg border-2 border-primary bg-card">
          <div className="flex items-center gap-3 bg-maroon-gradient px-5 py-4 text-primary-foreground">
            <Seal className="size-12 text-base" />
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Republic of the Philippines</p>
              <p className="font-display font-semibold">Polytechnic University of the Philippines</p>
              <p className="text-xs text-primary-foreground/75">San Pedro Campus · Official Reservation Voucher</p>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
              <dt className="text-muted-foreground">Status</dt>
              <dd><StatusBadge status={booking.status} /></dd>
            </dl>
            <img src={qr} alt="Pickup QR code" width={130} height={130} className="mx-auto rounded-md border p-1" />
          </div>
          <div className="mx-5 mb-5 rounded-lg bg-ink p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-foreground/60">Pickup token · show to admin staff</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.15em] text-gold-gradient">{token}</p>
            <p className="mt-1 text-[11px] text-ink-foreground/60">Single-use · valid until 30 minutes past start time</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(token).then(() => toast.success("Token copied"))}>
            <Copy className="size-4" /> Copy code
          </Button>
          <Button variant="maroon" onClick={() => window.print()}>
            <Printer className="size-4" /> Print voucher
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
