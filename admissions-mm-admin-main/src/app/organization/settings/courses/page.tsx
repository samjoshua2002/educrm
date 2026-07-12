"use client";

import * as React from "react";
import Link from "next/link";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Search,
  SearchX,
  BookOpen,
  Calendar,
  Layers,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Users,
  Building2,
  CalendarDays,
  Coins,
  MapPin,
  Mail,
  Phone,
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { cn } from "@/lib/utils";

import {
  useCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useHardDeleteCourse,
  Course,
} from "@/hooks/use-courses";
import {
  useAcademicSessions,
  useCreateAcademicSession,
  useUpdateAcademicSession,
  useDeleteAcademicSession,
  AcademicSession,
} from "@/hooks/use-academic-sessions";
import {
  useCourseSessions,
  useCreateCourseSession,
  useUpdateCourseSession,
  useDeleteCourseSession,
  CourseSession,
} from "@/hooks/use-course-sessions";

const statusStyles: Record<string, string> = {
  Active:
    "bg-[#05966933] text-[#065F46] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Inactive:
    "bg-[#D9770633] text-[#BD0F0F] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Current:
    "bg-[#2563EB22] text-[#2563EB] font-semibold px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

export default function CoursesSettingsPage() {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const [activeTab, setActiveTab] = React.useState("courses");

  // Fetch larger lists to enable responsive local filtering & pagination on the client side
  const { data: coursesResponse, isLoading: isLoadingCourses } = useCourses(1, 100);
  const { data: sessionsResponse, isLoading: isLoadingSessions } = useAcademicSessions(1, 100);
  const { data: courseSessionsResponse, isLoading: isLoadingCourseSessions } = useCourseSessions(1, 100);

  const allCourses = coursesResponse?.data || [];
  const allSessions = sessionsResponse?.data || [];
  const allCourseSessions = courseSessionsResponse?.data || [];

  // 1. COURSES TAB FILTERS, STATE, PAGINATION
  const [coursesSearch, setCoursesSearch] = React.useState("");
  const [coursesStatus, setCoursesStatus] = React.useState("all");
  const [coursesPage, setCoursesPage] = React.useState(1);
  const [coursesMobileCount, setCoursesMobileCount] = React.useState(5);

  const filteredCourses = React.useMemo(() => {
    return allCourses.filter((course) => {
      if (coursesSearch.trim() !== "") {
        const q = coursesSearch.toLowerCase();
        if (
          !course.name.toLowerCase().includes(q) &&
          !course.code.toLowerCase().includes(q) &&
          !(course.department || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (coursesStatus !== "all") {
        const isAct = coursesStatus === "Active";
        if (course.isActive !== isAct) return false;
      }
      return true;
    });
  }, [allCourses, coursesSearch, coursesStatus]);

  const coursesItemsPerPage = 5;
  const coursesTotalPages = Math.ceil(filteredCourses.length / coursesItemsPerPage) || 1;
  const coursesStartIndex = (coursesPage - 1) * coursesItemsPerPage;
  const coursesEndIndex = coursesStartIndex + coursesItemsPerPage;
  const paginatedCourses = filteredCourses.slice(coursesStartIndex, coursesEndIndex);
  const mobileCourses = filteredCourses.slice(0, coursesMobileCount);

  const coursesVisiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = coursesTotalPages;
    if (coursesTotalPages > 5) {
      if (coursesPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (coursesPage + 2 >= coursesTotalPages) {
        startPage = coursesTotalPages - 4;
        endPage = coursesTotalPages;
      } else {
        startPage = coursesPage - 2;
        endPage = coursesPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [coursesPage, coursesTotalPages]);


  // 2. ACADEMIC SESSIONS TAB FILTERS, STATE, PAGINATION
  const [sessionsSearch, setSessionsSearch] = React.useState("");
  const [sessionsStatus, setSessionsStatus] = React.useState("all");
  const [sessionsPage, setSessionsPage] = React.useState(1);
  const [sessionsMobileCount, setSessionsMobileCount] = React.useState(5);

  const filteredSessions = React.useMemo(() => {
    return allSessions.filter((session) => {
      if (sessionsSearch.trim() !== "") {
        const q = sessionsSearch.toLowerCase();
        if (
          !session.name.toLowerCase().includes(q) &&
          !(session.displayName || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (sessionsStatus !== "all") {
        const isAct = sessionsStatus === "Active";
        if (session.isActive !== isAct) return false;
      }
      return true;
    });
  }, [allSessions, sessionsSearch, sessionsStatus]);

  const sessionsItemsPerPage = 5;
  const sessionsTotalPages = Math.ceil(filteredSessions.length / sessionsItemsPerPage) || 1;
  const sessionsStartIndex = (sessionsPage - 1) * sessionsItemsPerPage;
  const sessionsEndIndex = sessionsStartIndex + sessionsItemsPerPage;
  const paginatedSessions = filteredSessions.slice(sessionsStartIndex, sessionsEndIndex);
  const mobileSessions = filteredSessions.slice(0, sessionsMobileCount);

  const sessionsVisiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = sessionsTotalPages;
    if (sessionsTotalPages > 5) {
      if (sessionsPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (sessionsPage + 2 >= sessionsTotalPages) {
        startPage = sessionsTotalPages - 4;
        endPage = sessionsTotalPages;
      } else {
        startPage = sessionsPage - 2;
        endPage = sessionsPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [sessionsPage, sessionsTotalPages]);


  // 3. COURSE SESSIONS TAB FILTERS, STATE, PAGINATION
  const [courseSessionsSearch, setCourseSessionsSearch] = React.useState("");
  const [filterCourseId, setFilterCourseId] = React.useState("all");
  const [filterSessionId, setFilterSessionId] = React.useState("all");
  const [courseSessionsStatus, setCourseSessionsStatus] = React.useState("all");
  const [courseSessionsPage, setCourseSessionsPage] = React.useState(1);
  const [courseSessionsMobileCount, setCourseSessionsMobileCount] = React.useState(5);

  const filteredCourseSessions = React.useMemo(() => {
    return allCourseSessions.filter((cs) => {
      if (courseSessionsSearch.trim() !== "") {
        const q = courseSessionsSearch.toLowerCase();
        const cName = cs.course?.name?.toLowerCase() || "";
        const cCode = cs.course?.code?.toLowerCase() || "";
        if (!cName.includes(q) && !cCode.includes(q)) {
          return false;
        }
      }
      if (filterCourseId !== "all" && cs.courseId !== filterCourseId) return false;
      if (filterSessionId !== "all" && cs.academicSessionId !== filterSessionId) return false;
      if (courseSessionsStatus !== "all") {
        const isAct = courseSessionsStatus === "Active";
        if (cs.isActive !== isAct) return false;
      }
      return true;
    });
  }, [allCourseSessions, courseSessionsSearch, filterCourseId, filterSessionId, courseSessionsStatus]);

  const courseSessionsItemsPerPage = 5;
  const courseSessionsTotalPages = Math.ceil(filteredCourseSessions.length / courseSessionsItemsPerPage) || 1;
  const courseSessionsStartIndex = (courseSessionsPage - 1) * courseSessionsItemsPerPage;
  const courseSessionsEndIndex = courseSessionsStartIndex + courseSessionsItemsPerPage;
  const paginatedCourseSessions = filteredCourseSessions.slice(courseSessionsStartIndex, courseSessionsEndIndex);
  const mobileCourseSessions = filteredCourseSessions.slice(0, courseSessionsMobileCount);

  const courseSessionsVisiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = courseSessionsTotalPages;
    if (courseSessionsTotalPages > 5) {
      if (courseSessionsPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (courseSessionsPage + 2 >= courseSessionsTotalPages) {
        startPage = courseSessionsTotalPages - 4;
        endPage = courseSessionsTotalPages;
      } else {
        startPage = courseSessionsPage - 2;
        endPage = courseSessionsPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [courseSessionsPage, courseSessionsTotalPages]);


  // We fetch dropdowns lists as well
  const { data: allCoursesDropdown } = useCourses(1, 100);
  const { data: allSessionsDropdown } = useAcademicSessions(1, 100);

  // Mutation Hooks
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const hardDeleteCourse = useHardDeleteCourse();

  const createSession = useCreateAcademicSession();
  const updateSession = useUpdateAcademicSession();
  const deleteSession = useDeleteAcademicSession();

  const createCourseSession = useCreateCourseSession();
  const updateCourseSession = useUpdateCourseSession();
  const deleteCourseSession = useDeleteCourseSession();

  // Dialog Forms State
  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [courseForm, setCourseForm] = React.useState({
    name: "",
    code: "",
    department: "",
    duration: "",
    durationMonths: "",
    isActive: true,
  });

  const [sessionDialogOpen, setSessionDialogOpen] = React.useState(false);
  const [editingSession, setEditingSession] =
    React.useState<AcademicSession | null>(null);
  const [sessionForm, setSessionForm] = React.useState({
    name: "",
    displayName: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    isActive: true,
  });

  const [courseSessionDialogOpen, setCourseSessionDialogOpen] =
    React.useState(false);
  const [editingCourseSession, setEditingCourseSession] =
    React.useState<CourseSession | null>(null);
  const [courseSessionForm, setCourseSessionForm] = React.useState({
    courseId: "",
    academicSessionId: "",
    totalSeats: "",
    feeAmount: "",
    isActive: true,
  });

  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: "course" | "session" | "course-session";
    id: string;
  } | null>(null);

  // Separate state for permanent hard-delete (courses only)
  const [hardDeleteCourseId, setHardDeleteCourseId] = React.useState<string | null>(null);

  // Dynamic Header Action registration
  React.useEffect(() => {
    const handleOpenAddCourse = () => {
      setEditingCourse(null);
      setCourseForm({
        name: "",
        code: "",
        department: "",
        duration: "",
        durationMonths: "",
        isActive: true,
      });
      setCourseDialogOpen(true);
    };

    const handleOpenAddSession = () => {
      setEditingSession(null);
      setSessionForm({
        name: "",
        displayName: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        isActive: true,
      });
      setSessionDialogOpen(true);
    };

    const handleOpenAddCourseSession = () => {
      setEditingCourseSession(null);
      setCourseSessionForm({
        courseId: "",
        academicSessionId: "",
        totalSeats: "",
        feeAmount: "",
        isActive: true,
      });
      setCourseSessionDialogOpen(true);
    };

    let actionLabel = "Add Course";
    let actionOnClick = handleOpenAddCourse;

    if (activeTab === "sessions") {
      actionLabel = "Add Session";
      actionOnClick = handleOpenAddSession;
    } else if (activeTab === "course-sessions") {
      actionLabel = "Link Course Session";
      actionOnClick = handleOpenAddCourseSession;
    }

    setHeader({
      title: "Courses & Sessions Settings",
      description:
        "Manage your organization's course catalogs, academic years/sessions, and course availability parameters.",
      action: {
        label: actionLabel,
        onClick: actionOnClick,
      },
    });

    return () => clearHeader();
  }, [activeTab, setHeader, clearHeader]);

  // Form Handlers
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name.trim() || !courseForm.code.trim()) return;

    const payload = {
      name: courseForm.name,
      code: courseForm.code,
      department: courseForm.department || undefined,
      duration: courseForm.duration || undefined,
      durationMonths: courseForm.durationMonths
        ? parseInt(courseForm.durationMonths, 10)
        : undefined,
      isActive: courseForm.isActive,
    };

    if (editingCourse) {
      updateCourse.mutate(
        { id: editingCourse.id, data: payload },
        { onSuccess: () => setCourseDialogOpen(false) },
      );
    } else {
      createCourse.mutate(payload, {
        onSuccess: () => setCourseDialogOpen(false),
      });
    }
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.name.trim()) return;

    const payload = {
      name: sessionForm.name,
      displayName: sessionForm.displayName || undefined,
      startDate: sessionForm.startDate || undefined,
      endDate: sessionForm.endDate || undefined,
      isCurrent: sessionForm.isCurrent,
      isActive: sessionForm.isActive,
    };

    if (editingSession) {
      updateSession.mutate(
        { id: editingSession.id, data: payload },
        { onSuccess: () => setSessionDialogOpen(false) },
      );
    } else {
      createSession.mutate(payload, {
        onSuccess: () => setSessionDialogOpen(false),
      });
    }
  };

  const handleSaveCourseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseSessionForm.courseId || !courseSessionForm.academicSessionId)
      return;

    const payload = {
      courseId: courseSessionForm.courseId,
      academicSessionId: courseSessionForm.academicSessionId,
      totalSeats: courseSessionForm.totalSeats
        ? parseInt(courseSessionForm.totalSeats, 10)
        : undefined,
      feeAmount: courseSessionForm.feeAmount
        ? parseFloat(courseSessionForm.feeAmount)
        : undefined,
      isActive: courseSessionForm.isActive,
    };

    if (editingCourseSession) {
      updateCourseSession.mutate(
        { id: editingCourseSession.id, data: payload },
        { onSuccess: () => setCourseSessionDialogOpen(false) },
      );
    } else {
      createCourseSession.mutate(payload, {
        onSuccess: () => setCourseSessionDialogOpen(false),
      });
    }
  };

  // Edit triggers
  const triggerEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      code: course.code,
      department: course.department || "",
      duration: course.duration || "",
      durationMonths: course.durationMonths?.toString() || "",
      isActive: course.isActive,
    });
    setCourseDialogOpen(true);
  };

  const triggerEditSession = (session: AcademicSession) => {
    setEditingSession(session);
    setSessionForm({
      name: session.name,
      displayName: session.displayName || "",
      startDate: session.startDate ? session.startDate.split("T")[0] : "",
      endDate: session.endDate ? session.endDate.split("T")[0] : "",
      isCurrent: session.isCurrent,
      isActive: session.isActive,
    });
    setSessionDialogOpen(true);
  };

  const triggerEditCourseSession = (cs: CourseSession) => {
    setEditingCourseSession(cs);
    setCourseSessionForm({
      courseId: cs.courseId,
      academicSessionId: cs.academicSessionId,
      totalSeats: cs.totalSeats?.toString() || "",
      feeAmount: cs.feeAmount?.toString() || "",
      isActive: cs.isActive,
    });
    setCourseSessionDialogOpen(true);
  };

  const triggerDelete = (type: "course" | "session" | "course-session", id: string) => {
    setDeleteTarget({ type, id });
  };

  const executeDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "course") {
      deleteCourse.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    } else if (deleteTarget.type === "session") {
      deleteSession.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    } else if (deleteTarget.type === "course-session") {
      deleteCourseSession.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex flex-col gap-4"
        >
          {/* Animated slider tab switch container matching red/blue/spacious aesthetics */}
          <TabsList className="bg-[#fafafa] dark:bg-muted/5 border border-border/80 p-[4px] rounded-[10px] h-12 w-fit inline-flex items-center">
            <TabsTrigger
              value="courses"
              className={cn(
                "h-9 px-6 rounded-[8px] text-sm font-semibold transition-all duration-300 cursor-pointer shadow-none border-0",
                "data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Courses
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className={cn(
                "h-9 px-6 rounded-[8px] text-sm font-semibold transition-all duration-300 cursor-pointer shadow-none border-0",
                "data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Academic Sessions
            </TabsTrigger>
            <TabsTrigger
              value="course-sessions"
              className={cn(
                "h-9 px-6 rounded-[8px] text-sm font-semibold transition-all duration-300 cursor-pointer shadow-none border-0",
                "data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Course Sessions
            </TabsTrigger>
          </TabsList>

          {/* 1. COURSES TAB CONTENT */}
          <TabsContent value="courses" className="flex flex-col gap-4 outline-none">
            {/* Search and Filters Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 w-full">
                <div className="relative w-full">
                  <Input
                    placeholder="Search courses by name or code..."
                    className="w-full pr-10 h-10"
                    value={coursesSearch}
                    onChange={(e) => {
                      setCoursesSearch(e.target.value);
                      setCoursesPage(1);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <Search className="size-4" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 min-w-0 sm:w-[140px]">
                    <Select
                      value={coursesStatus}
                      onValueChange={(val) => {
                        setCoursesStatus(val);
                        setCoursesPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop View Table */}
            <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <Table>
                <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
                  <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      COURSE NAME
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      CODE
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      DEPARTMENT
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      DURATION
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      STATUS
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!mounted || isLoadingCourses ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                          <p>Loading courses...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                            <SearchX className="size-6 text-muted-foreground/80" />
                          </div>
                          <div className="flex flex-col gap-0.5 text-center">
                            <p className="text-sm font-semibold text-foreground">No courses found</p>
                            <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCourses.map((course) => (
                      <TableRow
                        key={course.id}
                        className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[86px]"
                      >
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <div className="font-semibold text-[#1e293b] text-[14px]">
                            {course.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <Badge variant="outline" className="border-border text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {course.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle text-[#475569] text-[14px]">
                          {course.department || <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          {course.duration ? (
                            <div className="flex flex-col">
                              <span className="text-sm text-[#475569]">{course.duration}</span>
                              {course.durationMonths && (
                                <span className="text-xs text-muted-foreground mt-0.5">({course.durationMonths} Months)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <Badge
                            variant="secondary"
                            className={course.isActive ? statusStyles.Active : statusStyles.Inactive}
                          >
                            {course.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle text-right">
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
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => triggerEditCourse(course)}
                                >
                                  <Pencil className="size-4" />
                                  Edit Course
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {course.isActive && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2"
                                    onClick={() => triggerDelete("course", course.id)}
                                  >
                                    <Trash2 className="size-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="gap-2 text-red-700 focus:text-red-700"
                                  onClick={() => setHardDeleteCourseId(course.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete Permanently
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
                    {filteredCourses.length === 0 ? 0 : coursesStartIndex + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(coursesEndIndex, filteredCourses.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">{filteredCourses.length}</span>{" "}
                  entries
                </p>
                {coursesTotalPages > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                      onClick={() => {
                        if (coursesPage > 1) setCoursesPage(coursesPage - 1);
                      }}
                      disabled={coursesPage === 1}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-1.5 px-1">
                      {coursesVisiblePages.map((page) => {
                        const isActive = page === coursesPage;
                        return (
                          <Button
                            key={page}
                            variant={isActive ? "default" : "outline"}
                            className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                              isActive
                                ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                                : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                            }`}
                            onClick={() => setCoursesPage(page)}
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
                        if (coursesPage < coursesTotalPages) setCoursesPage(coursesPage + 1);
                      }}
                      disabled={coursesPage === coursesTotalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile View - Card List */}
            {filteredCourses.length === 0 ? (
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
                {mobileCourses.map((course) => {
                  const words = course.name.trim().split(/\s+/);
                  const firstLetters = words.map(w => w.replace(/[^A-Za-z]/g, '')[0]).filter(Boolean);
                  const initials = firstLetters.slice(0, 2).join("").toUpperCase();

                  return (
                    <div
                      key={course.id}
                      className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                              {course.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block mt-0.5">
                              Code: {course.code}
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
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="gap-2" onClick={() => triggerEditCourse(course)}>
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {course.isActive && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="gap-2"
                                  onClick={() => triggerDelete("course", course.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2 text-red-700 focus:text-red-700"
                                onClick={() => setHardDeleteCourseId(course.id)}
                              >
                                <Trash2 className="size-4" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                            <Building2 className="size-3" /> Dept:
                          </span>
                          <span className="text-foreground/95 font-medium truncate">
                            {course.department || "—"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-[#64748B] flex items-center gap-1">
                            <Clock className="size-3" /> Duration:
                          </span>
                          <span className="text-foreground/95 font-medium truncate">
                            {course.duration || "—"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-muted-foreground/80">Status:</span>
                          <div>
                            <Badge
                              variant="secondary"
                              className={course.isActive ? statusStyles.Active : statusStyles.Inactive}
                            >
                              {course.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile pagination load more */}
                {coursesMobileCount < filteredCourses.length ? (
                  <div className="flex flex-col items-center justify-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
                      onClick={() => setCoursesMobileCount((prev) => prev + 5)}
                    >
                      Load More Courses
                    </Button>
                    <p className="text-xs text-muted-foreground font-normal">
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {Math.min(coursesMobileCount, filteredCourses.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-foreground">{filteredCourses.length}</span> entries
                    </p>
                  </div>
                ) : (
                  filteredCourses.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 mt-2">
                      <p className="text-xs text-muted-foreground font-normal">
                        Showing all{" "}
                        <span className="font-medium text-foreground">{filteredCourses.length}</span> of{" "}
                        <span className="font-medium text-foreground">{filteredCourses.length}</span> entries
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* 2. ACADEMIC SESSIONS TAB CONTENT */}
          <TabsContent value="sessions" className="flex flex-col gap-4 outline-none">
            {/* Search and Filters Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 w-full">
                <div className="relative w-full">
                  <Input
                    placeholder="Search sessions by name or display title..."
                    className="w-full pr-10 h-10"
                    value={sessionsSearch}
                    onChange={(e) => {
                      setSessionsSearch(e.target.value);
                      setSessionsPage(1);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <Search className="size-4" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 min-w-0 sm:w-[140px]">
                    <Select
                      value={sessionsStatus}
                      onValueChange={(val) => {
                        setSessionsStatus(val);
                        setSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop View Table */}
            <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <Table>
                <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
                  <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      SESSION NAME
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      DISPLAY TITLE
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      DATE RANGE
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      CURRENT
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      STATUS
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!mounted || isLoadingSessions ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                          <p>Loading academic sessions...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                            <SearchX className="size-6 text-muted-foreground/80" />
                          </div>
                          <div className="flex flex-col gap-0.5 text-center">
                            <p className="text-sm font-semibold text-foreground">No sessions found</p>
                            <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSessions.map((session) => (
                      <TableRow
                        key={session.id}
                        className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[86px]"
                      >
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <div className="font-semibold text-[#1e293b] text-[14px]">
                            {session.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle text-[#475569] text-[14px]">
                          {session.displayName || <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          {session.startDate || session.endDate ? (
                            <div className="text-[#475569] text-[14px] flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-muted-foreground" />
                              <span>
                                {session.startDate
                                  ? new Date(session.startDate).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "N/A"}{" "}
                                to{" "}
                                {session.endDate
                                  ? new Date(session.endDate).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          {session.isCurrent ? (
                            <Badge className={statusStyles.Current}>Current</Badge>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <Badge
                            variant="secondary"
                            className={session.isActive ? statusStyles.Active : statusStyles.Inactive}
                          >
                            {session.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle text-right">
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
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => triggerEditSession(session)}
                                >
                                  <Pencil className="size-4" />
                                  Edit Session
                                </DropdownMenuItem>
                                {!session.isCurrent && session.isActive && (
                                  <DropdownMenuItem
                                    className="gap-2 font-medium text-blue-600"
                                    onClick={() =>
                                      updateSession.mutate({
                                        id: session.id,
                                        data: { isCurrent: true },
                                      })
                                    }
                                  >
                                    <Check className="size-4" />
                                    Mark as Current
                                  </DropdownMenuItem>
                                )}
                                {session.isActive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="gap-2"
                                      onClick={() => triggerDelete("session", session.id)}
                                    >
                                      <Trash2 className="size-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => triggerDelete("session", session.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete Permanently
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
                    {filteredSessions.length === 0 ? 0 : sessionsStartIndex + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(sessionsEndIndex, filteredSessions.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">{filteredSessions.length}</span>{" "}
                  entries
                </p>
                {sessionsTotalPages > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                      onClick={() => {
                        if (sessionsPage > 1) setSessionsPage(sessionsPage - 1);
                      }}
                      disabled={sessionsPage === 1}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-1.5 px-1">
                      {sessionsVisiblePages.map((page) => {
                        const isActive = page === sessionsPage;
                        return (
                          <Button
                            key={page}
                            variant={isActive ? "default" : "outline"}
                            className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                              isActive
                                ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                                : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                            }`}
                            onClick={() => setSessionsPage(page)}
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
                        if (sessionsPage < sessionsTotalPages) setSessionsPage(sessionsPage + 1);
                      }}
                      disabled={sessionsPage === sessionsTotalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile View - Card List */}
            {filteredSessions.length === 0 ? (
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
                {mobileSessions.map((session) => {
                  const words = session.name.trim().split(/[\s-]+/);
                  const firstLetters = words.map(w => w.replace(/[^A-Za-z0-9]/g, '')[0]).filter(Boolean);
                  const initials = firstLetters.slice(0, 2).join("").toUpperCase();

                  return (
                    <div
                      key={session.id}
                      className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                            {initials || "AS"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                              {session.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block mt-0.5">
                              {session.displayName || "No Display Name"}
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
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="gap-2" onClick={() => triggerEditSession(session)}>
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              {!session.isCurrent && session.isActive && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    updateSession.mutate({
                                      id: session.id,
                                      data: { isCurrent: true },
                                    })
                                  }
                                >
                                  <Check className="size-4" />
                                  Mark as Current
                                </DropdownMenuItem>
                              )}
                              {session.isActive && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2"
                                    onClick={() => triggerDelete("session", session.id)}
                                  >
                                    <Trash2 className="size-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => triggerDelete("session", session.id)}
                              >
                                <Trash2 className="size-4" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                        <div className="flex flex-col gap-1 min-w-0 col-span-2">
                          <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                            <Calendar className="size-3" /> Date Range:
                          </span>
                          <span className="text-foreground/95 font-medium truncate">
                            {session.startDate
                              ? new Date(session.startDate).toLocaleDateString()
                              : "N/A"}{" "}
                            to{" "}
                            {session.endDate
                              ? new Date(session.endDate).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-muted-foreground/80">Current:</span>
                          <div>
                            {session.isCurrent ? (
                              <Badge className={statusStyles.Current}>Current</Badge>
                            ) : (
                              <span className="text-foreground/95 font-medium">—</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-muted-foreground/80">Status:</span>
                          <div>
                            <Badge
                              variant="secondary"
                              className={session.isActive ? statusStyles.Active : statusStyles.Inactive}
                            >
                              {session.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile pagination load more */}
                {sessionsMobileCount < filteredSessions.length ? (
                  <div className="flex flex-col items-center justify-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
                      onClick={() => setSessionsMobileCount((prev) => prev + 5)}
                    >
                      Load More Sessions
                    </Button>
                    <p className="text-xs text-muted-foreground font-normal">
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {Math.min(sessionsMobileCount, filteredSessions.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-foreground">{filteredSessions.length}</span> entries
                    </p>
                  </div>
                ) : (
                  filteredSessions.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 mt-2">
                      <p className="text-xs text-muted-foreground font-normal">
                        Showing all{" "}
                        <span className="font-medium text-foreground">{filteredSessions.length}</span> of{" "}
                        <span className="font-medium text-foreground">{filteredSessions.length}</span> entries
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* 3. COURSE SESSIONS TAB CONTENT */}
          <TabsContent
            value="course-sessions"
            className="flex flex-col gap-4 outline-none"
          >
            {/* Search and Filters Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 w-full">
                <div className="relative w-full">
                  <Input
                    placeholder="Search by course name or code..."
                    className="w-full pr-10 h-10"
                    value={courseSessionsSearch}
                    onChange={(e) => {
                      setCourseSessionsSearch(e.target.value);
                      setCourseSessionsPage(1);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <Search className="size-4" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {/* Course Filter */}
                  <div className="flex-1 min-w-0 sm:w-[150px]">
                    <Select
                      value={filterCourseId}
                      onValueChange={(val) => {
                        setFilterCourseId(val);
                        setCourseSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {allCoursesDropdown?.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Session Filter */}
                  <div className="flex-1 min-w-0 sm:w-[160px]">
                    <Select
                      value={filterSessionId}
                      onValueChange={(val) => {
                        setFilterSessionId(val);
                        setCourseSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="All Sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        {allSessionsDropdown?.data?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.displayName || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex-1 min-w-0 sm:w-[140px]">
                    <Select
                      value={courseSessionsStatus}
                      onValueChange={(val) => {
                        setCourseSessionsStatus(val);
                        setCourseSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop View Table */}
            <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <Table>
                <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
                  <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      COURSE
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      ACADEMIC SESSION
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      TOTAL SEATS
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      FEE AMOUNT
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                      STATUS
                    </TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!mounted || isLoadingCourseSessions ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                          <p>Loading course sessions...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCourseSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                            <SearchX className="size-6 text-muted-foreground/80" />
                          </div>
                          <div className="flex flex-col gap-0.5 text-center">
                            <p className="text-sm font-semibold text-foreground">No course sessions found</p>
                            <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCourseSessions.map((cs) => (
                      <TableRow
                        key={cs.id}
                        className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[86px]"
                      >
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#1e293b] text-[14px]">
                              {cs.course?.name || "N/A"}
                            </span>
                            {cs.course?.code && (
                              <span className="text-[#64748b] text-[12px] mt-0.5">Code: {cs.course?.code}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle text-[#475569] text-[14px]">
                          {cs.academicSession?.displayName || cs.academicSession?.name || "N/A"}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <div className="flex items-center gap-1.5 text-sm text-[#475569]">
                            <Users className="size-4 text-muted-foreground" />
                            <span>{cs.totalSeats ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle font-medium text-emerald-700">
                          {cs.feeAmount ? (
                            <div className="flex items-center gap-0.5">
                              <DollarSign className="size-3.5" />
                              <span>{Number(cs.feeAmount).toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle">
                          <Badge
                            variant="secondary"
                            className={cs.isActive ? statusStyles.Active : statusStyles.Inactive}
                          >
                            {cs.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-[24px] px-[24px] align-middle text-right">
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
                              <DropdownMenuContent align="end" className="w-40 z-50">
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => triggerEditCourseSession(cs)}
                                >
                                  <Pencil className="size-4" />
                                  Edit Session
                                </DropdownMenuItem>
                                {cs.isActive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="gap-2"
                                      onClick={() => triggerDelete("course-session", cs.id)}
                                    >
                                      <Trash2 className="size-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </>
                                )}
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
                    {filteredCourseSessions.length === 0 ? 0 : courseSessionsStartIndex + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(courseSessionsEndIndex, filteredCourseSessions.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">{filteredCourseSessions.length}</span>{" "}
                  entries
                </p>
                {courseSessionsTotalPages > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                      onClick={() => {
                        if (courseSessionsPage > 1) setCourseSessionsPage(courseSessionsPage - 1);
                      }}
                      disabled={courseSessionsPage === 1}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-1.5 px-1">
                      {courseSessionsVisiblePages.map((page) => {
                        const isActive = page === courseSessionsPage;
                        return (
                          <Button
                            key={page}
                            variant={isActive ? "default" : "outline"}
                            className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                              isActive
                                ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                                : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                            }`}
                            onClick={() => setCourseSessionsPage(page)}
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
                        if (courseSessionsPage < courseSessionsTotalPages) setCourseSessionsPage(courseSessionsPage + 1);
                      }}
                      disabled={courseSessionsPage === courseSessionsTotalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile View - Card List */}
            {filteredCourseSessions.length === 0 ? (
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
                {mobileCourseSessions.map((cs) => {
                  const name = cs.course?.name || "CS";
                  const words = name.trim().split(/\s+/);
                  const firstLetters = words.map(w => w.replace(/[^A-Za-z]/g, '')[0]).filter(Boolean);
                  const initials = firstLetters.slice(0, 2).join("").toUpperCase();

                  return (
                    <div
                      key={cs.id}
                      className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                            {initials || "CS"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                              {cs.course?.name || "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block mt-0.5">
                              Session: {cs.academicSession?.displayName || cs.academicSession?.name || "N/A"}
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
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem className="gap-2" onClick={() => triggerEditCourseSession(cs)}>
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              {cs.isActive && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="gap-2"
                                  onClick={() => triggerDelete("course-session", cs.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                            <Users className="size-3" /> Seats:
                          </span>
                          <span className="text-foreground/95 font-medium truncate">
                            {cs.totalSeats || "—"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-[#64748B] flex items-center gap-1">
                            <Coins className="size-3" /> Fee:
                          </span>
                          <span className="text-foreground/95 font-medium truncate">
                            {cs.feeAmount ? `$ ${Number(cs.feeAmount).toLocaleString()}` : "—"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-muted-foreground/80">Status:</span>
                          <div>
                            <Badge
                              variant="secondary"
                              className={cs.isActive ? statusStyles.Active : statusStyles.Inactive}
                            >
                              {cs.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile pagination load more */}
                {courseSessionsMobileCount < filteredCourseSessions.length ? (
                  <div className="flex flex-col items-center justify-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
                      onClick={() => setCourseSessionsMobileCount((prev) => prev + 5)}
                    >
                      Load More Links
                    </Button>
                    <p className="text-xs text-muted-foreground font-normal">
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {Math.min(courseSessionsMobileCount, filteredCourseSessions.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-foreground">{filteredCourseSessions.length}</span> entries
                    </p>
                  </div>
                ) : (
                  filteredCourseSessions.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 mt-2">
                      <p className="text-xs text-muted-foreground font-normal">
                        Showing all{" "}
                        <span className="font-medium text-foreground">{filteredCourseSessions.length}</span> of{" "}
                        <span className="font-medium text-foreground">{filteredCourseSessions.length}</span> entries
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* A. COURSE DIALOG */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="sm:max-w-[680px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">
          
          {/* Card 1: Course Details */}
          <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <BookOpen className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Course Details</h3>
            </div>

            <form onSubmit={handleSaveCourse} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Course Name *
                </Label>
                <Input
                  placeholder="e.g. B.Tech Computer Science"
                  required
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, name: e.target.value })
                  }
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Course Code *
                  </Label>
                  <Input
                    placeholder="e.g. BTECH-CSE"
                    required
                    value={courseForm.code}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, code: e.target.value })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Department
                  </Label>
                  <Input
                    placeholder="e.g. School of Engineering"
                    value={courseForm.department}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, department: e.target.value })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Duration Label
                  </Label>
                  <Input
                    placeholder="e.g. 4 Years"
                    value={courseForm.duration}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, duration: e.target.value })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Duration in Months
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 48"
                    value={courseForm.durationMonths}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        durationMonths: e.target.value,
                      })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Card 2: CRM configuration */}
              <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                    <Layers className="size-5" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0F172A]">CRM Details</h3>
                </div>

                <div className="flex items-center justify-between rounded-xl p-4 bg-[#F8F9FA] border border-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Mark as Active Course</span>
                    <span className="text-xs text-muted-foreground">Course will be visible in registration and applicant lists</span>
                  </div>
                  <Switch
                    checked={courseForm.isActive}
                    onCheckedChange={(checked) =>
                      setCourseForm({ ...courseForm, isActive: checked })
                    }
                  />
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="flex items-center gap-3 justify-start mt-4 rounded-[10px] ">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCourseDialogOpen(false)}
                  className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createCourse.isPending ||
                    updateCourse.isPending ||
                    !courseForm.name.trim() ||
                    !courseForm.code.trim()
                  }
                  className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
                >
                  {createCourse.isPending || updateCourse.isPending ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* B. SESSION DIALOG */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="sm:max-w-[680px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">
          
          {/* Card 1: Session Details */}
          <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <CalendarDays className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Session Details</h3>
            </div>

            <form onSubmit={handleSaveSession} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Session Name *
                  </Label>
                  <Input
                    placeholder="e.g. 2026-27"
                    required
                    value={sessionForm.name}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, name: e.target.value })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Display Name
                  </Label>
                  <Input
                    placeholder="e.g. Academic Year 2026-27"
                    value={sessionForm.displayName}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        displayName: e.target.value,
                      })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={sessionForm.startDate}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        startDate: e.target.value,
                      })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm text-[#0F172A]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={sessionForm.endDate}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, endDate: e.target.value })
                    }
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm text-[#0F172A]"
                  />
                </div>
              </div>

              {/* Card 2: Reference settings */}
              <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                    <Clock className="size-5" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0F172A]">Reference Settings</h3>
                </div>

                <div className="flex items-center justify-between rounded-xl p-4 bg-[#F8F9FA] border border-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Mark as Current Session</span>
                    <span className="text-xs text-muted-foreground">Sets this session as default for applicant reference</span>
                  </div>
                  <Switch
                    checked={sessionForm.isCurrent}
                    onCheckedChange={(checked) =>
                      setSessionForm({ ...sessionForm, isCurrent: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl p-4 bg-[#F8F9FA] border border-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Mark as Active</span>
                    <span className="text-xs text-muted-foreground">Allows session details to be referenced by courses</span>
                  </div>
                  <Switch
                    checked={sessionForm.isActive}
                    onCheckedChange={(checked) =>
                      setSessionForm({ ...sessionForm, isActive: checked })
                    }
                  />
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="flex items-center gap-3 justify-start mt-4 rounded-[10px] ">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSessionDialogOpen(false)}
                  className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createSession.isPending ||
                    updateSession.isPending ||
                    !sessionForm.name.trim()
                  }
                  className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
                >
                  {createSession.isPending || updateSession.isPending ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* C. COURSE SESSION DIALOG */}
      <Dialog
        open={courseSessionDialogOpen}
        onOpenChange={setCourseSessionDialogOpen}
      >
        <DialogContent className="sm:max-w-[680px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">
          
          {/* Card 1: Course Session Assignment */}
          <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <Layers className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Course Session Assignment</h3>
            </div>

            <form onSubmit={handleSaveCourseSession} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Course *
                  </Label>
                  <Select
                    disabled={!!editingCourseSession}
                    value={courseSessionForm.courseId}
                    onValueChange={(val) =>
                      setCourseSessionForm({
                        ...courseSessionForm,
                        courseId: val,
                      })
                    }
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCoursesDropdown?.data
                        ?.filter((c) => c.isActive || !!editingCourseSession)
                        ?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Academic Session *
                  </Label>
                  <Select
                    disabled={!!editingCourseSession}
                    value={courseSessionForm.academicSessionId}
                    onValueChange={(val) =>
                      setCourseSessionForm({
                        ...courseSessionForm,
                        academicSessionId: val,
                      })
                    }
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="Select Session" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSessionsDropdown?.data
                        ?.filter((s) => s.isActive || !!editingCourseSession)
                        ?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.displayName || s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Total Seats
                  </Label>
                  <div className="relative flex items-center">
                    <Users className="absolute left-3.5 text-[#64748B] size-4 pointer-events-none" />
                    <Input
                      type="number"
                      placeholder="e.g. 120"
                      value={courseSessionForm.totalSeats}
                      onChange={(e) =>
                        setCourseSessionForm({
                          ...courseSessionForm,
                          totalSeats: e.target.value,
                        })
                      }
                      className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Fee Amount
                  </Label>
                  <div className="relative flex items-center">
                    <Coins className="absolute left-3.5 text-[#64748B] size-4 pointer-events-none" />
                    <Input
                      type="number"
                      placeholder="e.g. 150000"
                      value={courseSessionForm.feeAmount}
                      onChange={(e) =>
                        setCourseSessionForm({
                          ...courseSessionForm,
                          feeAmount: e.target.value,
                        })
                      }
                      className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: CRM status */}
              <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                    <Clock className="size-5" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0F172A]">Availability Settings</h3>
                </div>

                <div className="flex items-center justify-between rounded-xl p-4 bg-[#F8F9FA] border border-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Mark Connection Active</span>
                    <span className="text-xs text-muted-foreground">Allows session-based admissions to accept applicant seats for this course</span>
                  </div>
                  <Switch
                    checked={courseSessionForm.isActive}
                    onCheckedChange={(checked) =>
                      setCourseSessionForm({
                        ...courseSessionForm,
                        isActive: checked,
                      })
                    }
                  />
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="flex items-center gap-3 justify-start mt-4 rounded-[10px] ">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCourseSessionDialogOpen(false)}
                  className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createCourseSession.isPending ||
                    updateCourseSession.isPending ||
                    !courseSessionForm.courseId ||
                    !courseSessionForm.academicSessionId
                  }
                  className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
                >
                  {createCourseSession.isPending || updateCourseSession.isPending ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* D. CONFIRM DEACTIVATE DIALOG - Styled exactly like branches/page.tsx delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4 bg-white border border-slate-200">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently deactivate the
              selected item in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-[8px]"
              onClick={executeDelete}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* E. HARD DELETE COURSE CONFIRM DIALOG */}
      <AlertDialog
        open={hardDeleteCourseId !== null}
        onOpenChange={(open) => {
          if (!open) setHardDeleteCourseId(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4 bg-white border border-red-200">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-red-700">
              Permanently delete course?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This will <strong>permanently remove</strong> the course and all
              its linked course-sessions from the database. This action{" "}
              <strong>cannot be undone</strong> and will affect any applications
              already tied to this course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-[8px]"
              onClick={() => {
                if (hardDeleteCourseId) {
                  hardDeleteCourse.mutate(hardDeleteCourseId, {
                    onSuccess: () => setHardDeleteCourseId(null),
                  });
                }
              }}
            >
              Yes, Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
