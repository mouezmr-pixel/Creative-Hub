import React, { useState, useEffect } from "react";
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
  type WorkflowTemplate,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useStudio } from "@/lib/use-studio";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Trash2, FileText, Receipt, CheckCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ProjectOverview, getStatusBadge } from "./ProjectOverview";
import { IdeaWorkflow } from "./IdeaWorkflow";
import { ProjectMilestones } from "./ProjectMilestones";
import { ProjectFinancials } from "./ProjectFinancials";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { ProjectNotes } from "./ProjectNotes";
import { InvoiceDialog } from "./InvoiceDialog";
import { PaymentReceiptDialog } from "./PaymentReceiptDialog";

type Language = "arabic" | "algerian" | "english" | "french";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id!, 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { studioName } = useStudio();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: project, isLoading } = useGetProject(id);
  const { data: notes = [] } = useListProjectNotes(id);
  const { data: photographers = [] } = useListUsers();
  const { data: milestones = [] } = useListProjectMilestones(id);
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
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
  const [ideaLanguage, setIdeaLanguage] = useState<Language>("algerian");

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
        body: JSON.stringify({ originalIdea: editFields.originalClientIdea, language: ideaLanguage }),
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
      toast({ description: invoiceType === "final" ? t("finalInvoiceIssued") : t("proFormaLIssued") });
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

  const handleAddMilestone = async (title: string) => {
    try {
      await createMilestone.mutateAsync({ id, data: { title, order: (milestones as any[]).length } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(id) });
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

  const handleApplyTemplate = async (templateId: string) => {
    const template = (templates as WorkflowTemplate[]).find((tpl) => String(tpl.id) === templateId);
    if (!template || template.milestones.length === 0) return;
    try {
      const existingMilestones = (milestones as any[]).map((m) => ({
        title: m.title, titleAr: m.titleAr ?? null, titleFr: m.titleFr ?? null,
        description: m.description ?? null, order: m.order,
      }));
      const templateMilestones = template.milestones.map((m, i) => ({
        title: m.title, titleAr: m.titleAr ?? null, titleFr: m.titleFr ?? null,
        description: m.description ?? null, order: (existingMilestones.length + i),
      }));
      await bulkCreateMilestones.mutateAsync({ id, data: { milestones: [...existingMilestones, ...templateMilestones] } });
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(id) });
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
    toast({ variant: "destructive", description: t("enterValidAmount") });
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
    const cleanup = () => {
      root.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 5000);
  };

  const [activeTab, setActiveTab] = useState("overview");

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

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">{t("projectNotFound")}</div>;

  const amountPaid = project.amountPaid ?? 0;

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
        {user?.role !== "client" && (user?.role === "admin" || (user as any)?.canInvoice) && (
          <div className="flex items-center gap-2 flex-wrap">
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

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-border gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
            activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("overview")}
        </button>
        <button
          onClick={() => setActiveTab("workflow")}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
            activeTab === "workflow" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("workflow")}
        </button>
        {user?.role !== "photographer" && (
        <button
          onClick={() => setActiveTab("financials")}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
            activeTab === "financials" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("financials")}
        </button>
        )}
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
            activeTab === "notes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("notes")}
        </button>
      </div>

      {activeTab === "overview" && (
        <ProjectOverview
          project={project as any}
          editFields={editFields}
          setEditFields={setEditFields}
          save={save}
          photographerUsers={photographerUsers}
        />
      )}

      {activeTab === "workflow" && (
        <div className="space-y-6">
          {(user?.role !== "client" || (project as any).finalProposedIdea) && (
            <IdeaWorkflow
              project={project as any}
              editFields={editFields}
              setEditFields={setEditFields}
              save={save}
              enhanceIdeaWithAI={enhanceIdeaWithAI}
              handleCopyToFinalDetail={handleCopyToFinalDetail}
              isEnhancingIdea={isEnhancingIdea}
              ideaLanguage={ideaLanguage}
              setIdeaLanguage={setIdeaLanguage}
            />
          )}
          <ProjectMilestones
            project={project as any}
            milestones={milestones as any[]}
            templates={templates as WorkflowTemplate[]}
            onToggleMilestone={handleToggleMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            onAddMilestone={handleAddMilestone}
            onApplyTemplate={handleApplyTemplate}
            createMilestonePending={createMilestone.isPending}
            bulkCreatePending={bulkCreateMilestones.isPending}
          />
        </div>
      )}

      {activeTab === "financials" && (
        <ProjectFinancials
          project={project as any}
          editFields={editFields}
          setEditFields={setEditFields}
          save={save}
          projectPayments={projectPayments}
          paymentsLoading={paymentsLoading}
          fmtMoney={fmtMoney}
          amountPaid={amountPaid}
          onShowPaymentForm={() => setShowPaymentForm(true)}
          onDeletePayment={handleDeletePayment}
        />
      )}

      <PaymentFormDialog
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
        onSubmit={handleCreatePayment}
        isPending={createPayment.isPending}
      />

      {activeTab === "notes" && (
        <ProjectNotes
          notes={notes as any[]}
          newNote={newNote}
          setNewNote={setNewNote}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          createNotePending={createNote.isPending}
        />
      )}

      <InvoiceDialog
        open={showInvoice}
        onOpenChange={setShowInvoice}
        invoiceType={invoiceType}
        project={project as any}
        onPrint={handlePrint}
        onWhatsApp={handleWhatsApp}
        onEmail={handleEmail}
        onIssueInvoice={issueInvoice}
        isIssuingInvoice={isIssuingInvoice}
      />

      <PaymentReceiptDialog
        open={showPaymentReceipt}
        onOpenChange={setShowPaymentReceipt}
        project={project as any}
        onPrint={handlePrint}
      />
    </div>
  );
}
