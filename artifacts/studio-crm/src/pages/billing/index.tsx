import React, { useState, useMemo } from "react";
import {
  useListProjects,
  useListClients,
  useListServices,
  useCreateProject,
  useCreatePayment,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import type { Project, Client } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/use-studio";
import { format } from "date-fns";
import type { InvoiceDocType } from "@/components/invoice-document";
import { ClientBillingCard, type ClientWithProjects } from "./ClientBillingCard";
import { QuickInvoiceDialog } from "./QuickInvoiceDialog";
import { PaymentDialog } from "./PaymentDialog";
import { InvoicePreviewSheet } from "./InvoicePreviewSheet";

type BillingTab = "all" | "paid";

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
  const [isCreating, setIsCreating] = useState(false);

  const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [paymentTarget, setPaymentTarget] = useState<Project | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const baseParams = user?.role === "photographer" ? { photographerId: user.id } : {};
  const { data: allProjects = [], isLoading: projectsLoading } = useListProjects(baseParams);
  const { data: clients = [], isLoading: clientsLoading } = useListClients(baseParams);
  const { data: services = [] } = useListServices();
  const createProject = useCreateProject();
  const createPayment = useCreatePayment();
  const studio = useStudio();

  const studioInvoiceData = {
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
      const totalDebt = clientProjects.reduce((sum, p) => sum + (p.remainingDebt ?? 0), 0);
      const totalPaid = clientProjects.reduce((sum, p) => sum + (p.amountPaid ?? 0), 0);
      const totalCost = clientProjects.reduce((sum, p) => sum + (p.finalCost ?? 0), 0);

      return {
        client,
        projects: clientProjects,
        totalDebt,
        totalPaid,
        totalCost,
        projectCount: clientProjects.length,
        hasDebt: totalDebt > 0,
        isFullyPaid: totalCost > 0 && totalDebt === 0,
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

    return list.sort((a, b) => b.totalDebt - a.totalDebt);
  }, [clientsWithProjects, search, activeTab]);

  const handleOpenQuickInvoice = (client: Client) => {
    setSelectedClient(client);
    setIsInvoiceOpen(true);
  };

  const handleCreateQuickInvoice = async (data: {
    invoiceType: "proforma" | "final";
    newServiceId: string;
    newServicePrice: string;
    linkProjectId: string;
  }) => {
    if (!selectedClient) return;
    setIsCreating(true);
    try {
      const selectedService = data.newServiceId
        ? services.find((s) => String(s.id) === data.newServiceId)
        : undefined;

      const title = `${t("invoiceFor")} ${selectedClient.name} - ${format(new Date(), "dd/MM/yyyy")}`;

      const newProject = await createProject.mutateAsync({
        data: {
          title,
          clientId: selectedClient.id,
          status: "pending",
          expectedCost: data.newServicePrice ? parseFloat(data.newServicePrice) : null,
          finalCost: data.newServicePrice ? parseFloat(data.newServicePrice) : null,
          serviceId: selectedService?.id ?? null,
          currency: "DZD",
        } as any,
      });

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

      const previewProject: InvoicePreview = {
        type: data.invoiceType,
        project: newProject as unknown as Project,
      };
      setInvoicePreview(previewProject);
      setIsInvoiceOpen(false);
      setIsPreviewOpen(true);
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

  const handleOpenPayment = (project: Project) => {
    setPaymentTarget(project);
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = async (data: {
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    receiptNumber: string;
    notes: string;
  }) => {
    if (!paymentTarget) return;
    try {
      await createPayment.mutateAsync({
        data: {
          projectId: paymentTarget.id,
          amount: data.amount,
          currency: (paymentTarget as any).currency || "DZD",
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate || null,
          receiptNumber: data.receiptNumber || null,
          notes: data.notes || null,
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
                  onQuickInvoice={() => handleOpenQuickInvoice(cw.client)}
                  onPrintExisting={handlePrintExisting}
                  onRecordPayment={handleOpenPayment}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QuickInvoiceDialog
        open={isInvoiceOpen}
        onOpenChange={setIsInvoiceOpen}
        selectedClient={selectedClient}
        services={services as any[]}
        allProjects={allProjects}
        onCreateInvoice={handleCreateQuickInvoice}
        isCreating={isCreating}
      />

      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        paymentTarget={paymentTarget}
        isPending={createPayment.isPending}
        onRecordPayment={handleRecordPayment}
      />

      <InvoicePreviewSheet
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        invoicePreview={invoicePreview}
        studioInvoiceData={studioInvoiceData as any}
      />
    </div>
  );
}
