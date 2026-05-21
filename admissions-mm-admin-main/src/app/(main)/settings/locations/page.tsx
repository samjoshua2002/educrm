"use client";

import * as React from "react";

import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  Search,
  MapPin,
  Building2,
  UserCheck,
  Globe,
  Coins,
} from "lucide-react";

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
    country: "IN",
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

export default function LocationsPage() {
  const [locations, setLocations] =
    React.useState<Location[]>(initialLocations);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState<Partial<Location>>({
    type: "Center",
    country: "India",
  });

  const filteredLocations = React.useMemo(() => {
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.country.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [locations, searchQuery]);

  const handleCreateLocation = () => {
    const newLoc: Location = {
      id: locations.length + 1,
      type: formData.type as LocationType,
      name: formData.name || "",
      address: formData.address || "",
      city: formData.city || "",
      state: formData.state || "",
      pin: formData.pin || "",
      country: formData.country || "",
      currencySymbol:
        formData.type === "Center" ? formData.currencySymbol : undefined,
      currency: formData.type === "Center" ? formData.currency : undefined,
    };
    setLocations([...locations, newLoc]);
    setCreateDialogOpen(false);
    setFormData({ type: "Center", country: "India" });
  };

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Location Management</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Add Location
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city or country..."
              className="pl-8 bg-muted/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="type"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, type: val as LocationType })
                    }
                  >
                    <SelectTrigger id="type" className="bg-muted/30 w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Center">Center Location</SelectItem>
                      <SelectItem value="Interview">
                        Interview Location
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Location Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. New Delhi Center"
                    className="bg-muted/30"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="address"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Full Address
                </Label>
                <Input
                  id="address"
                  placeholder="Building number, street, etc."
                  className="bg-muted/30"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="country"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Country
                  </Label>
                  <Select
                    value={formData.country}
                    onValueChange={(val) =>
                      setFormData({ ...formData, country: val })
                    }
                  >
                    <SelectTrigger id="country" className="bg-muted/30 w-full">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="state"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    State
                  </Label>
                  <MultiSelect
                    values={formData.state ? [formData.state] : []}
                    onValuesChange={(vals) =>
                      setFormData({ ...formData, state: vals[0] })
                    }
                    single
                  >
                    <MultiSelectTrigger
                      id="state"
                      className="bg-muted/30 w-full"
                    >
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

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="city"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    City
                  </Label>
                  <Input
                    id="city"
                    placeholder="City"
                    className="bg-muted/30"
                    value={formData.city || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="pin"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    PIN / Zip Code
                  </Label>
                  <Input
                    id="pin"
                    placeholder="e.g. 110001"
                    className="bg-muted/30"
                    value={formData.pin || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, pin: e.target.value })
                    }
                  />
                </div>
              </div>

              {formData.type === "Center" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20 shadow-inner">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="currencySymbol"
                      className="text-xs font-bold text-primary uppercase"
                    >
                      Currency Symbol
                    </Label>
                    <Input
                      id="currencySymbol"
                      placeholder="e.g. ₹"
                      className="bg-white/50 border-primary/20 focus-visible:ring-primary/30"
                      value={formData.currencySymbol || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currencySymbol: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="currency"
                      className="text-xs font-bold text-primary uppercase"
                    >
                      Currency Code
                    </Label>
                    <Input
                      id="currency"
                      placeholder="e.g. INR"
                      className="bg-white/50 border-primary/20 focus-visible:ring-primary/30"
                      value={formData.currency || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLocation}
                className="px-8 shadow-lg shadow-primary/20"
              >
                Save Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="ps-4">Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${loc.type === "Center" ? "bg-blue-100/50 text-blue-600" : "bg-emerald-100/50 text-emerald-600"}`}
                        >
                          {loc.type === "Center" ? (
                            <Building2 className="size-4" />
                          ) : (
                            <UserCheck className="size-4" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground tracking-tight">
                          {loc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          loc.type === "Center"
                            ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                            : "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                        }
                      >
                        {loc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{loc.address}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {loc.city}, {loc.country}
                      </div>
                    </TableCell>
                    <TableCell>
                      {loc.type === "Center" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            {loc.currencySymbol}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {loc.currency}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-50">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pe-4">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                              size="icon"
                            >
                              <EllipsisVertical className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
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
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No locations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
