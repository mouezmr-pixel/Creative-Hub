import React, { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useShareCampaign,
  useUnshareCampaign,
  useListCampaignServices,
  useAddCampaignService,
  useRemoveCampaignService,
  useListCampaignMilestones,
  useAddCampaignMilestone,
  useUpdateCampaignMilestone,
  useDeleteCampaignMilestone,
  useListServices,
  useListClients,
  getGetCampaignQueryKey,
  getListCampaignsQueryKey,
  getListCampaignMilestonesQueryKey,
  getListCampaignServicesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Megaphone, Share2, Eye, Clock, CheckCircle2,
  Plus, Trash2, X, Calendar, FileText, ListChecks,
} from "lucide-react";

const CAMPAIGN_TYPES = ["seasonal", "event", "promotion", "product_launch", "other"] as const;
const CAMPAIGN_STATUSES = ["draft", "active", "completed", "archived"] as const;
const TABS = ["overview", "proposal", "timeline", "preview"] as const;

export default function CampaignDetail() {
  const params = useParams();
  const id = parseInt(params?.id ?? "0", 10);
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data: campaign, isLoading } = useGetCampaign(id);
  const updateCampaign = useUpdateCampaign();
  const shareCampaign = useShareCampaign();
  const unshareCampaign = useUnshareCampaign();

  const { data: services = [] } = useListServices();
  const { data: clients = [] } = useListClients();
  const { data: campaignServices = [] } = useListCampaignServices(id);
  const addService = useAddCampaignService();
  const removeService = useRemoveCampaignService();

  const { data: milestones = [] } = useListCampaignMilestones(id);
  const addMilestone = useAddCampaignMilestone();
  const updateMilestone = useUpdateCampaignMilestone();
  const deleteMilestone = useDeleteCampaignMilestone();

  const [newServiceId, setNewServiceId] = useState<string>("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProposal, setEditProposal] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCampaignMilestonesQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListCampaignServicesQueryKey(id) });
  };

  if (isLoading || !campaign) {
    return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  }

  const computedMilestones = (milestones as any[]) ?? [];
  const completedCount = computedMilestones.filter((m: any) => m.isCompleted).length;
  const totalCount = computedMilestones.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSaveInfo = async () => {
    try {
      await updateCampaign.mutateAsync({ id, data: { name: editTitle, description: editDescription } });
      invalidate();
      toast({ description: t("updated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdate") });
    }
  };

  const handleShare = async () => {
    try {
      if (campaign.shared) {
        await unshareCampaign.mutateAsync({ id });
      } else {
        await shareCampaign.mutateAsync({ id });
      }
      invalidate();
      toast({ description: campaign.shared ? t("campaignUnshared") : t("campaignShared") });
    } catch {
      toast({ variant: "destructive", description: t("failed") });
    }
  };

  const handleAddService = async () => {
    if (!newServiceId) return;
    try {
      await addService.mutateAsync({ id, data: { serviceId: parseInt(newServiceId, 10) } });
      setNewServiceId("");
      invalidate();
    } catch {
      toast({ variant: "destructive", description: t("failed") });
    }
  };

  const handleRemoveService = async (serviceId: number) => {
    try {
      await removeService.mutateAsync({ id, serviceId });
      invalidate();
    } catch {
      toast({ variant: "destructive", description: t("failed") });
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    try {
      await addMilestone.mutateAsync({ id, data: { title: newMilestoneTitle.trim() } });
      setNewMilestoneTitle("");
      invalidate();
    } catch {
      toast({ variant: "destructive", description: t("failed") });
    }
  };

  const handleToggleMilestone = async (ms: any) => {
    try {
      await updateMilestone.mutateAsync({
        id,
        milestoneId: ms.id,
        data: { isCompleted: !ms.isCompleted },
      });
      invalidate();
    } catch {
      toast({ variant: "destructive", description: t("failed") });
    }
  };

  const handleDeleteMilestone = async (msId: number) => {
    try {
      await deleteMilestone.mutateAsync({ id, milestoneId: msId });
      invalidate();
    } catch {
      toast({ variant: "destructive", description: t("failed") });
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    try {
      await updateCampaign.mutateAsync({ id, data: { [field]: value } });
      invalidate();
      toast({ description: t("saved") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdate") });
    }
  };

  const TABS_LABELS: Record<string, string> = {
    overview: t("overview"),
    proposal: t("proposal"),
    timeline: t("timeline"),
    preview: t("clientPreview"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {campaign.name}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {campaign.clientName ? `${t("for")} ${campaign.clientName}` : t("generalCampaign")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={campaign.shared ? "default" : "outline"} className="gap-1.5">
            <CheckCircle2 className={`h-3 w-3 ${campaign.shared ? "text-white" : "text-muted-foreground"}`} />
            {campaign.shared ? t("shared") : t("notShared")}
          </Badge>
          <Button variant={campaign.shared ? "outline" : "default"} size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            {campaign.shared ? t("unshare") : t("shareWithClient")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-slate-700"
            }`}
          >
            {TABS_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("campaignInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t("name")}</Label>
                  <Input
                    defaultValue={campaign.name}
                    onBlur={(e) => handleUpdateField("name", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("nameAr")}</Label>
                    <Input
                      defaultValue={campaign.nameAr ?? ""}
                      onBlur={(e) => handleUpdateField("nameAr", e.target.value || null)}
                    />
                  </div>
                  <div>
                    <Label>{t("nameFr")}</Label>
                    <Input
                      defaultValue={campaign.nameFr ?? ""}
                      onBlur={(e) => handleUpdateField("nameFr", e.target.value || null)}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("description")}</Label>
                  <Textarea
                    defaultValue={campaign.description ?? ""}
                    onBlur={(e) => handleUpdateField("description", e.target.value || null)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("campaignType")}</Label>
                    <Select
                      defaultValue={campaign.type}
                      onValueChange={(v) => handleUpdateField("type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_TYPES.map((ct) => (
                          <SelectItem key={ct} value={ct}>{t(`campaignType_${ct}` as any) || ct}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("status")}</Label>
                    <Select
                      defaultValue={campaign.status}
                      onValueChange={(v) => handleUpdateField("status", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("budget")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={campaign.budget ?? ""}
                      onBlur={(e) => handleUpdateField("budget", e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <Label>{t("client")}</Label>
                    <Select
                      defaultValue={campaign.clientId?.toString() ?? ""}
                      onValueChange={(v) => handleUpdateField("clientId", v ? parseInt(v, 10) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectClient")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("noClient")}</SelectItem>
                        {(clients as any[]).map((cl: any) => (
                          <SelectItem key={cl.id} value={cl.id.toString()}>{cl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("progress")}</CardTitle>
              </CardHeader>
              <CardContent>
                {totalCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("milestones")}</span>
                      <span className="font-medium" dir="ltr">{completedCount}/{totalCount}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center" dir="ltr">{progress}%</p>
                  </div>
                )}
                {campaign.budget != null && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">{t("budget")}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                      {Number(campaign.budget).toLocaleString()} DZD
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("services")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={newServiceId} onValueChange={setNewServiceId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("addService")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(services as any[]).map((svc: any) => (
                        <SelectItem key={svc.id} value={svc.id.toString()}>{svc.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddService} disabled={!newServiceId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {(campaignServices as any[]).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">{t("noServicesYet")}</p>
                ) : (
                  <div className="space-y-2">
                    {(campaignServices as any[]).map((cs: any) => {
                      const svc = (services as any[]).find((s: any) => s.id === cs.serviceId);
                      return (
                        <div key={cs.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm">
                          <span>{svc?.title ?? `#${cs.serviceId}`}</span>
                          <button onClick={() => handleRemoveService(cs.id)} className="text-slate-400 hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Proposal */}
      {activeTab === "proposal" && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("proposalContent")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("proposalContent")} (EN)</Label>
                <Textarea
                  defaultValue={campaign.proposalContent ?? ""}
                  onBlur={(e) => handleUpdateField("proposalContent", e.target.value || null)}
                  rows={4}
                  placeholder={t("proposalPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("proposalContent")} (AR)</Label>
                <Textarea
                  defaultValue={campaign.proposalContentAr ?? ""}
                  onBlur={(e) => handleUpdateField("proposalContentAr", e.target.value || null)}
                  rows={4}
                  placeholder="محتوى الاقتراح"
                />
              </div>
              <div>
                <Label>{t("proposalContent")} (FR)</Label>
                <Textarea
                  defaultValue={campaign.proposalContentFr ?? ""}
                  onBlur={(e) => handleUpdateField("proposalContentFr", e.target.value || null)}
                  rows={4}
                  placeholder="Contenu de la proposition"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === "timeline" && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                {t("milestones")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder={t("milestoneTitlePlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMilestone(); } }}
                />
                <Button onClick={handleAddMilestone} disabled={!newMilestoneTitle.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {computedMilestones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("noMilestonesYet")}</p>
              ) : (
                <div className="space-y-2">
                  {computedMilestones
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((ms: any, idx: number) => (
                      <div
                        key={ms.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          ms.isCompleted
                            ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
                            : "bg-card border-border"
                        }`}
                      >
                        <button
                          onClick={() => handleToggleMilestone(ms)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            ms.isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 hover:border-primary"
                          }`}
                        >
                          {ms.isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            ms.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isRTL && ms.titleAr ? ms.titleAr : ms.title}
                        </span>
                        <button
                          onClick={() => handleDeleteMilestone(ms.id)}
                          className="text-slate-400 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Client Preview */}
      {activeTab === "preview" && (
        <div className="max-w-3xl space-y-6">
          <Card className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-900">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <Megaphone className="h-8 w-8 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{campaign.name}</h2>
                {campaign.description && (
                  <p className="text-muted-foreground mt-2">{campaign.description}</p>
                )}
              </div>

              {campaign.proposalContent && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-border/50">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("proposal")}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {isRTL && campaign.proposalContentAr ? campaign.proposalContentAr :
                     campaign.proposalContentFr ? campaign.proposalContentFr :
                     campaign.proposalContent}
                  </p>
                </div>
              )}

              {(campaignServices as any[]).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-border/50">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">{t("includedServices")}</h3>
                  <div className="space-y-2">
                    {(campaignServices as any[]).map((cs: any) => {
                      const svc = (services as any[]).find((s: any) => s.id === cs.serviceId);
                      return (
                        <div key={cs.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <span className="text-sm">{svc?.title ?? `Service #${cs.serviceId}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {campaign.budget != null && (
                <div className="bg-emerald-50 dark:bg-emerald-950 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t("estimatedBudget")}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1" dir="ltr">
                    {Number(campaign.budget).toLocaleString()} DZD
                  </p>
                </div>
              )}

              {computedMilestones.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-border/50">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">{t("timeline")}</h3>
                  <div className="space-y-3">
                    {computedMilestones
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((ms: any, idx: number) => (
                        <div key={ms.id} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            ms.isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                          }`}>
                            {ms.isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                          </div>
                          <span className={`text-sm ${ms.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"}`}>
                            {isRTL && ms.titleAr ? ms.titleAr : ms.title}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
                {campaign.shared ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("campaignVisible")}
                  </span>
                ) : (
                  <span>{t("notVisibleToClient")}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
