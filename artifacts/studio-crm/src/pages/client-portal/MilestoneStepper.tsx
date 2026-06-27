import { useLanguage } from "@/lib/i18n";
import { useListProjectMilestones } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export function MilestoneStepper({ projectId, progress }: { projectId: number; progress: number }) {
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
          {completed}/{total} &middot; {progress}%
        </span>
      </div>
      <Progress value={progress} className="h-2" indicatorClassName={progress === 100 ? "bg-emerald-500" : "bg-primary"} />

      <div className="relative mt-4">
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
