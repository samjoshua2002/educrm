"use client";

import { usePathname } from "next/navigation";
import { Plus, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import Link from "next/link";

export function MobileFab() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Dashboard Overview";
    if (pathname.startsWith("/lead-manager")) return "Lead Management";
    if (pathname.startsWith("/gd-interview")) return "GD & Interview";
    if (pathname.startsWith("/payments")) return "Payments testing";
    if (pathname.includes("/applications/")) return "Application Details";

    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "EDUCRM";
    return (
      lastSegment.charAt(0).toUpperCase() +
      lastSegment.slice(1).replace(/-/g, " ")
    );
  };

  const title = getTitle();

  return (
    <div className="md:hidden fixed bottom-6 right-6 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button className="flex size-[48px] rounded-[12px] bg-[#ea2525] hover:bg-[#bb1e1e] shadow-[0_4px_6px_0_rgba(189,15,15,0.25)] p-0 justify-center items-center">
            <Plus className="size-6 text-white" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[100dvh] w-full p-0 m-0 rounded-none bg-white border-none flex flex-col gap-0 [&>button]:hidden">
          {/* Blue Header */}
          <div className="bg-[#120352] flex h-14 shrink-0 items-center justify-between px-4 w-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 p-0 size-8">
                <Menu className="size-5" />
              </Button>
              <h1 className="text-lg font-semibold text-white tracking-tight leading-tight">
                {title}
              </h1>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 p-0 size-8">
              <Bell className="size-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto w-full">
            {/* Search Bar */}
            <div className="px-4 py-4 w-full">
              <div className="flex w-full items-center justify-start rounded-[6px] border border-[#E5E5E5] bg-white px-[12px] py-[9px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground ml-2 shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col px-4 w-full">
              <div className="flex items-center gap-4 py-3 border-b border-[#D4D4D4] cursor-pointer active:bg-muted">
                <div className="flex size-10 items-center justify-center rounded-[32px] bg-[#2563ea] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 20V17H15V15H18V12H20V15H23V17H20V20H18ZM3 21C2.45 21 1.97917 20.8042 1.5875 20.4125C1.19583 20.0208 1 19.55 1 19V5C1 4.45 1.19583 3.97917 1.5875 3.5875C1.97917 3.19583 2.45 3 3 3H17C17.55 3 18.0208 3.19583 18.4125 3.5875C18.8042 3.97917 19 4.45 19 5V10H17V8H3V19H16V21H3ZM3 6H17V5H3V6Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-[#1E293B] font-inter text-[16px] font-medium leading-normal">Add Application</span>
              </div>

              <SheetClose asChild>
                <Link href="/lead-manager/create" className="flex items-center gap-4 py-3 border-b border-[#D4D4D4] cursor-pointer active:bg-muted hover:bg-muted/50 transition-colors w-full">
                  <div className="flex size-10 items-center justify-center rounded-[32px] bg-[#2563ea] shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M2 21V9H7.5V21H2ZM9.25 21V3H14.75V21H9.25ZM16.5 21V11H22V21H16.5Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[#1E293B] font-inter text-[16px] font-medium leading-normal">Add Lead</span>
                </Link>
              </SheetClose>

              <div className="flex items-center gap-4 py-3 border-b border-[#D4D4D4] cursor-pointer active:bg-muted">
                <div className="flex size-10 items-center justify-center rounded-[32px] bg-[#2563ea] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 19V18H13C12.45 18 11.9792 17.8042 11.5875 17.4125C11.1958 17.0208 11 16.55 11 16V8H9V9C9 9.55 8.80417 10.0208 8.4125 10.4125C8.02083 10.8042 7.55 11 7 11H4C3.45 11 2.97917 10.8042 2.5875 10.4125C2.19583 10.0208 2 9.55 2 9V5C2 4.45 2.19583 3.97917 2.5875 3.5875C2.97917 3.19583 3.45 3 4 3H7C7.55 3 8.02083 3.19583 8.4125 3.5875C8.80417 3.97917 9 4.45 9 5V6H15V5C15 4.45 15.1958 3.97917 15.5875 3.5875C15.9792 3.19583 16.45 3 17 3H20C20.55 3 21.0208 3.19583 21.4125 3.5875C21.8042 3.97917 22 4.45 22 5V9C22 9.55 21.8042 10.0208 21.4125 10.4125C21.0208 10.8042 20.55 11 20 11H17C16.45 11 15.9792 10.8042 15.5875 10.4125C15.1958 10.0208 15 9.55 15 9V8H13V16H15V15C15 14.45 15.1958 13.9792 15.5875 13.5875C15.9792 13.1958 16.45 13 17 13H20C20.55 13 21.0208 13.1958 21.4125 13.5875C21.8042 13.9792 22 14.45 22 15V19C22 19.55 21.8042 20.0208 21.4125 20.4125C21.0208 20.8042 20.55 21 20 21H17C16.45 21 15.9792 20.8042 15.5875 20.4125C15.1958 20.0208 15 19.55 15 19ZM17 9H20V5H17V9ZM17 19H20V15H17V19ZM4 9H7V5H4V9Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-[#1E293B] font-inter text-[16px] font-medium leading-normal">Add Branch</span>
              </div>

              <div className="flex items-center gap-4 py-3 border-b border-[#D4D4D4] cursor-pointer active:bg-muted">
                <div className="flex size-10 items-center justify-center rounded-[32px] bg-[#2563ea] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-[#1E293B] font-inter text-[16px] font-medium leading-normal">Add Member</span>
              </div>

              <SheetClose asChild>
                <Link href="/superadmin/organizations/create" className="flex items-center gap-4 py-3 border-b border-[#D4D4D4] cursor-pointer active:bg-muted hover:bg-muted/50 transition-colors w-full">
                  <div className="flex size-10 items-center justify-center rounded-[32px] bg-[#2563ea] shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM10 19V13H5V19H10ZM12 19H19V13H12V19ZM5 11H19V5H5V11Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[#1E293B] font-inter text-[16px] font-medium leading-normal">Create Organization</span>
                </Link>
              </SheetClose>
            </div>
            
            {/* We also need a close button to close this full-screen sheet */}
            <div className="p-4 w-full flex justify-center mt-4">
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full max-w-xs text-muted-foreground border-muted-foreground/30">
                  Cancel
                </Button>
              </SheetTrigger>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
