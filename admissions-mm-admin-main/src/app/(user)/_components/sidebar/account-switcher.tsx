"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export function AccountSwitcher({
  users = [],
}: {
  readonly users?: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
    readonly role: string;
  }>;
}) {
  const [activeUser, setActiveUser] = useState(users?.[0]);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const router = useRouter();

  if (!activeUser) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!p-0"
        >
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage
              src={activeUser.avatar || undefined}
              alt={activeUser.name}
            />
            <AvatarFallback className="rounded-full text-xs">
              {getInitials(activeUser.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{activeUser.name}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 space-y-1 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        {users.map((user) => (
          <DropdownMenuItem
            key={user.email}
            className={cn(
              "p-0",
              user.id === activeUser.id &&
                "bg-accent/50 border-l-primary border-l-2",
            )}
            onClick={() => setActiveUser(user)}
          >
            <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
              <Avatar className="size-9 rounded-full">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs capitalize">{user.role}</span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
