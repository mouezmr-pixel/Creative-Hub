import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  useListProjects,
  useListClients,
  useListUsers,
  useListServices,
  useListWorkflowTemplates,
  type WorkflowTemplate,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LayoutGrid, LayoutList } from "lucide-react";
import { StatsCards } from "./StatsCards";
import { ProjectList } from "./ProjectList";
import { CreateProjectDialog } from "./CreateProjectDialog";

export default function Projects() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const baseParams = user?.role === "photographer" ? { photographerId: user.id } : {};
  const { data: allProjects = [], isLoading } = useListProjects(baseParams);
  const { data: ongoingProjects = [] } = useListProjects({ ...baseParams, status: "in_progress" });
  const { data: pendingProjects = [] } = useListProjects({ ...baseParams, status: "pending" });
  const { data: completedProjects = [] } = useListProjects({ ...baseParams, status: "completed" });
  const { data: archivedProjects = [] } = useListProjects({ ...baseParams, status: "archived" });
  const { data: clients = [] } = useListClients(baseParams);
  const { data: photographers = [] } = useListUsers();
  const { data: services = [] } = useListServices();
  const { data: templates = [] } = useListWorkflowTemplates();

  const photographerUsers = photographers.filter((u) => u.role === "photographer");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("projects")}</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{allProjects.length} {t("totalProjects")}</p>
        </div>
        {user?.role === "admin" && (
          <CreateProjectDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            clients={clients}
            photographerUsers={photographerUsers}
            services={services}
            templates={templates as WorkflowTemplate[]}
          />
        )}
      </div>

      <StatsCards
        total={allProjects.length}
        ongoing={ongoingProjects.length}
        completed={completedProjects.length}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-white dark:bg-slate-900 border-border rounded-xl"
            placeholder={t("searchProjects")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center border border-border rounded-xl p-0.5 bg-white dark:bg-slate-900">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="all">{t("all")} ({allProjects.length})</TabsTrigger>
          <TabsTrigger value="ongoing">{t("ongoing")} ({ongoingProjects.length})</TabsTrigger>
          <TabsTrigger value="pending">{t("pending")} ({pendingProjects.length})</TabsTrigger>
          <TabsTrigger value="completed">{t("completed")} ({completedProjects.length})</TabsTrigger>
          <TabsTrigger value="archived">{t("archived")} ({archivedProjects.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><ProjectList projects={allProjects} search={search} viewMode={viewMode} /></TabsContent>
        <TabsContent value="ongoing"><ProjectList projects={ongoingProjects} search={search} viewMode={viewMode} /></TabsContent>
        <TabsContent value="pending"><ProjectList projects={pendingProjects} search={search} viewMode={viewMode} /></TabsContent>
        <TabsContent value="completed"><ProjectList projects={completedProjects} search={search} viewMode={viewMode} /></TabsContent>
        <TabsContent value="archived"><ProjectList projects={archivedProjects} search={search} viewMode={viewMode} /></TabsContent>
      </Tabs>
    </div>
  );
}
