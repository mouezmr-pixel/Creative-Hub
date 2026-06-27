import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListProjects } from "@workspace/api-client-react";
import { Briefcase } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { ClientPortalTabs } from "./ClientPortalTabs";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <ClientPortalTabs />
        <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  const totalProjects = projects?.length ?? 0;
  const activeProjects = (projects ?? []).filter((p: any) => p.status === "in_progress" || p.status === "pending");
  const avgProgress = activeProjects.length > 0
    ? Math.round(activeProjects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / activeProjects.length)
    : 0;
  const canSeeFinancials = (user as any)?.canViewFinancials === true;
  const outstandingBalance = canSeeFinancials
    ? (projects ?? []).reduce((sum: number, p: any) => sum + (p.remainingDebt || 0), 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ClientPortalTabs />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("totalProjects")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{avgProgress}%</p>
            <p className="text-xs text-muted-foreground mt-1">{t("progress")}</p>
          </CardContent>
        </Card>
        {canSeeFinancials ? (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {outstandingBalance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t("remaining")}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">&mdash;</p>
              <p className="text-xs text-muted-foreground mt-1">{t("remaining")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("yourProjects")}</h2>
        </div>
        {!projects?.length ? (
          <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
            {t("noActiveProjects")}
          </div>
        ) : (
          <div className="space-y-12">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
