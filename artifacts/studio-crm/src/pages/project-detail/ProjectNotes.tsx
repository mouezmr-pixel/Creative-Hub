import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface ProjectNotesProps {
  notes: any[];
  newNote: string;
  setNewNote: (val: string) => void;
  onAddNote: (e: React.FormEvent) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
  createNotePending: boolean;
}

export function ProjectNotes({
  notes,
  newNote,
  setNewNote,
  onAddNote,
  onDeleteNote,
  createNotePending,
}: ProjectNotesProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("projectNotes")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
              {t("noNotesYet")}
            </p>
          ) : (
            notes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`p-3 rounded-xl border text-sm ${
                  note.authorRole === "client"
                    ? "bg-slate-50 border-border ml-8"
                    : "bg-primary/5 border-primary/15 mr-8"
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{note.authorName}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 capitalize">{note.authorRole}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {format(new Date(note.createdAt), "MMM d, h:mm a")}
                    </span>
                    {user?.role === "admin" && (
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{note.content}</p>
              </motion.div>
            ))
          )}
        </div>
        <form onSubmit={onAddNote} className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            className="rounded-xl resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (newNote.trim()) onAddNote(e as any);
              }
            }}
          />
          <Button type="submit" disabled={!newNote.trim() || createNotePending} className="self-end rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
