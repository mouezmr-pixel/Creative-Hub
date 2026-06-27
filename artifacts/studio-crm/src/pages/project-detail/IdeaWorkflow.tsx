import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Bot, MessageSquare, FileCheck, ChevronRight, Globe, Copy } from "lucide-react";
import { motion } from "framer-motion";

type Language = "arabic" | "algerian" | "english" | "french";
const LANGUAGE_OPTIONS: { value: Language; labelKey: "langAlgerian" | "langArabicStd" | "langEnglish" | "langFrench"; nativeLabel: string }[] = [
  { value: "algerian", labelKey: "langAlgerian", nativeLabel: "الدارجة الجزائرية" },
  { value: "arabic", labelKey: "langArabicStd", nativeLabel: "العربية الفصحى" },
  { value: "english", labelKey: "langEnglish", nativeLabel: "English" },
  { value: "french", labelKey: "langFrench", nativeLabel: "Français" },
];

interface IdeaWorkflowProps {
  project: any;
  editFields: Record<string, any>;
  setEditFields: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  save: (field: string, value: any) => Promise<void>;
  enhanceIdeaWithAI: () => Promise<void>;
  handleCopyToFinalDetail: () => Promise<void>;
  isEnhancingIdea: boolean;
  ideaLanguage: Language;
  setIdeaLanguage: (lang: Language) => void;
}

export function IdeaWorkflow({
  project,
  editFields,
  setEditFields,
  save,
  enhanceIdeaWithAI,
  handleCopyToFinalDetail,
  isEnhancingIdea,
  ideaLanguage,
  setIdeaLanguage,
}: IdeaWorkflowProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm md:col-span-2 overflow-hidden">
      <div className="px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-white" />
        <span className="text-sm font-bold text-white">{t("ideaWorkflow")}</span>
        <span className="text-xs text-white/70 ms-auto" dir="ltr">{t("workflowSteps").replace("{count}", "3")}</span>
      </div>
      <CardContent className="p-5 space-y-5">
        {user?.role === "client" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">3</div>
              <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t("studioProposal")}
              </span>
            </div>
            {project.finalProposedIdea ? (
              <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {project.finalProposedIdea}
              </div>
            ) : (
              <div className="border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl py-8 text-center">
                <FileCheck className="h-8 w-8 mx-auto mb-2 text-emerald-200" />
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("proposalNotReady")}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* STEP 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">1</div>
                <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("clientOriginalIdeaLabel")}
                </span>
              </div>
              <Textarea
                value={editFields.originalClientIdea ?? ""}
                onChange={(e) => setEditFields((f: any) => ({ ...f, originalClientIdea: e.target.value }))}
                onBlur={() => save("originalClientIdea", editFields.originalClientIdea || null)}
                placeholder={t("ideaPlaceholder")}
                rows={3}
                className="bg-white dark:bg-slate-900 rounded-xl resize-none border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 py-0.5">
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-violet-200" />
              <ChevronRight className="h-4 w-4 text-violet-400" />
              <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-violet-200" />
            </div>

            {/* STEP 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">2</div>
                <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("aiGeneratedSuggestionLabel")}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-shrink-0">
                  <Globe className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <Select value={ideaLanguage} onValueChange={(v) => setIdeaLanguage(v as Language)}>
                    <SelectTrigger className="border-0 p-0 h-auto text-sm font-medium text-slate-700 dark:text-slate-300 bg-transparent focus:ring-0 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                          <span className="font-medium">{opt.nativeLabel}</span>
                          <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{t(opt.labelKey)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={enhanceIdeaWithAI}
                  disabled={isEnhancingIdea || !editFields.originalClientIdea?.trim()}
                  className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4" />
                  {isEnhancingIdea ? t("generating") : t("enhanceWithAI")}
                </Button>
              </div>
              {editFields.aiGeneratedSuggestion ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-950 border-b border-violet-100 dark:border-violet-900">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t("aiResult")}</span>
                      <span className="text-xs text-violet-400">· {LANGUAGE_OPTIONS.find(l => l.value === ideaLanguage)?.nativeLabel}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyToFinalDetail}
                      className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3"
                    >
                      <Copy className="h-3 w-3" />
                      {t("copyToFinal")}
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.aiGeneratedSuggestion ?? ""}
                    onChange={(e) => setEditFields((f: any) => ({ ...f, aiGeneratedSuggestion: e.target.value }))}
                    onBlur={() => save("aiGeneratedSuggestion", editFields.aiGeneratedSuggestion || null)}
                    className="border-0 rounded-none text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 resize-none leading-relaxed p-4"
                    rows={6}
                  />
                </motion.div>
              ) : (
                <div className="border border-dashed border-violet-200 dark:border-violet-800 rounded-xl py-6 text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-violet-200" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t("aiPlaceholder")}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 py-0.5">
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-emerald-200" />
              <ChevronRight className="h-4 w-4 text-emerald-400" />
              <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-emerald-200" />
            </div>

            {/* STEP 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">3</div>
                <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("finalProposedIdeaLabel")}
                </span>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                  {t("visibleToClient")}
                </span>
              </div>
              <Textarea
                value={editFields.finalProposedIdea ?? ""}
                onChange={(e) => setEditFields((f: any) => ({ ...f, finalProposedIdea: e.target.value }))}
                onBlur={() => save("finalProposedIdea", editFields.finalProposedIdea || null)}
                placeholder={t("finalIdeaPlaceholder")}
                rows={5}
                className="bg-white dark:bg-slate-900 rounded-xl resize-none border-emerald-200 dark:border-emerald-800 focus:border-emerald-500"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export type { Language, LANGUAGE_OPTIONS };
