import React from "react";
import {
  useListProjects,
  useListProjectNotes,
  useCreateProjectNote,
  useListProjectMilestones,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, Send, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function MilestoneStepper({ projectId, progress }: { projectId: number; progress: number }) {
  const { t, isRTL } = useLanguage();
  const { data: milestones = [] } = useListProjectMilestones(projectId);

  if ((milestones as any[]).length === 0) {
    return (
      <div>
        <div className="flex justify-between text-sm mb-2 font-medium">
          <span>{t("projectProgress")}</span>
          <span className="text-primary" dir="ltr">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" indicatorClassName="bg-primary" />
      </div>
    );
  }

  const getTitle = (m: any) => {
    if (isRTL && m.titleAr) return m.titleAr;
    return m.title;
  };

  const completed = (milestones as any[]).filter((m) => m.isCompleted).length;
  const total = (milestones as any[]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("projectSteps")}</span>
        <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full" dir="ltr">
          {completed}/{total} · {progress}%
        </span>
      </div>
      <Progress value={progress} className="h-2" indicatorClassName={progress === 100 ? "bg-emerald-500" : "bg-primary"} />

      <div className="relative mt-4">
        {/* Vertical connector line — uses start- for RTL compatibility */}
        <div className="absolute start-[11px] top-6 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 to-slate-100" />

        <div className="space-y-3">
          {(milestones as any[]).map((m: any, idx: number) => {
            const isCurrent = !m.isCompleted && (milestones as any[])[idx - 1]?.isCompleted !== false;
            const isPast = m.isCompleted;
            const isFuture = !m.isCompleted && !isCurrent;

            return (
              <div key={m.id} className="flex items-start gap-3 relative">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10 mt-0.5 border-2 transition-all ${
                  isPast
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isCurrent
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/30"
                    : "bg-white border-slate-200 text-slate-300"
                }`}>
                  {isPast ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-bold" dir="ltr">{idx + 1}</span>
                  )}
                </div>

                <div className={`flex-1 pb-0.5 ${isFuture ? "opacity-50" : ""}`}>
                  <p className={`text-sm font-medium leading-snug ${
                    isPast ? "text-slate-400 line-through" : isCurrent ? "text-slate-900" : "text-slate-500"
                  }`}>
                    {getTitle(m)}
                  </p>
                  {m.completedAt && isPast && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5" dir="ltr">
                      {format(new Date(m.completedAt), "MMM d, yyyy")}
                    </p>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center text-xs text-primary font-medium mt-0.5 gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {t("inProgressStep")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjectView({ project }: { project: any }) {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { data: notes, refetch: refetchNotes } = useListProjectNotes(project.id);
  const createNote = useCreateProjectNote();
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const hasFinancials =
    project.finalCost != null || project.amountPaid != null || project.remainingDebt != null;
  const canSeeFinancials = (user as any)?.canViewFinancials === true;

  const finalCost = project.finalCost ?? 0;
  const amountPaid = project.amountPaid ?? 0;
  const remaining = project.remainingDebt ?? Math.max(0, finalCost - amountPaid);
  const paidPct = finalCost > 0 ? Math.min(100, Math.round((amountPaid / finalCost) * 100)) : 0;
  const currency = project.currency ?? "DZD";

  function fmt(n: number) {
    return n.toLocaleString(isRTL ? "ar-DZ" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync({ id: project.id, data: { content: newNote } });
      setNewNote("");
      refetchNotes();
      toast({ description: t("noteAddedSuccess") });
    } catch {
      toast({ variant: "destructive", description: t("failedToAddNote") });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "archived": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 start-0 w-full h-1 bg-primary/20">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${project.progress}%` }} />
        </div>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{project.title}</h2>
              <p className="text-muted-foreground mt-1">
                {t("photographer")}: {project.photographerName}
              </p>
            </div>
            <Badge className={getStatusColor(project.status)} variant="outline">
              {t(project.status as any) || project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <MilestoneStepper projectId={project.id} progress={project.progress} />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-background/50 p-3 rounded-md border border-border/50">
              <span className="text-muted-foreground block mb-1">{t("startDate")}</span>
              <span className="font-medium" dir="ltr">
                {project.startDate ? format(new Date(project.startDate), "PPP") : t("tbd")}
              </span>
            </div>
            <div className="bg-background/50 p-3 rounded-md border border-border/50">
              <span className="text-muted-foreground block mb-1">{t("deliveryDate")}</span>
              <span className="font-medium" dir="ltr">
                {project.deliveryDate ? format(new Date(project.deliveryDate), "PPP") : t("tbd")}
              </span>
            </div>
          </div>

          {/* Final Proposal — hidden if canViewProposal = false */}
          {(user as any)?.canViewProposal !== false && project.finalProposedIdea && (
            <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 text-sm">{t("finalProposal")}</h4>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {project.finalProposedIdea}
              </p>
            </div>
          )}

          {/* Financial summary — only when permission granted AND data exists */}
          {canSeeFinancials && hasFinancials && (
            <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">{t("financialSummary")}</h4>
              </div>

              {/* Three stat boxes */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{t("totalCost")}</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">{fmt(finalCost)}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{currency}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{t("paid")}</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">{fmt(amountPaid)}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{currency}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{t("remaining")}</p>
                  <p className={`font-bold text-sm ${remaining > 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} dir="ltr">
                    {fmt(remaining)}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{currency}</p>
                </div>
              </div>

              {/* Payment progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500 mb-1.5 font-medium">
                  <span>{t("paymentProgress")}</span>
                  <span dir="ltr">{paidPct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${paidPct === 100 ? "bg-emerald-500" : "bg-emerald-400"}`}
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
                {paidPct === 100 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 text-center">
                    {t("fullyPaidMsg")}
                  </p>
                )}
              </div>
            </div>
          )}

          {project.weTransferLink && (
            <div className="bg-primary/10 p-4 rounded-md border border-primary/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-medium text-primary">{t("deliverablesAvailable")}</h4>
                <p className="text-sm text-muted-foreground">{t("downloadViaWeTransfer")}</p>
              </div>
              <Button asChild size="sm" className="flex-shrink-0">
                <a href={project.weTransferLink} target="_blank" rel="noreferrer">
                  {t("download")} <ExternalLink className="ms-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center text-lg gap-2">
            <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
            {t("projectNotes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {!notes?.length ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("noNotesYet")}</p>
            ) : (
              notes.map((note) => {
                const isClient = note.authorRole === "client";
                return (
                  <div
                    key={note.id}
                    className={`p-4 rounded-lg border ${
                      isClient
                        ? "bg-background/50 border-border/50 ms-8"
                        : "bg-primary/5 border-primary/20 me-8"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="font-medium text-sm">
                        {note.authorName}{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          ({note.authorRole})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0" dir="ltr">
                        {format(new Date(note.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleAddNote} className="flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t("addCommentOrQuestion")}
              className="bg-background/50 border-input flex-1"
            />
            <Button type="submit" disabled={!newNote.trim() || createNote.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientPortal() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight uppercase">
          {t("clientPortal")}
        </h1>
        <p className="text-muted-foreground">
          {t("welcome")}, {user?.name}. {t("hereIsYourProjects")}
        </p>
      </div>

      {!projects?.length ? (
        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
          {t("noActiveProjects")}
        </div>
      ) : (
        <div className="space-y-12">
          {projects.map((project) => (
            <ProjectView key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
