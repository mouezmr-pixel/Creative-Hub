import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useListProjects } from "@workspace/api-client-react";
import { FolderKanban, Play, Wallet, Search, FolderOpen } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { ClientPortalTabs } from "./ClientPortalTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const statusFilters = ["all", "in_progress", "pending", "completed", "archived"] as const;

export default function ProjectsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const filtered = (projects ?? []).filter((p: any) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ClientPortalTabs />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-xs text-muted-foreground">{t("totalProjects")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgProgress}%</p>
                <p className="text-xs text-muted-foreground">{t("progress")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {canSeeFinancials ? outstandingBalance.toLocaleString() : "\u2014"}
                </p>
                <p className="text-xs text-muted-foreground">{t("remaining")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 bg-white dark:bg-slate-900 border-border rounded-xl"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border w-fit">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              statusFilter === status
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {status === "all" ? t("all") : t(status as any)}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">{t("noActiveProjects")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
