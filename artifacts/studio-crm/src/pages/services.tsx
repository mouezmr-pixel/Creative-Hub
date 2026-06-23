import React, { useState } from "react";
import {
  useListServices,
  useCreateService,
  useDeleteService,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Layers, Plus, Trash2, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Services() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: services = [], isLoading } = useListServices();
  const createService = useCreateService();
  const deleteService = useDeleteService();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "" });

  const isAdmin = user?.role === "admin";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price) return;
    try {
      await createService.mutateAsync({
        data: {
          title: form.title,
          description: form.description || null,
          price: parseFloat(form.price),
        },
      });
      qc.invalidateQueries({ queryKey: getListServicesQueryKey() });
      setForm({ title: "", description: "", price: "" });
      setOpen(false);
      toast({ description: t("createService") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteService.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListServicesQueryKey() });
      toast({ description: t("delete") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("servicesCatalog")}</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{t("manageServices")}</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                {t("addService")}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("newService")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("serviceName")} *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t("serviceNamePlaceholder")}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("description")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t("serviceDescPlaceholder")}
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("basePrice")} *</Label>
                  <div className="relative">
                    <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder={t("servicePricePlaceholder")}
                      className="ps-9 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl" disabled={createService.isPending}>
                    {createService.isPending ? t("creating") : t("createService")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white dark:bg-slate-900 border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl">
          <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{t("noServicesYet")}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {isAdmin ? t("addFirstService") : t("noServicesCreated")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="bg-white dark:bg-slate-900 border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{service.title}</CardTitle>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          title={t("delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3 leading-relaxed line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100" dir="ltr">{formatCurrency(service.price)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
