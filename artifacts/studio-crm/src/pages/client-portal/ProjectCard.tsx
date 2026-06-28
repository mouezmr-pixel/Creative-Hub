import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useListProjectNotes, useCreateProjectNote } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, Send, Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MilestoneStepper } from "./MilestoneStepper";
import { cn } from "@/lib/utils";

export function ProjectCard({ project }: { project: any }) {
  const { t, isRTL } = useLanguage();
  const { data: notes, refetch: refetchNotes } = useListProjectNotes(project.id);
  const createNote = useCreateProjectNote();
  const [newNote, setNewNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const { toast } = useToast();

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
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm overflow-hidden relative">
      <div className="absolute top-0 start-0 w-full h-1 bg-primary/20">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${project.progress}%` }} />
      </div>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{project.title}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {t("photographer")}: {project.photographerName}
            </p>
          </div>
          <Badge className={getStatusColor(project.status)} variant="outline">
            {t(project.status as any) || project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MilestoneStepper projectId={project.id} progress={project.progress} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground" dir="ltr">
              {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : t("tbd")}
            </span>
            <span className="text-muted-foreground/60">&rarr;</span>
            <span className="font-medium text-foreground" dir="ltr">
              {project.deliveryDate ? format(new Date(project.deliveryDate), "MMM d, yyyy") : t("tbd")}
            </span>
          </div>
        </div>

        {project.weTransferLink && (
          <div className="bg-primary/10 p-3 rounded-md border border-primary/20 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{t("deliverablesAvailable")}</p>
              <p className="text-xs text-muted-foreground">{t("downloadViaWeTransfer")}</p>
            </div>
            <Button asChild size="sm" className="flex-shrink-0">
              <a href={project.weTransferLink} target="_blank" rel="noreferrer">
                {t("download")} <ExternalLink className="ms-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium">{t("projectNotes")}</span>
            {notes?.length ? (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{notes.length}</span>
            ) : null}
            <ChevronDown className={cn("h-4 w-4 ms-auto transition-transform", showNotes && "rotate-180")} />
          </button>

          {showNotes && (
            <div className="mt-4 space-y-4">
              {!notes?.length ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{t("noNotesYet")}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {notes.map((note) => {
                    const isClient = note.authorRole === "client";
                    return (
                      <div
                        key={note.id}
                        className={`p-3 rounded-lg border ${
                          isClient
                            ? "bg-background/50 border-border/50 ms-6"
                            : "bg-primary/5 border-primary/20 me-6"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                          <span className="font-medium text-xs">
                            {note.authorName}
                            <span className="text-muted-foreground font-normal ms-1">
                              ({note.authorRole})
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0" dir="ltr">
                            {format(new Date(note.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t("addCommentOrQuestion")}
                  className="bg-background/50 border-input flex-1 h-9 text-sm"
                />
                <Button type="submit" size="sm" disabled={!newNote.trim() || createNote.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
