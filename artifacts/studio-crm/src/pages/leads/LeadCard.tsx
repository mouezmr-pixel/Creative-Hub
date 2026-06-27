import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateLead, useDeleteLead, useConvertLead, useListLostReasons, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, fr as frLocale, enUS as enLocale } from "date-fns/locale";
import { Phone, Mail, Trash2, RefreshCw, Calendar, Zap } from "lucide-react";
import { SOURCES, DEFAULT_LOST_REASONS, formatCurrency, getCurrentMonth } from "./constants";

const currentMonth = getCurrentMonth();

interface LeadCardProps {
  lead: any;
  index: number;
}

export function LeadCard({ lead, index }: LeadCardProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();
  const { data: savedReasons = [] } = useListLostReasons();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showLostReason, setShowLostReason] = useState(false);
  const [pendingLostStatus, setPendingLostStatus] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [customLostReason, setCustomLostReason] = useState("");
  const [credentialData, setCredentialData] = useState<{ username: string; password: string } | null>(null);

  const locale = language === "ar" ? arLocale : language === "fr" ? frLocale : enLocale;
  const formatMonth = (m: string): string => {
    const [y, mon] = m.split("-");
    return format(new Date(parseInt(y, 10), parseInt(mon, 10) - 1, 1), "MMM yyyy", { locale });
  };

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    contacted: "bg-violet-50 text-violet-700 border-violet-200",
    proposal_sent: "bg-amber-50 text-amber-700 border-amber-200",
    negotiating: "bg-orange-50 text-orange-700 border-orange-200",
    won: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost: "bg-slate-100 text-slate-500 border-slate-200",
  };

  const STATUS_LABELS: Record<string, any> = {
    new: "new",
    contacted: "contacted",
    proposal_sent: "proposalSent",
    negotiating: "negotiating",
    won: "won",
    lost: "lost",
  };

  const statusColor = STATUS_COLORS[lead.status] ?? STATUS_COLORS.new;
  const statusLabel = t(STATUS_LABELS[lead.status] ?? "new");
  const SourceIcon = SOURCES.find((s) => s.value === lead.source)?.icon ?? Zap;

  const allLostReasons = [...new Set([...DEFAULT_LOST_REASONS, ...savedReasons])];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "lost") {
      setPendingLostStatus(true);
      setShowLostReason(true);
      return;
    }
    try {
      await updateLead.mutateAsync({ id: lead.id, data: { status: newStatus } });
      qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      if (newStatus === "won") {
        const result = await convertLead.mutateAsync({ id: lead.id });
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        const r = result as any;
        if (r.username) {
          setCredentialData({ username: r.username, password: r.password });
        } else {
          toast({ description: r.message || t("leadConverted") });
        }
      }
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const handleConfirmLost = async () => {
    const reason = lostReason || customLostReason || null;
    try {
      await updateLead.mutateAsync({ id: lead.id, data: { status: "lost", lostReason: reason } });
      qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      setShowLostReason(false);
      setLostReason("");
      setCustomLostReason("");
      setPendingLostStatus(false);
      toast({ description: t("leadMarkedLost") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const result = await convertLead.mutateAsync({ id: lead.id });
      qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      const r = result as any;
      if (r.username) {
        setCredentialData({ username: r.username, password: r.password });
      } else {
        toast({ description: r.message || t("convert") });
      }
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync({ id: lead.id });
      qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const isThisMonth = lead.wonMonth === currentMonth;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className={`bg-white dark:bg-slate-900 border-border shadow-sm hover:shadow-md transition-all group ${lead.status === "lost" ? "opacity-60" : ""}`}>
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-bold truncate">
                    {lead.name}
                    {lead.status === "won" && !isThisMonth && lead.wonMonth && (
                      <span className="ml-1.5 text-[9px] font-normal text-slate-400 dark:text-slate-500">({formatMonth(lead.wonMonth)})</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <SourceIcon className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{lead.source}</span>
                    {lead.estimatedValue && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ml-auto" dir="ltr">
                        {formatCurrency(lead.estimatedValue)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {confirmDelete ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="destructive" className="h-6 text-xs rounded-lg px-1.5" onClick={handleDelete}>{t("yes")}</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs rounded-lg px-1.5" onClick={() => setConfirmDelete(false)}>{t("no")}</Button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {(lead.phone || lead.email) && (
              <div className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {lead.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" /><span className="truncate" dir="ltr">{lead.phone}</span></div>}
                {lead.email && <div className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" /><span className="truncate" dir="ltr">{lead.email}</span></div>}
              </div>
            )}
            {lead.notes && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 line-clamp-2">{lead.notes}</p>
            )}
            {lead.lostReason && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50/70 border border-rose-100 dark:border-rose-900 rounded-lg px-2.5 py-1.5">
                {lead.lostReason}
              </p>
            )}
            {lead.status === "won" && isThisMonth && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-3 h-3" />
                {t("thisMonth")}
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-0.5">
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 text-[10px] rounded-lg flex-1 min-w-0 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, key]) => (
                    <SelectItem key={val} value={val} className="text-xs">{t(key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lead.status !== "won" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 rounded-lg border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:bg-emerald-950 flex-shrink-0 px-2"
                  onClick={handleConvert}
                  disabled={converting}
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${converting ? "animate-spin" : ""}`} />
                  {converting ? "" : t("convert")}
                </Button>
              )}
              {lead.status === "won" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 rounded-lg border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:bg-emerald-950 flex-shrink-0 px-2"
                  onClick={handleConvert}
                  disabled={converting}
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${converting ? "animate-spin" : ""}`} />
                  {converting ? "" : t("createProject")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showLostReason} onOpenChange={(v) => { if (!v) { setShowLostReason(false); setPendingLostStatus(false); } }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("lostReasonTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("lostReasonPrompt")}</p>
            <Select value={lostReason} onValueChange={(v) => { setLostReason(v); setCustomLostReason(""); }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("chooseReason")} />
              </SelectTrigger>
              <SelectContent>
                {allLostReasons.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500">{t("or")}</span>
              </div>
            </div>
            <Input
              value={customLostReason}
              onChange={(e) => { setCustomLostReason(e.target.value); setLostReason(""); }}
              placeholder={t("customReasonPlaceholder")}
              className="rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setShowLostReason(false); setPendingLostStatus(false); setLostReason(""); setCustomLostReason(""); }}>
                {t("cancel")}
              </Button>
              <Button onClick={handleConfirmLost} disabled={(!lostReason && !customLostReason.trim()) || updateLead.isPending}>
                {updateLead.isPending ? t("saving") : t("confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentialData} onOpenChange={(open) => { if (!open) setCredentialData(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-emerald-600">
              {t("leadConverted")}
            </DialogTitle>
          </DialogHeader>
          {credentialData && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("clientAccountCreated")}</p>
              <div className="bg-background rounded-lg p-3 border border-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("userLabel")}</span>
                  <code className="font-mono font-medium text-foreground">{credentialData.username}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("passLabel")}</span>
                  <code className="font-mono font-medium text-foreground">{credentialData.password}</code>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("saveCredentialsPrompt")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
