import { useLanguage } from "@/lib/i18n";
import { FolderKanban, Play, CheckCircle2 } from "lucide-react";

export function StatsCards({
  total,
  ongoing,
  completed,
}: {
  total: number;
  ongoing: number;
  completed: number;
}) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bento-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">{t("totalProjects")}</p>
          </div>
        </div>
      </div>
      <div className="bento-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Play className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{ongoing}</p>
            <p className="text-xs text-muted-foreground">{t("ongoing")}</p>
          </div>
        </div>
      </div>
      <div className="bento-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completed}</p>
            <p className="text-xs text-muted-foreground">{t("completed")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
