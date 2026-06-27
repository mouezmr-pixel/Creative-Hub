import React from "react";
import { useLanguage } from "@/lib/i18n";
import { useCreateLead, useListServices, getListLeadsQueryKey, type CreateLeadBodyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { SOURCES } from "./constants";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadFormDialog({ open, onOpenChange }: LeadFormDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const createLead = useCreateLead();
  const { data: services = [] } = useListServices();

  const [form, setForm] = React.useState({
    name: "", phone: "", email: "", estimatedValue: "", source: "instagram", status: "new", notes: "",
    projectName: "", serviceId: "",
  });

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
      onOpenChange(false);
      toast({ description: t("addLead") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSave") });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" className="flex-1 rounded-xl" disabled={createLead.isPending}>
              {createLead.isPending ? t("adding") : t("addLead")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
