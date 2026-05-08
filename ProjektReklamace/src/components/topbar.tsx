import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";

export function Topbar({
  name,
  email,
  role,
}: {
  name: string | null | undefined;
  email: string;
  role: "ADMIN" | "OPERATOR";
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/70 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground font-display text-base font-bold">
          R
        </div>
        <span className="font-display text-base font-semibold tracking-tight">
          Reklamace
        </span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-1">
        <NotificationBell />
        <UserMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}
