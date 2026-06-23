import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  useListServices,
  useListLostReasons,
  getListLeadsQueryKey,
  type CreateLeadBodyStatus,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, fr as frLocale, enUS as enLocale } from "date-fns/locale";
import {
  Plus, TrendingUp, Phone, Mail, Trash2, RefreshCw, X,
  Instagram, Users, MessageCircle, Globe, Zap, Calendar, Archive,
} from "lucide-react";

const SOURCES = [
  { value: "instagram", labelKey: "sourceInstagram" as const, icon: Instagram },
  { value: "referral", labelKey: "sourceReferral" as const, icon: Users },
  { value: "whatsapp", labelKey: "sourceWhatsApp" as const, icon: MessageCircle },
  { value: "website", labelKey: "sourceWebsite" as const, icon: Globe },
  { value: "other", labelKey: "sourceOther" as const, icon: Zap },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-violet-50 text-violet-700 border-violet-200" },
  proposal_sent: { label: "Proposal Sent", color: "bg-amber-50 text-amber-700 border-amber-200" },
  negotiating: { label: "Negotiating", color: "bg-orange-50 text-orange-700 border-orange-200" },
  won: { label: "Won ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost: { label: "Lost", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatCurrency(n: number | null | undefined) {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const currentMonth = getCurrentMonth();

const DEFAULT_LOST_REASONS = [
  "ليس عميلنا المثالي",
  "السعر مرتفع جداً",
  "لا رد",
  "اختار منافساً آخر",
  "التوقيت غير مناسب",
  "أخرى",
];

function LeadCard({ lead, index }: { lead: any; index: number }) {
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

export default function Leads() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useListLeads();
  const createLead = useCreateLead();
  const { data: services = [] } = useListServices();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", estimatedValue: "", source: "instagram", status: "new", notes: "",
    projectName: "", serviceId: "",
  });

  const pipelineLeads = leads.filter((l: any) => l.status !== "won" && l.status !== "lost");
  const pipelineValue = pipelineLeads.reduce((sum: number, l: any) => sum + (l.estimatedValue ?? 0), 0);

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc: Record<string, number>, s) => {
    acc[s] = leads.filter((l: any) => l.status === s).length;
    return acc;
  }, {});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await createLead.mutateAsync({
        data: {
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
          source: form.source,
          status: form.status as CreateLeadBodyStatus,
          notes: form.notes || null,
          projectName: form.projectName || null,
          serviceId: form.serviceId ? parseInt(form.serviceId) : null,
        },
      });
      qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      setForm({ name: "", phone: "", email: "", estimatedValue: "", source: "instagram", status: "new", notes: "", projectName: "", serviceId: "" });
      setOpen(false);
      toast({ description: t("addLead") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {t("leadsPipeline")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1" dir="ltr">{leads.length} {t("total")} · {pipelineLeads.length} {t("activeLeads")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" />{t("addLead")}</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">{t("addNewLead")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("name")} *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("clientName")} className="rounded-xl" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("phone")}</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("phonePlaceholder")} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("email")}</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder={t("emailPlaceholder")} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("source")}</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{t(s.labelKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("estimatedValue")}</Label>
                  <Input type="number" value={form.estimatedValue} onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))} placeholder="0" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("projectNameLabel")}</Label>
                <Input value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} placeholder={t("projectNamePlaceholder")} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("serviceSelect")}</Label>
                <Select value={form.serviceId || undefined} onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("selectServiceOptional")} /></SelectTrigger>
                  <SelectContent>
                    {(services as any[]).map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("notes")}</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder={t("addCommentOrQuestion")} className="rounded-xl resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={createLead.isPending}>
                  {createLead.isPending ? t("adding") : t("addLead")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary to-indigo-600 text-white border-0 shadow-md shadow-primary/20">
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-1">{t("pipelineValue")}</div>
            <div className="text-2xl font-bold" dir="ltr">{formatCurrency(pipelineValue)}</div>
            <div className="text-xs opacity-75 mt-1" dir="ltr">{pipelineLeads.length} {t("activeLeads")}</div>
          </CardContent>
        </Card>
        {[
          { labelKey: "new" as const, key: "new", color: "text-blue-600", bg: "bg-blue-50" },
          { labelKey: "negotiating" as const, key: "negotiating", color: "text-amber-600", bg: "bg-amber-50" },
          { labelKey: "won" as const, key: "won", color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.key} className={`${s.bg} border-0 shadow-sm`}>
            <CardContent className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{t(s.labelKey)}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{statusCounts[s.key] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Pipeline Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-60 min-w-[260px] bg-white dark:bg-slate-900 border rounded-2xl animate-pulse flex-shrink-0" />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{t("noActiveLeads")}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t("addFirstLead")}</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollBehavior: "smooth" }}>
          {(["new", "contacted", "proposal_sent", "negotiating", "won"] as const).map((status) => {
            const columnLeads = (status === "won")
              ? leads.filter((l: any) => l.status === "won" && l.wonMonth === currentMonth)
              : leads.filter((l: any) => l.status === status);
            const allWon = leads.filter((l: any) => l.status === "won");
            const prevWonCount = allWon.length - columnLeads.length;
            const cfg = STATUS_CONFIG[status];
            const columnValue = columnLeads.reduce((sum: number, l: any) => sum + (l.estimatedValue ?? 0), 0);
            return (
              <div key={status} className="min-w-[270px] max-w-[320px] flex-shrink-0">
                <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm flex flex-col h-full" style={{ maxHeight: "calc(100vh - 280px)" }}>
                  {/* Column header */}
                  <div className={`sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-border rounded-t-2xl ${status === "won" ? "bg-emerald-50 dark:bg-emerald-950" : "bg-white dark:bg-slate-900"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color.replace("text-", "bg-").split(" ")[0]}`} />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{t(status === "proposal_sent" ? "proposalSent" : status)}</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{columnLeads.length}</span>
                    {status === "won" && prevWonCount > 0 && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">(+{prevWonCount} {t("prevMonths")})</span>
                    )}
                    {columnValue > 0 && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400" dir="ltr">{formatCurrency(columnValue)}</span>}
                  </div>
                  {/* Column body */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <AnimatePresence>
                      {columnLeads.length === 0 ? (
                        <div className="text-center py-8 text-slate-300">
                          <p className="text-xs italic">{t("dropLeadsHere")}</p>
                        </div>
                      ) : (
                        columnLeads.map((lead: any, i: number) => (
                          <LeadCard key={lead.id} lead={lead} index={i} />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived Lost Leads */}
      {leads.filter((l: any) => l.status === "lost").length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Archive className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("archive")}</span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {leads.filter((l: any) => l.status === "lost").length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {leads.filter((l: any) => l.status === "lost").map((lead: any) => (
              <div key={lead.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold text-sm flex-shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lead.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{lead.source}</span>
                  </div>
                  {lead.lostReason && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 font-medium mt-0.5">{lead.lostReason}</p>
                  )}
                  {(lead.phone || lead.email) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5" dir="ltr">
                      {lead.phone}{lead.phone && lead.email ? " · " : ""}{lead.email}
                    </p>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                  {format(new Date(lead.createdAt), "MMM d")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
