import React from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

function getStatusBadge(status: string) {
  switch (status) {
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
    case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "archived": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

interface ProjectOverviewProps {
  project: any;
  editFields: Record<string, any>;
  setEditFields: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  save: (field: string, value: any) => Promise<void>;
  photographerUsers: any[];
}

export function ProjectOverview({
  project,
  editFields,
  setEditFields,
  save,
  photographerUsers,
}: ProjectOverviewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("projectDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("status")}</Label>
            <Select
              value={editFields.status}
              onValueChange={(val) => {
                setEditFields((f: any) => ({ ...f, status: val }));
                save("status", val);
              }}
              disabled={user?.role === "client"}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t("pending")}</SelectItem>
                <SelectItem value="in_progress">{t("in_progress")}</SelectItem>
                <SelectItem value="completed">{t("completed")}</SelectItem>
                <SelectItem value="archived">{t("archived")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {user?.role === "admin" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("leadCreative")}</Label>
              <Select
                value={editFields.photographerId}
                onValueChange={(val) => {
                  setEditFields((f: any) => ({ ...f, photographerId: val }));
                  save("photographerId", parseInt(val));
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("assignLeadCreative")} />
                </SelectTrigger>
                <SelectContent>
                  {photographerUsers.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {project.serviceName && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("servicePackage")}</Label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{project.serviceName}</span>
              </div>
            </div>
          )}

          {project.assignees && project.assignees.length > 0 && (
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("teamCreatives")}</Label>
              <div className="flex flex-wrap gap-2">
                {project.assignees.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-1.5 bg-primary/5 border border-primary/15 text-primary rounded-lg px-2.5 py-1 text-sm font-medium">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {a.name.charAt(0)}
                    </span>
                    {a.name}
                    {a.profession && <span className="text-xs text-primary/60 capitalize ml-0.5">· {a.profession}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("startDate")}</Label>
            <Input
              type="date"
              value={editFields.startDate}
              onChange={(e) => setEditFields((f: any) => ({ ...f, startDate: e.target.value }))}
              onBlur={() => save("startDate", editFields.startDate || null)}
              disabled={user?.role === "client" || user?.role === "photographer"}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("deliveryDate")}</Label>
            <Input
              type="date"
              value={editFields.deliveryDate}
              onChange={(e) => setEditFields((f: any) => ({ ...f, deliveryDate: e.target.value }))}
              onBlur={() => save("deliveryDate", editFields.deliveryDate || null)}
              disabled={user?.role === "client" || user?.role === "photographer"}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("weTransferLink")}</Label>
            <div className="flex gap-2">
              <Input
                value={editFields.weTransferLink}
                onChange={(e) => setEditFields((f: any) => ({ ...f, weTransferLink: e.target.value }))}
                onBlur={() => save("weTransferLink", editFields.weTransferLink || null)}
                placeholder={t("weTransferPlaceholder")}
                disabled={user?.role === "client" || user?.role === "photographer"}
                className="rounded-xl"
              />
              {editFields.weTransferLink && (
                <Button size="icon" variant="outline" asChild className="rounded-xl">
                  <a href={editFields.weTransferLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("progressLabel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={project.progress} className="h-2 mb-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("progressLabel")}</span>
              <span className="font-semibold">{project.progress}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("dates")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("startDate")}</span>
              <span>{project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("deliveryDate")}</span>
              <span>{project.deliveryDate ? format(new Date(project.deliveryDate), "MMM d, yyyy") : "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { getStatusBadge };
