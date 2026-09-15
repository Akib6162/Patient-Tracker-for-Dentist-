import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Clock,
  CheckCircle2,
  Activity,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Calendar,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchPatients(params: { search: string; status: string; page: number }) {
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

async function addPatient(patientData: { name: string; age?: number; phone?: string; address?: string }) {
  const { data } = await api.post("/api/patients", patientData);
  return data;
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

export default function Patients() {
  const queryClient = useQueryClient();

  // State for filters and pagination
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // State for Add Patient dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    phone: "",
    address: "",
  });

  // Queries & Mutations
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", { search: debouncedSearch, status: statusFilter, page }],
    queryFn: () => fetchPatients({ search: debouncedSearch, status: statusFilter, page }),
  });

  const addPatientMutation = useMutation({
    mutationFn: addPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient added successfully");
      setIsDialogOpen(false);
      setNewPatient({ name: "", age: "", phone: "", address: "" });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Failed to add patient";
      toast.error(msg);
    },
  });

  // Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name.trim()) {
      toast.error("Name is required");
      return;
    }

    addPatientMutation.mutate({
      ...newPatient,
      age: newPatient.age ? parseInt(newPatient.age, 10) : undefined,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setPage(1); // reset to first page on search
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // reset to first page on filter
  };

  // Helper to render status badges
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

  const paginationInfo = data?.pagination;
  const patientList = data?.data || [];

  // Calculate local stats based on the returned data
  const stats = {
    total: paginationInfo?.total || 0,
    pending: patientList.filter((p) => p.status === "pending").length,
    approved: patientList.filter((p) => p.status === "approved").length,
    treated: patientList.filter((p) => p.status === "treated").length,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Patients Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor, edit, and track patient status and billing in real-time.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/95 text-white gap-2 shadow-glow-sm hover:shadow-glow-primary transition-all duration-200 rounded-xl px-5 h-11 font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add New Patient</DialogTitle>
              <DialogDescription>
                Create a new record in the clinic registry. All fields except Name are optional.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="pl-9 rounded-xl h-11"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="age" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Age
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="age"
                      type="number"
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                      placeholder="28"
                      className="pl-9 rounded-xl h-11"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="pl-9 rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="address" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Home Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    placeholder="742 Evergreen Terrace"
                    className="pl-9 rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addPatientMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5"
                >
                  {addPatientMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Register Patient
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Registry</p>
            <p className="text-2xl font-black text-foreground">{isLoading ? "..." : stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Page</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{isLoading ? "..." : stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Approved */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved Page</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{isLoading ? "..." : stats.approved}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Treated */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Treated Page</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{isLoading ? "..." : stats.treated}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or address..."
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
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved / Admitted</SelectItem>
              <SelectItem value="treated">Treated / Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[320px] font-semibold text-foreground h-12">Patient Name</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Age</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Contact Phone</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Flow Status</TableHead>
                <TableHead className="font-semibold text-foreground h-12">Billing Status</TableHead>
                <TableHead className="font-semibold text-foreground h-12 text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Shimmer Skeleton loading states
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full skeleton" />
                        <div className="space-y-2">
                          <div className="h-4 w-28 skeleton" />
                          <div className="h-3 w-16 skeleton" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-4 w-8 skeleton" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-4 w-24 skeleton" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-5 w-16 skeleton" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-5 w-16 skeleton" />
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="h-8 w-16 skeleton ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-destructive animate-bounce" />
                      <div>
                        <p className="font-semibold text-foreground">Registry Load Error</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Could not fetch list. Verify server is online.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl mt-2"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["patients"] })}
                      >
                        Try Again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : patientList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-muted-foreground/60" />
                      <p className="font-medium text-muted-foreground">No patients found matching current search</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                patientList.map((patient, i) => (
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
                          <p className="text-[11px] text-muted-foreground mt-1">ID: {patient.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{patient.age ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{patient.phone ?? "—"}</TableCell>
                    <TableCell>{renderStatusBadge(patient.status)}</TableCell>
                    <TableCell>
                      {patient.paymentStatus === "clear" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                          Clear
                        </Badge>
                      ) : patient.paymentStatus === "due" ? (
                        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15">
                          Due
                        </Badge>
                      ) : patient.paymentStatus === "processing" ? (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15">
                          Processing
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No record</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-200 rounded-xl gap-1 group font-semibold"
                        asChild
                      >
                        <Link to={`/patients/${patient.id}`}>
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </Button>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="gap-1 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(paginationInfo.pages, p + 1))}
              disabled={page === paginationInfo.pages || isLoading}
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
