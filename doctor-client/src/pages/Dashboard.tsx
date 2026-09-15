import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Clock,
  CheckCircle,
  CreditCard,
  Check,
  ArrowRight,
  AlertCircle
} from "lucide-react";

import api from "@/lib/api";
import type { Patient, PaginatedResponse } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchPatientsList(params: { search: string; status: string; page: number }) {
  const { data } = await api.get<PaginatedResponse<Patient>>("/api/patients", {
    params: {
      search: params.search || undefined,
      status: params.status !== "all" ? params.status : undefined,
      page: params.page,
      limit: 20,
    },
  });
  return data;
}

async function fetchPatientsStats(status?: string) {
  const { data } = await api.get<PaginatedResponse<Patient>>("/api/patients", {
    params: {
      status,
      limit: 1,
    },
  });
  return data.pagination.total;
}

// Helper to get initials
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Helper to get avatar color based on name length
function getAvatarColor(name: string) {
  const colors = [
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  ];
  const index = name.length % colors.length;
  return colors[index];
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const queryClient = useQueryClient();

  // State for filters and pagination
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: listData, isLoading: isListLoading, isError: isListError, refetch } = useQuery({
    queryKey: ["patients", { search: debouncedSearch, status: statusFilter, page }],
    queryFn: () => fetchPatientsList({ search: debouncedSearch, status: statusFilter, page }),
  });

  const { data: totalPatients, isLoading: isTotalLoading } = useQuery({
    queryKey: ["patientsStats", "all"],
    queryFn: () => fetchPatientsStats(),
  });

  const { data: pendingPatients, isLoading: isPendingLoading } = useQuery({
    queryKey: ["patientsStats", "pending"],
    queryFn: () => fetchPatientsStats("pending"),
  });

  const { data: activePatients, isLoading: isActiveLoading } = useQuery({
    queryKey: ["patientsStats", "approved"],
    queryFn: () => fetchPatientsStats("approved"),
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/patients/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patientsStats"] });
      toast.success("Patient successfully approved and admitted");
    },
    onError: () => toast.error("Failed to approve patient"),
  });

  const treatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/patients/${id}/treated`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patientsStats"] });
      toast.success("Patient status updated to treated");
    },
    onError: () => toast.error("Failed to mark patient as treated"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePendingClick = () => {
    setStatusFilter("pending");
    setPage(1);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15 transition-colors font-medium">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/15 transition-colors font-medium">
            Approved
          </Badge>
        );
      case "treated":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 transition-colors font-medium">
            Treated
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  const paginationInfo = listData?.pagination;
  const patientsList = listData?.data || [];

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Clinical Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Oversee patient admissions, verify statuses, and record treatment progress.
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registry Total</p>
            <div className="text-2xl font-black text-foreground">
              {isTotalLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : totalPatients ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Pending Approval */}
        <div 
          className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 bg-gradient-to-br from-amber-500/5 to-transparent"
          onClick={handlePendingClick}
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Waiting Approval</p>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {isPendingLoading ? <Loader2 className="h-5 w-5 animate-spin text-amber-500" /> : pendingPatients ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Active Approved */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Admitted Patients</p>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {isActiveLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> : activePatients ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Payment Due */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Ledger Due</p>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              N/A
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, phone..."
            className="pl-10 bg-muted/40 border-border rounded-xl h-11 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-full sm:w-[220px] sm:ml-auto">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-muted/40 border-border rounded-xl h-11">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Admission</SelectItem>
              <SelectItem value="approved">Approved / Admitted</SelectItem>
              <SelectItem value="treated">Treated Patients</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Patients Table ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px] font-semibold text-foreground h-12">Patient Name</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Age</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Flow Status</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Invoice Ledger</TableHead>
                <TableHead className="font-semibold text-foreground h-12 text-right pr-6">Clinical Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isListLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full skeleton" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 skeleton" />
                          <div className="h-3 w-16 skeleton" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-4 w-8 skeleton" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-5 w-16 skeleton" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-5 w-16 skeleton" />
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="h-8 w-24 skeleton ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isListError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-destructive animate-bounce" />
                      <div>
                        <p className="font-semibold text-foreground">Registry Load Error</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Could not fetch clinical listings. Reconnect to database.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl mt-2"
                        onClick={() => refetch()}
                      >
                        Try Again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : patientsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-muted-foreground/60" />
                      <p className="font-medium text-muted-foreground">No patients matching filters are currently in registry</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                patientsList.map((patient, i) => (
                  <TableRow
                    key={patient.id}
                    className="hover:bg-muted/30 transition-colors animate-slide-up border-b border-border/60"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(patient.name)}`}>
                          {getInitials(patient.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-none">{patient.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{patient.phone || "No phone number"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{patient.age ?? "—"}</TableCell>
                    <TableCell>{renderStatusBadge(patient.status)}</TableCell>
                    <TableCell>
                      {patient.paymentStatus === "clear" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                          Clear
                        </Badge>
                      ) : patient.paymentStatus === "due" ? (
                        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20">
                          Due
                        </Badge>
                      ) : patient.paymentStatus === "processing" ? (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                          Processing
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No record</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-2">
                        {patient.status === "pending" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => approveMutation.mutate(patient.id)}
                            disabled={approveMutation.isPending}
                            className="text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-850 hover:bg-indigo-500 hover:text-white transition-all rounded-xl h-8 text-xs font-semibold gap-1"
                          >
                            {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Approve
                          </Button>
                        )}
                        {patient.status === "approved" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => treatMutation.mutate(patient.id)}
                            disabled={treatMutation.isPending}
                            className="text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-850 hover:bg-emerald-500 hover:text-white transition-all rounded-xl h-8 text-xs font-semibold gap-1"
                          >
                            {treatMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Mark Treated
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-200 rounded-xl h-8 text-xs font-semibold gap-1 group"
                          asChild
                        >
                          <Link to={`/patients/${patient.id}`}>
                            <span>Notes</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {paginationInfo && paginationInfo.pages > 1 && (
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-bold text-foreground">{(paginationInfo.page - 1) * paginationInfo.limit + 1}</span> to{" "}
            <span className="font-bold text-foreground">
              {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)}
            </span>{" "}
            of <span className="font-bold text-foreground">{paginationInfo.total}</span> patients
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isListLoading}
              className="gap-1 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(paginationInfo.pages, p + 1))}
              disabled={page === paginationInfo.pages || isListLoading}
              className="gap-1 rounded-xl"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
