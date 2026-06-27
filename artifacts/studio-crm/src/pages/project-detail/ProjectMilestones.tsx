import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";
import type { WorkflowTemplate } from "@workspace/api-client-react";

interface ProjectMilestonesProps {
  project: any;
  milestones: any[];
  templates: WorkflowTemplate[];
  onToggleMilestone: (milestoneId: number, isCompleted: boolean) => Promise<void>;
  onDeleteMilestone: (milestoneId: number) => Promise<void>;
  onAddMilestone: (title: string) => Promise<void>;
  onApplyTemplate: (templateId: string) => Promise<void>;
  createMilestonePending: boolean;
  bulkCreatePending: boolean;
}

export function ProjectMilestones({
  project,
  milestones,
  templates,
  onToggleMilestone,
  onDeleteMilestone,
  onAddMilestone,
  onApplyTemplate,
  createMilestonePending,
  bulkCreatePending,
}: ProjectMilestonesProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleAdd = async () => {
    if (!newMilestoneTitle.trim()) return;
    await onAddMilestone(newMilestoneTitle.trim());
    setNewMilestoneTitle("");
    setAddingMilestone(false);
  };

  const handleApply = async () => {
    if (!selectedTemplateId) return;
    await onApplyTemplate(selectedTemplateId);
    setShowApplyTemplate(false);
    setSelectedTemplateId("");
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm md:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {t("workflowSteps")}
          </CardTitle>
          <div className="flex items-center gap-3">
            {milestones.length > 0 && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                {milestones.filter((m) => m.isCompleted).length}/{milestones.length}{t("doneSeparator")}{project.progress}%
              </span>
            )}
            {user?.role === "admin" && (
              <button
                onClick={() => setShowApplyTemplate(true)}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {t("applyTemplate")}
              </button>
            )}
          </div>
        </div>
        {milestones.length > 0 && (
          <Progress
            value={project.progress}
            className="h-2 mt-2"
            indicatorClassName={project.progress === 100 ? "bg-emerald-500" : "bg-primary"}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {milestones.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic py-3 px-1">{t("noStepsYet")}</p>
        ) : (
          milestones.map((m: any) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-xl group transition-colors ${m.isCompleted ? "bg-emerald-50/60" : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"}`}
            >
              <button
                onClick={() => onToggleMilestone(m.id, m.isCompleted)}
                disabled={user?.role === "client" || user?.role === "photographer"}
                className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                  m.isCompleted
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 hover:border-primary"
                } ${user?.role === "client" ? "cursor-default" : "cursor-pointer"}`}
              >
                {m.isCompleted && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${m.isCompleted ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-800 dark:text-slate-200"}`}>
                  {m.title}
                </p>
                {m.completedAt && m.isCompleted && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {t("completedPrefix")}{format(new Date(m.completedAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              {user?.role === "admin" && (
                <button
                  onClick={() => onDeleteMilestone(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-all p-1 rounded flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}

        {user?.role === "admin" && (
          addingMilestone ? (
            <div className="flex gap-2 pt-1 px-1">
              <Input
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder={t("stepTitle")}
                className="rounded-xl h-8 text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setAddingMilestone(false);
                }}
                autoFocus
              />
              <Button size="sm" className="h-8 px-3 rounded-xl" onClick={handleAdd} disabled={createMilestonePending}>
                {t("addStep")}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 rounded-xl" onClick={() => setAddingMilestone(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingMilestone(true)}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addStep")}
            </button>
          )
        )}

        <Dialog open={showApplyTemplate} onOpenChange={setShowApplyTemplate}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">{t("applyTemplate")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {templates.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t("noTemplatesAvailable")}</p>
              ) : (
                <>
                  {selectedTemplateId && (() => {
                    const tpl = templates.find((t) => String(t.id) === selectedTemplateId);
                    return tpl && tpl.milestones.length > 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          {tpl.milestones.length} {t("stepsWillBeAdded")}
                        </p>
                        {tpl.milestones.map((m, i) => (
                          <p key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                            {m.title}
                          </p>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("chooseTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tmpl) => (
                        <SelectItem key={tmpl.id} value={String(tmpl.id)}>
                          {tmpl.name} · {tmpl.milestones.length} {t("steps").toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => { setShowApplyTemplate(false); setSelectedTemplateId(""); }}>
                      {t("cancel")}
                    </Button>
                    <Button
                      onClick={handleApply}
                      disabled={!selectedTemplateId || bulkCreatePending}
                    >
                      {bulkCreatePending ? t("applying") : t("apply")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
