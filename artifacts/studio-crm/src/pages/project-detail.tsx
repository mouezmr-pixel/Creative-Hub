import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useListProjectNotes,
  useCreateProjectNote,
  useDeleteNote,
  useListUsers,
  useListProjectMilestones,
  useCreateProjectMilestone,
  useUpdateProjectMilestone,
  useDeleteProjectMilestone,
  useGetProjectPayments,
  useCreatePayment,
  useDeletePayment,
  useListWorkflowTemplates,
  useBulkCreateProjectMilestones,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  getListProjectNotesQueryKey,
  getListProjectMilestonesQueryKey,
  getGetProjectPaymentsQueryKey,
  type Payment,
  type WorkflowTemplate,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useStudio } from "@/lib/use-studio";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Send, Trash2, ExternalLink, AlertCircle,
  FileText, Printer, MessageCircle, Mail, Camera,
  Plus, CheckCircle2, Circle, X, GripVertical, Sparkles,
  Bot, MessageSquare, FileCheck, ChevronRight, Globe, Copy,
  Receipt, CreditCard, CheckCheck, Clock,
} from "lucide-react";
import { formatCurrency, getCurrencySymbol, CURRENCIES } from "@/lib/currency";
import { format } from "date-fns";
import { motion } from "framer-motion";

