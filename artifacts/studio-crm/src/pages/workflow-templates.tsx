import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWorkflowTemplates,
  useCreateWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useAddTemplateMilestone,
  useUpdateTemplateMilestone,
  useDeleteTemplateMilestone,
  getListWorkflowTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Workflow, Trash2, GripVertical, Pencil, Check, X, Languages,
} from "lucide-react";

function MilestoneRow({ milestone, templateId, onRefresh }: { milestone: any; templateId: number; onRefresh: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const updateMilestone = useUpdateTemplateMilestone();
  const deleteMilestone = useDeleteTemplateMilestone();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: milestone.title, titleAr: milestone.titleAr ?? "", titleFr: milestone.titleFr ?? "", description: milestone.description ?? "" });
  const [showAr, setShowAr] = useState(false);

  const handleSave = async () => {
    try {
      await updateMilestone.mutateAsync({ id: templateId, milestoneId: milestone.id, data: { title: editData.title, titleAr: editData.titleAr || null, titleFr: editData.titleFr || null, description: editData.description || null } });
      onRefresh();
      setEditing(false);
    } catch { toast({ variant: "destructive", description: t("failedToUpdate") }); }
  };

  const handleDelete = async () => {
    try {
      await deleteMilestone.mutateAsync({ id: templateId, milestoneId: milestone.id });
      onRefresh();
    } catch { toast({ variant: "destructive", description: t("failedToDelete") }); }
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg group transition-colors">
      <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={editData.title} onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))} placeholder={t("stepTitleEn")} className="rounded-lg h-8 text-sm flex-1" />
              <button onClick={() => setShowAr((v) => !v)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${showAr ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>
                <Languages className="w-3 h-3 inline mr-1" />{t("arFr")}
              </button>
            </div>
            {showAr && (
              <div className="grid grid-cols-2 gap-2">
                <Input value={editData.titleAr} onChange={(e) => setEditData((d) => ({ ...d, titleAr: e.target.value }))} placeholder={t("stepTitleAr")} className="rounded-lg h-8 text-sm text-right" dir="rtl" />
                <Input value={editData.titleFr} onChange={(e) => setEditData((d) => ({ ...d, titleFr: e.target.value }))} placeholder={t("stepTitleFr")} className="rounded-lg h-8 text-sm" />
              </div>
            )}
            <Input value={editData.description} onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))} placeholder={t("stepDescriptionOptional")} className="rounded-lg h-8 text-sm" />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs rounded-lg" onClick={handleSave} disabled={updateMilestone.isPending}><Check className="w-3 h-3 mr-1" />{t("save")}</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setEditing(false)}><X className="w-3 h-3 mr-1" />{t("cancel")}</Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{milestone.title}</p>
            {milestone.titleAr && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 text-right" dir="rtl">{milestone.titleAr}</p>}
            {milestone.description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{milestone.description}</p>}
          </div>
        )}
      </div>
      {!editing && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditing(true)} className="text-slate-400 dark:text-slate-500 hover:text-primary p-1 rounded transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:text-rose-400 p-1 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, index }: { template: any; index: number }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { toast } = useToast();
  const deleteTemplate = useDeleteWorkflowTemplate();
  const addMilestone = useAddTemplateMilestone();
  const [newStep, setNewStep] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: getListWorkflowTemplatesQueryKey() });

  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    try {
      await addMilestone.mutateAsync({ id: template.id, data: { title: newStep.trim(), order: template.milestones.length } });
      refresh();
      setNewStep("");
      setAddingStep(false);
    } catch { toast({ variant: "destructive", description: t("failedToCreate") }); }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate.mutateAsync({ id: template.id });
      refresh();
    } catch { toast({ variant: "destructive", description: t("failedToDelete") }); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm hover:shadow-md transition-shadow group">
        <div className="h-1 bg-gradient-to-r from-primary to-violet-400" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Workflow className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-bold truncate">{template.name}</CardTitle>
                {template.description && <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{template.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                {template.milestones.length} {t("steps")}
              </Badge>
              {confirmDelete ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="destructive" className="h-7 text-xs rounded-lg px-1.5" onClick={handleDelete}>{t("delete")}</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg px-1.5" onClick={() => setConfirmDelete(false)}>{t("no")}</Button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors p-1 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {template.milestones.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic px-3 py-2">{t("noStepsYet")}</p>
          ) : (
            template.milestones.map((m: any) => (
              <MilestoneRow key={m.id} milestone={m} templateId={template.id} onRefresh={refresh} />
            ))
          )}

          {/* Add step inline */}
          {addingStep ? (
            <div className="flex gap-2 px-3 pt-2 pb-1">
              <Input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder={t("newStepTitle")}
                className="rounded-lg h-8 text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddStep(); if (e.key === "Escape") setAddingStep(false); }}
                autoFocus
              />
              <Button size="sm" className="h-8 rounded-lg px-3" onClick={handleAddStep} disabled={addMilestone.isPending}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-lg px-2" onClick={() => setAddingStep(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingStep(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addStepButton")}
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function WorkflowTemplates() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useListWorkflowTemplates();
  const createTemplate = useCreateWorkflowTemplate();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [stepsText, setStepsText] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const milestones = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title, i) => ({ title, order: i }));
    try {
      await createTemplate.mutateAsync({ data: { name: form.name, description: form.description || null, milestones } });
      qc.invalidateQueries({ queryKey: getListWorkflowTemplatesQueryKey() });
      setForm({ name: "", description: "" });
      setStepsText("");
      setOpen(false);
      toast({ description: t("templateCreated") });
    } catch { toast({ variant: "destructive", description: t("failedToCreateTemplate") }); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            {t("workflowTemplatesTitle")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{t("workflowTemplatesDesc")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" />{t("newTemplate")}</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">{t("newWorkflowTemplate")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("templateName")} *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("templateNamePlaceholder")} className="rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("templateDescription")}</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={t("templateDescPlaceholder")} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("stepsOnePerLine")}</Label>
                <textarea
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  placeholder={t("stepsPlaceholder")}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={5}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("translationsAfterCreate")}</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? t("creating") : t("createTemplate")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map((i) => <div key={i} className="h-56 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl">
          <Workflow className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{t("noTemplatesYet")}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t("noTemplatesSubtitle")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {(templates as any[]).map((template, i) => (
              <TemplateCard key={template.id} template={template} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
