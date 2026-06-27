import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useListProjectNotes, useCreateProjectNote } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MilestoneStepper } from "./MilestoneStepper";

export function ProjectCard({ project }: { project: any }) {
  const { t, isRTL } = useLanguage();
  const { data: notes, refetch: refetchNotes } = useListProjectNotes(project.id);
  const createNote = useCreateProjectNote();
  const [newNote, setNewNote] = useState("");
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
