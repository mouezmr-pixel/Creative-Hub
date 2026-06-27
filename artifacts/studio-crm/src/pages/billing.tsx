import React, { useState, useMemo, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  useListProjects,
  useListClients,
  useListServices,
  useCreateProject,
  useCreatePayment,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import type {
  Project,
  Client,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  CheckCheck,
  Receipt as ReceiptIcon,
  Plus,
  Loader2,
  Printer,
  User,
  Phone,
  Wallet,
} from "lucide-react";
import { InvoiceDocument } from "@/components/invoice-document";
import type { InvoiceProjectData, InvoiceStudioData, InvoiceDocType } from "@/components/invoice-document";
import { useStudio } from "@/lib/use-studio";
import { format } from "date-fns";

type BillingTab = "all" | "paid";

interface ClientWithProjects {
  client: Client;
  projects: Project[];
  totalPaid: number;
  totalCost: number;
  projectCount: number;
  isFullyPaid: boolean;
}

interface InvoicePreview {
  type: InvoiceDocType;
  project: Project;
}

export default function Billing() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<BillingTab>("all");

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"proforma" | "final">("proforma");
  const [newServiceId, setNewServiceId] = useState<string>("");
  const [newServicePrice, setNewServicePrice] = useState<string>("");
  const [linkProjectId, setLinkProjectId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [paymentTarget, setPaymentTarget] = useState<Project | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentReceipt, setPaymentReceipt] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const createPayment = useCreatePayment();

  const baseParams = user?.role === "photographer" ? { photographerId: user.id } : {};
  const { data: allProjects = [], isLoading: projectsLoading } = useListProjects(baseParams);
  const { data: clients = [], isLoading: clientsLoading } = useListClients(baseParams);
  const { data: services = [] } = useListServices();
  const createProject = useCreateProject();
  const studio = useStudio();
  const printRef = useRef<HTMLDivElement>(null);

  const studioInvoiceData: InvoiceStudioData = {
    studioName: studio.studioName,
    studioDescription: studio.studioDescription,
    studioAddress: studio.studioAddress,
    studioPhone: studio.studioPhone,
    studioEmail: studio.studioEmail,
    studioWebsite: studio.studioWebsite,
    studioTaxId: studio.studioTaxId,
    invoicePrefix: studio.invoicePrefix,
    proformaPrefix: studio.proformaPrefix,
    paymentTerms: studio.paymentTerms,
    invoiceFooter: studio.invoiceFooter,
    invoiceNotes: studio.invoiceNotes,
    studioLogoUrl: studio.studioLogoUrl,
    studioStampUrl: studio.studioStampUrl,
    showStamp: studio.showStamp,
    showSignature: studio.showSignature,
  };

  const clientsWithProjects = useMemo<ClientWithProjects[]>(() => {
    return clients.map((client) => {
      const clientProjects = allProjects.filter((p) => p.clientId === client.id);
      const totalPaid = clientProjects.reduce((sum, p) => sum + (p.amountPaid ?? 0), 0);
      const totalCost = clientProjects.reduce((sum, p) => sum + (p.finalCost ?? 0), 0);

      return {
        client,
        projects: clientProjects,
        totalPaid,
        totalCost,
        projectCount: clientProjects.length,
        isFullyPaid: totalCost > 0 && clientProjects.reduce((sum, p) => sum + (p.remainingDebt ?? 0), 0) === 0,
      };
    });
  }, [clients, allProjects]);

  const filteredClients = useMemo(() => {
    let list = clientsWithProjects;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.client.name.toLowerCase().includes(q) ||
          (c.client.phone && c.client.phone.toLowerCase().includes(q))
      );
    }

    switch (activeTab) {
      case "paid":
        list = list.filter((c) => c.isFullyPaid || c.projectCount === 0);
        break;
    }

    return list.sort((a, b) => {
      const debtA = a.projects.reduce((sum, p) => sum + (p.remainingDebt ?? 0), 0);
      const debtB = b.projects.reduce((sum, p) => sum + (p.remainingDebt ?? 0), 0);
      return debtB - debtA;
    });
  }, [clientsWithProjects, search, activeTab]);

  const handleOpenQuickInvoice = (client: Client) => {
    setSelectedClient(client);
    setInvoiceType("proforma");
    setNewServiceId("");
    setNewServicePrice("");
    setLinkProjectId("");
    setIsInvoiceOpen(true);
  };

  const handleCreateQuickInvoice = async () => {
    if (!selectedClient) return;
    setIsCreating(true);
    try {
      const selectedService = newServiceId
        ? services.find((s) => String(s.id) === newServiceId)
        : undefined;

      const title = `${t("invoiceFor")} ${selectedClient.name} - ${format(new Date(), "dd/MM/yyyy")}`;

      const newProject = await createProject.mutateAsync({
        data: {
          title,
          clientId: selectedClient.id,
          status: "pending",
          expectedCost: newServicePrice ? parseFloat(newServicePrice) : null,
          finalCost: newServicePrice ? parseFloat(newServicePrice) : null,
          serviceId: selectedService?.id ?? null,
          currency: "DZD",
        } as any,
      });

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

      const previewProject: InvoicePreview = {
        type: invoiceType,
        project: newProject as unknown as Project,
      };
      setInvoicePreview(previewProject);
      setIsInvoiceOpen(false);
      setIsPreviewOpen(true);
      setNewServiceId("");
      setNewServicePrice("");
      setLinkProjectId("");
    } catch {
      toast({ variant: "destructive", description: t("failedToCreate") });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrintExisting = (type: InvoiceDocType, project: Project) => {
    setInvoicePreview({ type, project });
    setIsPreviewOpen(true);
  };

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const printRoot = document.getElementById("print-root");
    if (!printRoot) return;
    const clone = content.cloneNode(true);
    printRoot.innerHTML = "";
    printRoot.appendChild(clone);
    window.print();
    setTimeout(() => { printRoot.innerHTML = ""; }, 5000);
  }, []);

  const handleOpenPayment = (project: Project) => {
    setPaymentTarget(project);
    setPaymentAmount(String(project.remainingDebt ?? ""));
    setPaymentMethod("cash");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentReceipt("");
    setPaymentNotes("");
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", description: t("enterValidAmount") });
      return;
    }
    try {
      await createPayment.mutateAsync({
        data: {
          projectId: paymentTarget.id,
          amount,
          currency: (paymentTarget as any).currency || "DZD",
          paymentMethod,
          paymentDate: paymentDate || null,
          receiptNumber: paymentReceipt || null,
          notes: paymentNotes || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ description: t("paymentRecorded") });
      setIsPaymentOpen(false);
      setPaymentTarget(null);
    } catch {
      toast({ variant: "destructive", description: t("failedToRecordPayment") });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
      case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
      default: return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const isLoading = projectsLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t("billing")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {clients.length} {t("clients")}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 bg-white dark:bg-slate-900 border-border rounded-xl"
          placeholder={t("billingClientSearch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BillingTab)}
      >
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="all">
            {t("billingAllClients")} ({clientsWithProjects.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            {t("billingFullyPaid")} (
            {clientsWithProjects.filter((c) => c.isFullyPaid || c.projectCount === 0).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
              {t("noResults")}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((cw) => (
                <ClientBillingCard
                  key={cw.client.id}
                  cw={cw}
                  t={t}
                  formatCurrency={formatCurrency}
                  getStatusColor={getStatusColor}
                  onQuickInvoice={() => handleOpenQuickInvoice(cw.client)}
                  onPrintExisting={handlePrintExisting}
                  onRecordPayment={handleOpenPayment}
                  onViewProjects={() => {}}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">
              {t("newInvoice")}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("invoiceType")}
                </Label>
                <Select
                  value={invoiceType}
                  onValueChange={(v) => setInvoiceType(v as "proforma" | "final")}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proforma">
                      <FileText className="h-4 w-4 inline mr-2 text-amber-600" />
                      {t("proformaInvoice")}
                    </SelectItem>
                    <SelectItem value="final">
                      <CheckCheck className="h-4 w-4 inline mr-2 text-emerald-600" />
                      {t("finalInvoice")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("addServiceItem")}
                </Label>
                <Select
                  value={newServiceId}
                  onValueChange={(v) => {
                    setNewServiceId(v);
                    const svc = services.find((s) => String(s.id) === v);
                    if (svc) setNewServicePrice(String(svc.price));
                    else setNewServicePrice("");
                    setLinkProjectId("");
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t("selectService") as string} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noService")}</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.title} — {s.price.toLocaleString()} DZD
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("costLabel")}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
                    {t("or")}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("linkExistingProject")}
                </Label>
                <Select
                  value={linkProjectId}
                  onValueChange={(v) => {
                    setLinkProjectId(v);
                    if (v) {
                      setNewServiceId("");
                      setNewServicePrice("");
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t("selectProject") as string} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const clientProjs = allProjects.filter(
                        (p) => p.clientId === selectedClient.id
                      );
                      return clientProjs.length === 0 ? (
                        <SelectItem value="none" disabled>
                          {t("noProjectsBilling")}
                        </SelectItem>
                      ) : (
                        clientProjs.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.title}
                          </SelectItem>
                        ))
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setIsInvoiceOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  className="rounded-xl gap-2"
                  onClick={handleCreateQuickInvoice}
                  disabled={isCreating || (!newServicePrice && !linkProjectId)}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  {t("createAndPrint")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">
              {t("recordPayment")}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {paymentTarget?.title} — {paymentTarget?.clientName}
            </DialogDescription>
          </DialogHeader>

          {paymentTarget && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("paymentAmount")}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("paymentMethod")}
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("bankTransfer")}</SelectItem>
                    <SelectItem value="check">{t("check")}</SelectItem>
                    <SelectItem value="ccp">{t("ccp")}</SelectItem>
                    <SelectItem value="baridi_mob">{t("baridiMob")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("paymentDate")}
                </Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("receiptNumber")}
                  <span className="text-xs text-muted-foreground ml-1">({t("optionalLabel")})</span>
                </Label>
                <Input
                  value={paymentReceipt}
                  onChange={(e) => setPaymentReceipt(e.target.value)}
                  placeholder={t("optionalLabel")}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("notes")}
                  <span className="text-xs text-muted-foreground ml-1">({t("optionalLabel")})</span>
                </Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={t("optionalNote")}
                  className="rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setIsPaymentOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  className="rounded-xl gap-2"
                  onClick={handleRecordPayment}
                  disabled={createPayment.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  {createPayment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {createPayment.isPending ? t("recording") : t("recordPayment")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {invoicePreview?.type === "proforma"
                ? t("invoiceProFormaTitle")
                : invoicePreview?.type === "final"
                  ? t("invoiceFinalTitle")
                  : t("paymentReceiptTitle")}
            </SheetTitle>
            <SheetDescription>
              {invoicePreview?.project.clientName}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex justify-end gap-2 mb-4">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              {t("printLabel")}
            </Button>
          </div>
          <div ref={printRef}>
            {invoicePreview && (
              <InvoiceDocument
                type={invoicePreview.type}
                project={invoicePreview.project as unknown as InvoiceProjectData}
                studio={studioInvoiceData}
                t={t}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ClientBillingCard({
  cw,
  t,
  formatCurrency,
  getStatusColor,
  onQuickInvoice,
  onPrintExisting,
  onRecordPayment,
}: {
  cw: ClientWithProjects;
  t: (key: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
  getStatusColor: (status: string) => string;
  onQuickInvoice: () => void;
  onPrintExisting: (type: InvoiceDocType, project: Project) => void;
  onRecordPayment: (project: Project) => void;
  onViewProjects: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="bg-white dark:bg-slate-900 border-border shadow-sm transition-all"
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base truncate">
                  {cw.client.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {cw.client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {cw.client.phone}
                    </span>
                  )}
                  <span>{cw.projectCount} {t("projectsCount")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {cw.totalCost > 0 && (
              <>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {t("totalCollectedLabel")}
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(cw.totalPaid, "DZD")}
                  </div>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={onQuickInvoice}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("newInvoice")}
            </Button>
            {cw.projects.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? t("cancel") : t("all")} ({cw.projects.length})
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {cw.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noProjectsBilling")}
              </p>
            ) : (
              cw.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-sm hover:text-primary transition-colors"
                    >
                      {project.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{project.serviceName || t("notAvailable")}</span>
                      {project.finalCost && project.finalCost > 0 && (
                        <span>
                          {formatCurrency(project.finalCost, project.currency ?? "DZD")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusColor(project.status)}
                    >
                      {t(project.status as any) || project.status}
                    </Badge>

                    <div className="flex gap-1">
                      <button
                        onClick={() => onRecordPayment(project)}
                        className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-600 dark:text-violet-400 transition-colors"
                        title={t("recordPayment")}
                      >
                        <Wallet className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          onPrintExisting("proforma", project)
                        }
                        className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 transition-colors"
                        title={t("proformaInvoice")}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintExisting("final", project)}
                        className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title={t("finalInvoice")}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintExisting("receipt", project)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                        title={t("receipt")}
                      >
                        <ReceiptIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
