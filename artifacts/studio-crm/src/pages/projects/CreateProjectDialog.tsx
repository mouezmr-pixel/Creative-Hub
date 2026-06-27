import React from "react";
import { useLanguage } from "@/lib/i18n";
import {
  useCreateProject,
  useBulkCreateProjectMilestones,
  getListProjectsQueryKey,
  getListProjectMilestonesQueryKey,
  type WorkflowTemplate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Workflow, Coins } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { CURRENCIES, Currency } from "@/lib/currency";
import { IdeaWorkflow, LANGUAGE_OPTIONS, type Language } from "./IdeaWorkflow";

export function CreateProjectDialog({
  open,
  onOpenChange,
  clients,
  photographerUsers,
  services,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: any[];
  photographerUsers: any[];
  services: any[];
  templates: WorkflowTemplate[];
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const bulkCreateMilestones = useBulkCreateProjectMilestones();

  const [selectedServicePrice, setSelectedServicePrice] = React.useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = React.useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = React.useState<Currency>("DZD");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = React.useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [assigneeCommissions, setAssigneeCommissions] = React.useState<Record<number, { commissionType: "percentage" | "flat"; commissionValue: string }>>({});

  const [originalClientIdea, setOriginalClientIdea] = React.useState("");
  const [aiInstructions, setAiInstructions] = React.useState("");
  const [aiLanguage, setAiLanguage] = React.useState<Language>("algerian");
  const [aiGeneratedSuggestion, setAiGeneratedSuggestion] = React.useState("");
  const [finalProposedIdea, setFinalProposedIdea] = React.useState("");

  const { register, handleSubmit, reset, control, setValue } = useForm<{
    title: string;
    clientId: string;
    status: string;
    startDate: string;
    deliveryDate: string;
    expectedCost: string;
  }>();

  const handleServiceSelect = (serviceId: string) => {
    if (!serviceId || serviceId === "none") {
      setSelectedServicePrice("");
      setSelectedServiceId(null);
      return;
    }
    const service = services.find((s) => String(s.id) === serviceId);
    if (service) {
      const price = String(service.price);
      setSelectedServicePrice(price);
      setSelectedServiceId(service.id);
      setValue("expectedCost", price);
    }
  };

  const toggleAssignee = (id: number) => {
    setSelectedAssigneeIds((prev) => {
      if (prev.includes(id)) {
        setAssigneeCommissions((c) => {
          const next = { ...c };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const resetForm = () => {
    reset();
    setSelectedServicePrice("");
    setSelectedServiceId(null);
    setSelectedCurrency("DZD");
    setSelectedAssigneeIds([]);
    setSelectedTemplateId("");
    setAssigneeCommissions({});
    setOriginalClientIdea("");
    setAiInstructions("");
    setAiLanguage("algerian");
    setAiGeneratedSuggestion("");
    setFinalProposedIdea("");
  };

  const onSubmit = async (data: any) => {
    if (!data.clientId) {
      toast({ variant: "destructive", description: t("selectClient") });
      return;
    }
    try {
      const commissionsPayload: Record<number, { commissionType: string; commissionValue: number | null }> = {};
      for (const uid of selectedAssigneeIds) {
        const comm = assigneeCommissions[uid];
        if (comm && comm.commissionValue) {
          commissionsPayload[uid] = {
            commissionType: comm.commissionType,
            commissionValue: parseFloat(comm.commissionValue),
          };
        }
      }
      const newProject = await createProject.mutateAsync({
        data: {
          title: data.title,
          clientId: parseInt(data.clientId),
          assigneeIds: selectedAssigneeIds,
          photographerId: selectedAssigneeIds[0] ?? null,
          serviceId: selectedServiceId,
          status: data.status || "pending",
          startDate: data.startDate || null,
          deliveryDate: data.deliveryDate || null,
          expectedCost: data.expectedCost ? parseFloat(data.expectedCost) : null,
          currency: selectedCurrency,
          assigneeCommissions: Object.keys(commissionsPayload).length > 0 ? commissionsPayload : undefined,
          originalClientIdea: originalClientIdea || null,
          aiGeneratedSuggestion: aiGeneratedSuggestion || null,
          finalProposedIdea: finalProposedIdea || null,
        } as any,
      });

      if (selectedTemplateId && selectedTemplateId !== "none" && newProject?.id) {
        const template = (templates as any[]).find((tmpl) => String(tmpl.id) === selectedTemplateId);
        if (template?.milestones?.length > 0) {
          const milestoneData = template.milestones.map((m: any, idx: number) => ({
            title: m.title,
            titleAr: m.titleAr ?? null,
            titleFr: m.titleFr ?? null,
            order: idx,
          }));
          await bulkCreateMilestones.mutateAsync({ id: newProject.id, data: { milestones: milestoneData } });
          queryClient.invalidateQueries({ queryKey: getListProjectMilestonesQueryKey(newProject.id) });
        }
      }

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ description: t("projectCreated") });
      resetForm();
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", description: t("failedToCreateProject") });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          {t("newProject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("newProject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("titleRequired")}</Label>
            <Input {...register("title", { required: true })} placeholder={t("projectTitle")} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("clientRequired")}</Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder={t("selectClient")} /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {photographerUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("assignCreatives")}</Label>
              <div className="border border-border rounded-xl p-3 max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-800 space-y-2">
                {photographerUsers.map((p) => {
                  const isSelected = selectedAssigneeIds.includes(p.id);
                  const isPerProject = (p as any).paymentType !== "monthly_salary";
                  const comm = assigneeCommissions[p.id];
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAssignee(p.id)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 dark:text-slate-100 flex-1">{p.name}</span>
                        {(p as any).profession && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{(p as any).profession}</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isPerProject ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"}`}>
                          {isPerProject ? t("perProjectLabel") : t("salaryLabel")}
                        </span>
                      </label>
                      {isSelected && isPerProject && (
                        <div className="ms-6 flex items-center gap-2">
                          <Select
                            value={comm?.commissionType ?? "flat"}
                            onValueChange={(v) => setAssigneeCommissions((c) => ({ ...c, [p.id]: { commissionType: v as "percentage" | "flat", commissionValue: c[p.id]?.commissionValue ?? "" } }))}
                          >
                            <SelectTrigger className="h-7 text-xs rounded-lg w-28 flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat">{t("flatAmount")}</SelectItem>
                              <SelectItem value="percentage">{t("percentOfRevenue")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            placeholder={comm?.commissionType === "percentage" ? t("commissionValuePlaceholder") : t("fixedAmountPlaceholder")}
                            value={comm?.commissionValue ?? ""}
                            onChange={(e) => setAssigneeCommissions((c) => ({ ...c, [p.id]: { commissionType: c[p.id]?.commissionType ?? "flat", commissionValue: e.target.value } }))}
                            className="h-7 text-xs rounded-lg flex-1"
                          />
                          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{comm?.commissionType === "percentage" ? t("percentSign") : t("currencySymbol")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedAssigneeIds.length > 0 && (
                <p className="text-xs text-primary">{selectedAssigneeIds.length} {t("creativesSelected")}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("startDate")}</Label>
              <Input {...register("startDate")} type="date" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("deliveryDate")}</Label>
              <Input {...register("deliveryDate")} type="date" className="rounded-xl mt-1" />
            </div>
          </div>
          <div className="border border-indigo-100 dark:border-indigo-900 bg-indigo-50/40 rounded-2xl p-3 space-y-2">
            <Label className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
              {t("servicePackageLabel")}
            </Label>
            <Select onValueChange={handleServiceSelect} disabled={services.length === 0}>
              <SelectTrigger className="rounded-xl bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 focus:ring-indigo-300">
                <SelectValue placeholder={services.length === 0 ? t("noServicesAvailable") : t("selectService")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noService")}</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <span className="font-medium">{s.title}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">{s.price.toLocaleString()} {selectedCurrency}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedServiceId && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-1">
                {t("priceAutoFilled")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expectedCost")}</Label>
              <Input
                {...register("expectedCost")}
                type="number"
                step="0.01"
                placeholder={t("costPlaceholder")}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                {t("currencyLabel")}
              </Label>
              <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as Currency)}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="font-medium">{c.flag} {c.symbol}</span>
                      <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <IdeaWorkflow
            originalClientIdea={originalClientIdea}
            setOriginalClientIdea={setOriginalClientIdea}
            aiInstructions={aiInstructions}
            setAiInstructions={setAiInstructions}
            aiLanguage={aiLanguage}
            setAiLanguage={setAiLanguage}
            aiGeneratedSuggestion={aiGeneratedSuggestion}
            setAiGeneratedSuggestion={setAiGeneratedSuggestion}
            finalProposedIdea={finalProposedIdea}
            setFinalProposedIdea={setFinalProposedIdea}
          />

          {(templates as any[]).length > 0 && (
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-primary" />
                {t("workflowTemplateLabel")}
              </Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder={t("chooseWorkflow")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noWorkflow")}</SelectItem>
                  {(templates as any[]).map((tmpl) => (
                    <SelectItem key={tmpl.id} value={String(tmpl.id)}>
                      {tmpl.name} · {tmpl.milestones?.length ?? 0} {t("workflowSteps")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateId && selectedTemplateId !== "none" && (() => {
                const tpl = (templates as any[]).find((tmpl) => String(tmpl.id) === selectedTemplateId);
                return tpl?.milestones?.length > 0 ? (
                  <div className="mt-2 px-3 py-2 bg-primary/5 border border-primary/15 rounded-xl">
                    <p className="text-xs font-medium text-primary mb-1">{tpl.milestones.length} {t("stepsWillBeAdded")}</p>
                    <div className="space-y-0.5">
                      {tpl.milestones.slice(0, 4).map((m: any, i: number) => (
                        <p key={i} className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">· {m.title}</p>
                      ))}
                      {tpl.milestones.length > 4 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">+{tpl.milestones.length - 4} {t("more")}</p>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="rounded-xl" disabled={createProject.isPending}>
              {t("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
