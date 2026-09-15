import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Stethoscope,
  CheckCircle,
  Save
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// ── Types ────────────────────────────────────────────────────────────────────

interface BillingRecord {
  id: string;
  patientId: string;
  totalBill: string;
  amountPaid: string;
  paymentStatus: "clear" | "due" | "processing";
  updatedAt: string;
}

interface TreatmentRecord {
  id: string;
  patientId: string;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
}

interface PatientDetailResponse {
  id: string;
  name: string;
  age: number | null;
  phone: string | null;
  address: string | null;
  status: "pending" | "approved" | "treated";
  createdAt: string;
  updatedAt: string;
  billing: BillingRecord[];
  treatments: TreatmentRecord[];
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

// ── Main Component ───────────────────────────────────────────────────────────

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data } = await api.get<{ status: string; data: PatientDetailResponse }>(`/api/patients/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const currentBilling = patient?.billing?.[0];
  const currentTreatment = patient?.treatments?.[0];

  useEffect(() => {
    if (currentTreatment?.notes) {
      setNotes(currentTreatment.notes);
    } else {
      setNotes("");
    }
  }, [currentTreatment]);

  // ── Mutations ───────────────────────────────────────────────────────────

  const saveNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      if (currentTreatment?.id) {
        // Update existing
        const { data } = await api.put(`/api/treatments/${currentTreatment.id}`, { notes: newNotes });
        return data;
      } else {
        // Create new
        const { data } = await api.post(`/api/treatments`, { patientId: id, notes: newNotes });
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      toast.success("Clinical treatment notes saved");
    },
    onError: () => toast.error("Failed to save treatment notes"),
  });

  const treatMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/api/patients/${id}/treated`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patientsStats"] });
      toast.success("Patient successfully marked as treated");
    },
    onError: () => toast.error("Failed to mark patient as treated"),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────

  const dueAmount = currentBilling 
    ? Math.max(0, (Number(currentBilling.totalBill) || 0) - (Number(currentBilling.amountPaid) || 0))
    : 0;
  
  const totalAmount = currentBilling ? Number(currentBilling.totalBill) || 0 : 0;
  const paidAmount = currentBilling ? Number(currentBilling.amountPaid) || 0 : 0;
  const isClear = currentBilling?.paymentStatus === "clear";
  const isProcessing = currentBilling?.paymentStatus === "processing";
  const paymentPercent = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1 font-semibold">Pending Approval</Badge>;
      case "approved":
        return <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 px-3 py-1 font-semibold">Approved / Admitted</Badge>;
      case "treated":
        return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-semibold">Treated / Closed</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize px-3 py-1">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="text-destructive font-semibold text-xl">Failed to load patient record.</div>
        <Button variant="outline" asChild className="rounded-xl">
          <Link to="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* ── Navigation ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="rounded-xl gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </Button>
      </div>

      {/* ── Patient Profile Hero Header ── */}
      <div className="bg-card border border-border shadow-sm rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 blur-[80px] pointer-events-none bg-primary" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shadow-glow-sm">
              {getInitials(patient.name)}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">{patient.name}</h1>
                {renderStatusBadge(patient.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  {patient.age ? `${patient.age} years old` : "Age N/A"}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-4 h-4 text-primary/60" />
                  {patient.phone || "No phone record"}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-primary/60" />
                  {patient.address || "No address record"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Section: Personal Info */}
        <Card className="shadow-sm border-border rounded-2xl overflow-hidden h-fit">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-primary" />
              Registry Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Patient Name</p>
                  <p className="font-semibold text-foreground text-base">{patient.name}</p>
                </div>
                <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Clinical Registry ID</p>
                  <p className="font-mono text-xs text-muted-foreground pt-0.5">{patient.id}</p>
                </div>
                <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Age</p>
                  <p className="font-semibold text-foreground text-sm">{patient.age || "—"}</p>
                </div>
                <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</p>
                  <p className="font-mono text-sm text-foreground">{patient.phone || "—"}</p>
                </div>
                <div className="space-y-1 border-l-2 border-primary/20 pl-3 col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Address</p>
                  <p className="font-semibold text-foreground text-sm">{patient.address || "—"}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                <p>Created: {new Date(patient.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(patient.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Section: Billing Overview */}
        <Card className="shadow-sm border-border rounded-2xl overflow-hidden h-fit">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Financial Invoice Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!currentBilling ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 bg-muted/60 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground">No Billing Ledger Created</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">Assistants have not initialized a billing ledger for this patient.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium">Payment Status</p>
                    {isClear ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold px-2.5 py-0.5">Cleared</Badge>
                    ) : isProcessing ? (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold px-2.5 py-0.5">Processing</Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-semibold px-2.5 py-0.5">Outstanding Balance</Badge>
                    )}
                  </div>

                  {totalAmount > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Received</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{paymentPercent}%</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {totalAmount > 0 && (
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isClear ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${paymentPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Bill</p>
                    <p className="font-extrabold text-foreground text-xl">${totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Paid</p>
                    <p className="font-extrabold text-foreground text-xl">${paidAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex justify-between items-center ${
                  isClear
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                    : isProcessing
                    ? "bg-muted/30 border-border text-foreground"
                    : "bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-400"
                }`}>
                  <p className="font-semibold text-sm">Remaining Due</p>
                  <p className="font-black text-2xl">${dueAmount.toFixed(2)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment Notes Section (Full Width Below) */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Stethoscope className="w-4 h-4 text-primary" />
                Clinical Treatment Notes
              </CardTitle>
              
              {patient.status === "treated" ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Completed Treatment: {currentTreatment?.completedAt ? new Date(currentTreatment.completedAt).toLocaleDateString() : "Treated"}
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => treatMutation.mutate()}
                  disabled={treatMutation.isPending || patient.status === "pending"}
                  className="text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-850 hover:bg-emerald-500 hover:text-white transition-all rounded-xl font-semibold gap-1.5"
                >
                  {treatMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Mark Patient Treated
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea 
                  placeholder="Enter patient diagnosis summary, prescriptions, daily notes, clinical observations, and follow-up directives here..." 
                  className="min-h-[220px] resize-y bg-muted/20 border-border rounded-xl text-base focus-visible:ring-primary/20 focus-visible:border-primary transition-all p-4"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                  <p>
                    {currentTreatment?.updatedAt 
                      ? `Last edited: ${new Date(currentTreatment.updatedAt).toLocaleString()}`
                      : "No notes logged yet."}
                  </p>
                  <Button 
                    onClick={() => saveNotesMutation.mutate(notes)}
                    disabled={saveNotesMutation.isPending || notes === (currentTreatment?.notes || "")}
                    className="bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl px-5 gap-1.5 shadow-glow-sm hover:shadow-glow-primary transition-all"
                  >
                    {saveNotesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Treatment Notes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
