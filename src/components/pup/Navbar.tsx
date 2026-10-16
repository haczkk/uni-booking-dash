import { useState } from "react";
import { toast } from "sonner";
import { Bell, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, post, type NotificationItem } from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./AuthDialogs";
import { Seal } from "./shared";

const ROLE_LABEL = { CLASS_PRESIDENT: "Class President", ADMIN: "Admin Staff", SUPER_ADMIN: "Super Admin" };

export function Navbar({ onSignIn }: { onSignIn: () => void }) {
  const { user, signOut } = useSession();
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-maroon-gradient text-primary-foreground shadow-elegant">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Seal />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[15px] font-semibold">Polytechnic University of the Philippines</p>
            <p className="truncate text-xs text-primary-foreground/70">San Pedro Campus · Reservation System</p>
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell userId={user.id} />
            <div className="hidden items-center gap-2 rounded-full bg-primary-foreground/10 py-1 pl-1 pr-3 md:flex">
              <span className="grid size-7 place-items-center rounded-full bg-gold-gradient text-xs font-bold text-gold-foreground">
                {user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold">{user.fullName}</p>
                <p className="text-[10px] uppercase tracking-wider text-gold">{ROLE_LABEL[user.role] ?? user.role}</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setPwOpen(true)} aria-label="Settings">
              <Settings className="size-4" />
            </Button>
            <Button size="sm" variant="glass" onClick={() => (signOut(), toast("Signed out."))}>
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
            <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
          </div>
        ) : (
          <Button size="sm" variant="gold" onClick={onSignIn}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}

function NotificationBell({ userId }: { userId: number }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  const load = async () => {
    try {
      const d = await api<{ notifications: NotificationItem[]; unreadCount: number }>("/notifications", { query: { userId } });
      setItems(d.notifications ?? []);
      setUnread(d.unreadCount ?? 0);
      const newest = d.notifications?.[0];
      if (newest && lastSeen !== null && newest.id > lastSeen && !newest.isRead) toast(newest.title, { description: newest.message });
      if (newest) setLastSeen(newest.id);
      else if (lastSeen === null) setLastSeen(0);
    } catch {}
  };
  usePolling(load, 5000, [userId, lastSeen]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative grid size-9 place-items-center rounded-md hover:bg-primary-foreground/10" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            className="text-xs font-medium text-primary hover:underline"
            onClick={async () => {
              await post("/notifications/read-all", { userId }).catch(() => {});
              load();
            }}
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.isRead) await post(`/notifications/${n.id}/read`).catch(() => {});
                load();
              }}
              className={cn(
                "block w-full border-b border-l-2 px-4 py-3 text-left last:border-b-0 hover:bg-muted/60",
                n.isRead ? "border-l-transparent" : "border-l-primary bg-accent/50",
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{n.time?.substring(11, 16)}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
