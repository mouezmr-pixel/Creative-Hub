import React, { useState } from "react";
import {
  useListMonthlyPackages,
  useCreateMonthlyPackage,
  useUpdateMonthlyPackage,
  useDeleteMonthlyPackage,
  useGenerateMonthlyPackage,
  useGenerateAllMonthlyPackages,
  useListClients,
  getListMonthlyPackagesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings2,
  Trash2,
  Video,
} from "lucide-react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";

const MONTHS_ARABIC = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function monthLabel(month: string): string {
  const [, m] = month.split("-");
  return MONTHS_ARABIC[parseInt(m) - 1];
}

function monthYearLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS_ARABIC[parseInt(m) - 1]} ${y}`;
}

export default function MonthlyPackages() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: packages = [], isLoading } = useListMonthlyPackages();
  const { data: clients = [], isLoading: clientsLoading } = useListClients();
  const createPkg = useCreateMonthlyPackage();
  const updatePkg = useUpdateMonthlyPackage();
  const deletePkg = useDeleteMonthlyPackage();
  const generateOne = useGenerateMonthlyPackage();
  const generateAll = useGenerateAllMonthlyPackages();

  const activePackages = packages.filter((p) => p.isActive);
  const generatedThisMonth = packages.filter((p) => p.generatedMonths?.includes(selectedMonth));
  const totalMonthlyBudget = activePackages.reduce((sum, p) => sum + p.totalBudget, 0);

  const goToPrev = () => setSelectedMonth((m) => format(subMonths(new Date(m + "-01"), 1), "yyyy-MM"));
  const goToNext = () => {
    const next = addMonths(new Date(selectedMonth + "-01"), 1);
    const now = startOfMonth(new Date());
    if (next <= now) setSelectedMonth(format(next, "yyyy-MM"));
  };
  const isNextDisabled = addMonths(new Date(selectedMonth + "-01"), 1) > startOfMonth(new Date());

  const refresh = () => qc.invalidateQueries({ queryKey: getListMonthlyPackagesQueryKey() });

  const handleGenerateAll = async () => {
    try {
      const res = await generateAll.mutateAsync({ data: { month: selectedMonth } });
      refresh();
      toast({
        description: `${t("packagesGenerated").replace("{n}", String(res.created))}${res.skipped > 0 ? ` (${t("packagesSkipped").replace("{n}", String(res.skipped))})` : ""}`,
      });
    } catch {
      toast({ variant: "destructive", description: "فشل التوليد" });
    }
  };

  const handleGenerateOne = async (id: number) => {
    try {
      await generateOne.mutateAsync({ id, data: { month: selectedMonth } });
      refresh();
      toast({ description: `${monthYearLabel(selectedMonth)} — تم الإنشاء` });
    } catch (err: any) {
      if (err?.status === 409) {
        toast({ description: `${monthYearLabel(selectedMonth)} — تم التوليد مسبقاً` });
      } else {
        const detail = err?.data?.detail || err?.data?.error || err?.message || "";
        const msg = detail ? `فشل التوليد: ${detail}` : "فشل التوليد";
        toast({ variant: "destructive", description: msg });
        console.error("Generation error:", err);
      }
    }
  };

  // ── Form state for create/edit ──
  const [form, setForm] = useState({
    clientId: "",
    serviceId: "",
    title: "",
    currency: "DZD",
    notes: "",
    items: [] as { title: string; price: string }[],
  });

  const resetForm = () => {
    setForm({ clientId: "", serviceId: "", title: "", currency: "DZD", notes: "", items: [] });
    setEditingPackage(null);
  };

  const openEditSheet = (pkg: any) => {
    setEditingPackage(pkg);
    setForm({
      clientId: String(pkg.clientId),
      serviceId: pkg.serviceId ? String(pkg.serviceId) : "",
      title: pkg.title,
      currency: pkg.currency,
      notes: pkg.notes ?? "",
      items: pkg.items.map((i: any) => ({
        title: i.title,
        price: String(i.price),
      })),
    });
    setSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.clientId || !form.title || form.items.length === 0) {
      toast({ variant: "destructive", description: "يرجى تعبئة الحقول الأساسية" });
      return;
    }

    const body: any = {
      clientId: parseInt(form.clientId),
      title: form.title,
      currency: form.currency,
      notes: form.notes || null,
      items: form.items.map((item, idx) => ({
        title: item.title,
        price: parseFloat(item.price) || 0,
        displayOrder: idx,
      })),
    };
    if (form.serviceId) body.serviceId = parseInt(form.serviceId);

    try {
      if (editingPackage) {
        await updatePkg.mutateAsync({ id: editingPackage.id, data: body });
      } else {
        await createPkg.mutateAsync({ data: body });
      }
      refresh();
      setSheetOpen(false);
      resetForm();
      toast({ description: editingPackage ? t("saved") : t("created") });
    } catch (err) {
      console.error("Failed to save package:", err);
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePkg.mutateAsync({ id });
      setDeleteConfirmId(null);
      refresh();
      toast({ description: t("deleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDelete") });
    }
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { title: "", price: "" }] }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            {t("monthlyPackages")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {activePackages.length} {t("activePackages")} · {generatedThisMonth.length} {t("generatedThisMonth")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateAll}
            disabled={generateAll.isPending || activePackages.length === 0}
            className="gap-2 rounded-xl"
          >
            <Package className="h-4 w-4" />
            {t("generateAll")}
          </Button>
          <Sheet open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) resetForm(); }}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                {t("newPackage")}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-bold">
                  {editingPackage ? t("edit") : t("newPackage")}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <Label className="text-sm font-medium">{t("clientRequired")}</Label>
                  <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue placeholder={t("selectClient")} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && !clientsLoading && (
                    <p className="text-xs text-red-500 mt-1">لا يوجد عملاء. يرجى إضافة عميل أولاً من صفحة العملاء.</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("titleRequired")}</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t("packageTitle")}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("currencyLabel")}</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DZD">د.ج DZD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("notes")}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder={t("briefNote")}
                    className="rounded-xl mt-1 resize-none"
                    rows={3}
                  />
                </div>

                {/* ── Items section ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-primary" />
                      {t("packageItems")}
                    </Label>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" onClick={addItem}>
                      <Plus className="h-3 w-3" />
                      {t("addVideo")}
                    </Button>
                  </div>
                  {form.items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-xl">
                      {t("noService")}
                    </p>
                  )}
                  {form.items.map((item, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-3 space-y-2 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Input
                        value={item.title}
                        onChange={(e) => updateItem(idx, "title", e.target.value)}
                        placeholder={t("videoTitle")}
                        className="rounded-lg text-sm h-9"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(idx, "price", e.target.value)}
                        placeholder={t("videoPriceLabel")}
                        className="rounded-lg text-sm h-9"
                      />
                    </div>
                  ))}
                  {form.items.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm font-bold">{t("totalBudgetLabel")}</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(
                          form.items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0),
                          form.currency as any,
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setSheetOpen(false); resetForm(); }}>
                    {t("cancel")}
                  </Button>
                  <Button className="flex-1 rounded-xl" onClick={handleSubmit} disabled={createPkg.isPending || updatePkg.isPending}>
                    {createPkg.isPending || updatePkg.isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Month Selector ── */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-border rounded-2xl px-4 py-3 w-fit">
        <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("period")}</span>
        <button onClick={goToPrev} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[140px] text-center">
          {monthYearLabel(selectedMonth)}
        </span>
        <button
          onClick={goToNext}
          disabled={isNextDisabled}
          className={`p-1 rounded-lg transition-colors ${isNextDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{packages.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("total")}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activePackages.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("activePackages")}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{generatedThisMonth.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("generatedThisMonth")}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalMonthlyBudget, "DZD")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("monthlyBudget")}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Packages Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white dark:bg-slate-900 border-border shadow-sm animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-border">
          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-semibold text-slate-500 dark:text-slate-400 mb-2">{t("noMonthlyPackages")}</p>
          <Sheet open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) resetForm(); }}>
            <SheetTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                {t("newPackage")}
              </Button>
            </SheetTrigger>
          </Sheet>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {packages.map((pkg, index) => {
              const isGenerated = pkg.generatedMonths?.includes(selectedMonth);
              const isActive = pkg.isActive;

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card className={`bg-white dark:bg-slate-900 border-border shadow-sm h-full hover:shadow-md transition-all ${!isActive ? "opacity-60" : ""}`}>
                    <CardContent className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-9 w-9 rounded-lg border border-border flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm rounded-lg">
                              {(pkg.clientName?.[0] || "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {pkg.clientName || `#${pkg.clientId}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{pkg.title}</p>
                          </div>
                        </div>
                        <Badge
                          className={`text-xs border flex-shrink-0 ${
                            isActive
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isActive ? t("active") : t("inactive")}
                        </Badge>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1.5">
                        {pkg.items.map((item: any, iidx: number) => (
                          <div key={iidx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <Video className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-700 dark:text-slate-300 truncate text-xs">{item.title}</span>
                            </div>
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100 flex-shrink-0 ms-2">
                              {formatCurrency(item.price, pkg.currency as any)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Divider + total */}
                      <div className="border-t border-border pt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{t("totalBudgetLabel")}</span>
                        <span className="text-base font-bold text-primary">
                          {formatCurrency(pkg.totalBudget, pkg.currency as any)}
                        </span>
                      </div>

                      {/* 12-dot timeline */}
                      <div className="flex items-center gap-1" dir="ltr">
                        {Array.from({ length: 12 }, (_, i) => {
                          const base = new Date(selectedMonth + "-01");
                          const m = new Date(base.getFullYear(), i, 1);
                          const ym = format(m, "yyyy-MM");
                          const isGen = pkg.generatedMonths?.includes(ym);
                          const isCurrent = ym === selectedMonth;
                          return (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded-full transition-all ${
                                isGen
                                  ? "bg-emerald-400"
                                  : isCurrent
                                    ? "bg-violet-400"
                                    : "bg-slate-200 dark:bg-slate-700"
                              }`}
                              title={`${MONTHS_ARABIC[i]}${isGen ? " ✓" : ""}`}
                            />
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {isGenerated ? (
                          <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs gap-1 py-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            {t("generated")}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1.5 rounded-lg text-xs h-8"
                            onClick={() => handleGenerateOne(pkg.id)}
                            disabled={generateOne.isPending || !isActive}
                          >
                            <Package className="h-3 w-3" />
                            {t("generateFor")} {monthLabel(selectedMonth)}
                          </Button>
                        )}
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => openEditSheet(pkg)}
                        >
                          <Settings2 className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                        {deleteConfirmId === pkg.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" className="h-7 text-xs rounded-lg px-2" onClick={() => handleDelete(pkg.id)}>
                              {t("delete")}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg px-2" onClick={() => setDeleteConfirmId(null)}>
                              {t("cancel")}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-destructive"
                            onClick={() => setDeleteConfirmId(pkg.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
