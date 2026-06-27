import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListProjects,
  useCreateProject,
  useListClients,
  useListUsers,
  useListServices,
  useListWorkflowTemplates,
  useBulkCreateProjectMilestones,
  getListProjectsQueryKey,
  getListProjectMilestonesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Workflow, Coins, Sparkles, Bot, MessageSquare, FileCheck, ChevronRight, Globe, Copy, LayoutGrid, LayoutList, FolderKanban, Play, CheckCircle2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { CURRENCIES, Currency } from "@/lib/currency";

type Language = "arabic" | "algerian" | "english" | "french";
const LANGUAGE_OPTIONS: { value: Language; labelKey: "langAlgerian" | "langArabicStd" | "langEnglish" | "langFrench"; nativeLabel: string }[] = [
  { value: "algerian", labelKey: "langAlgerian", nativeLabel: "الدارجة الجزائرية" },
  { value: "arabic", labelKey: "langArabicStd", nativeLabel: "العربية الفصحى" },
  { value: "english", labelKey: "langEnglish", nativeLabel: "English" },
  { value: "french", labelKey: "langFrench", nativeLabel: "Français" },
];

export default function Projects() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedServicePrice, setSelectedServicePrice] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("DZD");

  const baseParams = user?.role === "photographer" ? { photographerId: user.id } : {};
  const { data: allProjects = [], isLoading } = useListProjects(baseParams);
  const { data: ongoingProjects = [] } = useListProjects({ ...baseParams, status: "in_progress" });
  const { data: pendingProjects = [] } = useListProjects({ ...baseParams, status: "pending" });
  const { data: completedProjects = [] } = useListProjects({ ...baseParams, status: "completed" });
  const { data: archivedProjects = [] } = useListProjects({ ...baseParams, status: "archived" });
  const { data: clients = [] } = useListClients(baseParams);
  const { data: photographers = [] } = useListUsers();
  const { data: services = [] } = useListServices();
  const { data: templates = [] } = useListWorkflowTemplates();
  const createProject = useCreateProject();
  const bulkCreateMilestones = useBulkCreateProjectMilestones();

  const photographerUsers = photographers.filter((u) => u.role === "photographer");

  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [assigneeCommissions, setAssigneeCommissions] = useState<Record<number, { commissionType: "percentage" | "flat"; commissionValue: string }>>({});

  const [originalClientIdea, setOriginalClientIdea] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiLanguage, setAiLanguage] = useState<Language>("algerian");
  const [aiGeneratedSuggestion, setAiGeneratedSuggestion] = useState("");
  const [finalProposedIdea, setFinalProposedIdea] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhanceWithAI = async () => {
    if (!originalClientIdea.trim()) {
      toast({ variant: "destructive", description: t("enterOriginalIdeaFirst") });
      return;
    }
    setIsEnhancing(true);
    setAiGeneratedSuggestion("");
    try {
      const res = await fetch("/api/ai/enhance-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalIdea: originalClientIdea, instructions: aiInstructions, language: aiLanguage }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.proposal) setAiGeneratedSuggestion(data.proposal);
    } catch {
      toast({ variant: "destructive", description: t("aiEnhanceFailed") });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCopyToFinal = () => {
    setFinalProposedIdea(aiGeneratedSuggestion);
    toast({ description: t("aiCopySuccess") });
  };

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

  const filterBySearch = (projects: typeof allProjects) =>
    projects.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase()))
    );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "archived": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
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

      // Apply workflow template milestones if selected
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
      setIsCreateOpen(false);
    } catch {
      toast({ variant: "destructive", description: t("failedToCreateProject") });
    }
  };

  const ProjectList = ({ projects }: { projects: typeof allProjects }) => {
    const filtered = filterBySearch(projects);
    return (
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" : "space-y-3 mt-4"}>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
            {t("noProjectsFound")}
          </div>
        ) : (
          filtered.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link href={`/projects/${project.id}`}>
                <Card className={`group hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-900 border-border shadow-sm overflow-hidden`}>
                  {viewMode === "grid" && (
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                  )}
                  <CardContent className={viewMode === "grid" ? "p-5" : "p-4"}>
                    <div className={viewMode === "grid" ? "space-y-3" : "flex flex-col sm:flex-row sm:items-center justify-between gap-3"}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{project.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {project.clientName}
                          {project.photographerName && ` • ${project.photographerName}`}
                        </p>
                        {viewMode === "grid" ? (
                          <div className="mt-3 space-y-2">
                            <Progress value={project.progress} className="h-1.5" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{t("progressLabel")}</span>
                              <span className="font-medium">{project.progress}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 max-w-xs">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{t("progressLabel")}</span>
                              <span>{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                      <div className={viewMode === "grid" ? "flex items-center justify-between pt-2 border-t border-border" : "flex items-center gap-4 flex-shrink-0"}>
                        {viewMode === "grid" ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              {project.deliveryDate && (
                                <span className="text-xs text-muted-foreground">
                                  {t("due")}: {new Date(project.deliveryDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <Badge className={`${getStatusColor(project.status)}`} variant="outline">
                              {t(project.status as any) || project.status}
                            </Badge>
                          </>
                        ) : (
                          <>
                            {project.deliveryDate && (
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {t("due")}: {new Date(project.deliveryDate).toLocaleDateString()}
                              </span>
                            )}
                          </>
                        )}
                        
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("projects")}</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{allProjects.length} {t("totalProjects")}</p>
        </div>
        {user?.role === "admin" && (
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { reset(); setSelectedServicePrice(""); setSelectedTemplateId(""); setOriginalClientIdea(""); setAiInstructions(""); setAiLanguage("algerian"); setAiGeneratedSuggestion(""); setFinalProposedIdea(""); } }}>
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
              {user?.role === "admin" && photographerUsers.length > 0 && (
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
              {/* Service selector */}
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
              {/* ── Creative Idea Workflow ── 3-step section ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span className="text-sm font-bold text-white">{t("ideaWorkflowTitle")}</span>
                  <span className="text-xs text-white/70 ml-auto">3 {t("steps")}</span>
                </div>

                <div className="p-5 space-y-5">
                  {/* STEP 1 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">1</div>
                      <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t("clientOriginalIdea")}
                      </span>
                    </div>
                    <Textarea
                      value={originalClientIdea}
                      onChange={(e) => setOriginalClientIdea(e.target.value)}
                      placeholder={t("ideaPlaceholder")}
                      rows={3}
                      className="bg-white dark:bg-slate-900 rounded-xl resize-none border-slate-200 dark:border-slate-700 focus:border-primary"
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
                        {t("aiSuggestion")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                        placeholder={t("aiStyleNotes")}
                        className="bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700"
                      />
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-shrink-0">
                          <Globe className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <Select value={aiLanguage} onValueChange={(v) => setAiLanguage(v as Language)}>
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
                          onClick={handleEnhanceWithAI}
                          disabled={isEnhancing || !originalClientIdea.trim()}
                          className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
                          size="sm"
                        >
                          <Sparkles className="h-4 w-4" />
                          {isEnhancing ? t("generating") : t("enhanceWithAI")}
                        </Button>
                      </div>
                    </div>
                    {aiGeneratedSuggestion ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-950 border-b border-violet-100 dark:border-violet-900">
                          <div className="flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t("aiResult")}</span>
                            <span className="text-xs text-violet-400">· {LANGUAGE_OPTIONS.find(l => l.value === aiLanguage)?.nativeLabel}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCopyToFinal}
                            className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3"
                          >
                            <Copy className="h-3 w-3" />
                            {t("copyToFinal")}
                          </Button>
                        </div>
                        <div className="p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                          {aiGeneratedSuggestion}
                        </div>
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
                        {t("finalProposedIdea")}
                      </span>
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                        {t("visibleToClient")}
                      </span>
                    </div>
                    <Textarea
                      value={finalProposedIdea}
                      onChange={(e) => setFinalProposedIdea(e.target.value)}
                      placeholder={t("finalIdeaPlaceholder")}
                      rows={4}
                      className="bg-white dark:bg-slate-900 rounded-xl resize-none border-emerald-200 dark:border-emerald-800 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Workflow Template picker */}
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
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="rounded-xl" disabled={createProject.isPending}>
                  {t("create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bento-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allProjects.length}</p>
              <p className="text-xs text-muted-foreground">{t("totalProjects")}</p>
            </div>
          </div>
        </div>
        <div className="bento-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{ongoingProjects.length}</p>
              <p className="text-xs text-muted-foreground">{t("ongoing")}</p>
            </div>
          </div>
        </div>
        <div className="bento-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedProjects.length}</p>
              <p className="text-xs text-muted-foreground">{t("completed")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-white dark:bg-slate-900 border-border rounded-xl"
            placeholder={t("searchProjects")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center border border-border rounded-xl p-0.5 bg-white dark:bg-slate-900">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="all">{t("all")} ({allProjects.length})</TabsTrigger>
          <TabsTrigger value="ongoing">{t("ongoing")} ({ongoingProjects.length})</TabsTrigger>
          <TabsTrigger value="pending">{t("pending")} ({pendingProjects.length})</TabsTrigger>
          <TabsTrigger value="completed">{t("completed")} ({completedProjects.length})</TabsTrigger>
          <TabsTrigger value="archived">{t("archived")} ({archivedProjects.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><ProjectList projects={allProjects} /></TabsContent>
        <TabsContent value="ongoing"><ProjectList projects={ongoingProjects} /></TabsContent>
        <TabsContent value="pending"><ProjectList projects={pendingProjects} /></TabsContent>
        <TabsContent value="completed"><ProjectList projects={completedProjects} /></TabsContent>
        <TabsContent value="archived"><ProjectList projects={archivedProjects} /></TabsContent>
      </Tabs>
    </div>
  );
}
