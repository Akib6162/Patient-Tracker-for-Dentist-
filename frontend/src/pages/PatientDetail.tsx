import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Edit2,
  Save,
  X,
  Trash2,
  Plus
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface BillingRecord {
  id: string;
  patientId: string;
  totalBill: string;
  amountPaid: string;
  paymentStatus: "clear" | "due" | "processing";
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
}

// ── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchPatientDetail(id: string) {
  const { data } = await api.get<{ status: string; data: PatientDetailResponse }>(`/api/patients/${id}`);
  return data.data;
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Component States
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({ name: "", age: "", phone: "", address: "" });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({ totalBill: "", amountPaid: "" });

  // ── Queries & Mutations ──────────────────────────────────────────────────

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatientDetail(id!),
    enabled: !!id,
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (payload: { name: string; age?: number; phone?: string; address?: string }) => {
      const { data } = await api.put(`/api/patients/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient details updated");
      setIsEditingPatient(false);
    },
    onError: () => toast.error("Failed to update patient details"),
  });

  const deletePatientMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/api/patients/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient record permanently removed");
      navigate("/dashboard");
    },
    onError: () => toast.error("Failed to delete patient"),
  });

  const addBillingMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/billing`, {
        patientId: id,
        totalBill: 0,
        amountPaid: 0,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Billing ledger created");
    },
    onError: () => toast.error("Failed to create billing record"),
  });

  const updateBillingMutation = useMutation({
    mutationFn: async (payload: { billingId: string; totalBill: number; amountPaid: number }) => {
      const { data } = await api.put(`/api/billing/${payload.billingId}`, {
        totalBill: payload.totalBill,
        amountPaid: payload.amountPaid,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Billing information saved");
      setIsEditingBilling(false);
    },
    onError: () => toast.error("Failed to update billing"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEditPatientClick = () => {
    if (patient) {
      setPatientForm({
        name: patient.name,
        age: patient.age?.toString() || "",
        phone: patient.phone || "",
        address: patient.address || "",
      });
      setIsEditingPatient(true);
    }
  };

  const handleSavePatient = () => {
    if (!patientForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    updatePatientMutation.mutate({
      name: patientForm.name,
      age: patientForm.age ? parseInt(patientForm.age, 10) : undefined,
      phone: patientForm.phone,
      address: patientForm.address,
    });
  };

  const currentBilling = patient?.billing?.[0];

  const handleEditBillingClick = () => {
    if (currentBilling) {
      setBillingForm({
        totalBill: currentBilling.totalBill,
        amountPaid: currentBilling.amountPaid,
      });
      setIsEditingBilling(true);
    }
  };

  const handleSaveBilling = () => {
    if (!currentBilling) return;
    updateBillingMutation.mutate({
      billingId: currentBilling.id,
      totalBill: Number(billingForm.totalBill) || 0,
      amountPaid: Number(billingForm.amountPaid) || 0,
    });
  };

  // ── Real-time Billing Calculations ───────────────────────────────────────

  const billingCalculations = useMemo(() => {
    if (isEditingBilling) {
      const total = Number(billingForm.totalBill) || 0;
      const paid = Number(billingForm.amountPaid) || 0;
      const due = Math.max(0, total - paid);
      const isClear = total > 0 && paid >= total;
      const isProcessing = total === 0;
      const isDue = total > 0 && paid < total;
      const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
      return { total, paid, due, isClear, isProcessing, isDue, percent };
    } else if (currentBilling) {
      const total = Number(currentBilling.totalBill) || 0;
      const paid = Number(currentBilling.amountPaid) || 0;
      const due = Math.max(0, total - paid);
      const isClear = currentBilling.paymentStatus === "clear";
      const isProcessing = currentBilling.paymentStatus === "processing";
      const isDue = currentBilling.paymentStatus === "due";
      const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
      return { total, paid, due, isClear, isProcessing, isDue, percent };
    }
    return null;
  }, [isEditingBilling, billingForm, currentBilling]);

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1 font-semibold">Pending</Badge>;
      case "approved":
        return <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 px-3 py-1 font-semibold">Approved</Badge>;
      case "treated":
        return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-semibold">Treated</Badge>;
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
      {/* ── Top Nav Back ── */}
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

          <div className="flex items-center gap-3 self-end sm:self-auto border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
            {!isEditingPatient && (
              <Button
                variant="outline"
                onClick={handleEditPatientClick}
                className="rounded-xl flex-1 sm:flex-initial border-border gap-2 font-semibold"
              >
                <Edit2 className="w-4 h-4 text-muted-foreground" />
                Edit Profile
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="rounded-xl flex-1 sm:flex-initial gap-2 font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
              Delete Patient
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section: Personal Info */}
        <Card className="shadow-sm border-border rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-primary" />
              Personal Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isEditingPatient ? (
              <div className="space-y-4 animate-fade-scale-in">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Patient Name *</label>
                  <Input value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})} className="rounded-xl h-11" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Age</label>
                    <Input type="number" value={patientForm.age} onChange={e => setPatientForm({...patientForm, age: e.target.value})} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
                    <Input value={patientForm.phone} onChange={e => setPatientForm({...patientForm, phone: e.target.value})} className="rounded-xl h-11" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Address</label>
                  <Input value={patientForm.address} onChange={e => setPatientForm({...patientForm, address: e.target.value})} className="rounded-xl h-11" />
                </div>
                <div className="flex gap-3 pt-4 justify-end border-t border-border mt-4">
                  <Button variant="outline" onClick={() => setIsEditingPatient(false)} className="rounded-xl">
                    <X className="w-4 h-4 mr-2" />Cancel
                  </Button>
                  <Button onClick={handleSavePatient} disabled={updatePatientMutation.isPending} className="bg-primary hover:bg-primary/95 text-white rounded-xl">
                    {updatePatientMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</p>
                    <p className="font-semibold text-foreground text-base">{patient.name}</p>
                  </div>
                  <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registry ID</p>
                    <p className="font-mono text-xs text-muted-foreground pt-0.5">{patient.id}</p>
                  </div>
                  <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Patient Age</p>
                    <p className="font-semibold text-foreground text-sm">{patient.age || "—"}</p>
                  </div>
                  <div className="space-y-1 border-l-2 border-primary/20 pl-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</p>
                    <p className="font-mono text-sm text-foreground">{patient.phone || "—"}</p>
                  </div>
                  <div className="space-y-1 border-l-2 border-primary/20 pl-3 col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Home Address</p>
                    <p className="font-semibold text-foreground text-sm">{patient.address || "—"}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                  <p>Registered: {new Date(patient.createdAt).toLocaleDateString()}</p>
                  <p>Last Activity: {new Date(patient.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Section: Billing */}
        <Card className="shadow-sm border-border rounded-2xl overflow-hidden h-fit">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Financial Ledger
            </CardTitle>
            {currentBilling && !isEditingBilling && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditBillingClick}
                className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-lg px-3 py-1.5 h-auto text-xs gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit Invoice
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {!currentBilling ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-muted/60 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground">No Billing Ledger</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">This patient does not have an active billing invoice yet.</p>
                </div>
                <Button
                  onClick={() => addBillingMutation.mutate()}
                  disabled={addBillingMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 font-semibold shadow-glow-sm hover:shadow-glow-primary transition-all duration-200"
                >
                  {addBillingMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Ledger
                </Button>
              </div>
            ) : isEditingBilling ? (
              <div className="space-y-5 animate-fade-scale-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Bill ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">$</span>
                      <Input
                        type="number"
                        min="0"
                        value={billingForm.totalBill}
                        onChange={e => setBillingForm({...billingForm, totalBill: e.target.value})}
                        className="text-base font-bold pl-7 rounded-xl h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Amount Paid ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">$</span>
                      <Input
                        type="number"
                        min="0"
                        value={billingForm.amountPaid}
                        onChange={e => setBillingForm({...billingForm, amountPaid: e.target.value})}
                        className="text-base font-bold pl-7 rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/40 p-4 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projected Balance Due</p>
                    <p className={`text-2xl font-black ${billingCalculations?.due === 0 && !billingCalculations?.isProcessing ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      ${billingCalculations?.due.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    {billingCalculations?.isClear ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 py-1 text-xs font-semibold">Cleared</Badge>
                    ) : billingCalculations?.isProcessing ? (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 py-1 text-xs font-semibold">Processing</Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 py-1 text-xs font-semibold">Due</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 justify-end border-t">
                  <Button variant="outline" onClick={() => setIsEditingBilling(false)} className="rounded-xl"><X className="w-4 h-4 mr-2" />Cancel</Button>
                  <Button onClick={handleSaveBilling} disabled={updateBillingMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                    {updateBillingMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Ledger
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium">Invoice Status</p>
                    {billingCalculations?.isClear ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold px-2.5 py-0.5">Cleared</Badge>
                    ) : billingCalculations?.isProcessing ? (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold px-2.5 py-0.5">Processing</Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-semibold px-2.5 py-0.5">Outstanding Balance</Badge>
                    )}
                  </div>

                  {billingCalculations && billingCalculations.total > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Progress</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{billingCalculations.percent}%</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {billingCalculations && billingCalculations.total > 0 && (
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          billingCalculations.isClear ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${billingCalculations.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Invoiced</p>
                    <p className="font-extrabold text-foreground text-xl">${Number(currentBilling.totalBill).toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Received</p>
                    <p className="font-extrabold text-foreground text-xl">${Number(currentBilling.amountPaid).toFixed(2)}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex justify-between items-center ${
                  billingCalculations?.isClear
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                    : billingCalculations?.isProcessing
                    ? "bg-muted/30 border-border text-foreground"
                    : "bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-400"
                }`}>
                  <p className="font-semibold text-sm">Remaining Due</p>
                  <p className="font-black text-2xl">${billingCalculations?.due.toFixed(2)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600 dark:text-rose-400 font-bold text-lg">Delete Patient Record?</DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground leading-relaxed">
              Are you absolutely sure you want to permanently delete the profile for <strong>{patient.name}</strong>?
              This action cannot be undone. All active status, treatments, and billing ledgers will be permanently deleted from the database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deletePatientMutation.isPending} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePatientMutation.mutate()}
              disabled={deletePatientMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-1.5"
            >
              {deletePatientMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
