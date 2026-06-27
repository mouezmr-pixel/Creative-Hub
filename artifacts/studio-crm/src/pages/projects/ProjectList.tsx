import React from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export function getStatusColor(status: string) {
  switch (status) {
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
    case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "archived": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function ProjectList({
  projects,
  search,
  viewMode,
}: {
  projects: any[];
  search: string;
  viewMode: "list" | "grid";
}) {
  const { t } = useLanguage();

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" : "space-y-3 mt-4"}>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
          {t("noProjectsFound")}
        </div>
      ) : (
        filtered.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link href={`/projects/${project.id}`}>
              <Card className={`group hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-900 border-border shadow-sm overflow-hidden`}>
                {viewMode === "grid" && (
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                )}
                <CardContent className={viewMode === "grid" ? "p-5" : "p-4"}>
                  <div className={viewMode === "grid" ? "space-y-3" : "flex flex-col sm:flex-row sm:items-center justify-between gap-3"}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{project.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {project.clientName}
                        {project.photographerName && ` • ${project.photographerName}`}
                      </p>
                      {viewMode === "grid" ? (
                        <div className="mt-3 space-y-2">
                          <Progress value={project.progress} className="h-1.5" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t("progressLabel")}</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 max-w-xs">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{t("progressLabel")}</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className={viewMode === "grid" ? "flex items-center justify-between pt-2 border-t border-border" : "flex items-center gap-4 flex-shrink-0"}>
                      {viewMode === "grid" ? (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            {project.deliveryDate && (
                              <span className="text-xs text-muted-foreground">
                                {t("due")}: {new Date(project.deliveryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Badge className={`${getStatusColor(project.status)}`} variant="outline">
                            {t(project.status as any) || project.status}
                          </Badge>
                        </>
                      ) : (
                        <>
                          {project.deliveryDate && (
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {t("due")}: {new Date(project.deliveryDate).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      )}
                      
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))
      )}
    </div>
  );
}
