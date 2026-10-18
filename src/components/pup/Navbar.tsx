import { useState } from "react";
import { toast } from "sonner";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, post, type NotificationItem } from "@/lib/api";
import { usePolling, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./AuthDialogs";
import { Seal } from "./shared";

const ROLE_LABEL: Record<string, string> = {
  CLASS_PRESIDENT: "Class President",
  ADMIN: "Admin Staff",
  SUPER_ADMIN: "Super Admin",
};

export interface NavTab {
  id: string;
  label: string;
}

export function Navbar({
  tabs,
  active,
  onTab,
}: {
  tabs: NavTab[];
  active: string;
  onTab: (id: string) => void;
}) {
  const { user, signOut } = useSession();
  const [pwOpen, setPwOpen] = useState(false);
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-17.5 max-w-7xl items-stretch justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-stretch gap-2">
          <div className="flex items-center gap-2 pr-3">
            <Seal className="size-9" />
            <span className="text-2xl text-primary">Room and Equipment Reservation System</span>
          </div>
          <nav className="flex items-stretch overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 text-lg text-muted-foreground transition-colors hover:text-foreground",
                  active === t.id ? "border-primary text-foreground/80" : "border-transparent",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1 text-sis-blue"
              aria-label="Account"
            >
              <User className="size-5 fill-current" />
              <ChevronDown className="size-4 rounded-sm border border-muted-foreground text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {ROLE_LABEL[user.role] ?? user.role}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPwOpen(true)}>
                <Settings className="size-4" /> Change password
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => (signOut(), toast("Signed out."))}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
        </div>
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
      const d = await api<{ notifications: NotificationItem[]; unreadCount: number }>(
        "/notifications",
        { query: { userId } },
      );
      setItems(d.notifications ?? []);
      setUnread(d.unreadCount ?? 0);
      const newest = d.notifications?.[0];
      if (newest && lastSeen !== null && newest.id > lastSeen && !newest.isRead)
        toast(newest.title, { description: newest.message });
      if (newest) setLastSeen(newest.id);
      else if (lastSeen === null) setLastSeen(0);
    } catch {}
  };
  usePolling(load, 5000, [userId, lastSeen]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-bold">Inbox</p>
          <button
            className="text-xs font-medium text-brand-red hover:underline"
            onClick={async () => {
              await post("/notifications/read-all", { userId }).catch(() => {});
              load();
            }}
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.isRead) await post(`/notifications/${n.id}/read`).catch(() => {});
                load();
              }}
              className={cn(
                "block w-full border-b border-l-2 px-4 py-3 text-left last:border-b-0 hover:bg-muted/60",
                n.isRead ? "border-l-transparent" : "border-l-brand-red bg-accent/50",
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {n.time?.substring(11, 16)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
