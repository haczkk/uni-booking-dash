import { useState } from "react";
import {
  Check,
  Copy,
  Printer,
  BookOpen,
  CalendarDays,
  Clock,
  User,
  Package,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { type Booking } from "@/lib/api";
import { useSession } from "@/lib/session";

interface VoucherProps {
  booking: Booking | null;
  onClose: () => void;
}

const slipStyles = `
/* Real notches: transparent cut-outs */
.slip-main {
  -webkit-mask:
    radial-gradient(circle 12px at 0 100%, #0000 11.5px, #000 12px) left / 51% 100% no-repeat,
    radial-gradient(circle 12px at 100% 100%, #0000 11.5px, #000 12px) right / 51% 100% no-repeat;
  mask:
    radial-gradient(circle 12px at 0 100%, #0000 11.5px, #000 12px) left / 51% 100% no-repeat,
    radial-gradient(circle 12px at 100% 100%, #0000 11.5px, #000 12px) right / 51% 100% no-repeat;
}
.slip-stub {
  -webkit-mask:
    radial-gradient(circle 12px at 0 0, #0000 11.5px, #000 12px) left / 51% 100% no-repeat,
    radial-gradient(circle 12px at 100% 0, #0000 11.5px, #000 12px) right / 51% 100% no-repeat;
  mask:
    radial-gradient(circle 12px at 0 0, #0000 11.5px, #000 12px) left / 51% 100% no-repeat,
    radial-gradient(circle 12px at 100% 0, #0000 11.5px, #000 12px) right / 51% 100% no-repeat;
}
`;

export function VoucherDialog({ booking, onClose }: VoucherProps) {
  const { user } = useSession();
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const borrowerName = user?.fullName || "Class President";
  const rawSection = user?.section?.trim();
  const borrowerSection = rawSection && rawSection.toUpperCase() !== "N/A" ? rawSection : null;

  const issuedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedToken = booking.pickupToken ? booking.pickupToken.replace("-", " - ") : "PENDING";

  const copyToken = () => {
    if (!booking.pickupToken) return;
    navigator.clipboard.writeText(booking.pickupToken);
    toast.success(`Pickup token ${booking.pickupToken} copied to clipboard!`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 100% Reliable Print: Copies the exact slip HTML + CSS into an isolated frame
  const handlePrint = async () => {
    const slipCard = document.querySelector(".slip-card");
    if (!slipCard) return;

    const iframe = document.createElement("iframe");
    // Give it a real size, but keep it off-screen
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const headStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <base href="${document.baseURI}">
        <title>PUP Reservation Slip - #${booking.id}</title>
        ${headStyles}
        <style>
          @page { size: portrait; margin: 12mm; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body {
            display: flex !important;
            justify-content: center !important;
            padding-top: 20mm !important;
          }
          /* Override any global print rules that hide content */
          body * { visibility: visible !important; }
          .slip-card {
            width: 30rem !important;
            max-width: 100% !important;
            box-shadow: none !important;
            break-inside: avoid !important;
          }
          .slip-actions { display: none !important; }
          
          .slip-main,
          .slip-stub {
            -webkit-mask: none !important;
            mask: none !important;
            border: 0 !important;
          }
          .slip-card {
            border: 2px solid #800000 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>${slipCard.outerHTML}</body>
    </html>
  `);
    doc.close();

    // Wait for stylesheets + images instead of a fixed timeout
    const pending: Promise<void>[] = [];
    doc.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']").forEach((l) => {
      if (!l.sheet) {
        pending.push(
          new Promise((res) => {
            l.addEventListener("load", () => res());
            l.addEventListener("error", () => res());
          }),
        );
      }
    });
    doc.querySelectorAll("img").forEach((img) => {
      if (!img.complete) {
        pending.push(
          new Promise((res) => {
            img.addEventListener("load", () => res());
            img.addEventListener("error", () => res());
          }),
        );
      }
    });
    await Promise.race([Promise.all(pending), new Promise((res) => setTimeout(res, 3000))]);

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  const labelClass =
    "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500";
  const valueClass = "mt-1 text-[13px] font-semibold text-slate-900 leading-snug";

  return (
    <>
      <style>{slipStyles}</style>

      <Dialog open={booking !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="max-w-lg gap-0 p-0 overflow-visible border-0 ring-0 shadow-none bg-transparent
            [&>button]:z-10 [&>button]:text-white [&>button]:opacity-100 [&>button]:top-4 [&>button]:right-4
            [&>button]:rounded-full [&>button]:p-1.5 [&>button]:bg-white/15
            [&>button]:hover:bg-white/30 [&>button]:focus:ring-2 [&>button]:focus:ring-white/70
            [&>button]:focus:ring-offset-0 [&>button_svg]:w-5 [&>button_svg]:h-5"
        >
          <div className="drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]">
            <div className="slip-card">
              {/* ───────── Main ticket ───────── */}
              <div className="slip-main bg-white rounded-t-xl overflow-hidden">
                {/* Header (Font matches system sans) */}
                <div className="bg-[#800000] px-6 py-4 pr-14 text-white">
                  <div className="flex items-center gap-3">
                    <img
                      src="/pup-seal.png"
                      alt="PUP Seal"
                      className="w-11 h-11 object-contain drop-shadow"
                    />
                    <div>
                      <h3 className="font-sans font-bold text-sm tracking-wide uppercase leading-tight">
                        Polytechnic University of the Philippines
                      </h3>
                      <p className="text-[11px] text-amber-300 tracking-[0.15em] uppercase font-semibold mt-0.5">
                        San Pedro Campus &bull; Reservation Slip
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 pt-5 pb-8 text-slate-800 space-y-4">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#800000]">
                      <Check className="w-3 h-3" /> Confirmed
                    </span>
                    <p className="text-xs text-slate-500 mt-2.5">
                      Hello,{" "}
                      <span className="font-bold text-[#800000] text-sm">{borrowerName}</span>
                    </p>
                    <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                      Your reservation for{" "}
                      <span className="text-[#800000]">{booking.resourceName}</span> has been
                      confirmed
                      {borrowerSection ? <> for {borrowerSection}</> : null}.
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <div>
                      <span className={labelClass}>
                        <CalendarDays className="w-3 h-3 text-[#800000]" /> Reservation Date
                      </span>
                      <p className={`${valueClass} tabular-nums`}>{booking.reservationDate}</p>
                    </div>

                    <div>
                      <span className={labelClass}>
                        <Clock className="w-3 h-3 text-[#800000]" /> Scheduled Time
                      </span>
                      <p className={`${valueClass} tabular-nums`}>
                        {booking.startTime?.slice(0, 5)} &ndash; {booking.endTime?.slice(0, 5)}
                      </p>
                    </div>

                    <div>
                      <span className={labelClass}>
                        <User className="w-3 h-3 text-[#800000]" /> Faculty in Charge
                      </span>
                      <p className={valueClass}>{booking.professorName || "N/A"}</p>
                    </div>

                    <div>
                      <span className={labelClass}>
                        <Package className="w-3 h-3 text-[#800000]" /> Quantity &amp; Ref ID
                      </span>
                      <p className={`${valueClass} tabular-nums`}>
                        {booking.quantity ?? 1} unit(s) &bull; #{booking.id}
                      </p>
                    </div>

                    <div className="col-span-2 pt-3 border-t border-slate-200">
                      <span className={labelClass}>
                        <BookOpen className="w-3 h-3 text-[#800000]" /> Purpose
                      </span>
                      <p className="mt-1 text-[13px] font-medium text-slate-800 leading-relaxed">
                        {booking.purpose || "Academic Requirement"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ───────── Tear-off stub ───────── */}
              <div className="slip-stub relative bg-[#fffdf0] rounded-b-xl px-6 pt-6 pb-5">
                <div className="absolute top-0 left-5 right-5 border-t-2 border-dashed border-amber-400" />

                <div className="flex items-center justify-center gap-1.5 text-[9px] tracking-[0.22em] uppercase font-semibold text-amber-900/60">
                  <Scissors className="w-3 h-3 -scale-x-100" />
                  Claim stub &bull; Detach and present at the admin desk
                </div>

                <div className="text-center mt-3">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-amber-900 font-bold">
                    Official Pickup Token
                  </span>
                  <span className="block font-mono text-2xl leading-none font-bold text-[#800000] tracking-widest mt-2">
                    {formattedToken}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-2">
                    Single-use &bull; Ref #{booking.id} &bull; {booking.reservationDate}
                  </span>
                </div>

                {/* Buttons (Hidden on print via .slip-actions) */}
                <div className="flex gap-2 mt-5 slip-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyToken}
                    className="flex-1 text-xs font-semibold h-10 bg-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Token
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="maroon"
                    size="sm"
                    onClick={handlePrint}
                    className="flex-1 text-xs font-semibold h-10"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Slip
                  </Button>
                </div>

                <p className="text-center text-[10px] text-slate-500 leading-relaxed mt-3">
                  Issued on {issuedOn}. Please bring a valid school ID when claiming your
                  reservation.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
