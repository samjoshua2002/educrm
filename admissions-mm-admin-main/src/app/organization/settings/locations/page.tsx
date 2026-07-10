"use client";

import * as React from "react";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  SearchX,
  MapPin,
  Building2,
  UserCheck,
  Globe,
  Coins,
  Filter,
  Hash,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageHeaderStore } from "@/stores/page-header-store";

type LocationType = "Center" | "Interview";

type Location = {
  id: number;
  type: LocationType;
  name: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  currencySymbol?: string;
  currency?: string;
};

const initialLocations: Location[] = [
  {
    id: 1,
    type: "Center",
    name: "New Delhi Center",
    address: "Block A, Connaught Place",
    city: "New Delhi",
    state: "Delhi",
    pin: "110001",
    country: "India",
    currencySymbol: "₹",
    currency: "INR",
  },
  {
    id: 2,
    type: "Interview",
    name: "Chennai Marriot Hotel",
    address: "221B Baker Street",
    city: "Chennai",
    state: "Tamil Nadu",
    pin: "600001",
    country: "India",
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

const typeStyles: Record<string, string> = {
  Center: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Interview: "bg-[#05966933] text-[#065F46] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "SGD", symbol: "S$" },
  { code: "AED", symbol: "د.إ" },
] as const;

export default function LocationsPage() {
  const [locations, setLocations] = React.useState<Location[]>(initialLocations);
  const [searchQuery, setSearchQuery] = React.useState("");

  const availableStates = React.useMemo(() => {
    const states = new Set(locations.map((loc) => loc.state).filter(Boolean));
    return Array.from(states).sort();
  }, [locations]);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  // Filters
  const [advType, setAdvType] = React.useState("all");
  const [advState, setAdvState] = React.useState("all");
  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    type: "all",
    state: "all",
  });

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [deleteLocationId, setDeleteLocationId] = React.useState<number | null>(null);
  const [editingLocation, setEditingLocation] = React.useState<Location | null>(null);

  // Form
  const [formData, setFormData] = React.useState<Partial<Location>>({
    type: "Center",
    country: "India",
  });

  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  React.useEffect(() => {
    setHeader({
      title: "Location Management",
      description: "Manage physical branch locations and temporary external venues.",
      action: {
        label: "Add Location",
        onClick: () => {
          setEditingLocation(null);
          setFormData({ type: "Center", country: "India" });
          setCreateDialogOpen(true);
        },
      },
    });
    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setFormData(loc);
    setCreateDialogOpen(true);
  };

  const handleSaveLocation = () => {
    if (editingLocation) {
      setLocations(
        locations.map((loc) =>
          loc.id === editingLocation.id ? ({ ...loc, ...formData } as Location) : loc
        )
      );
    } else {
      const newLoc: Location = {
        id: Math.max(0, ...locations.map((l) => l.id)) + 1,
        type: formData.type as LocationType,
        name: formData.name || "",
        address: formData.address || "",
        city: formData.city || "",
        state: formData.state || "",
        pin: formData.pin || "",
        country: formData.country || "",
        currencySymbol: formData.type === "Center" ? formData.currencySymbol : undefined,
        currency: formData.type === "Center" ? formData.currency : undefined,
      };
      setLocations([...locations, newLoc]);
    }
    setCreateDialogOpen(false);
  };

  const handleDeleteLocation = () => {
    if (deleteLocationId) {
      setLocations(locations.filter((l) => l.id !== deleteLocationId));
      setDeleteLocationId(null);
    }
  };

  const filteredLocations = React.useMemo(() => {
    return locations.filter((loc) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (
          !loc.name.toLowerCase().includes(q) &&
          !loc.city.toLowerCase().includes(q) &&
          !loc.country.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (appliedAdvanced.type !== "all" && loc.type !== appliedAdvanced.type) {
        return false;
      }
      if (appliedAdvanced.state !== "all" && loc.state !== appliedAdvanced.state) {
        return false;
      }
      return true;
    });
  }, [locations, searchQuery, appliedAdvanced]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  const mobileLocations = React.useMemo(
    () => filteredLocations.slice(0, mobileVisibleCount),
    [filteredLocations, mobileVisibleCount]
  );

  const visiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > 5) {
      if (currentPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (currentPage + 2 >= totalPages) {
        startPage = totalPages - 4;
        endPage = totalPages;
      } else {
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [currentPage, totalPages]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Search & Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, city, or country..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2 hover:bg-transparent"
              >
                <Search className="size-4 text-muted-foreground" />
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Type Select Container */}
              <div className="flex-1 min-w-0 sm:w-[140px]">
                <Select
                  value={advType}
                  onValueChange={(val) => {
                    setAdvType(val);
                    setAppliedAdvanced({ ...appliedAdvanced, type: val });
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Center">Center</SelectItem>
                    <SelectItem value="Interview">Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* State Select Container */}
              <div className="flex-1 min-w-0 sm:w-[140px]">
                <Select
                  value={advState}
                  onValueChange={(val) => {
                    setAdvState(val);
                    setAppliedAdvanced({ ...appliedAdvanced, state: val });
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {availableStates.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  NAME
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  TYPE
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  ADDRESS
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  LOCATION
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  CURRENCY
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!mounted ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading locations...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-6 text-muted-foreground/80" />
                      </div>
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLocations.map((loc) => (
                  <TableRow
                    key={loc.id}
                    className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors"
                  >
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <div className="font-semibold text-[#1e293b] text-[14px]">{loc.name}</div>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <Badge variant="secondary" className={typeStyles[loc.type] || ""}>
                        {loc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <div className="text-sm text-[#475569]">{loc.address}</div>
                      {loc.pin && <div className="text-xs text-muted-foreground mt-0.5">PIN: {loc.pin}</div>}
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle text-[#475569] text-[14px]">
                      {loc.city}, {loc.state}
                      <div className="text-xs text-muted-foreground mt-0.5">{loc.country}</div>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      {loc.type === "Center" ? (
                        <div className="flex items-center gap-1.5 text-sm text-[#475569]">
                          <span className="font-semibold text-[#1e293b]">{loc.currencySymbol}</span>
                          <span>{loc.currency}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle text-right">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 rounded-md hover:bg-muted"
                              size="icon"
                            >
                              <EllipsisVertical className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 z-50">
                            <DropdownMenuItem className="gap-2" onClick={() => handleOpenEdit(loc)}>
                              <Pencil className="size-4" />
                              Edit Location
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setDeleteLocationId(loc.id)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Desktop Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredLocations.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredLocations.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{filteredLocations.length}</span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Prev
                </Button>
                <div className="flex items-center gap-1.5 px-1">
                  {visiblePages.map((page) => {
                    const isActive = page === currentPage;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                          isActive
                            ? "bg-background border-border text-foreground font-semibold hover:bg-muted/15 dark:hover:bg-muted/5 shadow-xs"
                            : "border-border/80 bg-transparent text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View */}
        {filteredLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 lg:hidden w-full">
            {mobileLocations.map((loc) => {
              return (
                <div
                  key={loc.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Name, Type, Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {loc.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-muted-foreground flex size-8 rounded-md hover:bg-muted p-0 shrink-0"
                            size="icon"
                          >
                            <EllipsisVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem className="gap-2" onClick={() => handleOpenEdit(loc)}>
                            <Pencil className="size-4" />
                            Edit Location
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setDeleteLocationId(loc.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        <MapPin className="size-3" /> Address:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">{loc.address}</span>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        <Building2 className="size-3" /> Type:
                      </span>
                      <div className="flex items-center">
                        <Badge variant="secondary" className={`${typeStyles[loc.type] || ""} truncate`}>
                          {loc.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        <Globe className="size-3" /> Location:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {loc.city}, {loc.state}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        <Coins className="size-3" /> Currency:
                      </span>
                      {loc.type === "Center" ? (
                        <span className="text-foreground/95 font-medium">
                          {loc.currencySymbol} {loc.currency}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 font-medium">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Load More Footer */}
        {mobileVisibleCount < filteredLocations.length ? (
          <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
            <Button
              variant="outline"
              className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
            >
              Load More Locations
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredLocations.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{filteredLocations.length}</span> entries
            </p>
          </div>
        ) : (
          filteredLocations.length > 0 && (
            <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
              <p className="text-xs text-muted-foreground font-normal">
                Showing all{" "}
                <span className="font-medium text-foreground">{filteredLocations.length}</span> of{" "}
                <span className="font-medium text-foreground">{filteredLocations.length}</span> entries
              </p>
            </div>
          )
        )}
      </div>

      {/* Add / Edit Location Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) setCreateDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[680px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">
          
          {/* Card 1: Location Details */}
          <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <MapPin className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Location Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val as LocationType })}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Center">Center Location</SelectItem>
                    <SelectItem value="Interview">Interview Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Location Name</Label>
                <Input
                  placeholder="e.g. New Delhi Center"
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Full Address</Label>
              <Input
                placeholder="Building number, street, etc."
                className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(val) => setFormData({ ...formData, country: val })}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">State</Label>
                <MultiSelect
                  values={formData.state ? [formData.state] : []}
                  onValuesChange={(vals) => setFormData({ ...formData, state: vals[0] })}
                  single
                >
                  <MultiSelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A] !px-3 !py-2">
                    <MultiSelectValue placeholder="Select State" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {INDIAN_STATES.map((state) => (
                      <MultiSelectItem key={state} value={state}>
                        {state}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">City</Label>
                <Input
                  placeholder="City"
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">PIN / Zip Code</Label>
                <Input
                  placeholder="e.g. 110001"
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  value={formData.pin || ""}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Currency Settings (if Center) */}
          {formData.type === "Center" && (
            <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                  <Coins className="size-5" />
                </div>
                <h3 className="text-[18px] font-bold text-[#0F172A]">Currency Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Currency Code</Label>
                  <Select
                    value={formData.currency || ""}
                    onValueChange={(val) => {
                      const matched = CURRENCIES.find(c => c.code === val);
                      setFormData({ 
                        ...formData, 
                        currency: val, 
                        currencySymbol: matched?.symbol || "" 
                      });
                    }}
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Currency Symbol</Label>
                  <Input
                    readOnly
                    placeholder="Auto-populated"
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-slate-50 text-slate-500 cursor-not-allowed pointer-events-none"
                    value={formData.currencySymbol || ""}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 justify-start mt-2 ml-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
            >
              {editingLocation ? "Save Changes" : "Save Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteLocationId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteLocationId(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently delete the location from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-[8px]"
              onClick={handleDeleteLocation}
            >
              Delete Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
