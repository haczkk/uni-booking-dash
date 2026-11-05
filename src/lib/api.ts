// Client for the Spring Boot REST API. Base URL is configurable via VITE_API_BASE.
export const API_BASE: string =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "http://localhost:8080/api";

export type Role = "CLASS_PRESIDENT" | "ADMIN" | "SUPER_ADMIN";

export interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  section?: string;
}

export interface Resource {
  id: number;
  name: string;
  type: string;
  totalQuantity: number;
  availableQuantity: number;
  maintenanceQuantity?: number;
  status: "AVAILABLE" | "UNDER_MAINTENANCE" | string;
}

export interface Booking {
  id: number;
  resourceName?: string;
  resource?: { name: string };
  reservationDate: string;
  startTime: string;
  endTime: string;
  professorName: string;
  purpose: string;
  quantity?: number;
  requestedQuantity?: number;
  status: string;
  pickupToken?: string;
  president?: { fullName: string; section?: string };
}

export interface Availability {
  resourceId: number;
  resourceName: string;
  resourceType: "ROOM" | "EQUIPMENT";
  totalQuantity: number;
  usableQuantity?: number; // <-- Add this
  maintenanceQuantity?: number; // <-- Add this
  status?: string; // <-- Add this
  date: string;
  operatingHours: string;
  bookings: Array<{
    id: number;
    startTime: string;
    endTime: string;
    professor: string;
    purpose: string;
    quantity: number;
    status: string;
  }>;
}

export interface ActivePickup {
  id: number;
  presidentName: string;
  section: string;
  resourceName: string;
  resourceType: string;
  quantity: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  pickupToken: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type?: string;
  time: string;
  isRead: boolean;
}

export interface Stats {
  pending?: number;
  activePickups?: number;
  maintenance?: number;
  totalResources?: number;
}

export interface UserRow {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  section?: string;
  active: boolean;
}

export interface CodeRow {
  code: string;
  assignedSection: string;
  used: boolean;
}

export interface AuditLog {
  timestamp: string;
  performedBy?: string;
  action: string;
  details: string;
}

export class ApiError extends Error {}

/** Fetch JSON from the API. Throws ApiError with the server's `error` message on failure. */
export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Record<string, any> | undefined } = {},
): Promise<T> {
  const qs = opts.query
    ? "?" +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}${qs}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : {},
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
    });
  } catch {
    throw new ApiError("Cannot reach the reservation server. Is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export const post = <T = any>(path: string, query?: Record<string, any>, body?: unknown) =>
  api<T>(path, { method: "POST", query, body });

export const SLOTS = Array.from({ length: 12 }, (_, i) => {
  const h = 7 + i;
  const f = (n: number) => `${String(n).padStart(2, "0")}:00`;
  return { start: f(h), end: f(h + 1) };
});

export function slotState(av: Availability, start: string, end: string) {
  let conflict: Availability["bookings"][number] | null = null;
  let units = 0;
  for (const b of av.bookings) {
    const bs = b.startTime.slice(0, 5);
    const be = b.endTime.slice(0, 5);
    if (start < be && end > bs) {
      conflict = b;
      units += b.quantity ?? 1;
    }
  }

  const isRoom = av.resourceType === "ROOM";

  // Calculate actual working units (Total minus units currently in maintenance)
  const workingCapacity =
    av.usableQuantity ?? Math.max(0, av.totalQuantity - (av.maintenanceQuantity ?? 0));
  const left = Math.max(0, workingCapacity - units);

  // Check if item or room is disabled by maintenance
  const isMaint =
    (av.maintenanceQuantity ?? 0) >= av.totalQuantity || av.status === "UNDER_MAINTENANCE";
  const isBooked = isRoom ? conflict !== null || isMaint : left <= 0;

  const effectiveConflict =
    conflict ??
    (isMaint
      ? {
          id: 0,
          startTime: start,
          endTime: end,
          professor: "Maintenance",
          purpose: "Under Maintenance",
          quantity: 1,
          status: "UNDER_MAINTENANCE",
        }
      : null);

  return { booked: isBooked, left, isRoom, conflict: effectiveConflict };
}

export function toCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
    "\n",
  );
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function next7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      iso,
      day: d.toLocaleDateString("en-PH", { weekday: "short" }),
      num: d.getDate(),
      month: d.toLocaleDateString("en-PH", { month: "short" }),
    };
  });
}
