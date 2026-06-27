import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function CampaignView({ campaign }: { campaign: any }) {
  const { t, isRTL } = useLanguage();
  const services = campaign.services ?? [];
  const milestones = campaign.milestones ?? [];
  const completedMs = milestones.filter((m: any) => m.isCompleted).length;
  const totalMs = milestones.length;
  const progress = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  const getTitle = (m: any) => {
    if (isRTL && m.titleAr) return m.titleAr;
    return m.title;
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-indigo-400 to-primary" />
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{campaign.name}</h2>
            {campaign.description && (
              <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 shrink-0">
            {t("proposal")}
          </Badge>
        </div>

        {campaign.proposalContent && (
          <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 text-sm">{t("proposal")}</h4>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {campaign.proposalContent}
            </p>
          </div>
        )}

        {services.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("includedServices")}</h4>
            <div className="space-y-1.5">
              {services.map((s: any) => (
                <div key={s.id} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Service #{s.serviceId}</span>
                  {s.customPrice != null && (
                    <span className="text-slate-500" dir="ltr">&mdash; {Number(s.customPrice).toLocaleString()} DZD</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {campaign.budget != null && (
          <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("estimatedBudget")}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100" dir="ltr">
              {Number(campaign.budget).toLocaleString()} DZD
            </p>
          </div>
        )}

        {milestones.length > 0 && (
          <div>
            <div className="flex justify-between text-sm font-medium mb-1.5">
              <span className="text-slate-600 dark:text-slate-400">{t("timeline")}</span>
              <span className="text-primary" dir="ltr">{completedMs}/{totalMs}</span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName="bg-primary" />
            <div className="space-y-1.5 mt-3">
              {milestones.sort((a: any, b: any) => a.order - b.order).map((ms: any, idx: number) => (
                <div key={ms.id} className="flex items-center gap-2 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    ms.isCompleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}>
                    {ms.isCompleted && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <span className={ms.isCompleted ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-400"}>
                    {getTitle(ms)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