type Language = "arabic" | "algerian" | "english" | "french";
const LANGUAGE_OPTIONS: { value: Language; labelKey: "langAlgerian" | "langArabicStd" | "langEnglish" | "langFrench"; nativeLabel: string }[] = [
  { value: "algerian", labelKey: "langAlgerian", nativeLabel: "الدارجة الجزائرية" },
  { value: "arabic", labelKey: "langArabicStd", nativeLabel: "العربية الفصحى" },
  { value: "english", labelKey: "langEnglish", nativeLabel: "English" },
  { value: "french", labelKey: "langFrench", nativeLabel: "Français" },
];

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id!, 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { studioName, studioDescription, studioAddress, studioPhone, studioEmail, studioTaxId, invoicePrefix, proformaPrefix, studioLogoUrl, studioStampUrl, showStamp, showSignature } = useStudio();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: project, isLoading } = useGetProject(id);
  const { data: notes = [] } = useListProjectNotes(id);
  const { data: photographers = [] } = useListUsers();
  const { data: milestones = [], refetch: refetchMilestones } = useListProjectMilestones(id);
  const updateProject = useUpdateProject();
  const createNote = useCreateProjectNote();
  const deleteNote = useDeleteNote();
  const createMilestone = useCreateProjectMilestone();
  const updateMilestone = useUpdateProjectMilestone();
  const deleteMilestone = useDeleteProjectMilestone();
  const deleteProject = useDeleteProject();
  const { data: templates = [] } = useListWorkflowTemplates();
  const bulkCreateMilestones = useBulkCreateProjectMilestones();
  const { data: projectPayments, isLoading: paymentsLoading } = useGetProjectPayments(id);
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [newNote, setNewNote] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"proforma" | "final">("proforma");
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const [isIssuingInvoice, setIsIssuingInvoice] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "", currency: "DZD", paymentMethod: "", receiptNumber: "",
    paymentDate: new Date().toISOString().split("T")[0], notes: "",
  });
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
  const [ideaLanguage, setIdeaLanguage] = useState<Language>("algerian");

  const invoiceRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      setEditFields({
        title: project.title,
        status: project.status,
        startDate: project.startDate ?? "",
        deliveryDate: project.deliveryDate ?? "",
        weTransferLink: project.weTransferLink ?? "",
        expectedCost: project.expectedCost ?? "",
        finalCost: project.finalCost ?? "",
        amountPaid: project.amountPaid ?? "",
        discount: (project as any).discount ?? "",
        photographerId: String(project.photographerId ?? ""),
        originalClientIdea: (project as any).originalClientIdea ?? "",
        aiGeneratedSuggestion: (project as any).aiGeneratedSuggestion ?? "",
        finalProposedIdea: (project as any).finalProposedIdea ?? "",
      });
    }
  }, [project]);

  const enhanceIdeaWithAI = async () => {
    if (!editFields.originalClientIdea?.trim()) {
      toast({ variant: "destructive", description: t("enterOriginalIdeaFirst") });
      return;
    }
    setIsEnhancingIdea(true);
    try {
      const res = await fetch("/api/ai/enhance-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalIdea: editFields.originalClientIdea,
          language: ideaLanguage,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.proposal) {
        setEditFields((f: any) => ({ ...f, aiGeneratedSuggestion: data.proposal }));
        await save("aiGeneratedSuggestion", data.proposal);
      }
    } catch {
      toast({ variant: "destructive", description: t("aiEnhanceFailed") });
    } finally {
      setIsEnhancingIdea(false);
    }
  };

  const handleCopyToFinalDetail = async () => {
    const suggestion = editFields.aiGeneratedSuggestion;
    setEditFields((f: any) => ({ ...f, finalProposedIdea: suggestion }));
    await save("finalProposedIdea", suggestion);
    toast({ description: t("aiCopySuccess") });
  };

  const openInvoice = (type: "proforma" | "final") => {
    setInvoiceType(type);
    setShowInvoice(true);
  };

  const issueInvoice = async () => {
    if (!project) return;
    setIsIssuingInvoice(true);
    try {
      await fetch(`/api/projects/${project.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: invoiceType }),
      });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      toast({
        description: invoiceType === "final"
          ? t("finalInvoiceIssued")
          : t("proFormaLIssued"),
      });
    } catch {
      toast({ variant: "destructive", description: t("failedToIssueInvoice") });
    } finally {
      setIsIssuingInvoice(false);
    }
  };

  const photographerUsers = photographers.filter((u) => u.role === "photographer");

  const save = async (field: string, value: any) => {
    try {
      await updateProject.mutateAsync({ id, data: { [field]: value } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      toast({ description: t("saved") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    try {
      await createMilestone.mutateAsync({ id, data: { title: newMilestoneTitle.trim(), order: (milestones as any[]).length } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(id) });
      setNewMilestoneTitle("");
      setAddingMilestone(false);
    } catch {
      toast({ variant: "destructive", description: t("failedToAddStep") });
    }
  };

  const handleToggleMilestone = async (milestoneId: number, isCompleted: boolean) => {
    try {
      await updateMilestone.mutateAsync({ id, milestoneId, data: { isCompleted: !isCompleted } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(id) });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateStep") });
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    try {
      await deleteMilestone.mutateAsync({ id, milestoneId });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(id) });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteStep") });
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    const template = (templates as WorkflowTemplate[]).find((t) => String(t.id) === selectedTemplateId);
    if (!template || template.milestones.length === 0) return;
    try {
      const existingMilestones = (milestones as any[]).map((m) => ({
        title: m.title,
        titleAr: m.titleAr ?? null,
        titleFr: m.titleFr ?? null,
        description: m.description ?? null,
        order: m.order,
      }));
      const templateMilestones = template.milestones.map((m, i) => ({
        title: m.title,
        titleAr: m.titleAr ?? null,
        titleFr: m.titleFr ?? null,
        description: m.description ?? null,
        order: (existingMilestones.length + i),
      }));
      await bulkCreateMilestones.mutateAsync({
        id,
        data: { milestones: [...existingMilestones, ...templateMilestones] },
      });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(id) });
      setShowApplyTemplate(false);
      setSelectedTemplateId("");
      toast({ description: t("templateApplied").replace("{name}", template.name) });
    } catch {
      toast({ variant: "destructive", description: t("failedToApplyTemplate") });
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync({ id, data: { content: newNote } });
      qc.invalidateQueries({ queryKey: getListProjectNotesQueryKey(id) });
      setNewNote("");
      toast({ description: t("noteAdded") });
    } catch {
      toast({ variant: "destructive", description: t("failedToAddNote") });
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote.mutateAsync({ id: noteId });
      qc.invalidateQueries({ queryKey: getListProjectNotesQueryKey(id) });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteNote") });
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast({ variant: "destructive", description: t("enterValidAmount") });
      return;
    }
    try {
      await createPayment.mutateAsync({
        data: {
          projectId: id,
          amount: parseFloat(paymentForm.amount),
          currency: paymentForm.currency as "DZD" | "USD" | "EUR",
          paymentMethod: paymentForm.paymentMethod || null,
          receiptNumber: paymentForm.receiptNumber || null,
          paymentDate: paymentForm.paymentDate || null,
          notes: paymentForm.notes || null,
        },
      });
      qc.invalidateQueries({ queryKey: getGetProjectPaymentsQueryKey(id) });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      setPaymentForm({
        amount: "", currency: "DZD", paymentMethod: "", receiptNumber: "",
        paymentDate: new Date().toISOString().split("T")[0], notes: "",
      });
      setShowPaymentForm(false);
      toast({ description: t("paymentRecorded") });
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? t("failedToRecordPayment");
      toast({ variant: "destructive", description: msg });
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await deletePayment.mutateAsync({ id: paymentId });
      qc.invalidateQueries({ queryKey: getGetProjectPaymentsQueryKey(id) });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      toast({ description: t("paymentRemoved") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeletePayment") });
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(t("deleteProjectConfirm"))) return;
    try {
      await deleteProject.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setLocation("/projects");
      toast({ description: t("projectDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteProject") });
    }
  };

  const handlePrint = () => {
    const source = document.getElementById("invoice-print") || document.getElementById("receipt-print");
    if (!source) return;
    const root = document.createElement("div");
    root.id = "print-root";
    root.innerHTML = source.innerHTML;
    document.body.appendChild(root);
    window.print();
    setTimeout(() => root.remove(), 1000);
  };

  const projCurrency = (project as any)?.currency ?? "DZD";
  const fmtMoney = (val: number) => formatCurrency(val, projCurrency);

  const handleWhatsApp = () => {
    if (!project) return;
    const isProforma = invoiceType === "proforma";
    const cost = isProforma ? (project.expectedCost ?? project.finalCost ?? 0) : (project.finalCost ?? 0);
    const paid = project.amountPaid ?? 0;
    const balance = Math.max(0, cost - paid);
    const cur = projCurrency;
    const docType = isProforma ? t("proForma") : t("finalInvoice");
    const msg = [
      `📸 *${docType} — ${studioName}*`,
      ``,
      `${t("projectLabel")}: ${project.title}`,
      `${t("clientNameLabel")}: ${project.clientName ?? t("notAvailable")}`,
      project.deliveryDate ? `${t("deliveryLabel")}: ${format(new Date(project.deliveryDate), "MMM d, yyyy")}` : "",
      isProforma ? `⚠️ ${t("preliminaryEstimateNote")}` : "",
      ``,
      `💰 *${t("financialSummary")}*`,
      `${isProforma ? t("estimated") : t("finalWord")} ${t("costLabel")}: ${formatCurrency(cost, cur)}`,
      paid > 0 ? `${t("amountPaidLabel")}: ${formatCurrency(paid, cur)}` : "",
      `${t("balanceDueLabel")}: ${formatCurrency(balance, cur)}`,
      ``,
      `${t("thankYou")} 🙏`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmail = () => {
    if (!project) return;
    const isProforma = invoiceType === "proforma";
    const cost = isProforma ? (project.expectedCost ?? project.finalCost ?? 0) : (project.finalCost ?? 0);
    const paid = project.amountPaid ?? 0;
    const balance = Math.max(0, cost - paid);
    const cur = projCurrency;
    const docType = isProforma ? `${t("proForma")} Invoice` : t("finalInvoice");
    const subject = `${docType}: ${project.title} — ${studioName}`;
    const body = [
      `${t("emailDear")} ${project.clientName ?? t("clientFallback")},`,
      ``,
      `${t("emailBodyPrefix")} ${docType.toLowerCase()} ${t("emailBodySuffix")} "${project.title}".`,
      isProforma ? `${t("emailPreliminaryNote")}` : "",
      ``,
      project.startDate ? `${t("emailStartDateLabel")}: ${format(new Date(project.startDate), "MMM d, yyyy")}` : "",
      project.deliveryDate ? `${t("emailDeliveryDateLabel")}: ${format(new Date(project.deliveryDate), "MMM d, yyyy")}` : "",
      `${t("emailStatusLabel")}: ${project.status.replace("_", " ")}`,
      ``,
      `${t("financialSummary")}:`,
      `  ${isProforma ? t("estimated") : t("finalWord")} ${t("costLabel")}: ${formatCurrency(cost, cur)}`,
      paid > 0 ? `  ${t("amountPaidLabel")}: ${formatCurrency(paid, cur)}` : "",
      `  ${t("balanceDueLabel")}: ${formatCurrency(balance, cur)}`,
      ``,
      `${t("thankYou")}!`,
      ``,
      `${t("emailBestRegards")},`,
      `${project.photographerName ?? t("studioTeam")}`,
    ].filter(Boolean).join("\n");
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "archived": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">{t("projectNotFound")}</div>;

  const hasDebt = (project.remainingDebt ?? 0) > 0;
  const finalCost = project.finalCost ?? 0;
  const amountPaid = project.amountPaid ?? 0;
  const discount = (project as any).discount ?? 0;
  const remaining = Math.max(0, finalCost - discount - amountPaid);
  const isFullyPaid = !hasDebt && finalCost > 0;
  const invoiceNumber = `${invoicePrefix}${String(project.id).padStart(4, "0")}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-1 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {project.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {project.clientName} {project.photographerName && `• ${project.photographerName}`}
          </p>
        </div>
        <Badge className={`border rounded-lg px-2.5 text-xs font-medium ${getStatusBadge(project.status)}`} variant="outline">
          {t(project.status as any) || project.status}
        </Badge>
        {isFullyPaid && (
          <Badge className="border rounded-lg px-2.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800" variant="outline">
            {t("fullyPaid")}
          </Badge>
        )}
        {user?.role !== "client" && (user?.role === "admin" || (user as any)?.canInvoice) && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pro-forma button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 dark:bg-amber-950"
              onClick={() => openInvoice("proforma")}
            >
              <FileText className="h-4 w-4" />
              {t("proForma")}
              {(project as any)?.proformaIssuedAt && (
                <span className="ml-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full">{t("issued")}</span>
              )}
            </Button>
            {/* Final Invoice button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:bg-emerald-950"
              onClick={() => openInvoice("final")}
            >
              <CheckCheck className="h-4 w-4" />
              {t("finalInvoice")}
              {(project as any)?.finalInvoiceIssuedAt && (
                <span className="ml-1 text-[10px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full">{t("issued")}</span>
              )}
            </Button>
            {/* Payment Receipt button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 dark:bg-blue-950"
              onClick={() => setShowPaymentReceipt(true)}
            >
              <Receipt className="h-4 w-4" />
              {t("receipt")}
            </Button>
            {user?.role === "admin" && (
              <Button variant="destructive" size="sm" className="gap-2 rounded-xl" onClick={handleDeleteProject}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </Button>
            )}
          </div>
        )}
      </div>

      {hasDebt && (
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            {t("outstandingBalanceLabel")}{fmtMoney(project.remainingDebt ?? 0)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Details */}
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("projectDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("status")}</Label>
              <Select
                value={editFields.status}
                onValueChange={(val) => {
                  setEditFields((f: any) => ({ ...f, status: val }));
                  save("status", val);
                }}
                disabled={user?.role === "client"}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("pending")}</SelectItem>
                  <SelectItem value="in_progress">{t("in_progress")}</SelectItem>
                  <SelectItem value="completed">{t("completed")}</SelectItem>
                  <SelectItem value="archived">{t("archived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user?.role === "admin" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("leadCreative")}</Label>
                <Select
                  value={editFields.photographerId}
                  onValueChange={(val) => {
                    setEditFields((f: any) => ({ ...f, photographerId: val }));
                    save("photographerId", parseInt(val));
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t("assignLeadCreative")} />
                  </SelectTrigger>
                  <SelectContent>
                    {photographerUsers.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(project as any).serviceName && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("servicePackage")}</Label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{(project as any).serviceName}</span>
                </div>
              </div>
            )}

            {(project as any).assignees && (project as any).assignees.length > 0 && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("teamCreatives")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(project as any).assignees.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-1.5 bg-primary/5 border border-primary/15 text-primary rounded-lg px-2.5 py-1 text-sm font-medium">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {a.name.charAt(0)}
                      </span>
                      {a.name}
                      {a.profession && <span className="text-xs text-primary/60 capitalize ml-0.5">· {a.profession}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("startDate")}</Label>
              <Input
                type="date"
                value={editFields.startDate}
                onChange={(e) => setEditFields((f: any) => ({ ...f, startDate: e.target.value }))}
                onBlur={() => save("startDate", editFields.startDate || null)}
                disabled={user?.role === "client"}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("deliveryDate")}</Label>
              <Input
                type="date"
                value={editFields.deliveryDate}
                onChange={(e) => setEditFields((f: any) => ({ ...f, deliveryDate: e.target.value }))}
                onBlur={() => save("deliveryDate", editFields.deliveryDate || null)}
                disabled={user?.role === "client"}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("weTransferLink")}</Label>
              <div className="flex gap-2">
                <Input
                  value={editFields.weTransferLink}
                  onChange={(e) => setEditFields((f: any) => ({ ...f, weTransferLink: e.target.value }))}
                  onBlur={() => save("weTransferLink", editFields.weTransferLink || null)}
                  placeholder={t("weTransferPlaceholder")}
                  disabled={user?.role === "client"}
                  className="rounded-xl"
                />
                {editFields.weTransferLink && (
                  <Button size="icon" variant="outline" asChild className="rounded-xl">
                    <a href={editFields.weTransferLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Creative Idea Workflow — 3-step */}
        {(user?.role !== "client" || (project as any).finalProposedIdea) && (
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm md:col-span-2 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">{t("ideaWorkflow")}</span>
              <span className="text-xs text-white/70 ms-auto" dir="ltr">{t("workflowSteps").replace("{count}", "3")}</span>
            </div>
            <CardContent className="p-5 space-y-5">
              {/* Client view: show only Final Proposed Idea */}
              {user?.role === "client" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">3</div>
                    <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t("studioProposal")}
                    </span>
                  </div>
                  {(project as any).finalProposedIdea ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {(project as any).finalProposedIdea}
                    </div>
                  ) : (
                    <div className="border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl py-8 text-center">
                      <FileCheck className="h-8 w-8 mx-auto mb-2 text-emerald-200" />
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t("proposalNotReady")}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* STEP 1 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">1</div>
                      <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t("clientOriginalIdeaLabel")}
                      </span>
                    </div>
                    <Textarea
                      value={editFields.originalClientIdea ?? ""}
                      onChange={(e) => setEditFields((f: any) => ({ ...f, originalClientIdea: e.target.value }))}
                      onBlur={() => save("originalClientIdea", editFields.originalClientIdea || null)}
                      placeholder={t("ideaPlaceholder")}
                      rows={3}
                      className="bg-white dark:bg-slate-900 rounded-xl resize-none border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-0.5">
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-violet-200" />
                    <ChevronRight className="h-4 w-4 text-violet-400" />
                    <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-violet-200" />
                  </div>

                  {/* STEP 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">2</div>
                      <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t("aiGeneratedSuggestionLabel")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-shrink-0">
                        <Globe className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <Select value={ideaLanguage} onValueChange={(v) => setIdeaLanguage(v as Language)}>
                          <SelectTrigger className="border-0 p-0 h-auto text-sm font-medium text-slate-700 dark:text-slate-300 bg-transparent focus:ring-0 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {LANGUAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                                <span className="font-medium">{opt.nativeLabel}</span>
                                <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{t(opt.labelKey)}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        onClick={enhanceIdeaWithAI}
                        disabled={isEnhancingIdea || !editFields.originalClientIdea?.trim()}
                        className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4" />
                        {isEnhancingIdea ? t("generating") : t("enhanceWithAI")}
                      </Button>
                    </div>
                    {editFields.aiGeneratedSuggestion ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-950 border-b border-violet-100 dark:border-violet-900">
                          <div className="flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t("aiResult")}</span>
                            <span className="text-xs text-violet-400">· {LANGUAGE_OPTIONS.find(l => l.value === ideaLanguage)?.nativeLabel}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCopyToFinalDetail}
                            className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3"
                          >
                            <Copy className="h-3 w-3" />
                            {t("copyToFinal")}
                          </Button>
                        </div>
                        <Textarea
                          value={editFields.aiGeneratedSuggestion ?? ""}
                          onChange={(e) => setEditFields((f: any) => ({ ...f, aiGeneratedSuggestion: e.target.value }))}
                          onBlur={() => save("aiGeneratedSuggestion", editFields.aiGeneratedSuggestion || null)}
                          className="border-0 rounded-none text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 resize-none leading-relaxed p-4"
                          rows={6}
                        />
                      </motion.div>
                    ) : (
                      <div className="border border-dashed border-violet-200 dark:border-violet-800 rounded-xl py-6 text-center">
                        <Bot className="h-8 w-8 mx-auto mb-2 text-violet-200" />
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t("aiPlaceholder")}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 py-0.5">
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-emerald-200" />
                    <ChevronRight className="h-4 w-4 text-emerald-400" />
                    <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-emerald-200" />
                  </div>

                  {/* STEP 3 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">3</div>
                      <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t("finalProposedIdeaLabel")}
                      </span>
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                        {t("visibleToClient")}
                      </span>
                    </div>
                    <Textarea
                      value={editFields.finalProposedIdea ?? ""}
                      onChange={(e) => setEditFields((f: any) => ({ ...f, finalProposedIdea: e.target.value }))}
                      onBlur={() => save("finalProposedIdea", editFields.finalProposedIdea || null)}
                      placeholder={t("finalIdeaPlaceholder")}
                      rows={5}
                      className="bg-white dark:bg-slate-900 rounded-xl resize-none border-emerald-200 dark:border-emerald-800 focus:border-emerald-500"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Milestones / Progress */}
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t("workflowSteps")}
              </CardTitle>
              <div className="flex items-center gap-3">
                {(milestones as any[]).length > 0 && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {(milestones as any[]).filter((m) => m.isCompleted).length}/{(milestones as any[]).length}{t("doneSeparator")}{project.progress}%
                  </span>
                )}
                {user?.role !== "client" && (
                  <button
                    onClick={() => setShowApplyTemplate(true)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {t("applyTemplate")}
                  </button>
                )}
              </div>
            </div>
            {(milestones as any[]).length > 0 && (
              <Progress
                value={project.progress}
                className="h-2 mt-2"
                indicatorClassName={project.progress === 100 ? "bg-emerald-500" : "bg-primary"}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {(milestones as any[]).length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic py-3 px-1">{t("noStepsYet")}</p>
            ) : (
              (milestones as any[]).map((m: any) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 px-2 py-2.5 rounded-xl group transition-colors ${m.isCompleted ? "bg-emerald-50/60" : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"}`}
                >
                  <button
                    onClick={() => handleToggleMilestone(m.id, m.isCompleted)}
                    disabled={user?.role === "client"}
                    className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                      m.isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 hover:border-primary"
                    } ${user?.role === "client" ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {m.isCompleted && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${m.isCompleted ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-800 dark:text-slate-200"}`}>
                      {m.title}
                    </p>
                    {m.completedAt && m.isCompleted && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {t("completedPrefix")}{format(new Date(m.completedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  {user?.role !== "client" && (
                    <button
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-all p-1 rounded flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}

            {user?.role !== "client" && (
              addingMilestone ? (
                <div className="flex gap-2 pt-1 px-1">
                  <Input
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder={t("stepTitle")}
                    className="rounded-xl h-8 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddMilestone();
                      if (e.key === "Escape") setAddingMilestone(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" className="h-8 px-3 rounded-xl" onClick={handleAddMilestone} disabled={createMilestone.isPending}>
                    {t("addStep")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 rounded-xl" onClick={() => setAddingMilestone(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingMilestone(true)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("addStep")}
                </button>
              )
            )}

            <Dialog open={showApplyTemplate} onOpenChange={setShowApplyTemplate}>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg">{t("applyTemplate")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {(templates as WorkflowTemplate[]).length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t("noTemplatesAvailable")}</p>
                  ) : (
                    <>
                      {selectedTemplateId && (() => {
                        const tpl = (templates as WorkflowTemplate[]).find((t) => String(t.id) === selectedTemplateId);
                        return tpl && tpl.milestones.length > 0 ? (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                              {tpl.milestones.length} {t("stepsWillBeAdded")}
                            </p>
                            {tpl.milestones.map((m, i) => (
                              <p key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                                {m.title}
                              </p>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("chooseTemplate")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(templates as WorkflowTemplate[]).map((tmpl) => (
                            <SelectItem key={tmpl.id} value={String(tmpl.id)}>
                              {tmpl.name} · {tmpl.milestones.length} {t("steps").toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => { setShowApplyTemplate(false); setSelectedTemplateId(""); }}>
                          {t("cancel")}
                        </Button>
                        <Button
                          onClick={handleApplyTemplate}
                          disabled={!selectedTemplateId || bulkCreateMilestones.isPending}
                        >
                          {bulkCreateMilestones.isPending ? t("applying") : t("apply")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Financials */}
        {user?.role !== "client" && (
          <Card className={`bg-white dark:bg-slate-900 shadow-sm ${hasDebt ? "border-rose-200 dark:border-rose-800" : "border-border"}`}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                {t("financials")}
                {hasDebt && <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("expectedCost")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFields.expectedCost}
                  onChange={(e) => setEditFields((f: any) => ({ ...f, expectedCost: e.target.value }))}
                  onBlur={() => save("expectedCost", editFields.expectedCost ? parseFloat(editFields.expectedCost) : null)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("finalCost")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFields.finalCost}
                  onChange={(e) => setEditFields((f: any) => ({ ...f, finalCost: e.target.value }))}
                  onBlur={() => save("finalCost", editFields.finalCost ? parseFloat(editFields.finalCost) : null)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("amountPaid")}</Label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmtMoney(projectPayments?.summary?.totalPaid ?? amountPaid)}</span>
                  <span className="text-xs text-emerald-500 dark:text-emerald-400 ml-auto">{t("paymentHistory")}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("discountLabel")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFields.discount}
                  onChange={(e) => setEditFields((f: any) => ({ ...f, discount: e.target.value }))}
                  onBlur={() => save("discount", editFields.discount ? parseFloat(editFields.discount) : 0)}
                  className="rounded-xl"
                />
              </div>
              <div className={`p-4 rounded-xl border ${hasDebt ? "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800" : "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"}`}>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 block mb-1">{t("remainingDebt")}</span>
                <span className={`text-2xl font-bold ${hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {fmtMoney(project.remainingDebt ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment History */}
      {user?.role !== "client" && (
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              {t("paymentHistory")}
            </CardTitle>
            {user?.role === "admin" && (
              <Button
                size="sm"
                className="h-7 rounded-xl text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                onClick={() => setShowPaymentForm(true)}
              >
                <Plus className="h-3 w-3" /> {t("recordPayment")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
              </div>
            ) : (projectPayments?.payments ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
                {t("noPaymentsYet")}
              </p>
            ) : (
              <div className="space-y-2">
                {(projectPayments?.payments ?? []).map((payment: Payment) => (
                  <div key={payment.id} className="flex items-start justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 dark:border-emerald-900">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5 flex flex-wrap gap-1.5">
                        <span>{format(new Date(payment.paymentDate), "dd/MM/yyyy")}</span>
                        {payment.paymentMethod && <span>· {payment.paymentMethod}</span>}
                        {payment.receiptNumber && <span>· #{payment.receiptNumber}</span>}
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic truncate">{payment.notes}</p>
                      )}
                    </div>
                    {user?.role === "admin" && (
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors ml-2 flex-shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("totalCollected")}</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(projectPayments?.summary?.totalPaid ?? 0, (project as any)?.currency ?? "DZD")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              {t("recordPayment")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentAmount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={t("costPlaceholder")}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("currencyLabel")}</Label>
                <Select
                  value={paymentForm.currency}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="DZD" className="rounded-lg">🇩🇿 DZD</SelectItem>
                    <SelectItem value="USD" className="rounded-lg">🇺🇸 USD</SelectItem>
                    <SelectItem value="EUR" className="rounded-lg">🇪🇺 EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentDate")}</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentMethod")}</Label>
                <Select
                  value={paymentForm.paymentMethod || "_none"}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, paymentMethod: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("optionalLabel")} /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="_none" className="rounded-lg">{t("noMethod")}</SelectItem>
                    <SelectItem value="cash" className="rounded-lg">{t("cash")}</SelectItem>
                    <SelectItem value="bank_transfer" className="rounded-lg">{t("bankTransfer")}</SelectItem>
                    <SelectItem value="check" className="rounded-lg">{t("check")}</SelectItem>
                    <SelectItem value="ccp" className="rounded-lg">{t("ccp")}</SelectItem>
                    <SelectItem value="baridi_mob" className="rounded-lg">{t("baridiMob")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("receiptNumber")}</Label>
                <Input
                  value={paymentForm.receiptNumber}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, receiptNumber: e.target.value }))}
                  placeholder={t("optionalLabel")}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("notes")}</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("optionalNote")}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPaymentForm(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" disabled={createPayment.isPending}>
                {createPayment.isPending ? t("savingEllipsis") : t("recordPayment")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notes */}
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("projectNotes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
                {t("noNotesYet")}
              </p>
            ) : (
              notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-3 rounded-xl border text-sm ${
                    note.authorRole === "client"
                      ? "bg-slate-50 border-border ml-8"
                      : "bg-primary/5 border-primary/15 mr-8"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{note.authorName}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 capitalize">{note.authorRole}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {format(new Date(note.createdAt), "MMM d, h:mm a")}
                      </span>
                      {user?.role !== "client" && (
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{note.content}</p>
                </motion.div>
              ))
            )}
          </div>
          <form onSubmit={handleAddNote} className="flex gap-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="rounded-xl resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newNote.trim()) handleAddNote(e as any);
                }
              }}
            />
            <Button type="submit" disabled={!newNote.trim() || createNote.isPending} className="self-end rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── INVOICE MODAL ─── */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
          {/* Toolbar - sticky at top */}
          <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${invoiceType === "proforma" ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"}`}>
            <div className="min-w-0">
              <DialogTitle className={`text-base font-bold truncate ${invoiceType === "proforma" ? "text-amber-800 dark:text-amber-200" : "text-emerald-800 dark:text-emerald-200"}`}>
                {invoiceType === "proforma" ? t("invoiceProFormaTitle") : t("invoiceFinalTitle")}
              </DialogTitle>
              <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                {invoiceType === "proforma" ? t("proFormaNote") : t("finalInvoiceNote")}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5" onClick={handlePrint}>
                <Printer className="w-3 h-3" /> {t("printLabel")}
              </Button>
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" onClick={handleWhatsApp}>
                <MessageCircle className="w-3 h-3" /> {t("whatsapp")}
              </Button>
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" onClick={handleEmail}>
                <Mail className="w-3 h-3" /> {t("emailLabel")}
              </Button>
              <Button
                size="sm"
                className={`gap-1 rounded-lg text-[11px] font-semibold h-8 px-3 ${invoiceType === "proforma" ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                onClick={issueInvoice}
                disabled={isIssuingInvoice || (invoiceType === "proforma" ? !!(project as any)?.proformaIssuedAt : !!(project as any)?.finalInvoiceIssuedAt)}
              >
                {invoiceType === "proforma" ? <FileText className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />}
                {(invoiceType === "proforma" ? !!(project as any)?.proformaIssuedAt : !!(project as any)?.finalInvoiceIssuedAt)
                  ? t("alreadyIssued")
                  : isIssuingInvoice
                    ? t("issuing")
                    : invoiceType === "proforma" ? t("issueProForma") : t("issueFinalInvoice")}
              </Button>
            </div>
          </div>

          {/* Scrollable document */}
          <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-6">
            <div ref={invoiceRef} className="max-w-[210mm] mx-auto bg-white dark:bg-slate-900 shadow-sm rounded-xl relative" id="invoice-print" data-print-root="invoice">
              {/* PRO-FORMA WATERMARK */}
              {invoiceType === "proforma" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden rounded-xl">
                  <div className="text-amber-200 font-black text-[90px] tracking-widest rotate-[-30deg] opacity-30 whitespace-nowrap print-watermark">
                    {t("proForma")}
                  </div>
                </div>
              )}

              {/* Inner padding */}
              <div className="p-8 md:p-10">
                {/* Top accent bar */}
                <div className={`h-1.5 -mx-8 md:-mx-10 -mt-8 md:-mt-10 mb-8 rounded-t-xl ${invoiceType === "proforma" ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-200" : "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-200"}`} />

                {/* Studio Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden ${invoiceType === "proforma" ? "bg-amber-500" : "bg-emerald-600"}`}>
                      {studioLogoUrl ? (
                        <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${studioLogoUrl}`} alt={studioName} className="w-full h-full object-contain" />
                      ) : (
                        <Camera className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{studioName}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{studioDescription || t("studioTagline")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg mb-2 font-bold text-xs ${invoiceType === "proforma" ? "bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"}`}>
                      {invoiceType === "proforma" ? <FileText className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}
                      {invoiceType === "proforma" ? t("proFormaBadge") : t("finalInvoiceBadge")}
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {invoiceType === "proforma" ? `${proformaPrefix}${String(project.id).padStart(4, "0")}` : invoiceNumber}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {t("datePrefix")}{format(new Date((invoiceType === "proforma" ? (project as any)?.proformaIssuedAt : (project as any)?.finalInvoiceIssuedAt) || new Date()), "MMMM d, yyyy")}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {CURRENCIES.find((c) => c.value === projCurrency)?.flag} {projCurrency}
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 print-bg-slate">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 print-text-muted">{t("billedTo")}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{project.clientName ?? t("clientFallback")}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{t("clientLabel")}</div>
                  </div>
                  <div className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 print-bg-slate">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 print-text-muted">{t("issuedBy")}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{project.photographerName ?? studioName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("photographerLabel")}</div>
                    {(studioAddress || studioPhone || studioEmail) && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
                        {studioAddress && <div>{studioAddress}</div>}
                        {studioPhone && <div>{studioPhone}</div>}
                        {studioEmail && <div>{studioEmail}</div>}
                        {studioTaxId && <div className="font-medium text-slate-500 dark:text-slate-400 mt-1">{t("invoiceTaxId")}: {studioTaxId}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Project details */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-5 py-4 mb-7 border border-slate-200 dark:border-slate-700 print-bg-slate">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 print-text-muted">{t("projectDetails")}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">{t("projectLabel")}</span>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{project.title}</div>
                    </div>
                    {(project as any).serviceName && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">{t("serviceLabel")}</span>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{(project as any).serviceName}</div>
                      </div>
                    )}
                    {project.startDate && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">{t("startDateLabel")}</span>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{format(new Date(project.startDate), "dd/MM/yyyy")}</div>
                      </div>
                    )}
                    {project.deliveryDate && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">{t("deliveryLabel")}</span>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{format(new Date(project.deliveryDate), "dd/MM/yyyy")}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service / Financial breakdown table */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-6">
                  {/* Table header */}
                  <div className={`px-5 py-3 ${invoiceType === "proforma" ? "bg-amber-700 print-bg-amber-dark" : "bg-slate-900 print-bg-dark"}`}>
                    <div className="grid grid-cols-12 gap-4 text-[11px] font-bold uppercase tracking-wider">
                      <span className="col-span-9 text-white/90">{t("descriptionLabel")}</span>
                      <span className="col-span-3 text-right text-white">{t("amountLabel")}</span>
                    </div>
                  </div>
                  {/* Service line */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(project as any).serviceName ? (
                      <div className="px-5 py-3.5 grid grid-cols-12 gap-4 text-sm bg-white dark:bg-slate-900">
                        <span className="col-span-9 text-slate-700 dark:text-slate-300 font-medium">{(project as any).serviceName}</span>
                        <span className="col-span-3 text-right font-bold text-slate-900 dark:text-slate-100">{fmtMoney(invoiceType === "proforma" ? (project.expectedCost ?? 0) : finalCost)}</span>
                      </div>
                    ) : (
                      <div className="px-5 py-3.5 grid grid-cols-12 gap-4 text-sm bg-white dark:bg-slate-900">
                        <span className="col-span-9 text-slate-700 dark:text-slate-300">{t("photographyService")}</span>
                        <span className="col-span-3 text-right font-bold text-slate-900 dark:text-slate-100">{fmtMoney(invoiceType === "proforma" ? (project.expectedCost ?? finalCost) : finalCost)}</span>
                      </div>
                    )}
                  </div>
                  {/* Financial summary */}
                  <div className="border-t-2 border-slate-200 dark:border-slate-700">
                    {/* Subtotal */}
                    <div className="px-5 py-2.5 grid grid-cols-12 gap-4 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 print-text-muted">
                      <span className="col-span-9">{t("subtotal")}</span>
                      <span className="col-span-3 text-right font-medium">{fmtMoney(invoiceType === "proforma" ? (project.expectedCost ?? finalCost) : finalCost)}</span>
                    </div>
                    {/* Discount */}
                    {discount > 0 && (
                      <div className="px-5 py-2.5 grid grid-cols-12 gap-4 text-sm bg-amber-50/80 dark:bg-amber-950/50 print-bg-amber">
                        <span className="col-span-9 text-amber-700 dark:text-amber-300 font-medium">{t("discountOnInvoice")}</span>
                        <span className="col-span-3 text-right font-semibold text-amber-700 dark:text-amber-300">- {fmtMoney(discount)}</span>
                      </div>
                    )}
                    {/* Amount paid */}
                    {amountPaid > 0 && (
                      <div className="px-5 py-2.5 grid grid-cols-12 gap-4 text-sm bg-emerald-50/80 dark:bg-emerald-950/50 print-bg-emerald">
                        <span className="col-span-9 text-emerald-700 dark:text-emerald-300 font-medium">{t("paidDeposit")}</span>
                        <span className="col-span-3 text-right font-semibold text-emerald-700 dark:text-emerald-300">- {fmtMoney(amountPaid)}</span>
                      </div>
                    )}
                  </div>
                  {/* Balance due - prominent */}
                  <div className={`px-5 py-4 grid grid-cols-12 gap-4 ${hasDebt ? "bg-rose-50 dark:bg-rose-950 print-bg-rose" : "bg-emerald-50 dark:bg-emerald-950 print-bg-emerald"}`}>
                    <span className={`col-span-8 text-sm font-bold ${hasDebt ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                      {hasDebt ? t("balanceDue") : t("fullyPaidLabel")}
                    </span>
                    <span className={`col-span-4 text-right text-xl font-black ${hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {fmtMoney(invoiceType === "proforma" ? Math.max(0, (project.expectedCost ?? finalCost) - amountPaid) : remaining)}
                    </span>
                  </div>
                </div>

                {/* Pro-forma disclaimer */}
                {invoiceType === "proforma" && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-5 print-bg-amber">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <p className="text-xs font-semibold">{t("proFormaDisclaimer")}</p>
                    </div>
                  </div>
                )}
                {(showStamp || showSignature) && (
                  <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    {showSignature && (
                      <div className="text-center">
                        <div className="h-14 border-b border-slate-300 dark:border-slate-600 mb-2" />
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t("clientSignature")}</p>
                      </div>
                    )}
                    {showStamp && (
                      <div className="text-center">
                        {studioStampUrl ? (
                          <div className="h-14 flex items-center justify-center mb-2">
                            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${studioStampUrl}`} alt="Stamp" className="max-h-14 object-contain" />
                          </div>
                        ) : (
                          <div className="h-14 border-b border-slate-300 dark:border-slate-600 mb-2" />
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t("studioStamp")}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-600 dark:text-slate-400">{t("thankYou")}</p>
                  <p className="mt-1">{t("retainDocument")}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PAYMENT RECEIPT MODAL ─── */}
      <Dialog open={showPaymentReceipt} onOpenChange={setShowPaymentReceipt}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 shrink-0">
            <div>
              <DialogTitle className="text-base font-bold text-blue-900 dark:text-blue-200">{t("paymentReceiptTitle")}</DialogTitle>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">{t("receiptDescription")}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5" onClick={handlePrint}>
                <Printer className="w-3 h-3" /> {t("printLabel")}
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-6">
            <div ref={receiptRef} className="max-w-[210mm] mx-auto bg-white dark:bg-slate-900 shadow-sm rounded-xl" id="receipt-print" data-print-root="receipt">
              <div className="p-8 md:p-10">
                {/* Top accent bar */}
                <div className="h-1.5 -mx-8 md:-mx-10 -mt-8 md:-mt-10 mb-8 rounded-t-xl bg-gradient-to-r from-blue-500 via-blue-400 to-blue-200" />

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm overflow-hidden">
                      {studioLogoUrl ? (
                        <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${studioLogoUrl}`} alt={studioName} className="w-full h-full object-contain" />
                      ) : (
                        <Receipt className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{studioName}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{studioDescription || t("studioTagline")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg mb-2 font-bold text-xs bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                      {t("paymentReceiptBadge")}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{t("datePrefix")}{format(new Date(), "dd/MM/yyyy")}</div>
                  </div>
                </div>

                {/* Project & client */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-5 py-4 mb-7 border border-slate-200 dark:border-slate-700 print-bg-slate">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{t("clientNameLabel")}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{project?.clientName ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{t("projectNameLabel")}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{project?.title}</div>
                    </div>
                    {(project as any)?.serviceName && (
                      <div className="col-span-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{t("serviceNameLabel")}</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{(project as any).serviceName}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment summary */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-6">
                  <div className="bg-slate-900 text-white px-5 py-3 text-xs font-bold uppercase tracking-wider grid grid-cols-2 print-bg-dark">
                    <span>{t("descriptionLabel")}</span><span className="text-right">{t("amountLabel")}</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="px-5 py-3 grid grid-cols-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t("totalInvoiceAmount")}</span>
                      <span className="text-right font-semibold">{fmtMoney(finalCost)}</span>
                    </div>
                    <div className="px-5 py-3 grid grid-cols-2 text-sm bg-emerald-50/80 dark:bg-emerald-950/50 print-bg-emerald">
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{t("amountReceived")}</span>
                      <span className="text-right font-bold text-emerald-700 dark:text-emerald-300">{fmtMoney(amountPaid)}</span>
                    </div>
                  </div>
                  <div className={`px-5 py-4 grid grid-cols-2 ${hasDebt ? "bg-rose-50 dark:bg-rose-950 print-bg-rose" : "bg-emerald-50 dark:bg-emerald-950 print-bg-emerald"}`}>
                    <span className={`font-bold ${hasDebt ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                      {hasDebt ? t("remainingBalance") : t("balanceZero")}
                    </span>
                    <span className={`text-right text-xl font-black ${hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {fmtMoney(remaining)}
                    </span>
                  </div>
                </div>

                {(showStamp || showSignature) && (
                  <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    {showSignature && (
                      <div className="text-center">
                        <div className="h-12 border-b border-slate-300 dark:border-slate-600 mb-2" />
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t("clientSignature")}</p>
                      </div>
                    )}
                    {showStamp && (
                      <div className="text-center">
                        {studioStampUrl ? (
                          <div className="h-12 flex items-center justify-center mb-2">
                            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${studioStampUrl}`} alt="Stamp" className="max-h-12 object-contain" />
                          </div>
                        ) : (
                          <div className="h-12 border-b border-slate-300 dark:border-slate-600 mb-2" />
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t("studioStamp")}</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
                  {t("receiptConfirm")}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html, body {
            height: 100% !important;
            overflow: hidden !important;
            background: white !important;
          }

          body > *:not(#print-root) {
            display: none !important;
          }

          #print-root {
            display: block !important;
            position: fixed;
            inset: 0;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 0;
            background: white !important;
            color: #0f172a !important;
            overflow: visible;
            z-index: 99999;
            font-size: 11px;
            line-height: 1.5;
          }

          #print-root * {
            color: #0f172a !important;
            border-color: #e2e8f0 !important;
          }

          #print-root .shadow-sm {
            box-shadow: none !important;
          }

          #print-root .rounded-xl {
            border-radius: 0 !important;
          }

          #print-root .-mx-8 {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          #print-root .print-bg-slate {
            background: transparent !important;
          }

          #print-root .print-bg-amber {
            background: #fffbeb !important;
          }

          #print-root .print-bg-amber-dark {
            background: #b45309 !important;
          }

          #print-root .print-bg-amber-dark * {
            color: white !important;
          }

          #print-root .print-bg-emerald {
            background: #ecfdf5 !important;
          }

          #print-root .print-bg-rose {
            background: #fff1f2 !important;
          }

          #print-root .print-bg-blue {
            background: #eff6ff !important;
          }

          #print-root .print-bg-dark {
            background: #0f172a !important;
          }

          #print-root .print-bg-dark * {
            color: white !important;
          }

          #print-root .print-text-muted {
            color: #64748b !important;
          }

          #print-root .print-watermark {
            opacity: 0.12 !important;
          }

          #print-root .bg-slate-50 {
            background: #f8fafc !important;
          }

          #print-root .bg-amber-50 {
            background: #fffbeb !important;
          }

          #print-root .bg-emerald-50 {
            background: #ecfdf5 !important;
          }

          #print-root .bg-rose-50 {
            background: #fff1f2 !important;
          }
        }
      `}</style>
    </div>
  );
}
