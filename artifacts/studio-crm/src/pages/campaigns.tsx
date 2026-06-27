import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useListClients,
  getListCampaignsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Megaphone, Calendar, User, Trash2, Eye, Clock, CheckCircle2,
} from "lucide-react";
import { useForm } from "react-hook-form";

const CAMPAIGN_TYPES = ["seasonal", "event", "promotion", "product_launch", "other"] as const;
const CAMPAIGN_STATUSES = ["draft", "active", "completed", "archived"] as const;

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    archived: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <Badge variant="outline" className={map[status] ?? map.draft}>
      {t(status as any) || status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    seasonal: "bg-orange-50 text-orange-700 border-orange-200",
    event: "bg-purple-50 text-purple-700 border-purple-200",
    promotion: "bg-rose-50 text-rose-700 border-rose-200",
    product_launch: "bg-cyan-50 text-cyan-700 border-cyan-200",
    other: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${map[type] ?? map.other}`}>
      {type}
    </span>
  );
}

export default function Campaigns() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useListCampaigns();
  const { data: clients = [] } = useListClients();
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();
  const watchType = watch("type");

  const filtered = campaigns.filter((c) => {
    const mSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const mStatus = statusFilter === "all" || c.status === statusFilter;
    return mSearch && mStatus;
  });

  const resetForm = () => {
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      await createCampaign.mutateAsync({
        data: {
          name: data.name,
          nameAr: data.nameAr || null,
          nameFr: data.nameFr || null,
          description: data.description || null,
          type: data.type || "other",
          clientId: data.clientId ? parseInt(data.clientId, 10) : null,
          budget: data.budget ? parseFloat(data.budget) : null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      setIsCreateOpen(false);
      resetForm();
      toast({ description: t("campaignCreated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToCreateCampaign") });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteCampaignConfirm"))) return;
    try {
      await deleteCampaign.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      toast({ description: t("campaignDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteCampaign") });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("campaigns")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("campaignsDesc")}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("newCampaign")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("newCampaign")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t("name")} *</Label>
                <Input {...register("name")} placeholder={t("campaignNamePlaceholder")} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("nameAr")}</Label>
                  <Input {...register("nameAr")} placeholder="اسم الحملة" />
                </div>
                <div>
                  <Label>{t("nameFr")}</Label>
                  <Input {...register("nameFr")} placeholder="Nom de la campagne" />
                </div>
              </div>
              <div>
                <Label>{t("description")}</Label>
                <Input {...register("description")} placeholder={t("campaignDescPlaceholder")} />
              </div>
              <div>
                <Label>{t("campaignType")}</Label>
                <Select
                  value={watchType}
                  onValueChange={(v) => setValue("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {t(`campaignType_${ct}` as any) || ct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("budget")}</Label>
                <Input {...register("budget")} type="number" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <Label>{t("client")}</Label>
                <Select onValueChange={(v) => setValue("clientId", v)}>
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? t("creating") : t("create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCampaigns")}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {CAMPAIGN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>
      ) : !filtered.length ? (
        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
          <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>{t("noCampaignsYet")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/campaigns/${campaign.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all border-border/80 h-full group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {campaign.name}
                          </h3>
                        </div>
                        <TypeBadge type={campaign.type} />
                      </div>
                      <StatusBadge status={campaign.status} />
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {campaign.clientName && (
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{campaign.clientName}</span>
                        </div>
                      )}
                      {campaign.budget != null && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300" dir="ltr">
                            {Number(campaign.budget).toLocaleString()} DZD
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      {campaign.shared ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("sharedWithClient")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("notShared")}</span>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(campaign.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
