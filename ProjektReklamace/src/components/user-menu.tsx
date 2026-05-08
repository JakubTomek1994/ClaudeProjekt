"use client";

import { useTransition } from "react";
import { LogOut, User as UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "?");
}

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string | null | undefined;
  email: string;
  role: "ADMIN" | "OPERATOR";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">{initials(name, email)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">{name ?? email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{name ?? "Uživatel"}</span>
            <span className="text-xs font-normal text-muted-foreground">{email}</span>
            <Badge
              variant={role === "ADMIN" ? "default" : "secondary"}
              className="mt-1 w-fit text-[10px]"
            >
              {role === "ADMIN" ? "Administrátor" : "Operátor"}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="mr-2 h-4 w-4" />
          Můj profil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await logout();
            })
          }
        >
          <LogOut className="mr-2 h-4 w-4" />
          {pending ? "Odhlašuji…" : "Odhlásit se"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
