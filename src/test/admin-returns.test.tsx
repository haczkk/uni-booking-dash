import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminView } from "@/components/pup/AdminView";
import { api, post } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/api")>(), api: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/session", () => ({ useSession: () => ({ user: { email: "admin@example.test" } }), usePolling: (fn: () => void) => {
  // Trigger only the initial poll in tests.
  useEffect(() => { fn(); }, []);
} }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const item = { id: 42, presidentName: "Test President", section: "BSIT 2-1", resourceName: "Projector", resourceType: "EQUIPMENT", quantity: 2, reservationDate: "2026-10-18", startTime: "09:00:00", endTime: "11:00:00", pickupToken: "TCK-TEST1234" };

beforeEach(() => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === "/admin/reservations/active-pickups") return [item];
    if (path === "/admin/dashboard/stats") return { activePickups: 1 };
    return [];
  });
  vi.mocked(post).mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function openReturn() {
  render(<AdminView />);
  fireEvent.click(await screen.findByRole("button", { name: "Return Item" }));
  return screen.getByRole("dialog");
}

describe("Admin active-pickup returns", () => {
  it("defaults damaged to false and refreshes active pickups, stats, and inventory after returning reservation 42", async () => {
    const dialog = await openReturn();
    const before = vi.mocked(api).mock.calls.length;
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm Return" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/reservations/42/return", { adminEmail: "admin@example.test", damaged: false }));
    await waitFor(() => {
      const paths = vi.mocked(api).mock.calls.slice(before).map(([path]) => path);
      expect(paths).toContain("/admin/reservations/active-pickups");
      expect(paths).toContain("/admin/dashboard/stats");
      expect(paths).toContain("/reservations/resources");
    });
  });

  it("sends damaged=true only when the admin marks the return as damaged", async () => {
    const dialog = await openReturn();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm Return" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/reservations/42/return", { adminEmail: "admin@example.test", damaged: true }));
  });

  it("does not submit a return when confirmation is cancelled", async () => {
    const dialog = await openReturn();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(post).not.toHaveBeenCalled();
  });
});