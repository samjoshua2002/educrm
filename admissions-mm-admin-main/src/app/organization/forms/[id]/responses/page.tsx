"use client";

import * as React from "react";
import {
  ChevronLeft,
  Download,
  Filter,
  Search,
  Eye,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  User,
  FileType,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useForm, useFormResponses, useUpdateResponseStatus } from "@/hooks/use-forms";
import { FormResponse } from "@/types/form";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

const statusStyles = {
  verified: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const statusIcons = {
  verified: <CheckCircle2 className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
};

export default function OrganizationResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;
  
  // State
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedResponse, setSelectedResponse] = React.useState<FormResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // API Hooks
  const { data: form, isLoading: isLoadingForm } = useForm(id);
  const { data: paginatedResponses, isLoading: isLoadingResponses } = useFormResponses(id, page, 10);
  const { mutate: updateStatus } = useUpdateResponseStatus();

  const responses = paginatedResponses?.data || [];
  const pagination = paginatedResponses?.pagination;

  const handleStatusUpdate = (resId: string, status: FormResponse['status']) => {
    updateStatus({ id: resId, status });
    if (selectedResponse?.id === resId) {
      setSelectedResponse(prev => prev ? { ...prev, status } : null);
    }
  };

  if (isLoadingForm) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-14 border-b flex items-center px-6 gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-lg font-semibold">Form not found</p>
        <Link href="/organization/forms">
          <Button variant="outline">Back to Forms</Button>
        </Link>
      </div>
    );
  }

  // Logic to find "Applicant Name" and "Email" from dynamic data for display
  const getDisplayValue = (res: FormResponse, type: 'name' | 'email') => {
    const field = form.fields.find(f => f.type === (type === 'name' ? 'text' : 'email'));
    if (field && res.data[field.id]) return res.data[field.id];
    
    // Fallback search
    const entries = Object.entries(res.data);
    if (type === 'name') {
      const nameKey = Object.keys(res.data).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('full'));
      return nameKey ? res.data[nameKey] : "Applicant";
    } else {
      const emailKey = Object.keys(res.data).find(k => k.toLowerCase().includes('email'));
      return emailKey ? res.data[emailKey] : "—";
    }
  };

  return (
    <>
      {/* Header */}
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link href="/organization/forms">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Form Submissions</h1>
            <p className="text-xs text-muted-foreground">{form.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Exporting CSV...")}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Search + quick filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search submissions..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <span className="text-xs italic">
               {pagination ? `Total ${pagination.total} submissions` : ""}
             </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-primary/10 shadow-sm bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="ps-4">Applicant</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Status</TableHead>
                {form.fields.slice(0, 2).map(field => (
                  <TableHead key={field.id}>{field.label}</TableHead>
                ))}
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingResponses ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={form.fields.slice(0, 2).length + 4} className="py-4 ps-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                          <Skeleton className="h-3 w-[100px]" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : responses.length > 0 ? (
                responses.map((res) => {
                  const applicantName = getDisplayValue(res, 'name');
                  const applicantEmail = getDisplayValue(res, 'email');
                  return (
                    <TableRow key={res.id} className="hover:bg-primary/[0.01]">
                      <TableCell className="ps-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] uppercase">
                            {String(applicantName).split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{applicantName}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{applicantEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium uppercase">
                          <Calendar className="h-3 w-3" />
                          {res.submittedAt ? format(new Date(res.submittedAt), 'MMM dd, hh:mm a') : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`border-0 capitalize flex items-center w-fit gap-1.5 px-2 py-0 h-5 text-[10px] font-bold ${statusStyles[res.status] ?? ""}`}
                        >
                          {statusIcons[res.status]}
                          {res.status}
                        </Badge>
                        {res.isDuplicate && (
                          <Badge variant="destructive" className="ml-2 text-[9px] h-3.5 px-1 font-black">DUP</Badge>
                        )}
                      </TableCell>
                      {form.fields.slice(0, 2).map(field => (
                        <TableCell key={field.id} className="text-xs font-medium">
                          {res.data[field.id] || "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right pe-4">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => {
                              setSelectedResponse(res);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-primary/10 transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 p-1">
                              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">Set Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 focus:bg-emerald-600 focus:text-white rounded-md cursor-pointer" onClick={() => handleStatusUpdate(res.id, 'verified')}>
                                <CheckCircle2 className="h-4 w-4" /> Mark as Verified
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 focus:bg-orange-600 focus:text-white rounded-md cursor-pointer" onClick={() => handleStatusUpdate(res.id, 'pending')}>
                                <Clock className="h-4 w-4" /> Set to Pending
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 focus:bg-destructive focus:text-white rounded-md cursor-pointer text-destructive" onClick={() => handleStatusUpdate(res.id, 'rejected')}>
                                <XCircle className="h-4 w-4" /> Reject Application
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={form.fields.slice(0, 2).length + 4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                      <Database className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium italic">No submissions found for this form.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
              Showing {responses.length} of {pagination.total} submissions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold uppercase"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <div className="text-xs font-bold w-12 text-center">
                {page} / {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold uppercase"
                onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedResponse && (
            <>
              <SheetHeader className="pb-6 border-b">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <FileType className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Application Summary</span>
                </div>
                <SheetTitle className="text-xl font-bold">
                  {getDisplayValue(selectedResponse, 'name')}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={`border-0 capitalize ${statusStyles[selectedResponse.status] ?? ""}`}
                  >
                    {selectedResponse.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">ID: {selectedResponse.id}</span>
                </div>
              </SheetHeader>

              <div className="py-6 space-y-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Database className="h-3 w-3" /> Form Data
                  </h3>
                  <div className="grid grid-cols-1 gap-2 bg-muted/20 p-4 rounded-lg border border-dashed">
                    {form.fields.map(field => (
                      <div key={field.id} className="grid grid-cols-3 py-1 border-b border-muted last:border-0 items-center">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground col-span-1">{field.label}</p>
                        <p className="text-sm font-medium col-span-2">{selectedResponse.data[field.id] || "—"}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" /> System Metadata
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Submitted At</p>
                      <p className="text-sm font-medium">{format(new Date(selectedResponse.submittedAt), 'PPpp')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-bold">Is Potential Duplicate?</p>
                      <Badge variant={selectedResponse.isDuplicate ? "destructive" : "outline"} className="text-[10px]">
                        {selectedResponse.isDuplicate ? "YES" : "NO"}
                      </Badge>
                    </div>
                  </div>
                </section>

                <Separator />

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/5 border-destructive/20 hover:text-destructive"
                    onClick={() => handleStatusUpdate(selectedResponse.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStatusUpdate(selectedResponse.id, 'verified')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Verify & Approve
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
