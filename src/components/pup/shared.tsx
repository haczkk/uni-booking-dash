import type { ReactNode } from "react";
import pupSeal from "@/assets/pup-seal.png.asset.json";
import { cn } from "@/lib/utils";

export function Seal({ className }: { className?: string }) {
  return (
    <img
      src="/pup-seal.png"
      alt="Polytechnic University of the Philippines"
      className={cn("shrink-0 object-contain", className ?? "size-10")}
    />
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  AUTO_APPROVED: { label: "Auto-approved", cls: "bg-success-soft text-success" },
  APPROVED: { label: "Approved", cls: "bg-success-soft text-success" },
  PENDING: { label: "Pending", cls: "bg-warning-soft text-warning" },
  PICKED_UP: { label: "In use", cls: "bg-info-soft text-info" },
  RETURNED: { label: "Returned", cls: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "Cancelled", cls: "bg-danger-soft text-destructive" },
  REJECTED: { label: "Rejected", cls: "bg-danger-soft text-destructive" },
  AVAILABLE: { label: "Available", cls: "bg-success-soft text-success" },
  UNDER_MAINTENANCE: { label: "Maintenance", cls: "bg-warning-soft text-warning" },
  ACTIVE: { label: "Active", cls: "bg-success-soft text-success" },
  INACTIVE: { label: "Inactive", cls: "bg-danger-soft text-destructive" },
  USED: { label: "Used", cls: "bg-muted text-muted-foreground" },
  UNUSED: { label: "Unused", cls: "bg-gold-soft text-gold-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.cls,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
      {children}
    </span>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-sm bg-card shadow-card", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DataTable({
  head,
  children,
  empty,
}: {
  head: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto border">
      <table className="w-full text-sm">
        <thead className="border-b-2 text-left text-sm text-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap border-x px-4 py-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y [&_td]:border-x">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-muted-foreground">
                Nothing to show yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3 align-middle";

export function MaroonBar({ children }: { children: ReactNode }) {
  return <div className="bg-primary px-6 py-4 text-lg text-primary-foreground">{children}</div>;
}
